export type OnboardingStatus = 'loading' | 'new' | 'onboarded';

/**
 * Has this device finished onboarding? (uix-spec 2.1: onboarding is never shown again after
 * completion; the user goes straight to Home or their active trip.)
 *
 * TODO(Permissions screen): persist completion and read it here. Until then every launch is 'new'.
 */
export function useOnboardingStatus(): OnboardingStatus {
  return 'new';
}
