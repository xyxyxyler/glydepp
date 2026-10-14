/**
 * End-to-end checks of the Driver app's backend calls against the hosted project, made exactly as
 * the app makes them (publishable key, signed-in driver):
 *   sign-up with an invite → pending → terms/onboarded → approved → SOS; test driver's
 *   timeline / demand / history / alerts / scanner fallback. Cleans up the throwaway driver.
 *
 *   npm run test:driver
 */
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

import type { Database } from '../packages/domain/src/database.types.ts';
import { internalEmailForPhone } from '../packages/domain/src/identity.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
process.loadEnvFile(new URL('../apps/driver/.env.local', import.meta.url));
const url = process.env.SUPABASE_URL as string;
const publishable = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY as string, { auth: { persistSession: false } });
const client = () => createClient<Database>(url, publishable, { auth: { persistSession: false } });

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`✔ ${name}`);
}

// ─── Sign-up with an invite code (uix-spec 3.1 / 4.4) ───────────────────────
const phone = `+23320${String(Date.now()).slice(-7)}`;
const password = `Test-${crypto.randomUUID()}`;
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: internalEmailForPhone(phone),
  password,
  email_confirm: true,
});
if (createError) throw createError;
const uid = created.user.id;
const owner = (await admin.from('bus_owners').select('id').eq('name', 'Glyde Test Fleet').single()).data?.id as string;
const invite = (await admin.from('driver_invites').insert({ owner_id: owner }).select('code').single()).data?.code as string;
const newDriver = client();
await newDriver.auth.signInWithPassword({ email: internalEmailForPhone(phone), password });

const signup = (code: string) =>
  newDriver.rpc('complete_driver_signup', {
    p_first_name: 'Test',
    p_last_name: 'Driver',
    p_date_of_birth: '1990-08-12',
    p_residential_area: 'Adenta',
    p_ghana_card_number: 'GHA-123456789-0',
    p_licence_number: 'DL-TEST-1',
    p_invite_code: code,
    p_photo_path: `${uid}/profile.jpg`,
  });

try {
  await check('photo uploads to own folder only', async () => {
    const own = await newDriver.storage.from('driver-photos').upload(`${uid}/profile.jpg`, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg', upsert: true });
    assert.equal(own.error, null);
    const other = await newDriver.storage.from('driver-photos').upload(`${crypto.randomUUID()}/x.jpg`, new Uint8Array([1]), { contentType: 'image/jpeg' });
    assert.notEqual(other.error, null);
  });
  await check('bad invite code is rejected', async () => {
    const { error } = await signup('NOTACODE');
    assert.match(error?.message ?? '', /invalid_invite/);
  });
  await check('sign-up → Pending Approval, linked to the owner', async () => {
    const { error } = await signup(invite);
    assert.equal(error, null);
    const { data } = await newDriver.from('drivers').select('status, owner_id').eq('id', uid).single();
    assert.deepEqual(data, { status: 'pending', owner_id: owner });
  });
  await check('invite code is single-use', async () => {
    const { error } = await signup(invite);
    assert.match(error?.message ?? '', /already_registered|used_invite/);
  });
  await check('pending driver cannot start a trip or send SOS', async () => {
    const { error } = await newDriver.rpc('driver_sos', { p_description: 'test' });
    assert.match(error?.message ?? '', /not_approved/);
  });
  await check('terms + onboarding + voice setting saved', async () => {
    await newDriver.rpc('driver_update_self', { p_terms_version: '1', p_onboarded: true, p_voice_alerts: false });
    const { data } = await newDriver.from('drivers').select('terms_version, onboarded_at, voice_alerts').eq('id', uid).single();
    assert.equal(data?.terms_version, '1');
    assert.ok(data?.onboarded_at);
    assert.equal(data?.voice_alerts, false);
  });
  await check('approved driver SOS → HQ alert + confirmation in the inbox', async () => {
    await admin.from('drivers').update({ status: 'approved' }).eq('id', uid);
    const { data: id, error } = await newDriver.rpc('driver_sos', { p_description: 'Engine overheating (test)' });
    assert.equal(error, null);
    const { data: sos } = await admin.from('sos_alerts').select('priority, status').eq('id', id as string).single();
    assert.deepEqual(sos, { priority: 'high', status: 'open' });
    const { data: inbox } = await newDriver.from('driver_alerts').select('title').eq('driver_id', uid);
    assert.ok(inbox?.some((a) => a.title === 'SOS sent to HQ'));
  });
} finally {
  await admin.from('sos_alerts').delete().eq('driver_id', uid);
  await admin.from('driver_alerts').delete().eq('driver_id', uid);
  await admin.from('driver_invites').delete().eq('code', invite);
  await admin.from('drivers').delete().eq('id', uid);
  await admin.storage.from('driver-photos').remove([`${uid}/profile.jpg`]);
  await admin.auth.admin.deleteUser(uid);
}

// ─── The seeded test driver's dashboard calls (uix-spec 3.2–3.4) ────────────
const driver = client();
const { error: authError } = await driver.auth.signInWithPassword({
  email: internalEmailForPhone(process.env.DRIVER_TEST_PHONE as string),
  password: process.env.DRIVER_TEST_PASSWORD as string,
});
if (authError) throw new Error(`Test driver sign-in failed (npm run seed:driver?): ${authError.message}`);

await check('demand + history load', async () => {
  const demand = await driver.rpc('driver_demand');
  assert.equal(demand.error, null);
  const history = await driver.rpc('driver_history');
  assert.equal(history.error, null);
  assert.ok(Array.isArray(history.data));
});
await check('timeline: own trip only, every stop in order', async () => {
  const { data: trip } = await admin.from('trips').select('id, route_id').limit(1).single();
  const other = await driver.rpc('driver_trip_timeline', { p_trip_id: trip?.id as string });
  const { data: mine } = await driver.rpc('driver_current_trip');
  if (mine) {
    const { data, error } = await driver.rpc('driver_trip_timeline', { p_trip_id: (mine as { trip_id: string }).trip_id });
    assert.equal(error, null);
    assert.ok(data && data.length > 1 && data.every((s, i) => s.stop_idx === i));
  } else {
    assert.match(other.error?.message ?? '', /not_your_trip/);
  }
});
await check('scanner: unknown Ticket ID → not_found (no override possible)', async () => {
  const { data: mine } = await driver.rpc('driver_current_trip');
  if (!mine) return;
  const { data } = await driver.rpc('validate_ticket', { p_trip_id: (mine as { trip_id: string }).trip_id, p_code: 'GLY-ZZZZZZ' });
  assert.equal((data as { result: string }).result, 'not_found');
});

console.log(`\n${passed} driver checks passed`);
