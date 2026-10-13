import { nearest } from '@glyde/domain';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Stop } from '@/features/network/useNetwork';

import type { LocationPermission } from './useLocationPermission';

export type NearestStop = { stop: Stop; walkM: number };

/** The stop closest to the device (straight line), for the 'Current location' pickup default. */
export function useNearestStop(stops: Stop[] | null, permission: LocationPermission): NearestStop | null {
  const [result, setResult] = useState<NearestStop | null>(null);
  useEffect(() => {
    if (!stops?.length || permission !== 'granted') return;
    let cancelled = false;
    void Location.getLastKnownPositionAsync()
      .then((pos) => pos ?? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
      .then((pos) => {
        if (cancelled || !pos) return;
        const n = nearest({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, stops);
        if (n) setResult({ stop: n.item, walkM: n.distanceM });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [stops, permission]);
  return permission === 'granted' ? result : null;
}
