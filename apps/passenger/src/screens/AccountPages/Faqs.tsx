import { GlydeText, hapticFor, radius, size, space, useTheme } from '@glyde/ui';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { PageScaffold } from '@/components/PageScaffold';

/**
 * FAQs (Account tab, uix-spec 2.9). Every answer restates a rule from docs/product.md,
 * docs/uix-spec.md or a decision recorded in this project — nothing invented.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'How does Glyde work?',
    a: 'Glyde runs scheduled shuttles on fixed routes with fixed stops. You choose your pickup and drop-off, book and pay for a seat in advance, then board by having your QR ticket scanned. You can watch your bus live on the map.',
  },
  {
    q: 'When is my seat confirmed?',
    a: 'Your seat is reserved when you pay, and confirmed when your QR code is scanned as you board.',
  },
  {
    q: 'What if I miss my bus?',
    a: 'If your ticket isn’t scanned within 3 minutes of the bus reaching your pickup, you’re marked as missed and the seat is released. You can move a missed booking to a later bus the same day, up to 2 times. After that, or if you don’t board by the end of the day, the fare isn’t refunded.',
  },
  {
    q: 'My QR code won’t scan. What do I do?',
    a: 'Tell the conductor the Ticket ID printed under your QR code (it starts with GLY-). They can enter it instead.',
  },
  {
    q: 'Can I book for someone else?',
    a: 'Yes. Tap + next to the pickup to add another drop-off — each extra stop is another passenger with their own seat and ticket. You can also share a ticket by link from the ticket screen.',
  },
  {
    q: 'How do shared ticket links work?',
    a: 'Anyone with the link can show the QR code. After it’s scanned the link shows “On Trip”, and after drop-off it stops working.',
  },
  {
    q: 'Why can I book a seat on a bus that looks full?',
    a: 'Seats are booked only for the part of the route you travel. If someone gets off before you get on, that seat is free for your journey.',
  },
  {
    q: 'How can I pay?',
    a: 'With your Glyde Wallet, Mobile Money or a card. You can save payment methods and top up your wallet in the Payments tab. All trips are paid in advance.',
  },
  {
    q: 'What if my payment fails?',
    a: 'Your seats are held for 3 minutes while you pay. You can try again or use another payment method in that time.',
  },
  {
    q: 'How is my fare calculated?',
    a: 'Your fare is shown before you pay. It’s made up of a base fare for your trip, a booking fee and a platform fee, minus any discounts.',
  },
];

export function FaqsScreen() {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PageScaffold title="FAQs">
      <View style={[styles.group, { borderColor: colors.border.default }]}>
        {FAQS.map((f, i) => (
          <Animated.View key={f.q} layout={LinearTransition}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border.default }]} />}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === i }}
              onPress={() => {
                hapticFor('selection');
                setOpen((o) => (o === i ? null : i));
              }}
              style={styles.q}
            >
              <GlydeText variant="headline" style={styles.flex}>
                {f.q}
              </GlydeText>
              <View style={open === i ? styles.rotated : undefined}>
                <ChevronDown size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.tertiary} />
              </View>
            </Pressable>
            {open === i && (
              <Animated.View entering={FadeIn} style={styles.a}>
                <GlydeText variant="body" tone="secondary">
                  {f.a}
                </GlydeText>
              </Animated.View>
            )}
          </Animated.View>
        ))}
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { borderWidth: size.hairline, borderRadius: radius.lg, overflow: 'hidden' },
  divider: { height: size.hairline },
  q: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, minHeight: size.tapMin },
  a: { paddingHorizontal: space.md, paddingBottom: space.md },
  rotated: { transform: [{ rotate: '180deg' }] },
});
