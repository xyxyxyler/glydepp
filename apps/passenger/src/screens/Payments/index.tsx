import {
  formatGHS,
  GlydeText,
  hapticFor,
  PrimaryButton,
  radius,
  RollingNumber,
  SecondaryButton,
  size,
  Skeleton,
  space,
  useTheme,
  useToast,
} from '@glyde/ui';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CreditCard, Smartphone } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { methodLabel, usePaymentMethods, type PaymentMethod } from '@/features/payments/usePaymentMethods';
import { useWallet } from '@/features/wallet/useWallet';

/**
 * uix-spec 2.6 Payments: wallet balance (prominent), Add Funds, saved MoMo numbers and cards —
 * add, remove, set as default.
 */
export function PaymentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const wallet = useWallet();
  const { methods, failed, remove, setDefault } = usePaymentMethods();

  // Balance changes after paying or topping up elsewhere.
  const { refresh } = wallet;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const manage = (m: PaymentMethod) => {
    hapticFor('selection');
    Alert.alert(methodLabel(m), m.isDefault ? 'This is your default payment method.' : undefined, [
      ...(m.isDefault
        ? []
        : [
            {
              text: 'Set as default',
              onPress: () =>
                void setDefault(m.id).then((r) =>
                  r === 'ok'
                    ? toast.show({ tone: 'success', title: 'Default payment method updated' })
                    : toast.show({ tone: 'danger', title: 'Couldn’t update', message: 'Please try again.' }),
                ),
            },
          ]),
      {
        text: 'Remove',
        style: 'destructive' as const,
        onPress: () =>
          void remove(m.id).then((r) =>
            r === 'ok'
              ? toast.show({ tone: 'info', title: 'Payment method removed' })
              : toast.show({ tone: 'danger', title: 'Couldn’t remove it', message: 'Please try again.' }),
          ),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.body}>
        <GlydeText variant="title1">Payments</GlydeText>

        <View style={[styles.balance, { backgroundColor: colors.bg.subtle }]}>
          <GlydeText variant="callout" tone="secondary">
            Glyde Wallet balance
          </GlydeText>
          {wallet.balance === null ? (
            <Skeleton height={size.button} width="60%" radius="md" />
          ) : (
            <RollingNumber
              value={wallet.balance}
              format={formatGHS}
              variant="display"
              accessibilityLabel={`Wallet balance ${formatGHS(wallet.balance)}`}
            />
          )}
          <GlydeText variant="caption" tone="tertiary">
            Prototype: wallets start with a GHS 100 test credit. No real money.
          </GlydeText>
          <PrimaryButton label="Add Funds" onPress={() => router.push('/payments/add-funds')} />
        </View>

        <View style={styles.section}>
          <GlydeText variant="title2">Payment methods</GlydeText>
          {methods === null ? (
            failed ? (
              <GlydeText variant="body" tone="secondary">
                We couldn’t load your payment methods.
              </GlydeText>
            ) : (
              <Skeleton height={size.tapMin * 2} radius="lg" />
            )
          ) : methods.length === 0 ? (
            <GlydeText variant="body" tone="secondary">
              No saved methods yet. Save a Mobile Money number or card to pay faster.
            </GlydeText>
          ) : (
            <View style={[styles.group, { borderColor: colors.border.default }]}>
              {methods.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border.default }]} />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${methodLabel(m)}${m.isDefault ? ', default' : ''}. Manage`}
                    onPress={() => manage(m)}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg.subtle }]}
                  >
                    <View style={[styles.icon, { backgroundColor: colors.bg.subtle }]}>
                      {m.kind === 'momo' ? (
                        <Smartphone size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
                      ) : (
                        <CreditCard size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
                      )}
                    </View>
                    <GlydeText variant="body" style={styles.flex}>
                      {methodLabel(m)}
                    </GlydeText>
                    {m.isDefault && (
                      <View style={[styles.badge, { backgroundColor: colors.ink.primary }]}>
                        <GlydeText variant="caption" tone="inverse">
                          Default
                        </GlydeText>
                      </View>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <SecondaryButton label="Add payment method" onPress={() => router.push('/payments/add-method')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screenX, paddingTop: space.lg, paddingBottom: space.xxl, gap: space.xl },
  balance: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  section: { gap: space.sm },
  group: { borderWidth: size.hairline, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.tapMin + space.sm,
    paddingHorizontal: space.md,
  },
  divider: { height: size.hairline, marginLeft: space.md },
  icon: {
    width: size.busCardIcon,
    height: size.busCardIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: space.xxs },
});
