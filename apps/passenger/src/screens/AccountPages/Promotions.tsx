import { GlydeText, PromoCard, size, Skeleton, space, useTheme } from '@glyde/ui';
import { TicketPercent } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { PageScaffold } from '@/components/PageScaffold';
import { usePromotions } from '@/features/promotions/usePromotions';

/** uix-spec 2.9 Promotions page: every promotion and discount available to the passenger. */
export function PromotionsScreen() {
  const { colors } = useTheme();
  const { promos } = usePromotions();
  return (
    <PageScaffold title="Promotions">
      {promos === null ? (
        <Skeleton height={size.tapMin * 2} radius="lg" />
      ) : promos.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.bg.subtle }]}>
            <TicketPercent size={size.icon * 2} strokeWidth={size.iconStroke} color={colors.ink.secondary} />
          </View>
          <GlydeText variant="title2">No promotions right now</GlydeText>
          <GlydeText variant="body" tone="secondary" style={styles.center}>
            When Glyde has an offer for you it will appear here and on Home, and the discount is applied automatically
            when you pay.
          </GlydeText>
        </View>
      ) : (
        <>
          <GlydeText variant="body" tone="secondary">
            Discounts are applied automatically when you pay — the best one available is used.
          </GlydeText>
          {promos.map((p) => (
            <PromoCard
              key={p.id}
              title={p.title}
              description={p.description}
              validity={p.validity}
              used={p.used}
              backdrop={colors.bg.base}
            />
          ))}
        </>
      )}
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  empty: { alignItems: 'center', gap: space.sm, paddingTop: space.xl },
  emptyIcon: {
    width: size.tapMin * 2,
    height: size.tapMin * 2,
    borderRadius: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
