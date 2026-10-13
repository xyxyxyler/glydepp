import { normaliseEmail, normaliseGhanaPhone } from '@glyde/domain';
import {
  a11y,
  GlydeText,
  hapticFor,
  PrimaryButton,
  radius,
  size,
  space,
  type as typeTokens,
  useTheme,
} from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { otpErrorMessage, requestCode, type OtpChannel } from '@/features/auth/otp';

/**
 * uix-spec 2.1 Registration — step 1: choose phone or email and request a code.
 * Ghana numbers only (+233, decision 2026-10-14); social sign-in hidden for now.
 */
export function RegisterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<OtpChannel>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const raw = channel === 'phone' ? phone : email;
  const normalised = channel === 'phone' ? normaliseGhanaPhone(phone) : normaliseEmail(email);

  const send = async () => {
    if (!normalised) {
      hapticFor('failure');
      setError(
        channel === 'phone'
          ? 'Enter a Ghana mobile number, e.g. 024 123 4567.'
          : 'Enter a valid email address, e.g. ama@company.com.',
      );
      return;
    }
    setError(null);
    setSending(true);
    const r = await requestCode(channel, normalised);
    setSending(false);
    // "too soon" means a code was already sent moments ago: carry on to entering it.
    if (r.ok || r.error === 'too_soon') {
      router.push({
        pathname: '/verify',
        params: {
          channel,
          identifier: normalised,
          resendAfterS: String(r.ok ? r.value.resendAfterS : (r.retryAfterS ?? 60)),
        },
      });
      return;
    }
    hapticFor('failure');
    setError(otpErrorMessage(r.error, r));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}
    >
      <StatusBar style="dark" />
      <ScreenHeader />
      <View style={styles.body}>
        <View style={styles.copy}>
          <GlydeText variant="title1">Get started</GlydeText>
          <GlydeText variant="body" tone="secondary">
            Enter your phone number or email and we’ll send you a code.
          </GlydeText>
        </View>

        <View style={[styles.segment, { backgroundColor: colors.bg.subtle }]} accessibilityRole="tablist">
          {(['phone', 'email'] as const).map((c) => {
            const active = c === channel;
            return (
              <Pressable
                key={c}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={c === 'phone' ? 'Use phone number' : 'Use email'}
                onPress={() => {
                  if (active) return;
                  hapticFor('selection');
                  setChannel(c);
                  setError(null);
                }}
                style={[styles.segmentItem, active && { backgroundColor: colors.bg.base }]}
              >
                <GlydeText variant="callout" tone={active ? 'primary' : 'secondary'}>
                  {c === 'phone' ? 'Phone' : 'Email'}
                </GlydeText>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.field,
            {
              backgroundColor: colors.bg.subtle,
              borderColor: error ? colors.status.danger : colors.bg.subtle,
            },
          ]}
        >
          {channel === 'phone' && (
            <View
              style={[styles.prefix, { borderColor: colors.border.default }]}
              accessible
              accessibilityLabel="Ghana, plus 2 3 3"
            >
              <GlydeText variant="body">🇬🇭 +233</GlydeText>
            </View>
          )}
          <TextInput
            key={channel}
            value={raw}
            onChangeText={(t) => {
              if (channel === 'phone') setPhone(t);
              else setEmail(t);
              if (error) setError(null);
            }}
            onSubmitEditing={() => void send()}
            placeholder={channel === 'phone' ? '024 123 4567' : 'ama@company.com'}
            placeholderTextColor={colors.ink.tertiary}
            keyboardType={channel === 'phone' ? 'phone-pad' : 'email-address'}
            textContentType={channel === 'phone' ? 'telephoneNumber' : 'emailAddress'}
            autoComplete={channel === 'phone' ? 'tel' : 'email'}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="send"
            accessibilityLabel={channel === 'phone' ? 'Phone number' : 'Email address'}
            maxFontSizeMultiplier={a11y.maxFontScale}
            style={[typeTokens.body, styles.input, { color: colors.ink.primary }]}
          />
        </View>
        {error && (
          <GlydeText variant="callout" style={{ color: colors.status.danger }} accessibilityLiveRegion="polite">
            {error}
          </GlydeText>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PrimaryButton
          label="Send code"
          loading={sending}
          disabled={!raw.trim()}
          haptic="confirm"
          onPress={() => void send()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space.screenX, gap: space.lg },
  copy: { gap: space.xs },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: space.xxs,
  },
  segmentItem: {
    flex: 1,
    minHeight: size.tapMin - space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.button,
    borderRadius: radius.md,
    borderWidth: size.seatBorder,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  prefix: { paddingRight: space.sm, borderRightWidth: size.hairline },
  input: { flex: 1, padding: 0 },
  footer: { paddingHorizontal: space.screenX },
});
