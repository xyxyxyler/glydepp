import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { disabledOpacity, motion, radius, size, space, spring } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

export type RadioCardProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Extra content shown under the row when selected (e.g. a MoMo number field). */
  children?: ReactNode;
};

/**
 * DESIGN.md §8.9: payment methods are selectable cards; the radio fills with a short spring.
 * Selected: 2px brand border + brand tint (same language as BusCard).
 */
export function RadioCard({ title, subtitle, icon, selected, onSelect, disabled = false, children }: RadioCardProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const dot = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    dot.set(
      reduceMotion
        ? withTiming(selected ? 1 : 0, { duration: motion.reduceMotionFade })
        : withSpring(selected ? 1 : 0, spring.pop),
    );
  }, [selected, reduceMotion, dot]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.get() }] }));

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: selected ? colors.brand.primary : colors.border.default,
          backgroundColor: selected ? colors.brand.tint : colors.bg.base,
        },
        disabled && styles.disabled,
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, disabled }}
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        disabled={disabled}
        onPress={() => {
          if (selected) return;
          hapticFor('selection');
          onSelect();
        }}
        style={styles.row}
      >
        {icon ? <View style={[styles.icon, { backgroundColor: colors.bg.subtle }]}>{icon}</View> : null}
        <View style={styles.text}>
          <GlydeText variant="headline">{title}</GlydeText>
          {subtitle ? (
            <GlydeText variant="callout" tone="secondary">
              {subtitle}
            </GlydeText>
          ) : null}
        </View>
        <View style={[styles.radio, { borderColor: selected ? colors.ink.primary : colors.ink.tertiary }]}>
          <Animated.View style={[styles.radioDot, { backgroundColor: colors.ink.primary }, dotStyle]} />
        </View>
      </Pressable>
      {selected && children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: size.selectedBorder, borderRadius: radius.lg },
  disabled: { opacity: disabledOpacity },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, minHeight: size.tapMin },
  icon: {
    width: size.busCardIcon,
    height: size.busCardIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: space.xxs },
  radio: {
    width: size.icon,
    height: size.icon,
    borderRadius: radius.pill,
    borderWidth: size.selectedBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: size.icon / 2, height: size.icon / 2, borderRadius: radius.pill },
  extra: { paddingHorizontal: space.sm, paddingBottom: space.sm, gap: space.sm },
});
