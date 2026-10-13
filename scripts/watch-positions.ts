/**
 * Dev check: subscribe to bus_positions over Supabase Realtime using the PUBLISHABLE key —
 * exactly what the apps will do — and print each fix.
 *
 *   npm run gps:watch            # until Ctrl-C
 *   npm run gps:watch -- --count 5
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

import type { Database } from '../packages/domain/src/database.types.ts';

const { values } = parseArgs({ options: { count: { type: 'string' } } });
const limit = values.count ? Number(values.count) : Infinity;

process.loadEnvFile(new URL('../apps/passenger/.env.local', import.meta.url));
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY missing from apps/passenger/.env.local');

const db = createClient<Database>(url, key);
let seen = 0;
const channel = db
  .channel('bus-positions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_positions' }, (msg) => {
    const p = msg.new as Database['public']['Tables']['bus_positions']['Row'];
    console.log(`${p.recorded_at.slice(11, 19)}  ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}  ${p.distance_m} m  hdg ${p.heading}`);
    if (++seen >= limit) void channel.unsubscribe().then(() => process.exit(0));
  })
  .subscribe((status) => console.log(`realtime: ${status}`));
