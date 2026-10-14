/**
 * GPS replay — dev tool that stands in for real buses (CLAUDE.md §4: mocked in the prototype).
 * Drives a trip along its route geometry, dwelling at each stop, and upserts the latest fix into
 * public.bus_positions so Supabase Realtime pushes it to the apps.
 *
 *   npm run gps:replay                           # today's outbound trip nearest to now
 *   npm run gps:replay -- --direction inbound --rate 10
 *   npm run gps:replay -- --trip <uuid> --speed 50 --tick 2 --dwell 20
 *
 * Uses the SECRET key from .env.local (bypasses RLS). Never ship this in an app.
 */
import { createClient } from '@supabase/supabase-js';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import type { Database } from '../packages/domain/src/database.types.ts';

type LatLng = { latitude: number; longitude: number };

const { values: args } = parseArgs({
  options: {
    trip: { type: 'string' },
    direction: { type: 'string', default: 'outbound' },
    speed: { type: 'string', default: '40' }, // km/h while moving
    tick: { type: 'string', default: '2' }, // seconds between fixes (simulated time)
    dwell: { type: 'string', default: '20' }, // seconds stopped at each stop
    rate: { type: 'string', default: '1' }, // simulated seconds per real second (10 = 10× faster)
  },
});
const speedMps = (Number(args.speed) * 1000) / 3600;
const tick = Number(args.tick);
const dwell = Number(args.dwell);
const rate = Number(args.rate);
if (![speedMps, tick, dwell, rate].every((n) => Number.isFinite(n) && n >= 0) || tick === 0 || rate === 0) {
  throw new Error('speed, tick, dwell and rate must be positive numbers');
}
if (args.direction !== 'outbound' && args.direction !== 'inbound') throw new Error('--direction must be outbound or inbound');

process.loadEnvFile(new URL('../.env.local', import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY missing from .env.local');
const db = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// ── Geometry ────────────────────────────────────────────────────────────────
const R = 6_371_000;
const rad = Math.PI / 180;
function metres(a: LatLng, b: LatLng): number {
  const x = (b.longitude - a.longitude) * rad * Math.cos(((a.latitude + b.latitude) / 2) * rad);
  const y = (b.latitude - a.latitude) * rad;
  return Math.hypot(x, y) * R;
}
function bearing(a: LatLng, b: LatLng): number {
  const φ1 = a.latitude * rad;
  const φ2 = b.latitude * rad;
  const Δλ = (b.longitude - a.longitude) * rad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

// ── Load trip, route path and stops ─────────────────────────────────────────
async function findTrip(): Promise<string> {
  if (args.trip) return args.trip;
  const { data: route, error } = await db
    .from('routes')
    .select('id')
    .eq('code', 'ACC-DOD')
    .eq('direction', args.direction as 'outbound' | 'inbound')
    .single();
  if (error) throw error;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0); // Africa/Accra is UTC+0
  const { data: trips, error: e2 } = await db
    .from('trips')
    .select('id, departs_at')
    .eq('route_id', route.id)
    .in('status', ['scheduled', 'active'])
    .gte('departs_at', dayStart.toISOString())
    .lt('departs_at', new Date(dayStart.getTime() + 86_400_000).toISOString());
  if (e2) throw e2;
  if (trips.length) {
    const now = Date.now();
    trips.sort((a, b) => Math.abs(Date.parse(a.departs_at) - now) - Math.abs(Date.parse(b.departs_at) - now));
    return trips[0].id;
  }
  // No trip today (seed is per-day): create one departing now on the first active bus.
  const { data: bus, error: e3 } = await db.from('buses').select('id').eq('status', 'active').limit(1).single();
  if (e3) throw e3;
  const { data: created, error: e4 } = await db
    .from('trips')
    .insert({ route_id: route.id, bus_id: bus.id, departs_at: new Date().toISOString() })
    .select('id')
    .single();
  if (e4) throw e4;
  console.log('No trip today for this direction — created one departing now.');
  return created.id;
}

const tripId = await findTrip();
const { data: trip, error: tripErr } = await db
  .from('trips')
  .select('id, departs_at, route_id, buses(plate), routes(name, length_m)')
  .eq('id', tripId)
  .single();
if (tripErr) throw tripErr;
const { data: pathRow, error: pathErr } = await db.from('route_paths').select('path').eq('route_id', trip.route_id).single();
if (pathErr) throw pathErr;
const { data: stops, error: stopsErr } = await db
  .from('route_stops')
  .select('stop_idx, distance_m, stops(name)')
  .eq('route_id', trip.route_id)
  .order('stop_idx');
if (stopsErr) throw stopsErr;

const path = pathRow.path as LatLng[];
const cumulative = [0];
for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + metres(path[i - 1], path[i]));
const length = cumulative[cumulative.length - 1];

/** Point and heading at `d` metres along the path. */
function at(d: number): LatLng & { heading: number } {
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < d) i++;
  const seg = cumulative[i] - cumulative[i - 1] || 1;
  const t = Math.min(1, Math.max(0, (d - cumulative[i - 1]) / seg));
  const a = path[i - 1];
  const b = path[i];
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
    heading: bearing(a, b),
  };
}

