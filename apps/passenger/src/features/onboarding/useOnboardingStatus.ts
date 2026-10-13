import { useSession } from '@/features/auth/useSession';
import { isOnboardedLocally } from '@/features/profile/onboardedFlag';
import { useProfile } from '@/features/profile/useProfile';

/**
 * Where a launch should land (uix-spec 2.1: onboarding is never shown again once complete, and an
 * interrupted onboarding resumes at the step the passenger reached).
 */
export type OnboardingStatus =
  | 'loading'
  | 'new' // no account on this device → Landing
  | 'needs-profile'
  | 'needs-terms'
  | 'needs-permissions'
  | 'onboarded'; // → Home (or the active trip)

export function useOnboardingStatus(): OnboardingStatus {
  const session = useSession();
  const { state } = useProfile();
  if (session.status === 'loading') return 'loading';
  if (session.status === 'signed-out') return 'new';
  if (isOnboardedLocally(session.session.user.id)) return 'onboarded';
  if (state.status !== 'ready') return 'loading';
  const p = state.profile;
  if (p?.onboarded_at) return 'onboarded';
  // Offline at launch with no local flag: start at the beginning of the remaining steps.
  if (!p) return 'needs-profile';
  if (!p.terms_accepted_at) return 'needs-terms';
  return 'needs-permissions';
}

export const ONBOARDING_ROUTE = {
  new: '/landing',
  'needs-profile': '/profile',
  'needs-terms': '/terms',
  'needs-permissions': '/permissions',
  onboarded: '/home',
} as const;
