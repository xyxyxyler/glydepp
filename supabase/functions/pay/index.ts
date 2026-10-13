// pay — completes a held booking (uix-spec 2.3 Payment) or tops up the wallet (2.6 Add Funds).
// Booking: { payment_id, method: 'wallet' | 'momo' | 'card', details }
// Top-up:  { action: 'top_up', amount_pesewas, method: 'momo' | 'card', details } → { status, balance_pesewas }
// → { status: 'succeeded' } | { status: 'failed', reason } | { status: 'expired' }
// Amounts come from the payment row (priced by hold_seats on the server), never from the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { MockPaymentProvider, type ChargeResult, type MomoNetwork, type PaymentProvider } from './providers.ts';

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

/** Top-up limits (decision 2026-10-14) — same as public.top_up_limits(). */
const TOP_UP_MIN = 500;
const TOP_UP_MAX = 100_000;

const userClient = (jwt: string) =>
  createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });

/** Charge MoMo or card through the PaymentProvider. */
async function chargeExternal(
  method: 'momo' | 'card',
  amountPesewas: number,
  reference: string,
  details: Record<string, unknown>,
): Promise<ChargeResult> {
  if (method === 'momo') {
    const phone = ghanaPhone(details.phone);
    const network = NETWORKS.find((n) => n === details.network);
    if (!phone || !network) return { ok: false, reason: 'Check the Mobile Money network and number.' };
    return provider.charge({ method, amountPesewas, reference, network, phone });
  }
  const testOutcome = details.testOutcome === 'decline' ? 'decline' : 'approve';
  return provider.charge({ method, amountPesewas, reference, testOutcome });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Who is paying: verify the passenger's access token ourselves.
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return json({ error: 'not_signed_in' }, 401);

  let body: { action?: string; payment_id?: string; amount_pesewas?: number; method?: string; details?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const method = body.method;
  if (method !== 'wallet' && method !== 'momo' && method !== 'card') return json({ error: 'bad_request' }, 400);

  // ── Wallet top-up (uix-spec 2.6 Add Funds) ─────────────────────────────────
  if (body.action === 'top_up') {
    const amount = Number(body.amount_pesewas);
    if (!Number.isInteger(amount) || amount < TOP_UP_MIN || amount > TOP_UP_MAX) {
      return json({ status: 'failed', reason: 'Top-ups must be between GHS 5 and GHS 1,000.' });
    }
    if (method === 'wallet') return json({ error: 'bad_request' }, 400);
    const result = await chargeExternal(method, amount, `topup-${crypto.randomUUID()}`, body.details ?? {});
    if (!result.ok) return json({ status: 'failed', reason: result.reason });
    // Opens the wallet (with the prototype test balance) on first use, then credits it.
    await userClient(jwt).rpc('my_wallet');
    const { data: balance, error } = await admin.rpc('credit_wallet', {
      p_passenger_id: user.id,
      p_amount_pesewas: amount,
      p_provider_ref: result.providerRef,
    });
    // TODO(real provider): refund if the credit fails after a successful charge.
    if (error) return json({ status: 'failed', reason: 'Something went wrong on our side. Please try again.' });
    return json({ status: 'succeeded', balance_pesewas: balance });
  }

  const { data: payment } = await admin.from('payments').select('*').eq('id', body.payment_id ?? '').maybeSingle();
  if (!payment || payment.passenger_id !== user.id) return json({ error: 'not_found' }, 404);
  if (payment.status === 'succeeded') return json({ status: 'succeeded' });
  if (payment.status !== 'pending' || Date.parse(payment.expires_at) <= Date.now()) return json({ status: 'expired' });

  let providerName = 'wallet';
  let providerRef: string | null = null;

  if (method === 'wallet') {
    // Opens the wallet (with the prototype test balance) if this is its first use.
    await userClient(jwt).rpc('my_wallet');
  } else {
    const result = await chargeExternal(method, payment.amount_pesewas, payment.id, body.details ?? {});
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
