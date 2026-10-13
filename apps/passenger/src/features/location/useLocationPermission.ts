import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

/**
 * Reads (never requests — that's the Permissions screen's job) the foreground location
 * permission, and re-checks when the app returns from Settings.
 */
export function useLocationPermission() {
  const [permission, setPermission] = useState<LocationPermission>('unknown');

  useEffect(() => {
    const check = () =>
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => setPermission(status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied'))
        .catch(() => setPermission('denied'));
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, []);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { permission, openSettings };
}
