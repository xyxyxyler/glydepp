import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { elevation, motion, radius, size, space } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';
import type { ToastTone } from './Toast';

export type BannerProps = {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * DESIGN.md §7 Banner: pinned (not auto-dismissed), status.* accent, plain-language message,
 * optional single action. Used for offline, permission-denied and error states (§11).
 */
export function Banner({ message, tone = 'info', actionLabel, onAction, style }: BannerProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? motion.reduceMotionFade : motion.base;
  return (
    <Animated.View
      entering={FadeIn.duration(duration)}
      exiting={FadeOut.duration(duration)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.bg.sheet, borderLeftColor: colors.status[tone] }, style]}
    >
      <GlydeText variant="callout" style={styles.message}>
        {message}
      </GlydeText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={space.xs}
          onPress={() => {
            hapticFor('selection');
            onAction();
          }}
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.bg.subtle }]}
        >
          <GlydeText variant="callout" style={{ color: colors.ink.primary }}>
            {actionLabel}
          </GlydeText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...elevation.floating,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    borderLeftWidth: size.toastAccent,
    paddingLeft: space.md,
    paddingRight: space.xs,
    minHeight: size.tapMin,
  },
  message: { flex: 1, paddingVertical: space.sm },
  action: { minHeight: size.tapMin, justifyContent: 'center', paddingHorizontal: space.sm, borderRadius: radius.md },
});
