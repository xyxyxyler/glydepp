import { CircleAlert } from 'lucide-react-native';
import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { a11y, radius, size, space, type as typeTokens } from '../../tokens';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** Shown under the field with an icon; also turns the border red (never colour alone). */
  error?: string | null;
  ref?: Ref<TextInput>;
};

/** Labelled text input with focus and error states (DESIGN.md §11: plain-language errors). */
export function TextField({ label, error, ref, onFocus, onBlur, ...input }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.status.danger : focused ? colors.ink.primary : colors.bg.subtle;
  return (
    <View style={styles.root}>
      <GlydeText variant="caption" tone="secondary">
        {label}
      </GlydeText>
      <View style={[styles.field, { backgroundColor: colors.bg.subtle, borderColor: border }]}>
        <TextInput
          ref={ref}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={input.accessibilityLabel ?? label}
          accessibilityHint={error ?? input.accessibilityHint}
          placeholderTextColor={colors.ink.tertiary}
          maxFontSizeMultiplier={a11y.maxFontScale}
          style={[typeTokens.body, styles.input, { color: colors.ink.primary }]}
        />
      </View>
      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <CircleAlert size={size.iconChip - space.xxs} strokeWidth={size.iconStroke} color={colors.status.danger} />
          <GlydeText variant="caption" style={{ color: colors.status.danger }}>
            {error}
          </GlydeText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xxs },
  field: {
    minHeight: size.button,
    borderRadius: radius.md,
    borderWidth: size.seatBorder,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  input: { padding: 0 },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
});
