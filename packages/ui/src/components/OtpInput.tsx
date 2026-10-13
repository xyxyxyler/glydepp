import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { a11y, motion, radius, shake, size, space, type as typeTokens } from '../../tokens';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

export type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  /** Bump to shake the boxes (wrong code). */
  errorKey?: number;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

/**
 * Verification code boxes (uix-spec 2.1). One hidden input drives all boxes, so paste and iOS
 * one-time-code autofill work; wrong codes shake (DESIGN.md §8.7: ±6dp, 3 cycles, 300ms).
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  errorKey = 0,
  invalid = false,
  disabled = false,
  autoFocus = true,
  accessibilityLabel = 'Verification code',
}: OtpInputProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const input = useRef<TextInput>(null);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!errorKey || reduceMotion) return;
    const step = motion.shake / (shake.cycles * 2);
    const swing = [];
    for (let i = 0; i < shake.cycles; i++) {
      swing.push(withTiming(shake.amplitude, { duration: step }), withTiming(-shake.amplitude, { duration: step }));
    }
    x.set(withSequence(...swing, withTiming(0, { duration: step })));
  }, [errorKey, reduceMotion, x]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));
  const digits = value.split('');

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel={accessibilityLabel} disabled={disabled}>
      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length }, (_, i) => {
          const active = !disabled && i === Math.min(value.length, length - 1);
          const border = invalid ? colors.status.danger : active ? colors.ink.primary : colors.border.default;
          return (
            <View
              key={i}
              style={[styles.box, { backgroundColor: colors.bg.subtle, borderColor: border }]}
              importantForAccessibility="no-hide-descendants"
            >
              <GlydeText variant="title2" tabular>
                {digits[i] ?? ''}
              </GlydeText>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        editable={!disabled}
        maxLength={length}
        caretHidden
        accessibilityLabel={`${accessibilityLabel}, ${value.length} of ${length} digits entered`}
        maxFontSizeMultiplier={a11y.maxFontScale}
        style={[typeTokens.body, styles.hidden]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  box: {
    flex: 1,
    height: size.otpBox,
    borderRadius: radius.md,
    borderWidth: size.seatBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Kept in the tree (focusable, receives paste/autofill) but invisible.
  hidden: {
    position: 'absolute',
    width: size.hairline,
    height: size.hairline,
    opacity: 0,
  },
});
