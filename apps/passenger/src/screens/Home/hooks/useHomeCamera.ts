import type { GlydeMapHandle } from '@glyde/ui';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

import type { LocationPermission } from '@/features/location/useLocationPermission';
import { useServiceArea } from '@/features/routes/useServiceArea';

/**
 * Initial framing (once): the user's last known position if location is granted, otherwise the
 * whole service area. Waits for the map to be ready and the permission to be known.
 */
export function useHomeCamera(map: RefObject<GlydeMapHandle | null>, permission: LocationPermission) {
  const serviceArea = useServiceArea();
  const ready = useRef(false);
  const framed = useRef(false);

  const frame = useCallback(async () => {
    if (framed.current || !ready.current || permission === 'unknown') return;
    if (permission === 'granted') {
      const here = await Location.getLastKnownPositionAsync().catch(() => null);
      if (here) {
        framed.current = true;
        map.current?.centreOn({ latitude: here.coords.latitude, longitude: here.coords.longitude });
        return;
      }
    }
    if (serviceArea?.length) {
      framed.current = true;
      map.current?.fitTo(serviceArea);
    }
  }, [map, permission, serviceArea]);

  useEffect(() => {
    void frame();
  }, [frame]);

  const onMapReady = useCallback(() => {
    ready.current = true;
    void frame();
  }, [frame]);

  return { onMapReady };
}
