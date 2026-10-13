import * as Haptics from 'expo-haptics';

import { haptics, type HapticKind, type HapticMoment } from '../tokens';

const fire: Record<HapticKind, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

/**
 * Fire the haptic DESIGN.md §10 assigns to a moment.
 * Haptics never block or throw into UI code. The OS already suppresses them in
 * silent / haptics-off modes; there is no separate "reduce haptics" API to query.
 */
export function hapticFor(moment: HapticMoment): void {
  fire[haptics[moment]]().catch(() => {});
}
