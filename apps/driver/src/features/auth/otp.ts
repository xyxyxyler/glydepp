import { functionsUrl, publishableKey, supabase } from '@/lib/supabase';

export type OtpChannel = 'phone' | 'email';
export type OtpError =
  | 'invalid_identifier'
  | 'too_soon'
  | 'invalid_code'
  | 'expired'
  | 'too_many_attempts'
  | 'email_in_use'
  | 'network'
  | 'server';

type Result<T> = { ok: true; value: T } | { ok: false; error: OtpError; retryAfterS?: number; attemptsLeft?: number };

async function call(
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  try {
    const res = await fetch(`${functionsUrl}/auth-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  } catch {
    return null;
  }
}

function failure(body: Record<string, unknown>): Result<never> {
  const known: OtpError[] = [
    'invalid_identifier',
    'too_soon',
    'invalid_code',
    'expired',
    'too_many_attempts',
    'email_in_use',
  ];
  const error = known.includes(body.error as OtpError) ? (body.error as OtpError) : 'server';
  return {
    ok: false,
    error,
    retryAfterS: typeof body.retryAfterS === 'number' ? body.retryAfterS : undefined,
    attemptsLeft: typeof body.attemptsLeft === 'number' ? body.attemptsLeft : undefined,
  };
}

/** Ask for a code (mocked: nothing is sent; the test code is fixed — CLAUDE.md §4). */
export async function requestCode(channel: OtpChannel, identifier: string): Promise<Result<{ resendAfterS: number }>> {
  const r = await call({ action: 'request', channel, identifier });
  if (!r) return { ok: false, error: 'network' };
  if (r.body.ok) return { ok: true, value: { resendAfterS: Number(r.body.resendAfterS) || 60 } };
  return failure(r.body);
}

/** Check the code; on success the passenger is signed in on this device. */
export async function verifyCode(
  channel: OtpChannel,
  identifier: string,
  code: string,
): Promise<Result<{ newUser: boolean }>> {
  const r = await call({ action: 'verify', channel, identifier, code });
  if (!r) return { ok: false, error: 'network' };
  if (typeof r.body.access_token !== 'string' || typeof r.body.refresh_token !== 'string') return failure(r.body);
  const { error } = await supabase.auth.setSession({
    access_token: r.body.access_token,
    refresh_token: r.body.refresh_token,
  });
  if (error) return { ok: false, error: 'server' };
  return { ok: true, value: { newUser: r.body.new_user === true } };
}

/** Attach a verified email to the signed-in account (Account → Verification). */
export async function linkEmail(email: string, code: string): Promise<Result<{ email: string }>> {
  const { data } = await supabase.auth.getSession();
  const r = await call({ action: 'link_email', channel: 'email', identifier: email, code }, data.session?.access_token);
  if (!r) return { ok: false, error: 'network' };
  if (r.body.ok) return { ok: true, value: { email } };
  return failure(r.body);
}

/** Plain-language messages (DESIGN.md §11: never a raw error code). */
export function otpErrorMessage(e: OtpError, extra?: { retryAfterS?: number; attemptsLeft?: number }): string {
  switch (e) {
    case 'invalid_identifier':
      return 'Check the number or email and try again.';
    case 'too_soon':
      return `Please wait ${extra?.retryAfterS ?? 60}s before asking for another code.`;
    case 'invalid_code':
      return extra?.attemptsLeft !== undefined && extra.attemptsLeft <= 2
        ? `That code isn’t right. ${extra.attemptsLeft} ${extra.attemptsLeft === 1 ? 'try' : 'tries'} left.`
        : 'That code isn’t right. Check it and try again.';
    case 'expired':
      return 'This code has expired. Tap Resend Code to get a new one.';
    case 'too_many_attempts':
      return 'Too many wrong tries. Tap Resend Code to get a new one.';
    case 'email_in_use':
      return 'That email is already used by another Glyde account.';
    case 'network':
      return 'You’re offline. Check your connection and try again.';
    default:
      return 'Something went wrong on our side. Please try again.';
  }
}
