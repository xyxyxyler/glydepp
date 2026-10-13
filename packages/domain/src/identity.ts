/**
 * Sign-up identifiers (uix-spec 2.1). Ghana mobile numbers only for now (decision 2026-10-14).
 * Mirrored in supabase/functions/auth-otp — keep the rules identical.
 */

/** Ghana mobile → E.164: +233 followed by 9 digits starting 2 or 5. Accepts 024…, 24…, +233 24…. */
export function normaliseGhanaPhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, '');
  if (digits.startsWith('233')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^[25]\d{8}$/.test(digits) ? `+233${digits}` : null;
}

/** "+233241234567" → "024 123 4567" (how Ghanaians write their numbers). */
export function formatGhanaPhone(e164: string): string {
  const d = e164.replace(/^\+233/, '0');
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : e164;
}

export function normaliseEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export const OTP_LENGTH = 6;

/**
 * Internal sign-in address for phone accounts (the reserved .invalid TLD — never deliverable).
 * Same scheme as supabase/functions/auth-otp and scripts/seed-test-driver.ts: keep identical.
 */
export function internalEmailForPhone(e164: string): string {
  return `phone-${e164.replace(/^\+/, '')}@users.glyde.invalid`;
}
