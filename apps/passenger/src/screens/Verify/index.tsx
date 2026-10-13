import { formatGhanaPhone, OTP_LENGTH } from '@glyde/domain';
import { CheckDraw, GlydeText, hapticFor, OtpInput, space, useTheme } from '@glyde/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { otpErrorMessage, requestCode, verifyCode, type OtpChannel } from '@/features/auth/otp';
import { useNow } from '@/features/time/useNow';

/**
 * uix-spec 2.1 Registration — step 2: enter the code. Checks automatically when all boxes are
 * filled; inline errors; "Resend Code" after a 60s countdown; success → Profile Setup.
 */
export function VerifyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    channel: OtpChannel;
    identifier: string;
    resendAfterS: string;
  }>();
  const channel: OtpChannel = params.channel === 'email' ? 'email' : 'phone';
  const identifier = params.identifier ?? '';

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resendAt, setResendAt] = useState(() => Date.now() + (Number(params.resendAfterS) || 60) * 1000);
  const now = useNow(1000);
  const waitS = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const shown = channel === 'phone' ? formatGhanaPhone(identifier) : identifier;

  const check = async (full: string) => {
    setStatus('checking');
    setMessage(null);
    const r = await verifyCode(channel, identifier, full);
    if (r.ok) {
      setStatus('success'); // CheckDraw plays + success haptic, then we move on
      return;
    }
    hapticFor('failure');
    setStatus('error');
    setErrorKey((k) => k + 1);
    setMessage(otpErrorMessage(r.error, r));
    setCode('');
  };

  const resend = async () => {
    setMessage(null);
    setStatus('idle');
    const r = await requestCode(channel, identifier);
    if (r.ok || r.error === 'too_soon') {
      setResendAt(Date.now() + (r.ok ? r.value.resendAfterS : (r.retryAfterS ?? 60)) * 1000);
      setCode('');
      if (r.ok) setMessage('A new code is on its way.');
      return;
    }
    setStatus('error');
    setMessage(otpErrorMessage(r.error, r));
  };

  // After the success animation, continue onboarding (uix-spec 2.1: automatically).
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => router.replace('/profile'), 900);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader backLabel="Change number or email" />
      <View style={styles.body}>
        <View style={styles.copy}>
          <GlydeText variant="title1">Enter the code</GlydeText>
          <GlydeText variant="body" tone="secondary">
            Sent to {shown}
          </GlydeText>
        </View>

        {status === 'success' ? (
          <View style={styles.success} accessibilityLiveRegion="polite">
            <CheckDraw />
            <GlydeText variant="headline">Verified</GlydeText>
          </View>
        ) : (
          <OtpInput
            value={code}
            onChange={(c) => {
              setCode(c);
              if (status === 'error') setStatus('idle');
              if (c.length === OTP_LENGTH) void check(c);
            }}
            length={OTP_LENGTH}
            errorKey={errorKey}
            invalid={status === 'error'}
            disabled={status === 'checking'}
          />
        )}

        {status === 'checking' && (
          <GlydeText variant="callout" tone="secondary" accessibilityLiveRegion="polite">
            Checking…
          </GlydeText>
        )}
        {message && status !== 'success' && (
          <GlydeText
            variant="callout"
            style={status === 'error' ? { color: colors.status.danger } : undefined}
            tone={status === 'error' ? undefined : 'secondary'}
            accessibilityLiveRegion="polite"
          >
            {message}
          </GlydeText>
        )}

        {status !== 'success' &&
          (waitS > 0 ? (
            <GlydeText variant="callout" tone="secondary" tabular>
              Resend code in {Math.floor(waitS / 60)}:{String(waitS % 60).padStart(2, '0')}
            </GlydeText>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void resend()}
              style={styles.resend}
              hitSlop={space.xs}
            >
              <GlydeText variant="callout" style={{ textDecorationLine: 'underline' }}>
                Resend Code
              </GlydeText>
            </Pressable>
          ))}

        {__DEV__ && status !== 'success' && (
          <GlydeText variant="caption" tone="tertiary">
            Prototype: no {channel === 'phone' ? 'SMS' : 'email'} is sent. Use the test code.
          </GlydeText>
        )}
      </View>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space.screenX, gap: space.lg },
  copy: { gap: space.xs },
  success: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  resend: {
    alignSelf: 'flex-start',
    minHeight: space.xxxl,
    justifyContent: 'center',
  },
});
