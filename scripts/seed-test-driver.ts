/**
 * Creates (or refreshes) the prototype's approved test driver (decision 2026-10-14).
 * Phone + password come from .env.local (DRIVER_TEST_PHONE / DRIVER_TEST_PASSWORD); never in git.
 * Real driver sign-up (Ghana Card, licence, invite code, liveness) comes with the owner dashboard.
 *
 *   npm run seed:driver
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../packages/domain/src/database.types.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
const phone = process.env.DRIVER_TEST_PHONE as string;
const password = process.env.DRIVER_TEST_PASSWORD as string;
if (!phone || !password) throw new Error('DRIVER_TEST_PHONE / DRIVER_TEST_PASSWORD missing from .env.local');

const admin = createClient<Database>(process.env.SUPABASE_URL as string, process.env.SUPABASE_SECRET_KEY as string, {
  auth: { persistSession: false },
});

// Same internal address scheme as the auth-otp function, so one person = one account.
const email = `phone-${phone.slice(1)}@users.glyde.invalid`;

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users.find((u) => u.email === email);
if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    phone,
    phone_confirm: true,
    password,
    user_metadata: { signup_channel: 'seed', role: 'driver' },
  });
  if (error) throw error;
  user = data.user;
}

// The test fleet owner (stands in for the Bus Owner dashboard) owns the GLYDE-TEST buses.
let { data: owner } = await admin.from('bus_owners').select('id').eq('name', 'Glyde Test Fleet').maybeSingle();
if (!owner) {
  ({ data: owner } = await admin.from('bus_owners').insert({ name: 'Glyde Test Fleet' }).select('id').single());
  await admin.from('buses').update({ owner_id: owner!.id }).like('plate', 'GLYDE-TEST-%');
}
const now = new Date().toISOString();
const { error } = await admin.from('drivers').upsert({
  id: user!.id,
  first_name: 'Kwame',
  last_name: 'Test',
  status: 'approved',
  owner_id: owner!.id,
  // Already onboarded, so the test driver goes straight to the dashboard.
  terms_accepted_at: now,
  terms_version: 'placeholder-2026-10-14',
  onboarded_at: now,
});
if (error) throw error;
console.log(`Test driver ready: ${phone} (approved) — password in .env.local as DRIVER_TEST_PASSWORD`);
