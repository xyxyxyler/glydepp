import { TicketPercent, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { disabledOpacity, elevation, radius, size, space } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

export type PromoCardProps = {
  title: string;
  validity: string;
  description?: string | null;
  /** Already used up by this passenger. */
  used?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
  /** Colour behind the card, so the stub cut-outs look punched through. */
  backdrop: string;
};

/**
 * uix-spec 2.9 NB / DESIGN.md §7 PromoCard: coupon with ticket-stub cut-outs, title, validity,
 * promo icon and a dismiss ×. Tapping opens Promotions.
 */
export function PromoCard({
  title,
  validity,
  description,
  used = false,
  onPress,
  onDismiss,
  backdrop,
}: PromoCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}. ${validity}${used ? '. Used' : ''}`}
      disabled={!onPress}
      onPress={() => {
        hapticFor('selection');
        onPress?.();
      }}
      style={[styles.card, { backgroundColor: colors.brand.tint }, used && styles.used]}
    >
      <View style={[styles.notch, styles.left, { backgroundColor: backdrop }]} />
      <View style={[styles.notch, styles.right, { backgroundColor: backdrop }]} />
      <View style={[styles.icon, { backgroundColor: colors.brand.primary }]}>
        <TicketPercent size={size.icon} strokeWidth={size.iconStroke} color={colors.brand.onPrimary} />
      </View>
      <View style={[styles.text, { borderLeftColor: colors.ink.tertiary }]}>
        <GlydeText variant="headline" style={{ color: colors.brand.onPrimary }}>
          {title}
        </GlydeText>
        {description ? (
          <GlydeText variant="callout" style={{ color: colors.brand.onPrimary }}>
            {description}
          </GlydeText>
        ) : null}
        <GlydeText variant="caption" style={{ color: colors.brand.onPrimary }}>
          {used ? 'Used' : validity}
        </GlydeText>
      </View>
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title}`}
          hitSlop={space.xs}
          onPress={() => {
            hapticFor('selection');
            onDismiss();
          }}
          style={styles.close}
        >
          <X size={size.iconChip} strokeWidth={size.iconStroke} color={colors.brand.onPrimary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevation.floating,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    minHeight: size.tapMin + space.md,
    overflow: 'hidden',
  },
  used: { opacity: disabledOpacity },
  notch: {
    position: 'absolute',
    top: '50%',
    width: size.ticketNotch,
    height: size.ticketNotch,
    borderRadius: radius.pill,
    marginTop: -size.ticketNotch / 2,
  },
  left: { left: -size.ticketNotch / 2 },
  right: { right: -size.ticketNotch / 2 },
  icon: {
    width: size.alertIcon,
    height: size.alertIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: space.xxs, borderLeftWidth: size.hairline, borderStyle: 'dashed', paddingLeft: space.sm },
  close: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -space.sm,
  },
});
