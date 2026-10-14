import { formatGhanaPhone, normaliseGhanaPhone } from '@glyde/domain';
import {
  Banner,
  formatGHS,
  GlydeText,
  hapticFor,
  PrimaryButton,
  RadioCard,
  radius,
  SecondaryButton,
  size,
  Skeleton,
  space,
  TextField,
  useTheme,
} from '@glyde/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CreditCard, Smartphone, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/features/auth/useSession';
import { payBooking, type MomoNetwork, type PayMethod } from '@/features/booking/pay';
import { decodePicks, holdErrorMessage, useHold } from '@/features/booking/useHold';
import { useNetwork } from '@/features/network/useNetwork';
import { usePaymentMethods } from '@/features/payments/usePaymentMethods';
import { useSeatMap } from '@/features/seats/useSeatMap';
import { useNow } from '@/features/time/useNow';
import { useWallet } from '@/features/wallet/useWallet';

import { TestCardSheet } from '@/components/TestCardSheet';

const NETWORKS: { id: MomoNetwork; label: string }[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'telecel', label: 'Telecel' },
  { id: 'airteltigo', label: 'AirtelTigo' },
];
const METHOD_LABEL: Record<PayMethod, string> = { wallet: 'Glyde Wallet', momo: 'Mobile Money', card: 'Card' };

/**
 * uix-spec 2.3 Payment. Seats are held on the server for 3 minutes while the passenger pays.
 * States: idle → processing (screen dims, button spins) → success (→ Payment Success) or failure
 * (banner + one-tap retry or another method). DESIGN.md §8.9.
 */
