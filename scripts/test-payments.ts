/**
 * End-to-end check of booking + payment on the hosted project: a test passenger signs in through
 * auth-otp, holds seats on a throwaway trip, and pays through the deployed `pay` function
 * (mock provider + wallet). Everything it creates is deleted afterwards.
 *
 *   npm run test:payments
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

import type { Database } from '../packages/domain/src/database.types.ts';
import { internalEmailForPhone } from '../packages/domain/src/identity.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
process.loadEnvFile(new URL('../apps/passenger/.env.local', import.meta.url));
const url = process.env.SUPABASE_URL as string;
const publishable = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
const CODE = process.env.TEST_OTP_CODE as string;
const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY as string, { auth: { persistSession: false } });

const PHONE = '+233200000002'; // test-only
let tripId = '';

async function fn(name: string, body: unknown, token?: string) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: publishable, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return (await res.json()) as Record<string, unknown>;
}

async function signIn(): Promise<{ client: SupabaseClient<Database>; token: string }> {
  await admin.from('otp_requests').delete().eq('identifier', PHONE);
  await fn('auth-otp', { action: 'request', channel: 'phone', identifier: PHONE });
  const s = await fn('auth-otp', { action: 'verify', channel: 'phone', identifier: PHONE, code: CODE });
  const client = createClient<Database>(url, publishable, { auth: { persistSession: false } });
  await client.auth.setSession({ access_token: s.access_token as string, refresh_token: s.refresh_token as string });
  return { client, token: s.access_token as string };
}

async function cleanup() {
  if (tripId) {
    const { data: pays } = await admin.from('payments').select('id').eq('trip_id', tripId);
    const ids = (pays ?? []).map((p) => p.id);
    await admin.from('tickets').delete().eq('trip_id', tripId);
    if (ids.length) await admin.from('wallet_transactions').delete().in('payment_id', ids);
    await admin.from('payments').delete().eq('trip_id', tripId);
    await admin.from('trips').delete().eq('id', tripId);
  }
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) if (u.phone === PHONE.slice(1)) await admin.auth.admin.deleteUser(u.id); // cascades wallet/profile
}

let n = 0;
const ok = (name: string) => console.log(`ok ${++n} - ${name}`);

try {
  // Throwaway trip later today on the outbound route.
  const { data: route } = await admin.from('routes').select('id').eq('code', 'ACC-DOD').eq('direction', 'outbound').single();
  const { data: bus } = await admin.from('buses').select('id').eq('plate', 'GLYDE-TEST-01').single();
  const { data: trip } = await admin
    .from('trips')
    .insert({ route_id: route!.id, bus_id: bus!.id, departs_at: new Date(Date.now() + 30 * 60_000).toISOString() })
    .select('id')
    .single();
  tripId = trip!.id;
  const { data: stops } = await admin.from('stops').select('id, name');
  const stop = (name: string) => stops!.find((s) => s.name === name)!.id;

  const { client, token } = await signIn();
  const hold = async (seat: number) => {
    const { data, error } = await client.rpc('hold_seats', {
      p_trip_id: tripId,
      p_pickup_stop_id: stop('Ridge'),
      p_seats: [{ dropoff_stop_id: stop('Madina'), seat_no: seat }],
    });
    if (error) throw new Error(`hold_seats failed: ${error.message}`);
    return data as { payment_id: string; amount_pesewas: number };
  };

  const h1 = await hold(1);
  assert.equal(h1.amount_pesewas, 1500);
  ok('hold priced on the server at the standard GHS 15.00');

  let r = await fn('pay', { payment_id: h1.payment_id, method: 'momo', details: { network: 'mtn', phone: '024 000 0000' } }, token);
  assert.equal(r.status, 'failed');
  ok(`MoMo test number ending 000 is declined ("${r.reason}")`);
  const { data: stillHeld } = await client.from('tickets').select('status').eq('payment_id', h1.payment_id).single();
  assert.equal(stillHeld!.status, 'held');
  ok('after a failure the seat stays held for a retry');

  r = await fn('pay', { payment_id: h1.payment_id, method: 'momo', details: { network: 'mtn', phone: '024 123 4567' } }, token);
  assert.equal(r.status, 'succeeded');
  const { data: t1 } = await client.from('tickets').select('status').eq('payment_id', h1.payment_id).single();
  assert.equal(t1!.status, 'reserved');
  ok('retry with MoMo succeeds and the ticket is reserved');

  const { data: paid } = await client.from('tickets').select('id, ticket_code, qr_token').eq('payment_id', h1.payment_id).single();
  assert.match(paid!.ticket_code, /^GLY-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
  const { data: shareToken, error: shareError } = await client.rpc('share_ticket', { p_ticket_id: paid!.id });
  if (shareError) throw shareError;
  const stranger = createClient<Database>(url, publishable, { auth: { persistSession: false } });
  const { data: shared } = await stranger.rpc('shared_ticket', { p_token: shareToken as string });
  assert.equal((shared as { state: string }).state, 'valid');
  assert.equal((shared as { qr_token: string }).qr_token, paid!.qr_token);
  ok(`paid ticket ${paid!.ticket_code} has a QR, and its share link opens for someone else`);

  // Boarding: the test driver scans it (same call as the conductor scanner and dev:board).
  const driver = createClient<Database>(url, publishable, { auth: { persistSession: false } });
  const { error: driverAuth } = await driver.auth.signInWithPassword({
    email: internalEmailForPhone(process.env.DRIVER_TEST_PHONE as string),
    password: process.env.DRIVER_TEST_PASSWORD as string,
  });
  if (driverAuth) throw driverAuth;
  const scan1 = await driver.rpc('validate_ticket', { p_trip_id: tripId, p_code: `GLYDE1:${paid!.qr_token}` });
  assert.equal((scan1.data as { result: string }).result, 'ok');
  const scan2 = await driver.rpc('validate_ticket', { p_trip_id: tripId, p_code: paid!.ticket_code });
  assert.equal((scan2.data as { result: string }).result, 'already_used');
  // Bus reaches the drop-off (Madina): the ticket completes automatically.
  const { data: madina } = await admin
    .from('route_stops')
    .select('distance_m, stops!inner(name)')
    .eq('route_id', route!.id)
    .eq('stops.name', 'Madina')
    .single();
  await admin.from('bus_positions').upsert({ trip_id: tripId, latitude: 5.68, longitude: -0.17, distance_m: madina!.distance_m });
  const { data: after1 } = await client.from('tickets').select('status').eq('id', paid!.id).single();
  assert.equal(after1!.status, 'completed');
  await admin.from('bus_positions').delete().eq('trip_id', tripId);
  ok('scan boards the ticket, a second scan is refused, reaching the drop-off completes it');

  const h2 = await hold(2);
  r = await fn('pay', { payment_id: h2.payment_id, method: 'card', details: { testOutcome: 'decline' } }, token);
  assert.equal(r.status, 'failed');
  r = await fn('pay', { payment_id: h2.payment_id, method: 'wallet' }, token);
  assert.equal(r.status, 'succeeded');
  const { data: balance } = await client.rpc('my_wallet');
  assert.equal(balance, 10000 - 1500);
  ok('card decline, then a different method (wallet) succeeds and is deducted');

  r = await fn('pay', { action: 'top_up', amount_pesewas: 5000, method: 'momo', details: { network: 'telecel', phone: '050 123 4567' } }, token);
  assert.equal(r.status, 'succeeded');
  assert.equal(r.balance_pesewas, 10000 - 1500 + 5000);
  r = await fn('pay', { action: 'top_up', amount_pesewas: 400, method: 'card', details: {} }, token);
  assert.equal(r.status, 'failed');
  r = await fn('pay', { action: 'top_up', amount_pesewas: 2000, method: 'momo', details: { network: 'mtn', phone: '024 000 0000' } }, token);
  assert.equal(r.status, 'failed');
  r = await fn('pay', { action: 'top_up', amount_pesewas: 2000, method: 'wallet' }, token);
  assert.equal(r.error, 'bad_request');
  const { data: after } = await client.rpc('my_wallet');
  assert.equal(after, 10000 - 1500 + 5000);
  ok('top-up credits the wallet; out-of-range, declined and wallet-to-wallet top-ups are refused');

  const h3 = await hold(3);
  await admin.from('payments').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', h3.payment_id);
  r = await fn('pay', { payment_id: h3.payment_id, method: 'card', details: {} }, token);
  assert.equal(r.status, 'expired');
  ok('an expired hold cannot be paid');

  r = await fn('pay', { payment_id: crypto.randomUUID(), method: 'card', details: {} }, token);
  assert.equal(r.error, 'not_found');
  r = await fn('pay', { payment_id: h2.payment_id, method: 'card', details: {} });
  assert.equal(r.error, 'not_signed_in');
  ok('unknown payments and signed-out calls are refused');

  console.log(`\n${n}/${n} passed`);
} finally {
  await cleanup();
}
