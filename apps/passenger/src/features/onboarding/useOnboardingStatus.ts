import { useSession } from '@/features/auth/useSession';

/**
 * Where a launch should land (uix-spec 2.1: onboarding is never shown again once complete).
 * - 'new': no account on this device → Landing
 * - 'signed-in': verified but onboarding not finished → Profile Setup
 * - 'onboarded': → Home (or the active trip)
 *
 * TODO(Permissions screen): mark onboarding complete and return 'onboarded' here.
 */
export type OnboardingStatus = 'loading' | 'new' | 'signed-in' | 'onboarded';

export function useOnboardingStatus(): OnboardingStatus {
  const session = useSession();
  if (session.status === 'loading') return 'loading';
  return session.status === 'signed-in' ? 'signed-in' : 'new';
}
