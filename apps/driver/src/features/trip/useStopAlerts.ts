import { dueStopAlert, stopAlertKey, type StopAlert } from '@glyde/domain';
import { hapticFor } from '@glyde/ui';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';

import type { TimelineStop } from './useTripTimeline';

/**
 * uix-spec 3.2: approaching / arriving at a stop shows a modal with a system voice alert —
 * "Approaching [Stop Name]" and "Arrived at stop" (DESIGN.md §10 haptics). Each fires once per
 * stop. Voice follows the driver's Settings.
 */
export function useStopAlerts(
  tripId: string | null,
  busM: number | null,
  stops: TimelineStop[] | null,
  voice: boolean,
): { alert: StopAlert | null; dismiss: () => void } {
  const fired = useRef<{ tripId: string | null; keys: Set<string> }>({ tripId: null, keys: new Set() });
  const [alert, setAlert] = useState<StopAlert | null>(null);

  useEffect(() => {
    if (!tripId || busM === null || !stops) return;
    if (fired.current.tripId !== tripId) {
      // Stops already passed when the screen opens don't alert.
      const keys = new Set<string>();
      for (const s of stops) {
        if (s.distanceM < busM) {
          keys.add(`approaching:${s.stopIdx}`);
          keys.add(`arrived:${s.stopIdx}`);
        }
      }
      fired.current = { tripId, keys };
    }
    const due = dueStopAlert(
      busM,
      stops.map((s) => ({ stopIdx: s.stopIdx, name: s.name, distanceM: s.distanceM })),
      fired.current.keys,
    );
    if (!due) return;
    fired.current.keys.add(stopAlertKey(due));
    if (due.kind === 'arrived') fired.current.keys.add(`approaching:${due.stopIdx}`);
    hapticFor(due.kind === 'arrived' ? 'arrived' : 'approaching');
    if (voice) {
      Speech.stop();
      Speech.speak(due.kind === 'arrived' ? 'Arrived at stop' : `Approaching ${due.name}`, { language: 'en-GB' });
    }
    // Showing the alert is the point of this effect (an external event: the bus moved).
    setAlert(due);
  }, [tripId, busM, stops, voice]);

  useEffect(() => () => void Speech.stop(), []);

  return { alert: alert && tripId ? alert : null, dismiss: () => setAlert(null) };
}
