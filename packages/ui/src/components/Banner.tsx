import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { motion, radius, size, space } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';
import { GlassSurface, StatusIcon } from './GlassSurface';
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
 * DESIGN.md §7 Banner: pinned (not auto-dismissed), frosted glass with a pale status icon, plain-language message,
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
      style={style}
    >
      <GlassSurface>
        <View style={styles.banner}>
          <StatusIcon tone={tone} />
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
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.statusTint[tone] }]}
            >
              <GlydeText variant="callout" style={{ color: colors.ink.primary }}>
                {actionLabel}
              </GlydeText>
            </Pressable>
          ) : null}
        </View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.xs,
    minHeight: size.tapMin,
  },
  message: { flex: 1, paddingVertical: space.sm },
  action: { minHeight: size.tapMin, justifyContent: 'center', paddingHorizontal: space.sm, borderRadius: radius.md },
});
