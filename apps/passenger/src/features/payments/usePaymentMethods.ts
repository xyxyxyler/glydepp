import { formatGhanaPhone } from '@glyde/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { MomoNetwork } from '@/features/booking/pay';
import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

export type PaymentMethod = {
  id: string;
  kind: 'momo' | 'card';
  momoNetwork: MomoNetwork | null;
  momoNumber: string | null; // E.164
  cardBrand: string | null;
  cardLast4: string | null;
  isDefault: boolean;
};

export const NETWORK_LABEL: Record<MomoNetwork, string> = { mtn: 'MTN', telecel: 'Telecel', airteltigo: 'AirtelTigo' };

/** "MTN MoMo · 024 123 4567" / "Test card ··4242". */
export function methodLabel(m: PaymentMethod): string {
  return m.kind === 'momo'
    ? `${NETWORK_LABEL[m.momoNetwork ?? 'mtn']} MoMo · ${formatGhanaPhone(m.momoNumber ?? '')}`
    : `${m.cardBrand} ··${m.cardLast4}`;
}

type Result = 'ok' | 'duplicate' | 'offline' | 'error';
const classify = (error: { code?: string; message: string } | null): Result =>
  !error ? 'ok' : error.code === '23505' ? 'duplicate' : /fetch|network/i.test(error.message) ? 'offline' : 'error';

/** The passenger's saved payment methods (uix-spec 2.6; RLS: own rows only). */
export function usePaymentMethods() {
  const session = useSession();
  const userId = session.status === 'signed-in' ? session.session.user.id : null;
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((a) => a + 1), []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      void supabase
        .from('payment_methods')
        .select('*')
        .order('created_at')
        .then(({ data, error }) => {
          if (cancelled) return;
          setFailed(!!error);
          if (data)
            setMethods(
              data.map((m) => ({
                id: m.id,
                kind: m.kind as PaymentMethod['kind'],
                momoNetwork: m.momo_network as MomoNetwork | null,
                momoNumber: m.momo_number,
                cardBrand: m.card_brand,
                cardLast4: m.card_last4,
                isDefault: m.is_default,
              })),
            );
        });
      return () => {
        cancelled = true;
      };
      // `attempt` re-runs the query after a change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, attempt]),
  );

  const addMomo = useCallback(
    async (network: MomoNetwork, e164: string): Promise<Result> => {
      if (!userId) return 'error';
      const { error } = await supabase
        .from('payment_methods')
        .insert({ passenger_id: userId, kind: 'momo', momo_network: network, momo_number: e164 });
      refresh();
      return classify(error);
    },
    [userId, refresh],
  );

  /** Prototype: details come back from the provider's (test) hosted card page — never typed in Glyde. */
  const addCard = useCallback(
    async (brand: string, last4: string): Promise<Result> => {
      if (!userId) return 'error';
      const { error } = await supabase
        .from('payment_methods')
        .insert({ passenger_id: userId, kind: 'card', card_brand: brand, card_last4: last4 });
      refresh();
      return classify(error);
    },
    [userId, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<Result> => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      refresh();
      return classify(error);
    },
    [refresh],
  );

  const setDefault = useCallback(
    async (id: string): Promise<Result> => {
      const { error } = await supabase.rpc('set_default_payment_method', { p_method_id: id });
      refresh();
      return classify(error);
    },
    [refresh],
  );

  return { methods, failed, refresh, addMomo, addCard, remove, setDefault };
}
