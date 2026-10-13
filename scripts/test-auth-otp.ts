/**
 * End-to-end check of the deployed auth-otp function (mock OTP), calling it exactly as the app
 * does (publishable key). Uses throwaway test identities and deletes them afterwards.
 *
 *   npm run test:auth
 */
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
process.loadEnvFile(new URL('../apps/passenger/.env.local', import.meta.url));
const url = process.env.SUPABASE_URL as string;
const publishable = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY as string, { auth: { persistSession: false } });
const CODE = process.env.TEST_OTP_CODE as string; // same value as the function secret; kept out of git
if (!CODE) throw new Error('TEST_OTP_CODE missing from .env.local');

const PHONE_INPUT = '020 000 0001'; // test-only number
const PHONE = '+233200000001';
const EMAIL = 'otp-check@glyde.invalid';

async function call(body: Record<string, unknown>) {
  const res = await fetch(`${url}/functions/v1/auth-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: publishable },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function cleanup() {
  await admin.from('otp_requests').delete().in('identifier', [PHONE, EMAIL]);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.phone === PHONE.slice(1) || u.email === EMAIL || u.email?.startsWith('phone-233200000001@')) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`ok ${passed} - ${name}`);
}

await cleanup();
try {
  await check('rejects a non-Ghana-mobile number', async () => {
    const r = await call({ action: 'request', channel: 'phone', identifier: '12345' });
    assert.equal(r.body.error, 'invalid_identifier');
  });
  await check('request accepts local format and starts a window', async () => {
    const r = await call({ action: 'request', channel: 'phone', identifier: PHONE_INPUT });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.resendAfterS, 60);
  });
  await check('resend is blocked during the 60s countdown', async () => {
    const r = await call({ action: 'request', channel: 'phone', identifier: PHONE_INPUT });
    assert.equal(r.body.error, 'too_soon');
  });
  await check('wrong code → invalid_code with attempts left', async () => {
    const r = await call({ action: 'verify', channel: 'phone', identifier: PHONE_INPUT, code: '000000' });
    assert.equal(r.body.error, 'invalid_code');
    assert.equal(r.body.attemptsLeft, 4);
  });
  await check('test code signs in a NEW user with the real phone number', async () => {
    const r = await call({ action: 'verify', channel: 'phone', identifier: PHONE_INPUT, code: CODE });
    assert.equal(r.body.new_user, true);
    const client = createClient(url, publishable, { auth: { persistSession: false } });
    const { data, error } = await client.auth.setSession({
      access_token: r.body.access_token as string,
      refresh_token: r.body.refresh_token as string,
    });
    assert.equal(error, null);
    assert.equal(data.user?.phone, PHONE.slice(1));
  });
  await check('a used code window cannot be reused', async () => {
    const r = await call({ action: 'verify', channel: 'phone', identifier: PHONE_INPUT, code: CODE });
    assert.equal(r.body.error, 'expired');
  });
  await check('returning user signs in to the same account', async () => {
    await call({ action: 'request', channel: 'phone', identifier: PHONE });
    const r = await call({ action: 'verify', channel: 'phone', identifier: PHONE, code: CODE });
    assert.equal(r.body.new_user, false);
    assert.ok(r.body.access_token);
  });
  await check('codes expire after 10 minutes', async () => {
    await call({ action: 'request', channel: 'email', identifier: EMAIL });
    await admin
      .from('otp_requests')
      .update({ requested_at: new Date(Date.now() - 11 * 60_000).toISOString() })
      .eq('identifier', EMAIL);
    const r = await call({ action: 'verify', channel: 'email', identifier: EMAIL, code: CODE });
    assert.equal(r.body.error, 'expired');
  });
  await check('5 wrong attempts lock the window', async () => {
    await admin.from('otp_requests').delete().eq('identifier', EMAIL);
    await call({ action: 'request', channel: 'email', identifier: EMAIL });
    for (let i = 0; i < 5; i++) await call({ action: 'verify', channel: 'email', identifier: EMAIL, code: '999999' });
    const r = await call({ action: 'verify', channel: 'email', identifier: EMAIL, code: CODE });
    assert.equal(r.body.error, 'too_many_attempts');
  });
  await check('email channel signs in with the test code', async () => {
    await admin.from('otp_requests').delete().eq('identifier', EMAIL);
    await call({ action: 'request', channel: 'email', identifier: EMAIL });
    const r = await call({ action: 'verify', channel: 'email', identifier: EMAIL, code: CODE });
    assert.ok(r.body.access_token, JSON.stringify(r.body));
  });
  console.log(`\n${passed}/${passed} passed`);
} finally {
  await cleanup();
}
