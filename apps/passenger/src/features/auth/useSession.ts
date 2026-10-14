import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

export type SessionState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; session: Session };

/** The current passenger session (restored from the device on launch). */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) =>
        setState(data.session ? { status: 'signed-in', session: data.session } : { status: 'signed-out' }),
      );
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setState(session ? { status: 'signed-in', session } : { status: 'signed-out' }),
    );
    // Supabase's RN guidance: refresh tokens only while the app is in the foreground.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);
  return state;
}
