export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000;
const rad = Math.PI / 180;

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dφ = (b.latitude - a.latitude) * rad;
  const dλ = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Closest item to `point` (straight line). Null for an empty list. */
export function nearest<T extends LatLng>(point: LatLng, items: readonly T[]): { item: T; distanceM: number } | null {
  let best: { item: T; distanceM: number } | null = null;
  for (const item of items) {
    const d = haversineM(point, item);
    if (!best || d < best.distanceM) best = { item, distanceM: d };
  }
  return best;
}
