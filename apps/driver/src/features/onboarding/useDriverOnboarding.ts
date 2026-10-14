import { useDriver } from '@/features/driver/useDriver';

/**
 * Where a driver-app launch lands (uix-spec 3.1): Landing → verify → profile (+ liveness) →
 * terms → permissions → dashboard. Interrupted onboarding resumes at the right step.
 */
export type DriverStep = 'loading' | '/landing' | '/signup' | '/terms' | '/permissions' | '/dashboard';

export function useDriverOnboarding(): DriverStep {
  const state = useDriver();
  if (state.status === 'loading') return 'loading';
  if (state.status === 'signed-out') return '/landing';
  if (state.status === 'not-a-driver') return '/signup';
  if (state.status === 'error') return '/dashboard'; // dashboard shows the error + logout
  const d = state.driver;
  if (!d.terms_accepted_at) return '/terms';
  if (!d.onboarded_at) return '/permissions';
  return '/dashboard';
}
