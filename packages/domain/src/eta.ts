/**
 * Estimates from distance along the route, scaled by the route's OSRM free-flow time.
 * They include neither traffic nor time stopped at stops — the UI labels them as estimates.
 */
export type RouteTiming = { lengthM: number; freeFlowS: number | null };

/** Seconds to drive `fromM` → `toM` along the route. Null if the route has no timing. */
export function travelSeconds(fromM: number, toM: number, route: RouteTiming): number | null {
  if (!route.freeFlowS || route.lengthM <= 0) return null;
  return (Math.max(0, toM - fromM) / route.lengthM) * route.freeFlowS;
}

export type TripProgress = {
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  departsAt: string;
  busDistanceM: number | null;
  busRecordedAt: string | null;
};

/** When the bus should reach the stop at `stopDistanceM` (ms since epoch), or null if unknown. */
export function arrivalAt(trip: TripProgress, stopDistanceM: number, route: RouteTiming): number | null {
  const live = trip.status === 'active' && trip.busDistanceM !== null && trip.busRecordedAt !== null;
  const fromM = live ? (trip.busDistanceM as number) : 0;
  const from = live ? Date.parse(trip.busRecordedAt as string) : Date.parse(trip.departsAt);
  const s = travelSeconds(fromM, stopDistanceM, route);
  return s === null || Number.isNaN(from) ? null : from + s * 1000;
}
