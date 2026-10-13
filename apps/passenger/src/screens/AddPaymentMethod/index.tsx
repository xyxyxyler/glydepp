import { normaliseGhanaPhone } from '@glyde/domain';
import {
  Banner,
  GlydeText,
  hapticFor,
  PrimaryButton,
  radius,
  size,
  space,
  TextField,
  useTheme,
  useToast,
} from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NetworkPicker } from '@/components/NetworkPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TestCardSheet } from '@/components/TestCardSheet';
import type { MomoNetwork } from '@/features/booking/pay';
import { usePaymentMethods } from '@/features/payments/usePaymentMethods';

/** Prototype card returned by the (test) hosted card page. */
const TEST_CARD = { brand: 'Test card', last4: '4242' } as const;

/** uix-spec 2.6 Add Payment Method: link a MoMo number or a card. */
export function AddPaymentMethodScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { addMomo, addCard } = usePaymentMethods();
  const [kind, setKind] = useState<'momo' | 'card'>('momo');
  const [network, setNetwork] = useState<MomoNetwork>('mtn');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cardSheet, setCardSheet] = useState(false);

  const finish = (r: 'ok' | 'duplicate' | 'offline' | 'error', label: string) => {
    if (r === 'ok') {
      hapticFor('paymentSuccess');
      toast.show({ tone: 'success', title: `${label} saved` });
      router.back();
      return;
    }
    hapticFor('failure');
    setError(
      r === 'duplicate'
        ? 'That number is already saved.'
        : r === 'offline'
          ? 'You’re offline. Try again when you’re connected.'
          : 'We couldn’t save it. Please try again.',
    );
  };

  const saveMomo = async () => {
    const e164 = normaliseGhanaPhone(phone);
    if (!e164) {
      hapticFor('failure');
      setError('Enter a Ghana mobile number, e.g. 024 123 4567.');
      return;
    }
    setSaving(true);
    finish(await addMomo(network, e164), 'Mobile Money number');
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}
    >
      <StatusBar style="dark" />
      <ScreenHeader backLabel="Back to payments" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <GlydeText variant="title1">Add payment method</GlydeText>
        <View style={[styles.segment, { backgroundColor: colors.bg.subtle }]} accessibilityRole="tablist">
          {(['momo', 'card'] as const).map((k) => {
            const active = k === kind;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  hapticFor('selection');
                  setKind(k);
                  setError(null);
                }}
                style={[styles.segmentItem, active && { backgroundColor: colors.bg.base }]}
              >
                <GlydeText variant="callout" tone={active ? 'primary' : 'secondary'}>
                  {k === 'momo' ? 'Mobile Money' : 'Card'}
                </GlydeText>
              </Pressable>
            );
          })}
        </View>
        {error && <Banner tone="danger" message={error} />}
        {kind === 'momo' ? (
          <>
            <NetworkPicker value={network} onChange={setNetwork} />
            <TextField
              label="Mobile Money number"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setError(null);
              }}
              placeholder="024 123 4567"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              onSubmitEditing={() => void saveMomo()}
            />
          </>
        ) : (
          <GlydeText variant="body" tone="secondary">
            Cards are added on the payment provider’s secure page, so Glyde never sees your card number. In this
            prototype a test card page stands in for it.
          </GlydeText>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        {kind === 'momo' ? (
          <PrimaryButton label="Save number" loading={saving} onPress={() => void saveMomo()} />
        ) : (
          <PrimaryButton label="Add a card" onPress={() => setCardSheet(true)} />
        )}
      </View>
      <TestCardSheet
        visible={cardSheet}
        headline={`Save ${TEST_CARD.brand} ··${TEST_CARD.last4}`}
        approveLabel="Save test card"
        onClose={() => setCardSheet(false)}
        onResult={(o) => {
          setCardSheet(false);
          if (o === 'decline') {
            hapticFor('failure');
            setError('Your card was declined. Try another card.');
            return;
          }
          void addCard(TEST_CARD.brand, TEST_CARD.last4).then((r) => finish(r, 'Card'));
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenX, paddingBottom: space.xl, gap: space.md },
  segment: { flexDirection: 'row', borderRadius: radius.pill, padding: space.xxs },
  segmentItem: {
    flex: 1,
    minHeight: size.tapMin - space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: space.screenX, paddingTop: space.sm },
});
