import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { radius, size, space, type HapticMoment } from '../../tokens';
import { hapticFor } from '../haptics';
import { usePressScale } from '../motion/usePressScale';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

type Colors = { fill: string; fillPressed: string; ink: string };

type BaseButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Replaces the label with an inline spinner; width is unchanged. */
  loading?: boolean;
  /** DESIGN.md §10 moment to fire on press. null = no haptic. */
  haptic?: HapticMoment | null;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** 'driver': 64dp tall for the tablet-first Driver app (DESIGN.md §5). */
  size?: 'default' | 'driver';
};

function BaseButton({
  label,
  onPress,
  disabled,
  loading,
  haptic = 'confirm',
  accessibilityHint,
  style,
  size: variant = 'default',
  colors,
}: BaseButtonProps & { colors: Colors }) {
  const theme = useTheme().colors;
  const inactive = disabled || loading;
  const { pressed, style: scaleStyle, onPressIn, onPressOut } = usePressScale(inactive);

  const fill = disabled ? theme.disabled.fill : colors.fill;
  const fillPressed = disabled ? theme.disabled.fill : colors.fillPressed;
  const ink = disabled ? theme.disabled.ink : colors.ink;

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [fill, fillPressed]),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={inactive}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        if (haptic) hapticFor(haptic);
        onPress?.();
      }}
      style={style}
    >
      <Animated.View style={[styles.base, variant === 'driver' && styles.driver, fillStyle, scaleStyle]}>
        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <GlydeText variant="headline" style={{ color: ink }} numberOfLines={1}>
            {label}
          </GlydeText>
        )}
      </Animated.View>
    </Pressable>
  );
}

export type ButtonProps = BaseButtonProps;

/** DESIGN.md §7: pill, 56h, brand fill, onPrimary text. */
export function PrimaryButton(props: ButtonProps) {
  const { brand } = useTheme().colors;
  return <BaseButton {...props} colors={{ fill: brand.primary, fillPressed: brand.pressed, ink: brand.onPrimary }} />;
}

/** DESIGN.md §7: ink fill + white text on light; bg.subtle fill on dark. */
export function SecondaryButton(props: ButtonProps) {
  const { name, colors } = useTheme();
  const c =
    name === 'light'
      ? { fill: colors.ink.primary, fillPressed: colors.ink.secondary, ink: colors.ink.inverse }
      : { fill: colors.bg.subtle, fillPressed: colors.border.default, ink: colors.ink.primary };
  return <BaseButton haptic="selection" {...props} colors={c} />;
}

const styles = StyleSheet.create({
  base: {
    height: size.button,
    minWidth: size.tapMin,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driver: { height: size.driverTap },
});
