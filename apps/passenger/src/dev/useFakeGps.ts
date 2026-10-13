import { resampleByDistance, type LatLng, type VehicleFix } from '@glyde/ui';
import { useEffect, useMemo, useState } from 'react';

/**
 * FAKE GPS for the dev Gallery only — not the Accra–Dodowa stop list.
 * Resamples `route` into `fixes` evenly spaced points and emits one per `intervalMs`.
 * The bus ping-pongs end to end so it never jumps.
 */
export function useFakeGps(route: LatLng[], fixes: number, intervalMs: number, running: boolean) {
  const samples = useMemo(() => resampleByDistance(route, fixes), [route, fixes]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, running]);

  const last = samples.length - 1;
  const pos = tick % (last * 2);
  const fix: VehicleFix = samples[pos <= last ? pos : last * 2 - pos];
  return { fix };
}
