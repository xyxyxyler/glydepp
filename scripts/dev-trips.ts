/**
 * Dev helper: create test trips departing soon (both directions) so the app has something to
 * book outside the seeded 06:00–17:30 schedule. Optionally pass minutes from now (default 15).
 *
 *   npm run dev:trips            # departs in 15 min
 *   npm run dev:trips -- 5
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../packages/domain/src/database.types.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
const db = createClient<Database>(process.env.SUPABASE_URL as string, process.env.SUPABASE_SECRET_KEY as string, {
  auth: { persistSession: false },
});

const minutes = Number(process.argv[2] ?? 15);
const departsAt = new Date(Date.now() + minutes * 60_000);
departsAt.setUTCSeconds(0, 0);

const { data: routes, error } = await db.from('routes').select('id, direction').eq('code', 'ACC-DOD');
if (error) throw error;
const { data: buses } = await db.from('buses').select('id, plate').in('plate', ['GLYDE-TEST-01', 'GLYDE-TEST-02']).order('plate');

for (const [i, direction] of (['outbound', 'inbound'] as const).entries()) {
  const route = routes.find((r) => r.direction === direction)!;
  const bus = buses![i];
  const { data, error: e } = await db
    .from('trips')
    .insert({ route_id: route.id, bus_id: bus.id, departs_at: departsAt.toISOString() })
    .select('id')
    .single();
  if (e) throw e;
  console.log(`${direction.padEnd(8)} ${bus.plate}  departs ${departsAt.toISOString().slice(11, 16)} (Accra)  trip ${data.id}`);
}
