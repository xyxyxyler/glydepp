import type { FareRules } from '@glyde/domain';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** Active fare rules for a route code. null = no rates set yet ("Fare pending"). */
export function useFareRules(routeCode: string | null): FareRules | null {
  const [rules, setRules] = useState<FareRules | null>(null);
  useEffect(() => {
    if (!routeCode) return;
    let cancelled = false;
    void supabase
      .from('fare_rules')
      .select('base_pesewas, per_km_pesewas, booking_fee_pesewas, platform_fee_bps, peak_multiplier')
      .eq('route_code', routeCode)
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRules(
          data
            ? {
                basePesewas: data.base_pesewas,
                perKmPesewas: data.per_km_pesewas,
                bookingFeePesewas: data.booking_fee_pesewas,
                platformFeeBps: data.platform_fee_bps,
                peakMultiplier: Number(data.peak_multiplier),
              }
            : null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [routeCode]);
  return routeCode ? rules : null;
}