export function PaymentScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId: string; pickup: string; picks: string }>();
  const hold = useHold(params.tripId, params.pickup, params.picks);
  const { network } = useNetwork();
  const seatMap = useSeatMap(params.tripId ?? null);
  const wallet = useWallet();
  const session = useSession();
  const now = useNow(1000);

  const ownPhone =
    session.status === 'signed-in' && session.session.user.phone ? `0${session.session.user.phone.slice(3)}` : '';
  // Start from the passenger's default saved method (uix-spec 2.6); anything they pick here wins.
  const { methods: saved } = usePaymentMethods();
  const savedDefault = saved?.find((m) => m.isDefault);
  const [methodChoice, setMethod] = useState<PayMethod | null>(null);
  const [networkChoice, setMomoNetwork] = useState<MomoNetwork | null>(null);
  const [momoPhone, setMomoPhone] = useState<string | null>(null); // null = default / own number
  const method: PayMethod = methodChoice ?? savedDefault?.kind ?? 'momo';
  const momoNetwork: MomoNetwork = networkChoice ?? savedDefault?.momoNetwork ?? 'mtn';
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [cardSheet, setCardSheet] = useState(false);

  const stopName = (id: string) => network?.stops.find((s) => s.id === id)?.name ?? '…';
  const picks = useMemo(() => decodePicks(params.picks), [params.picks]);
  const plate = seatMap.status === 'ready' ? seatMap.map.plate : null;

  if (hold.status === 'error') {
    const msg = holdErrorMessage(hold.error);
    return (
      <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
        <ScreenHeader backLabel="Back to seats" />
        <View style={[styles.pad, styles.message]}>
          <GlydeText variant="title2">{msg.title}</GlydeText>
          <GlydeText variant="body" tone="secondary">
            {msg.body}
          </GlydeText>
          {hold.error === 'offline' || hold.error === 'server' ? (
            <PrimaryButton label="Try again" onPress={hold.retry} />
          ) : (
            <PrimaryButton label="Choose again" onPress={() => router.back()} />
          )}
        </View>
      </View>
    );
  }

  const held = hold.status === 'held' ? hold.hold : null;
  const leftS = held ? Math.max(0, Math.ceil((held.expiresAt - now) / 1000)) : null;
  const expired = leftS === 0;
  const walletShort = held && wallet.balance !== null && wallet.balance < held.amountPesewas;
  const defaultPhone =
    savedDefault?.kind === 'momo' && savedDefault.momoNumber ? formatGhanaPhone(savedDefault.momoNumber) : ownPhone;
  const phone = momoPhone ?? defaultPhone;

  const pay = async (cardOutcome?: 'approve' | 'decline') => {
    if (!held || processing) return;
    if (method === 'momo' && !normaliseGhanaPhone(phone)) {
      hapticFor('failure');
      setPhoneError('Enter the Ghana mobile number to charge, e.g. 024 123 4567.');
      return;
    }
    if (method === 'card' && !cardOutcome) {
      setCardSheet(true); // provider's (test) card page
      return;
    }
    setCardSheet(false);
    setFailure(null);
    setProcessing(true);
    const r = await payBooking(
      held.paymentId,
      method,
      method === 'momo'
        ? { network: momoNetwork, phone }
        : method === 'card'
          ? { testOutcome: cardOutcome ?? 'approve' }
          : {},
    );
    setProcessing(false);
    if (r.status === 'succeeded') {
      hapticFor('paymentSuccess');
      router.replace({ pathname: '/payment-success', params: { paymentId: held.paymentId } });
      return;
    }
    hapticFor('failure');
    if (r.status === 'expired') {
      setFailure('Your seats were released because the hold ran out. Please choose your seats again.');
      return;
    }
    setFailure(r.reason);
    if (method === 'wallet') void wallet.refresh();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}
    >
      <StatusBar style="dark" />
      <ScreenHeader backLabel="Back to seats" />
      <ScrollView
        contentContainerStyle={[styles.pad, styles.body]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!processing}
      >
        <GlydeText variant="title1">Payment</GlydeText>

        {failure && <Banner tone="danger" message={failure} />}

        {/* Trip summary (uix-spec: route, pickup, drop-off, seats, driver, bus number) */}
        <View style={[styles.card, { borderColor: colors.border.default }]}>
          <GlydeText variant="headline">
            {stopName(params.pickup ?? '')} → {picks.map((p) => stopName(p.dropoffStopId)).join(', ')}
          </GlydeText>
          <Row label="Bus" value={plate ?? '…'} />
          <Row label="Driver" value="Assigned before departure" />
          {!held ? (
            <Skeleton height={space.xxxl} radius="sm" />
          ) : (
            <>
              {held.tickets.map((t, i) => (
                <Row
                  key={t.id}
                  label={`Seat ${t.seat_no}${picks.length > 1 ? ` · to ${stopName(picks[i]?.dropoffStopId ?? '')}` : ''}`}
                  value={formatGHS(t.fare_pesewas)}
                />
              ))}
              {held.discountPesewas > 0 && (
                <Row
                  label={`Discount${held.promotionTitle ? ` · ${held.promotionTitle}` : ''}`}
                  value={`−${formatGHS(held.discountPesewas)}`}
                />
              )}
              <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
              <Row label="Total" value={formatGHS(held.amountPesewas)} strong />
            </>
          )}
        </View>

        <GlydeText variant="title2">Pay with</GlydeText>
        <RadioCard
          title={METHOD_LABEL.momo}
          subtitle="MTN, Telecel or AirtelTigo"
          icon={<Smartphone size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
          selected={method === 'momo'}
          onSelect={() => setMethod('momo')}
          disabled={processing}
        >
          <View style={styles.networks} accessibilityRole="radiogroup" accessibilityLabel="Mobile Money network">
            {NETWORKS.map((n) => {
              const active = n.id === momoNetwork;
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={n.label}
                  onPress={() => {
                    hapticFor('selection');
                    setMomoNetwork(n.id);
                  }}
                  style={[
                    styles.network,
                    {
                      backgroundColor: active ? colors.ink.primary : colors.bg.base,
                      borderColor: active ? colors.ink.primary : colors.border.default,
                    },
                  ]}
                >
                  <GlydeText variant="callout" tone={active ? 'inverse' : 'primary'}>
                    {n.label}
                  </GlydeText>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label="Mobile Money number"
            value={phone}
            onChangeText={(t) => {
              setMomoPhone(t);
              setPhoneError(null);
            }}
            placeholder="024 123 4567"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            error={phoneError}
          />
        </RadioCard>
        <RadioCard
          title={METHOD_LABEL.card}
          subtitle="Debit or credit card"
          icon={<CreditCard size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
          selected={method === 'card'}
          onSelect={() => setMethod('card')}
          disabled={processing}
        />
        <RadioCard
          title={METHOD_LABEL.wallet}
          subtitle={
            wallet.balance === null
              ? 'Checking balance…'
              : `Balance ${formatGHS(wallet.balance)}${walletShort ? ' — not enough for this trip' : ''} (test balance)`
          }
          icon={<Wallet size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />}
          selected={method === 'wallet'}
          onSelect={() => setMethod('wallet')}
          disabled={processing || !!walletShort}
        />
        {__DEV__ && (
          <GlydeText variant="caption" tone="tertiary">
            Prototype payments: no money moves. MoMo numbers ending 000 (declined) or 111 (not approved) test failures.
          </GlydeText>
        )}
      </ScrollView>

      <View
        style={[
          styles.pad,
          styles.footer,
          { paddingBottom: insets.bottom + space.md, backgroundColor: colors.bg.base },
        ]}
      >
        {leftS !== null && (
          <GlydeText
            variant="callout"
            tone={expired ? undefined : 'secondary'}
            style={expired ? { color: colors.status.danger } : undefined}
            tabular
            accessibilityLiveRegion="polite"
          >
            {expired
              ? 'Your seats were released.'
              : `Seats held for ${Math.floor(leftS / 60)}:${String(leftS % 60).padStart(2, '0')}`}
          </GlydeText>
        )}
        {expired ? (
          <SecondaryButton label="Choose seats again" onPress={() => router.back()} />
        ) : (
          <PrimaryButton
            label={held ? `Confirm & Pay ${formatGHS(held.amountPesewas)}` : 'Holding your seats…'}
            loading={processing || !held}
            haptic="confirm"
            onPress={() => void pay()}
          />
        )}
      </View>

      {/* Processing: the rest of the screen dims and can't be touched (DESIGN.md §8.9). */}
      {processing && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          accessibilityLabel="Processing payment"
          accessibilityLiveRegion="polite"
        />
      )}

      <TestCardSheet
        visible={cardSheet}
        headline={held ? `Pay ${formatGHS(held.amountPesewas)}` : ''}
        onClose={() => setCardSheet(false)}
        onResult={(outcome) => void pay(outcome)}
      />
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <GlydeText variant={strong ? 'headline' : 'callout'} tone={strong ? 'primary' : 'secondary'} style={styles.flex}>
        {label}
      </GlydeText>
      <GlydeText variant={strong ? 'headline' : 'callout'} tabular>
        {value}
      </GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pad: { paddingHorizontal: space.screenX },
  body: { gap: space.md, paddingBottom: space.xl },
  message: { gap: space.md, paddingTop: space.xl },
  card: { borderWidth: size.hairline, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: space.xl },
  divider: { height: size.hairline, marginVertical: space.xxs },
  networks: { flexDirection: 'row', gap: space.xs },
  network: {
    flex: 1,
    minHeight: size.tapMin,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingTop: space.sm, gap: space.xs },
});
