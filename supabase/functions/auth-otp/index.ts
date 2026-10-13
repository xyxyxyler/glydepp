// auth-otp — MOCK one-time-code sign-in for the prototype (CLAUDE.md §4).
// No SMS or email is ever sent: the only valid code is the TEST_OTP_CODE secret.
// PROTOTYPE ONLY — anyone who knows the test code can sign in as any number/email.
// Replace with Supabase's native phone/email OTP before launch.
//
// POST { action: 'request', channel: 'phone' | 'email', identifier }
//   → { ok: true, resendAfterS, expiresInS }
// POST { action: 'verify', channel, identifier, code }
//   → { access_token, refresh_token } | { error: 'invalid_code' | 'expired' | 'too_many_attempts' | ... }
import { createClient } from 'npm:@supabase/supabase-js@2';

const CODE_TTL_S = 600; // 10 minutes
const RESEND_AFTER_S = 60; // uix-spec 2.1: resend after a 60-second countdown
const MAX_ATTEMPTS = 5;

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const testCode = Deno.env.get('TEST_OTP_CODE');

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

type Channel = 'phone' | 'email';

/** Ghana mobile → E.164 (+233 + 9 digits starting 2 or 5). Mirrors packages/domain identity.ts. */
function normalisePhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, '');
  if (digits.startsWith('233')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^[25]\d{8}$/.test(digits) ? `+233${digits}` : null;
}
function normaliseEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Phone accounts get an internal address on the reserved .invalid TLD (never deliverable). */
const internalEmailFor = (phone: string) => `phone-${phone.slice(1)}@users.glyde.invalid`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!testCode) return json({ error: 'server_misconfigured' }, 500);

  let body: { action?: string; channel?: Channel; identifier?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const channel = body.channel;
  if (channel !== 'phone' && channel !== 'email') return json({ error: 'bad_request' }, 400);
  const identifier =
    channel === 'phone' ? normalisePhone(body.identifier ?? '') : normaliseEmail(body.identifier ?? '');
  if (!identifier) return json({ error: 'invalid_identifier' }, 400);

  // ── request: start (or restart) a code window ───────────────────────────────
  if (body.action === 'request') {
    const { data: existing } = await admin.from('otp_requests').select('requested_at').eq('identifier', identifier).maybeSingle();
    if (existing) {
      const ageS = (Date.now() - Date.parse(existing.requested_at)) / 1000;
      if (ageS < RESEND_AFTER_S) return json({ error: 'too_soon', retryAfterS: Math.ceil(RESEND_AFTER_S - ageS) }, 429);
    }
    const { error } = await admin
      .from('otp_requests')
      .upsert({ identifier, channel, requested_at: new Date().toISOString(), attempts: 0 });
    if (error) return json({ error: 'server' }, 500);
    return json({ ok: true, resendAfterS: RESEND_AFTER_S, expiresInS: CODE_TTL_S });
  }

  // ── verify: check the code, then sign in (creating the account if new) ─────
  if (body.action === 'verify') {
    const { data: request } = await admin.from('otp_requests').select('*').eq('identifier', identifier).maybeSingle();
    if (!request || Date.now() - Date.parse(request.requested_at) > CODE_TTL_S * 1000) {
      return json({ error: 'expired' }, 400);
    }
    if (request.attempts >= MAX_ATTEMPTS) return json({ error: 'too_many_attempts' }, 400);
    if ((body.code ?? '').trim() !== testCode) {
      await admin.from('otp_requests').update({ attempts: request.attempts + 1 }).eq('identifier', identifier);
      return json({ error: 'invalid_code', attemptsLeft: MAX_ATTEMPTS - request.attempts - 1 }, 400);
    }

    const email = channel === 'phone' ? internalEmailFor(identifier) : identifier;
    // Create on first sign-in; "already registered" just means a returning user.
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      ...(channel === 'phone' ? { phone: identifier, phone_confirm: true } : {}),
      user_metadata: { signup_channel: channel },
    });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) {
      return json({ error: 'server', detail: created.error.message }, 500);
    }

    // Mint a one-time token server-side and exchange it for a session (nothing is emailed).
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) return json({ error: 'server', detail: link.error?.message }, 500);
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
    if (error || !data.session) return json({ error: 'server', detail: error?.message }, 500);

    await admin.from('otp_requests').delete().eq('identifier', identifier);
    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      new_user: !created.error,
    });
  }

  return json({ error: 'bad_request' }, 400);
});