// ── Drive ───────────────────────────────────────────────────────────────────
console.log(
  `Replaying ${trip.routes?.name} on ${trip.buses?.plate} (trip ${tripId})\n` +
    `${(length / 1000).toFixed(1)} km, ${stops.length} stops, ${args.speed} km/h, fix every ${tick}s, ` +
    `${dwell}s dwell, ${rate}× speed. Ctrl-C to stop.`,
);

let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
});

await db.from('trips').update({ status: 'active' }).eq('id', tripId);

// Resume from the bus's last known position (e.g. the replay was restarted at a new speed).
const { data: lastFix } = await db.from('bus_positions').select('distance_m').eq('trip_id', tripId).maybeSingle();
let distance = Math.min(length, lastFix?.distance_m ?? 0);
let nextStop = stops.findIndex((s) => s.distance_m >= distance);
if (nextStop < 0) nextStop = stops.length;
if (distance > 0) console.log(`Resuming at ${(distance / 1000).toFixed(1)} km.`);
// Simulated time follows the real clock (× rate), so slow network writes don't slow the bus.
let lastTick = performance.now();
let ticks = 0;
/** Check the trip is still running every N fixes. */
const STATUS_CHECK_EVERY = 5;
let dwellLeft = 0;
let heading = at(0).heading;

while (!stopped) {
  // Arrive at the next stop?
  if (nextStop < stops.length && distance >= stops[nextStop].distance_m) {
    distance = stops[nextStop].distance_m;
    const s = stops[nextStop];
    const last = nextStop === stops.length - 1;
    console.log(`${new Date().toISOString().slice(11, 19)}  ${last ? 'Arrived at final stop' : 'At stop'} ${s.stop_idx}: ${s.stops?.name}`);
    dwellLeft = last ? 0 : dwell;
    nextStop++;
  }

  const p = at(distance);
  const moving = dwellLeft <= 0;
  if (moving) heading = p.heading; // keep heading while stopped
  const { error } = await db.from('bus_positions').upsert({
    trip_id: tripId,
    latitude: +p.latitude.toFixed(6),
    longitude: +p.longitude.toFixed(6),
    heading: Math.round(heading),
    speed_mps: moving ? +speedMps.toFixed(2) : 0,
    distance_m: Math.round(distance),
    recorded_at: new Date().toISOString(),
  });
  if (error) console.error('upsert failed:', error.message);

  if (distance >= length || nextStop >= stops.length) break;

  // The driver may end the trip early (or it was cancelled): stop driving it.
  if (++ticks % STATUS_CHECK_EVERY === 0) {
    const { data: t } = await db.from('trips').select('status').eq('id', tripId).single();
    if (t?.status !== 'active') {
      console.log(`Trip is ${t?.status ?? 'gone'} — stopping.`);
      process.exit(0);
    }
  }
  const spent = performance.now() - lastTick;
  await sleep(Math.max(0, (tick / rate) * 1000 - spent));
  const now = performance.now();
  const dt = ((now - lastTick) / 1000) * rate; // simulated seconds since the last fix
  lastTick = now;
  if (dwellLeft > 0) dwellLeft -= dt;
  else distance = Math.min(length, distance + speedMps * dt);
}

if (stopped) {
  console.log('\nStopped. Trip left active; re-run to start again from the first stop.');
} else {
  await db.from('trips').update({ status: 'completed' }).eq('id', tripId);
  console.log('Trip completed.');
}
