/**
 * Dev helpers standing in for the Bus Owner dashboard (not built yet):
 *
 *   npm run dev:invite                    # new driver invite code from the test fleet owner (48 h)
 *   npm run dev:approve-driver -- 024…    # approve a pending driver by phone (or --reject)
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

import type { Database } from '../packages/domain/src/database.types.ts';
import { normaliseGhanaPhone } from '../packages/domain/src/identity.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
const admin = createClient<Database>(process.env.SUPABASE_URL as string, process.env.SUPABASE_SECRET_KEY as string, {
  auth: { persistSession: false },
});

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { reject: { type: 'boolean', default: false } },
});
const [command, arg] = positionals;

/** The prototype's test fleet owner; owns the GLYDE-TEST buses. */
async function testOwner(): Promise<string> {
  const { data } = await admin.from('bus_owners').select('id').eq('name', 'Glyde Test Fleet').maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await admin.from('bus_owners').insert({ name: 'Glyde Test Fleet' }).select('id').single();
  if (error) throw error;
  await admin.from('buses').update({ owner_id: created.id }).like('plate', 'GLYDE-TEST-%');
  return created.id;
}

if (command === 'invite') {
  const owner = await testOwner();
  const { data, error } = await admin.from('driver_invites').insert({ owner_id: owner }).select('code, expires_at').single();
  if (error) throw error;
  console.log(`Invite code: ${data.code}  (Glyde Test Fleet, expires ${data.expires_at.slice(0, 16).replace('T', ' ')} UTC)`);
} else if (command === 'approve') {
  const phone = normaliseGhanaPhone(arg ?? '');
  if (!phone) throw new Error('Usage: npm run dev:approve-driver -- 024XXXXXXX [--reject]');
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = users.users.find((u) => u.phone === phone.slice(1));
  if (!user) throw new Error(`No account for ${phone}`);
  const status = values.reject ? 'rejected' : 'approved';
  const { data, error } = await admin.from('drivers').update({ status }).eq('id', user.id).select('first_name, last_name, status').single();
  if (error) throw new Error(`No driver profile for ${phone} (finish sign-up first)`);
  console.log(`${data.first_name} ${data.last_name}: ${data.status}`);
} else {
  console.log('Usage: npm run dev:invite | npm run dev:approve-driver -- <phone> [--reject]');
}
