import type { Database } from '@glyde/domain';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type DriverAlert = Database['public']['Tables']['driver_alerts']['Row'];

/** Operational alerts inbox (uix-spec 3.2: route and operations only, never promotions). */
export function useDriverAlerts() {
  const [alerts, setAlerts] = useState<DriverAlert[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('driver_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        setError(!!e);
        if (data) setAlerts(data);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { alerts, error: error && !alerts, refresh };
}
