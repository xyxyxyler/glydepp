import type { Database } from '@glyde/domain';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing — see apps/passenger/.env.local');
}

/**
 * Supabase client with the PUBLISHABLE key (RLS applies). No auth yet: sign-in arrives with
 * Register, at which point add session storage (Expo guide: expo-sqlite localStorage).
 * Components never call this directly — use the typed hooks in src/features.
 */
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
