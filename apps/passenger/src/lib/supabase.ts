import 'expo-sqlite/localStorage/install';

import type { Database } from '@glyde/domain';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing — see apps/passenger/.env.local',
  );
}

/**
 * Supabase client with the PUBLISHABLE key (RLS applies). The session is kept on the device
 * (expo-sqlite localStorage, per Expo's Supabase guide) so passengers stay signed in.
 * Components never call this directly — use the typed hooks in src/features.
 */
export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Base URL for Edge Functions (called with fetch so error bodies are easy to read). */
export const functionsUrl = `${url}/functions/v1`;
export const publishableKey = key;
