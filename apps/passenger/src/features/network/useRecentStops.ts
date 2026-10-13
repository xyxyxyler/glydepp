import 'expo-sqlite/localStorage/install';

import { useCallback, useState } from 'react';

const KEY = 'glyde.recentStops';
const MAX = 5;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Recently chosen stop ids, newest first, kept on the device (expo-sqlite localStorage). */
export function useRecentStops() {
  const [recent, setRecent] = useState<string[]>(read);
  const remember = useCallback((stopId: string) => {
    setRecent((current) => {
      const next = [stopId, ...current.filter((id) => id !== stopId)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: recents just won't persist this time.
      }
      return next;
    });
  }, []);
  return { recent, remember };
}
