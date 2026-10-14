import { formatGhanaPhone, normaliseEmail, OTP_LENGTH } from '@glyde/domain';
import {
  GlydeText,
  hapticFor,
  OtpInput,
  PrimaryButton,
  size,
  space,
  StatusIcon,
  TextField,
  useTheme,
  useToast,
} from '@glyde/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageScaffold } from '@/components/PageScaffold';
import { linkEmail, otpErrorMessage, requestCode } from '@/features/auth/otp';
import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

const isRealEmail = (e: string | undefined) => !!e && !e.endsWith('.invalid');

/** Verification (Account tab): phone status; add and verify an email with a code. */
export function VerificationScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const session = useSession();
  const user = session.status === 'signed-in' ? session.session.user : null;
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'enter' | 'code'>('enter');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const hasEmail = isRealEmail(user?.email) && !!user?.email_confirmed_at;

  const send = async () => {
    const e = normaliseEmail(email);
    if (!e) {
      hapticFor('failure');
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    const r = await requestCode('email', e);
    setBusy(false);
    if (r.ok || r.error === 'too_soon') {
      setError(null);
      setStep('code');
      return;
    }
    setError(otpErrorMessage(r.error, r));
  };

  const verify = async (full: string) => {
    const e = normaliseEmail(email);
    if (!e) return;
    setBusy(true);
    const r = await linkEmail(e, full);
    setBusy(false);
    if (r.ok) {
      hapticFor('paymentSuccess');
      await supabase.auth.refreshSession(); // pick up the new email on this device
      toast.show({ tone: 'success', title: 'Email verified' });
      setStep('enter');
      setEmail('');
      setCode('');
      return;
    }
    hapticFor('failure');
    setErrorKey((k) => k + 1);
    setCode('');
    setError(
      r.error === 'email_in_use' ? 'That email is already used by another Glyde account.' : otpErrorMessage(r.error, r),
    );
  };

  return (
    <PageScaffold title="Verification">
      <View style={[styles.row, { borderColor: colors.border.default }]}>
        <StatusIcon tone={user?.phone_confirmed_at ? 'success' : 'info'} />
        <View style={styles.flex}>
          <GlydeText variant="body">Phone number</GlydeText>
          <GlydeText variant="caption" tone="secondary">
            {user?.phone ? formatGhanaPhone(`+${user.phone}`) : 'Not added'}
          </GlydeText>
        </View>
        <GlydeText variant="callout">{user?.phone_confirmed_at ? 'Verified' : '—'}</GlydeText>
      </View>
      <View style={[styles.row, { borderColor: colors.border.default }]}>
        <StatusIcon tone={hasEmail ? 'success' : 'info'} />
        <View style={styles.flex}>
          <GlydeText variant="body">Email</GlydeText>
          <GlydeText variant="caption" tone="secondary">
            {hasEmail ? user?.email : 'Not added'}
          </GlydeText>
        </View>
        <GlydeText variant="callout">{hasEmail ? 'Verified' : '—'}</GlydeText>
      </View>

      <View style={styles.section}>
        <GlydeText variant="title2">{hasEmail ? 'Change email' : 'Add an email'}</GlydeText>
        {step === 'enter' ? (
          <>
            <TextField
              label="Email address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="ama@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
            />
            <PrimaryButton label="Send code" loading={busy} onPress={() => void send()} />
          </>
        ) : (
          <>
            <GlydeText variant="body" tone="secondary">
              Enter the code sent to {normaliseEmail(email)}.
            </GlydeText>
            <OtpInput
              value={code}
              onChange={(c) => {
                setCode(c);
                setError(null);
                if (c.length === OTP_LENGTH) void verify(c);
              }}
              errorKey={errorKey}
              invalid={!!error}
              disabled={busy}
            />
            {error && (
              <GlydeText variant="callout" style={{ color: colors.status.danger }}>
                {error}
              </GlydeText>
            )}
            {__DEV__ && (
              <GlydeText variant="caption" tone="tertiary">
                Prototype: no email is sent. Use the test code.
              </GlydeText>
            )}
          </>
        )}
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.tapMin + space.xs,
    borderBottomWidth: size.hairline,
  },
});
