import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

/** 'blocked' = refused and the OS won't show the prompt again: only Settings can change it. */
export type PermissionStatus = 'unknown' | 'undetermined' | 'granted' | 'blocked';

type Raw = { granted: boolean; canAskAgain: boolean };
// Not granted but the OS can still prompt → we can ask; otherwise only Settings can change it.
const toStatus = (p: Raw): PermissionStatus => (p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'blocked');

/**
 * Notification + location permission state for onboarding (uix-spec 2.1). Requests use the
 * native OS prompt; status is re-read when the app returns from Settings.
 * Push tokens / FCM are NOT registered here (needs a development build).
 */
export function usePermissions() {
  const [notifications, setNotifications] = useState<PermissionStatus>('unknown');
  const [location, setLocation] = useState<PermissionStatus>('unknown');

  useEffect(() => {
    const read = () => {
      Notifications.getPermissionsAsync()
        .then((p) => setNotifications(toStatus(p)))
        .catch(() => setNotifications('undetermined'));
      Location.getForegroundPermissionsAsync()
        .then((p) => setLocation(toStatus(p)))
        .catch(() => setLocation('undetermined'));
    };
    read();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') read();
    });
    return () => sub.remove();
  }, []);

  const requestNotifications = useCallback(async () => {
    const p = await Notifications.requestPermissionsAsync().catch(() => null);
    const next = p ? toStatus(p) : 'blocked';
    setNotifications(next);
    return next;
  }, []);

  const requestLocation = useCallback(async () => {
    const p = await Location.requestForegroundPermissionsAsync().catch(() => null);
    const next = p ? toStatus(p) : 'blocked';
    setLocation(next);
    return next;
  }, []);

  const openSettings = useCallback(() => void Linking.openSettings(), []);

  return { notifications, location, requestNotifications, requestLocation, openSettings };
}
