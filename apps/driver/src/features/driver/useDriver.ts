import type { Database } from '@glyde/domain';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

export type Driver = Database['public']['Tables']['drivers']['Row'];
export type DriverState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** Signed in, but this account has no driver record. */
  | { status: 'not-a-driver' }
  | { status: 'error' }
  | { status: 'ready'; driver: Driver };

/** The signed-in driver's own record (RLS: drivers read only their own row). */
export function useDriver(): DriverState {
  const session = useSession();
  const userId = session.status === 'signed-in' ? session.session.user.id : null;
  const [result, setResult] = useState<{ userId: string; state: DriverState } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void supabase
      .from('drivers')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setResult({
          userId,
          state: error ? { status: 'error' } : data ? { status: 'ready', driver: data } : { status: 'not-a-driver' },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (session.status === 'loading') return { status: 'loading' };
  if (!userId) return { status: 'signed-out' };
  if (!result || result.userId !== userId) return { status: 'loading' };
  return result.state;
}
