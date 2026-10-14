import 'expo-sqlite/localStorage/install';

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { formatAccraDate } from '@/features/time/format';
import { supabase } from '@/lib/supabase';

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  validity: string; // "Valid until Tue 14 Oct"
  used: boolean;
};

const DISMISSED_KEY = 'glyde.promos.dismissed';
function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Current promotions (RLS: active + in their validity window) and whether this passenger has
 * used them up. Discounts are applied on the server when seats are held.
 */
export function usePromotions() {
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void Promise.all([
        supabase
          .from('promotions')
          .select('id, title, description, valid_until, max_uses_per_passenger')
          .order('valid_until'),
        supabase.from('promotion_redemptions').select('promotion_id'),
      ]).then(([p, r]) => {
        if (cancelled || p.error || !p.data) return;
        const uses = new Map<string, number>();
        for (const x of r.data ?? []) uses.set(x.promotion_id, (uses.get(x.promotion_id) ?? 0) + 1);
        setPromos(
          p.data.map((x) => ({
            id: x.id,
            title: x.title,
            description: x.description,
            validity: `Valid until ${formatAccraDate(Date.parse(x.valid_until))}`,
            used: (uses.get(x.id) ?? 0) >= x.max_uses_per_passenger,
          })),
        );
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((d) => {
      const next = [...d, id];
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: dismissed for this session only.
      }
      return next;
    });
  }, []);

  /** The coupon to feature on Home: first usable promotion not dismissed. */
  const featured = promos?.find((p) => !p.used && !dismissed.includes(p.id)) ?? null;
  return { promos, featured, dismiss };
}
