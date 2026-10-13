/**
 * One-off: fetch the Accra–Dodowa road geometry from the public OSRM demo server
 * (OpenStreetMap data, ODbL), snap the approved stops onto it, and write
 * supabase/data/accra-dodowa.json. Re-run only if the stop list changes.
 *
 *   node scripts/fetch-route.ts
 */
import { writeFileSync } from 'node:fs';

type LatLng = { latitude: number; longitude: number };

// Approved 2026-10-13. Coordinates are approximate source points (OSM bus stops / places);
// they are snapped onto the road line below. Ground-truth before launch.
const STOPS: { name: string; at: LatLng }[] = [
  { name: 'Ministries', at: { latitude: 5.55164, longitude: -0.19892 } },
  { name: 'Ridge', at: { latitude: 5.5605, longitude: -0.19663 } },
  { name: '37', at: { latitude: 5.5869, longitude: -0.185 } },
  { name: 'Airport City', at: { latitude: 5.601766, longitude: -0.17847 } },
  { name: 'Shiashie', at: { latitude: 5.6289, longitude: -0.1697 } },
  { name: 'Legon', at: { latitude: 5.6407, longitude: -0.17903 } },
  { name: 'Atomic Junction', at: { latitude: 5.66702, longitude: -0.17716 } },
  { name: 'Madina', at: { latitude: 5.686359, longitude: -0.171378 } },
  { name: 'Adenta', at: { latitude: 5.70872, longitude: -0.17062 } },
  { name: 'Ashiyie', at: { latitude: 5.742189, longitude: -0.153638 } },
  { name: 'Amrahia', at: { latitude: 5.765851, longitude: -0.142857 } },
  { name: 'Malejor', at: { latitude: 5.791335, longitude: -0.129887 } },
  { name: 'Oyibi', at: { latitude: 5.814578, longitude: -0.121887 } },
  { name: 'Mensah Bar', at: { latitude: 5.841318, longitude: -0.115641 } },
  { name: 'Dodowa', at: { latitude: 5.88, longitude: -0.1047 } },
];

// Via points that keep OSRM on Independence Ave → Liberation Rd → N4 → R40
// (without them the fastest route uses the N1 motorway).
const VIA: [number, number][] = [
  [-0.19892, 5.55164],
  [-0.19663, 5.5605],
  [-0.185, 5.5869],
  [-0.17668, 5.63055],
  [-0.17279, 5.67914],
  [-0.17062, 5.70872],
  [-0.13652, 5.77803],
  [-0.1047, 5.88],
];

const R = 6_371_000;
const rad = Math.PI / 180;
function metres(a: LatLng, b: LatLng): number {
  const x = (b.longitude - a.longitude) * rad * Math.cos(((a.latitude + b.latitude) / 2) * rad);
  const y = (b.latitude - a.latitude) * rad;
  return Math.hypot(x, y) * R;
}

const url =
  'https://router.project-osrm.org/route/v1/driving/' +
  VIA.map(([lng, lat]) => `${lng},${lat}`).join(';') +
  '?overview=full&geometries=geojson';
const res = await fetch(url);
const body = (await res.json()) as { code: string; routes: { distance: number; geometry: { coordinates: [number, number][] } }[] };
if (body.code !== 'Ok') throw new Error(`OSRM: ${body.code}`);

const path: LatLng[] = body.routes[0].geometry.coordinates.map(([lng, lat]) => ({
  latitude: +lat.toFixed(6),
  longitude: +lng.toFixed(6),
}));
const cumulative = [0];
for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + metres(path[i - 1], path[i]));

const stops = STOPS.map(({ name, at }, idx) => {
  let best = Infinity;
  let bi = 0;
  path.forEach((p, i) => {
    const d = metres(p, at);
    if (d < best) [best, bi] = [d, i];
  });
  return { idx, name, ...path[bi], distance_m: Math.round(cumulative[bi]), snapped_from_m: Math.round(best) };
});

stops.forEach((s, i) => {
  if (i > 0 && s.distance_m <= stops[i - 1].distance_m) throw new Error(`Stop order broken at ${s.name}`);
});

const out = {
  _source:
    'Road geometry: OSRM demo server (router.project-osrm.org), OpenStreetMap data © OpenStreetMap contributors, ODbL. ' +
    `Fetched ${new Date().toISOString().slice(0, 10)}. Stop list approved by Glyde 2026-10-13; coordinates need ground-truthing.`,
  route: { code: 'ACC-DOD', name: 'Accra – Dodowa', length_m: Math.round(cumulative[cumulative.length - 1]) },
  stops,
  path,
};
const file = new URL('../supabase/data/accra-dodowa.json', import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote ${stops.length} stops, ${path.length} path points, ${(out.route.length_m / 1000).toFixed(1)} km`);
for (const s of stops) console.log(`${String(s.idx).padStart(2)} ${(s.distance_m / 1000).toFixed(1).padStart(5)} km  ${s.name}`);
