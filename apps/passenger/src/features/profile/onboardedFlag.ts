import 'expo-sqlite/localStorage/install';

/**
 * Device copy of "this passenger finished onboarding", so a relaunch goes straight to Home even
 * offline (the profile row's onboarded_at is the source of truth when online).
 */
const key = (userId: string) => `glyde.onboarded.${userId}`;

export function markOnboardedLocally(userId: string): void {
  try {
    localStorage.setItem(key(userId), '1');
  } catch {
    // Storage unavailable: the server flag still applies on the next online launch.
  }
}

export function isOnboardedLocally(userId: string): boolean {
  try {
    return localStorage.getItem(key(userId)) === '1';
  } catch {
    return false;
  }
}
