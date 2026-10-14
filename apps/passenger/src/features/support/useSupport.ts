import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

export type SupportCategory = 'trip' | 'payment' | 'ticket' | 'account' | 'other';
export type SupportRequest = {
  id: string;
  category: SupportCategory;
  message: string;
  status: string;
  createdAt: string;
};

/** "Report a problem" requests (RLS: own rows; HQ reads them with the service role). */
export function useSupport() {
  const session = useSession();
  const userId = session.status === 'signed-in' ? session.session.user.id : null;
  const [requests, setRequests] = useState<SupportRequest[] | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void supabase
      .from('support_requests')
      .select('id, category, message, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRequests(
          data.map((r) => ({
            id: r.id,
            category: r.category as SupportCategory,
            message: r.message,
            status: r.status,
            createdAt: r.created_at,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const file = useCallback(
    async (category: SupportCategory, message: string): Promise<'ok' | 'offline' | 'error'> => {
      if (!userId) return 'error';
      const { error } = await supabase
        .from('support_requests')
        .insert({ passenger_id: userId, category, message: message.trim() });
      setAttempt((a) => a + 1);
      return !error ? 'ok' : /fetch|network/i.test(error.message) ? 'offline' : 'error';
    },
    [userId],
  );

  return { requests, file };
}
