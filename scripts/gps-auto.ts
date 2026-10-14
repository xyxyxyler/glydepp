/**
 * Prototype GPS for every running trip (CLAUDE.md §4: real bus GPS is mocked by replay).
 * Watches for trips a driver has started and drives each along its route with gps-replay, so
 * passengers see the bus move as soon as the driver taps Start Trip. Ctrl-C stops everything.
 *
 *   npm run gps:auto                 # real speed
 *   npm run gps:auto -- --rate 5     # 5× faster (demo)
 */
import { createClient } from '@supabase/supabase-js';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import type { Database } from '../packages/domain/src/database.types.ts';

const { values } = parseArgs({ options: { rate: { type: 'string', default: '1' } } });
process.loadEnvFile(new URL('../.env.local', import.meta.url));
const db = createClient<Database>(process.env.SUPABASE_URL as string, process.env.SUPABASE_SECRET_KEY as string, {
  auth: { persistSession: false },
});

const POLL_MS = 5_000;
const running = new Map<string, ChildProcess>();
const replay = new URL('./gps-replay.ts', import.meta.url).pathname;

process.on('SIGINT', () => {
  for (const child of running.values()) child.kill('SIGINT');
  process.exit(0);
});

console.log(`Watching for running trips (replay at ${values.rate}×). Ctrl-C to stop.`);
for (;;) {
  const { data: trips, error } = await db.from('trips').select('id, buses(plate), routes(name)').eq('status', 'active');
  if (error) console.error('poll failed:', error.message);
  for (const t of trips ?? []) {
    if (running.has(t.id)) continue;
    console.log(`▶ ${t.buses?.plate} · ${t.routes?.name} (trip ${t.id})`);
    const child = spawn(process.execPath, [replay, '--trip', t.id, '--rate', values.rate as string], { stdio: 'inherit' });
    running.set(t.id, child);
    child.on('exit', () => {
      running.delete(t.id);
      console.log(`■ trip ${t.id} finished`);
    });
  }
  await sleep(POLL_MS);
}
