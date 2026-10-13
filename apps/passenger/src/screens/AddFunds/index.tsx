import { normaliseGhanaPhone } from '@glyde/domain';
import {
  Banner,
  CheckDraw,
  formatGHS,
  GlydeText,
  hapticFor,
  PrimaryButton,
  RadioCard,
  radius,
  size,
  space,
  TextField,
  useTheme,
} from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CreditCard, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NetworkPicker } from '@/components/NetworkPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TestCardSheet } from '@/components/TestCardSheet';
import type { MomoNetwork } from '@/features/booking/pay';
import { methodLabel, usePaymentMethods } from '@/features/payments/usePaymentMethods';
import { TOP_UP, topUp } from '@/features/payments/topUp';

type Choice = { kind: 'saved'; id: string } | { kind: 'new-momo' } | { kind: 'card' };

/** uix-spec 2.6 Add Funds: amount → MoMo or card (mock provider) → wallet credited on the server. */
export function AddFundsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { methods } = usePaymentMethods();
  const [amount, setAmount] = useState<number>(TOP_UP.quickPicks[1]);
  const [custom, setCustom] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [network, setNetwork] = useState<MomoNetwork>('mtn');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [cardSheet, setCardSheet] = useState(false);
  const [done, setDone] = useState<{ added: number; balance: number } | null>(null);

  const savedDefault = methods?.find((m) => m.isDefault);
  const defaultChoice: Choice = savedDefault ? { kind: 'saved', id: savedDefault.id } : { kind: 'new-momo' };
  const selected = choice ?? defaultChoice;
  const amountOk = amount >= TOP_UP.min && amount <= TOP_UP.max;

  const run = async (cardOutcome?: 'approve' | 'decline') => {
    if (!amountOk || processing) return;
    let method: 'momo' | 'card';
    let details: Parameters<typeof topUp>[2];
    if (selected.kind === 'saved') {
      const m = methods?.find((x) => x.id === selected.id);
      if (!m) return;
      if (m.kind === 'card' && !cardOutcome) return setCardSheet(true);
      method = m.kind;
      details =
        m.kind === 'momo'
          ? { network: m.momoNetwork ?? 'mtn', phone: m.momoNumber ?? '' }
          : { testOutcome: cardOutcome ?? 'approve' };
    } else if (selected.kind === 'new-momo') {
      const e164 = normaliseGhanaPhone(phone);
      if (!e164) {
        hapticFor('failure');
        setFailure('Enter the Ghana mobile number to charge, e.g. 024 123 4567.');
        return;
      }
      method = 'momo';
      details = { network, phone: e164 };
    } else {
      if (!cardOutcome) return setCardSheet(true);
      method = 'card';
      details = { testOutcome: cardOutcome };
    }
    setCardSheet(false);
    setFailure(null);
    setProcessing(true);
    const r = await topUp(amount, method, details);
    setProcessing(false);
    if (r.status === 'succeeded') {
      hapticFor('paymentSuccess');
      setDone({ added: amount, balance: r.balancePesewas });
      return;
    }
    hapticFor('failure');
    setFailure(r.reason);
  };

  if (done) {
    return (
      <View
        style={[
          styles.root,
          styles.centre,
          { backgroundColor: colors.bg.base, paddingBottom: insets.bottom + space.lg },
        ]}
      >
        <CheckDraw haptic={false} />
        <GlydeText variant="title1">{formatGHS(done.added)} added</GlydeText>
        <GlydeText variant="body" tone="secondary">
          New wallet balance: {formatGHS(done.balance)}
        </GlydeText>
        <PrimaryButton label="Done" style={styles.stretch} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}
    >
      <StatusBar style="dark" />
      <ScreenHeader backLabel="Back to payments" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" scrollEnabled={!processing}>
        <GlydeText variant="title1">Add Funds</GlydeText>
        {failure && <Banner tone="danger" message={failure} />}

        <GlydeText variant="title2">Amount</GlydeText>
        <View style={styles.chips}>
          {TOP_UP.quickPicks.map((p) => {
            const active = !custom && amount === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  hapticFor('selection');
                  setCustom('');
                  setAmount(p);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.ink.primary : colors.bg.base,
                    borderColor: active ? colors.ink.primary : colors.border.default,
                  },
                ]}
              >
                <GlydeText variant="headline" tone={active ? 'inverse' : 'primary'}>
                  {formatGHS(p).replace('.00', '')}
                </GlydeText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="Or enter an amount (GHS)"
          value={custom}
          onChangeText={(t) => {
            const clean = t.replace(/[^\d.]/g, '');
            setCustom(clean);
            setAmount(Math.round(Number(clean || '0') * 100));
          }}
          placeholder="e.g. 75"
          keyboardType="decimal-pad"
          error={custom && !amountOk ? 'Top-ups must be between GHS 5 and GHS 1,000.' : null}
        />

        <GlydeText variant="title2">Pay with</GlydeText>
        {methods?.map((m) => (
          <RadioCard
            key={m.id}
            title={methodLabel(m)}
            subtitle={m.isDefault ? 'Default' : undefined}
            icon={
              m.kind === 'momo' ? (
                <Smartphone size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
              ) : (
                <CreditCard size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
              )
            }
            selected={selected.kind === 'saved' && selected.id === m.id}
            onSelect={() => setChoice({ kind: 'saved', id: m.id })}
            disabled={processing}
          />
        ))}
        <RadioCard
          title="Another Mobile Money number"
          icon={<Smartphone size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
          selected={selected.kind === 'new-momo'}
          onSelect={() => setChoice({ kind: 'new-momo' })}
          disabled={processing}
        >
          <NetworkPicker value={network} onChange={setNetwork} />
          <TextField
            label="Mobile Money number"
            value={phone}
            onChangeText={setPhone}
            placeholder="024 123 4567"
            keyboardType="phone-pad"
          />
        </RadioCard>
        <RadioCard
          title="Card"
          subtitle="Debit or credit card"
          icon={<CreditCard size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
          selected={selected.kind === 'card'}
          onSelect={() => setChoice({ kind: 'card' })}
          disabled={processing}
        />
        {__DEV__ && (
          <GlydeText variant="caption" tone="tertiary">
            Prototype: no money moves. MoMo numbers ending 000 test a decline.
          </GlydeText>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PrimaryButton
          label={amountOk ? `Add ${formatGHS(amount)}` : 'Choose an amount'}
          disabled={!amountOk}
          loading={processing}
          haptic="confirm"
          onPress={() => void run()}
        />
      </View>
      {processing && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} accessibilityLabel="Processing" />
      )}
      <TestCardSheet
        visible={cardSheet}
        headline={`Add ${formatGHS(amount)} to your wallet`}
        onClose={() => setCardSheet(false)}
        onResult={(o) => void run(o)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  centre: { alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.screenX },
  body: { paddingHorizontal: space.screenX, paddingBottom: space.xl, gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    flexGrow: 1,
    minWidth: size.tapMin * 1.5,
    minHeight: size.tapMin,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  footer: { paddingHorizontal: space.screenX, paddingTop: space.sm },
});
