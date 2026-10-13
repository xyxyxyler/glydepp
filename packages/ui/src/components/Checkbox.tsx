import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
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

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Read by screen readers when disabled, e.g. why it can't be ticked yet. */
  disabledHint?: string;
};

/** Checkbox with a short spring fill (DESIGN.md §8.9) and a light haptic. Whole row is the target. */
export function Checkbox({ checked, onChange, label, disabled = false, disabledHint }: CheckboxProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    fill.set(
      reduceMotion
        ? withTiming(checked ? 1 : 0, { duration: motion.reduceMotionFade })
        : withSpring(checked ? 1 : 0, spring.pop),
    );
  }, [checked, reduceMotion, fill]);

  const markStyle = useAnimatedStyle(() => ({ opacity: fill.get(), transform: [{ scale: fill.get() }] }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      accessibilityHint={disabled ? disabledHint : undefined}
      disabled={disabled}
      onPress={() => {
        hapticFor('selection');
        onChange(!checked);
      }}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.box,
          { borderColor: checked ? colors.brand.primary : colors.ink.secondary, backgroundColor: colors.bg.base },
        ]}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.mark, { backgroundColor: colors.brand.primary }, markStyle]}
        >
          <Check size={size.iconChip - space.xxs} strokeWidth={size.iconStroke + 1} color={colors.brand.onPrimary} />
        </Animated.View>
      </View>
      <GlydeText variant="body" style={styles.label}>
        {label}
      </GlydeText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: size.tapMin },
  disabled: { opacity: disabledOpacity },
  box: {
    width: size.icon,
    height: size.icon,
    borderRadius: radius.sm / 2,
    borderWidth: size.selectedBorder,
    overflow: 'hidden',
  },
  mark: { alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});
