/** Map-library-agnostic geometry. Screens use these types, never react-native-maps types. */

export type LatLng = { latitude: number; longitude: number };

/** Heading delta in (-180, 180]: the shortest arc from `from` to `to`, in degrees. */
export function shortestArcDelta(from: number, to: number): number {
  'worklet';
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng): number {
  'worklet';
  const toRad = Math.PI / 180;
  const φ1 = a.latitude * toRad;
  const φ2 = b.latitude * toRad;
  const Δλ = (b.longitude - a.longitude) * toRad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) / toRad) + 360) % 360;
}

/** Linear interpolation between two coordinates. Fine at city scale (< a few km per tick). */
export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  'worklet';
  return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
}

function planarDistance(a: LatLng, b: LatLng): number {
  // Equirectangular approximation — only used for proportions along one route.
  const k = Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  return Math.hypot(b.latitude - a.latitude, (b.longitude - a.longitude) * k);
}

/**
 * The first `fraction` (0..1) of a polyline by length, ending on an interpolated point.
 * Used by RouteLine's draw-on effect.
 */
export function slicePolyline(points: LatLng[], fraction: number): LatLng[] {
  if (points.length < 2 || fraction >= 1) return points;
  if (fraction <= 0) return points.slice(0, 1);
  const lengths = points.slice(1).map((p, i) => planarDistance(points[i], p));
  let remaining = lengths.reduce((s, l) => s + l, 0) * fraction;
  const out: LatLng[] = [points[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      out.push(lerpLatLng(points[i], points[i + 1], lengths[i] === 0 ? 1 : remaining / lengths[i]));
      return out;
    }
    remaining -= lengths[i];
    out.push(points[i + 1]);
  }
  return out;
}
