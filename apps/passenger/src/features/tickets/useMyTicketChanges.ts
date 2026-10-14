import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

/**
 * Calls `onChange` whenever one of the signed-in passenger's tickets changes (scanned at
 * boarding, completed at drop-off…). Realtime + RLS: only their own rows arrive. Cleaned up on
 * unmount.
 */
export function useMyTicketChanges(onChange: () => void): void {
  const session = useSession();
  const userId = session.status === 'signed-in' ? session.session.user.id : null;
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`my-tickets-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `passenger_id=eq.${userId}` },
        () => latest.current(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
