// pay — completes a held booking (uix-spec 2.3 Payment). Called by the signed-in passenger with
// { payment_id, method: 'wallet' | 'momo' | 'card', details }.
// → { status: 'succeeded' } | { status: 'failed', reason } | { status: 'expired' }
// Amounts come from the payment row (priced by hold_seats on the server), never from the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { MockPaymentProvider, type MomoNetwork, type PaymentProvider } from './providers.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Swap for a real provider here; the rest of the flow doesn't change.
const provider: PaymentProvider = new MockPaymentProvider();

const NETWORKS: MomoNetwork[] = ['mtn', 'telecel', 'airteltigo'];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function ghanaPhone(input: unknown): string | null {
  let d = String(input ?? '').replace(/[^\d]/g, '');
  if (d.startsWith('233')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^[25]\d{8}$/.test(d) ? `+233${d}` : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Who is paying: verify the passenger's access token ourselves.
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return json({ error: 'not_signed_in' }, 401);

  let body: { payment_id?: string; method?: string; details?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const method = body.method;
  if (method !== 'wallet' && method !== 'momo' && method !== 'card') return json({ error: 'bad_request' }, 400);

  const { data: payment } = await admin.from('payments').select('*').eq('id', body.payment_id ?? '').maybeSingle();
  if (!payment || payment.passenger_id !== user.id) return json({ error: 'not_found' }, 404);
  if (payment.status === 'succeeded') return json({ status: 'succeeded' });
  if (payment.status !== 'pending' || Date.parse(payment.expires_at) <= Date.now()) return json({ status: 'expired' });

  let providerName = 'wallet';
  let providerRef: string | null = null;

  if (method === 'wallet') {
    // Opens the wallet (with the prototype test balance) if this is its first use.
    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    await asUser.rpc('my_wallet');
  } else {
    const details = body.details ?? {};
    let result;
    if (method === 'momo') {
      const phone = ghanaPhone(details.phone);
      const network = NETWORKS.find((n) => n === details.network);
      if (!phone || !network) return json({ status: 'failed', reason: 'Check the Mobile Money network and number.' });
      result = await provider.charge({ method, amountPesewas: payment.amount_pesewas, reference: payment.id, network, phone });
    } else {
      const testOutcome = details.testOutcome === 'decline' ? 'decline' : 'approve';
      result = await provider.charge({ method, amountPesewas: payment.amount_pesewas, reference: payment.id, testOutcome });
    }
    if (!result.ok) {
      await admin.rpc('record_payment_failure', { p_payment_id: payment.id, p_method: method, p_reason: result.reason });
      return json({ status: 'failed', reason: result.reason });
    }
    providerName = provider.name;
    providerRef = result.providerRef;
  }

  const { data: outcome, error } = await admin.rpc('confirm_payment', {
    p_payment_id: payment.id,
    p_method: method,
    p_provider: providerName,
    p_provider_ref: providerRef,
  });
  if (error) return json({ status: 'failed', reason: 'Something went wrong on our side. Please try again.' });
  if (outcome === 'succeeded') return json({ status: 'succeeded' });
  if (outcome === 'insufficient_funds') return json({ status: 'failed', reason: 'Not enough money in your wallet.' });
  // TODO(real provider): if the charge succeeded but the hold had expired, refund via the provider.
  return json({ status: 'expired' });
});
