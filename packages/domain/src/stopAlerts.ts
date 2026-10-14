/**
 * Driver stop alerts (uix-spec 3.2: "Approaching [Stop Name]" / "Arrived at stop").
 * Distances are along the route, from the live position feed. The thresholds are prototype
 * defaults (not in the spec): approaching within 500 m, arrived within 40 m.
 */
export const APPROACH_ALERT_M = 500;
export const ARRIVED_ALERT_M = 40;

export type AlertStop = { stopIdx: number; name: string; distanceM: number };
export type StopAlert = { kind: 'approaching' | 'arrived'; stopIdx: number; name: string };

/** Key used to fire each alert once per stop. */
export const stopAlertKey = (a: StopAlert) => `${a.kind}:${a.stopIdx}`;

/**
 * The alert due at `busM` metres along the route, or null. The departure stop (index 0) never
 * alerts. `fired` holds keys already shown, so each stop alerts at most once per kind.
 */
export function dueStopAlert(busM: number, stops: readonly AlertStop[], fired: ReadonlySet<string>): StopAlert | null {
  const next = stops.find((s) => s.stopIdx > 0 && s.distanceM + ARRIVED_ALERT_M >= busM);
  if (!next) return null;
  const gap = next.distanceM - busM;
  const kind = gap <= ARRIVED_ALERT_M ? 'arrived' : gap <= APPROACH_ALERT_M ? 'approaching' : null;
  if (!kind) return null;
  const alert: StopAlert = { kind, stopIdx: next.stopIdx, name: next.name };
  return fired.has(stopAlertKey(alert)) ? null : alert;
}

/** The first stop the bus hasn't reached yet (null after the last). */
export function nextStop<T extends { stopIdx: number; distanceM: number }>(
  busM: number,
  stops: readonly T[],
): T | null {
  return stops.find((s) => s.distanceM > busM + ARRIVED_ALERT_M) ?? null;
}
