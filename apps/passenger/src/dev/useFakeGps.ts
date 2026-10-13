import { useEffect, useMemo, useState } from 'react';

import type { LatLng, VehicleFix } from '@glyde/ui';

/**
 * FAKE GPS for the dev Gallery only — not a real route and not the Accra–Dodowa stop list.
 * A straight line split into `steps` points; the bus ping-pongs end to end so it never jumps.
 */
export function useFakeGps(from: LatLng, to: LatLng, steps: number, intervalMs: number, running: boolean) {
  const path = useMemo(
    () =>
      Array.from({ length: steps + 1 }, (_, i) => ({
        latitude: from.latitude + ((to.latitude - from.latitude) * i) / steps,
        longitude: from.longitude + ((to.longitude - from.longitude) * i) / steps,
      })),
    [from.latitude, from.longitude, to.latitude, to.longitude, steps],
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, running]);

  const cycle = steps * 2;
  const pos = tick % cycle;
  const index = pos <= steps ? pos : cycle - pos;
  const fix: VehicleFix = path[index];
  return { fix, path };
}
