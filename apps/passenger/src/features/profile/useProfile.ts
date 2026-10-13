import type { Database } from '@glyde/domain';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileFields = Pick<
  Profile,
  'first_name' | 'last_name' | 'residential_area' | 'work_location' | 'company_name'
>;

export type ProfileState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** profile is null for a new passenger who hasn't saved yet. loadFailed: offline/server error. */
  | {
      status: 'ready';
      userId: string;
      profile: Profile | null;
      loadFailed: boolean;
    };

/** The signed-in passenger's own profile (RLS: they can only read/write their own row). */
export function useProfile() {
  const session = useSession();
  const userId = session.status === 'signed-in' ? session.session.user.id : null;
  const [loaded, setLoaded] = useState<{
    userId: string;
    profile: Profile | null;
    loadFailed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled) setLoaded({ userId, profile: data, loadFailed: !!error });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = useCallback(
    async (fields: ProfileFields): Promise<'ok' | 'offline' | 'error'> => {
      if (!userId) return 'error';
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...fields })
        .select('*')
        .single();
      if (error) return /fetch|network/i.test(error.message) ? 'offline' : 'error';
      setLoaded({ userId, profile: data, loadFailed: false });
      return 'ok';
    },
    [userId],
  );

  /** Record acceptance of a specific terms version (uix-spec 2.1 Terms & Conditions). */
  const acceptTerms = useCallback(
    async (version: string): Promise<'ok' | 'offline' | 'error'> => {
      if (!userId) return 'error';
      const { data, error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString(), terms_version: version })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) return /fetch|network/i.test(error.message) ? 'offline' : 'error';
      setLoaded({ userId, profile: data, loadFailed: false });
      return 'ok';
    },
    [userId],
  );

  let state: ProfileState;
  if (session.status === 'loading') state = { status: 'loading' };
  else if (!userId) state = { status: 'signed-out' };
  else if (!loaded || loaded.userId !== userId) state = { status: 'loading' };
  else state = { status: 'ready', ...loaded };

  return { state, save, acceptTerms };
}
