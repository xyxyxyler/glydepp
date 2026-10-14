import {
  CheckDraw,
  GlydeText,
  hapticFor,
  DangerButton,
  radius,
  SecondaryButton,
  size,
  space,
  TextField,
  useTheme,
} from '@glyde/ui';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { supabase } from '@/lib/supabase';

const MIN_DESCRIPTION = 3;

/**
 * uix-spec 3.2 SOS: describe the issue → confirm (two-step, DESIGN.md §8.11: never one accidental
 * tap) → active trip ends automatically and a high-priority alert goes to HQ.
 */
export function SosPanel({ hasTrip, onSent }: { hasTrip: boolean; onSent: () => void }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [state, setState] = useState<'edit' | 'sending' | 'sent'>('edit');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setState('sending');
    setError(null);
    const { error: e } = await supabase.rpc('driver_sos', { p_description: text.trim() });
    if (e) {
      hapticFor('failure');
      setState('edit');
      setError(
        /fetch|network/i.test(e.message)
          ? 'You’re offline — the SOS was not sent. If you’re in danger, call emergency services.'
          : 'The SOS couldn’t be sent. Try again.',
      );
      return;
    }
    hapticFor('paymentSuccess');
    setState('sent');
    onSent();
  };

  const confirm = () => {
    if (text.trim().length < MIN_DESCRIPTION) {
      hapticFor('failure');
      setError('Describe the issue in a few words.');
      return;
    }
    hapticFor('confirm');
    Alert.alert(
      'Send SOS to HQ?',
      hasTrip ? 'Your current trip will end immediately and HQ will be alerted.' : 'HQ will be alerted immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: () => void send() },
      ],
    );
  };

  if (state === 'sent')
    return (
      <View style={[styles.root, styles.centre]}>
        <CheckDraw haptic={false} />
        <GlydeText variant="title1" style={styles.center}>
          SOS sent
        </GlydeText>
        <GlydeText variant="body" tone="secondary" style={styles.center}>
          HQ has your alert and location.{hasTrip ? ' Your trip has been ended.' : ''} Stay safe — HQ will contact you.
        </GlydeText>
        <SecondaryButton
          label="Send another"
          size="driver"
          onPress={() => {
            setText('');
            setState('edit');
          }}
        />
      </View>
    );

  return (
    <View style={styles.root}>
      <View style={[styles.head, { backgroundColor: colors.statusTint.danger }]}>
        <TriangleAlert size={size.icon * 1.5} strokeWidth={size.iconStroke} color={colors.status.danger} />
        <View style={styles.flex}>
          <GlydeText variant="title2" style={{ color: colors.status.danger }}>
            Emergency / SOS
          </GlydeText>
          <GlydeText variant="callout">
            For breakdowns, accidents or safety issues. {hasTrip ? 'Sending ends your current trip.' : ''}
          </GlydeText>
        </View>
      </View>
      <TextField
        label="What’s happening?"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
        }}
        placeholder="e.g. Engine overheating near Adenta"
        multiline
        maxLength={1000}
        error={error ?? undefined}
      />
      <DangerButton label="Send SOS" size="driver" loading={state === 'sending'} onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg, width: '100%', maxWidth: size.qr * 3, alignSelf: 'center' },
  centre: { alignItems: 'center', paddingVertical: space.xxl },
  center: { textAlign: 'center' },
  flex: { flex: 1, gap: space.xxs },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center', borderRadius: radius.lg, padding: space.lg },
});
