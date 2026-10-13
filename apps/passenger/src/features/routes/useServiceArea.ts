import type { LatLng } from '@glyde/ui';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** All stops served (any route). Used to frame the map when the user's location is unknown. */
export function useServiceArea(): LatLng[] | null {
  const [points, setPoints] = useState<LatLng[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('stops')
      .select('latitude, longitude')
      .then(({ data }) => {
        if (!cancelled && data) setPoints(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return points;
}
