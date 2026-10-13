import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` (for "in N min" labels). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "17:42" in Africa/Accra. Accra is UTC+0 all year (no DST), so UTC fields are exact. */
export function formatAccraTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
