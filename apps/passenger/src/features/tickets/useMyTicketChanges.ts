import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

let channelSeq = 0;

/**
 * One Realtime channel per signed-in user, shared by every hook that listens. Supabase returns the
 * existing channel for a repeated name, and listeners can't be added after subscribe() — so each
 * caller registers a listener here instead of opening its own channel.
 */
const shared = new Map<string, { channel: RealtimeChannel; listeners: Set<() => void> }>();

function addListener(userId: string, listener: () => void): () => void {
  let entry = shared.get(userId);
  if (!entry) {
    const listeners = new Set<() => void>();
    const channel = supabase
      // Unique name: removeChannel is async, so a quick remount must not get the old channel back.
      .channel(`my-tickets-${userId}-${++channelSeq}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `passenger_id=eq.${userId}` },
        () => listeners.forEach((l) => l()),
      )
      .subscribe();
    entry = { channel, listeners };
    shared.set(userId, entry);
  }
  entry.listeners.add(listener);
  return () => {
    const e = shared.get(userId);
    if (!e) return;
    e.listeners.delete(listener);
    if (e.listeners.size === 0) {
      shared.delete(userId);
      void supabase.removeChannel(e.channel);
    }
  };
}

/**
 * Calls `onChange` whenever one of the signed-in passenger's tickets changes (scanned at
 * boarding, completed at drop-off, marked missed…). Realtime + RLS: only their own rows arrive.
 * Cleaned up on unmount.
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
    return addListener(userId, () => latest.current());
  }, [userId]);
}
