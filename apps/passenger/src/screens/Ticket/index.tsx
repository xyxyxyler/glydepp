import {
  GlydeText,
  hapticFor,
  radius,
  SecondaryButton,
  size,
  Skeleton,
  space,
  TicketCard,
  useTheme,
  useToast,
} from '@glyde/ui';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { qrPayload } from '@/features/tickets/qr';
import { shareTicketToken, useTickets, type Ticket } from '@/features/tickets/useTickets';
import { formatAccraTime } from '@/features/time/useNow';

import { QrFullScreen } from './components/QrFullScreen';
import { TicketQr } from './components/TicketQr';

/**
 * uix-spec 2.5 Ticket View: one ticket per seat (swipe between them), big QR (tap → full
 * screen), Ticket ID, bus, seat, pickup, drop-off, boarding time; each ticket shareable.
 */
export function TicketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const state = useTickets(paymentId);
  const [page, setPage] = useState(0);
  const [fullQr, setFullQr] = useState<Ticket | null>(null);
  const [sharing, setSharing] = useState(false);

  const tickets = state.status === 'ready' ? state.tickets : [];
  const current = tickets[page];

  const share = async () => {
    if (!current || sharing) return;
    setSharing(true);
    const token = await shareTicketToken(current.id);
    setSharing(false);
    if (!token) {
      hapticFor('failure');
      toast.show({
        tone: 'danger',
        title: 'Couldn’t create a share link',
        message: 'Check your connection and try again.',
      });
      return;
    }
    const url = Linking.createURL(`share/${token}`);
    await Share.share({
      message: `Glyde ticket ${current.ticketCode} — seat ${current.seatNo}, ${current.pickup} → ${current.dropoff}. Open in the Glyde app: ${url}`,
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.subtle, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <GlydeText variant="title2">{tickets.length > 1 ? 'Your tickets' : 'Your ticket'}</GlydeText>
        {current && (current.status === 'reserved' || current.status === 'boarded') && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share ticket ${current.ticketCode}`}
            onPress={() => void share()}
            style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.border.default }]}
          >
            <Share2 size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
          </Pressable>
        )}
      </View>

      {state.status === 'ready' && state.savedAt && (
        <GlydeText variant="caption" tone="secondary" style={styles.pad}>
          Offline — showing the copy saved on your phone at {formatAccraTime(state.savedAt)}.
        </GlydeText>
      )}

      {state.status === 'loading' ? (
        <View style={styles.pad}>
          <Skeleton height={size.qr * 2} radius="lg" />
        </View>
      ) : state.status === 'error' ? (
        <View style={[styles.pad, styles.message]}>
          <GlydeText variant="body">We couldn’t load your ticket.</GlydeText>
          <SecondaryButton label="Try again" onPress={state.retry} />
        </View>
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          accessibilityLabel={tickets.length > 1 ? `${tickets.length} tickets, swipe to see each` : undefined}
        >
          {tickets.map((t) => (
            <ScrollView key={t.id} style={{ width }} contentContainerStyle={styles.page}>
              <TicketCard
                title={`${t.pickup} → ${t.dropoff}`}
                subtitle={t.boardingAt ? `Boarding ~${formatAccraTime(t.boardingAt)} (estimate)` : undefined}
                qr={<TicketQr status={t.status} value={qrPayload(t.qrToken)} />}
                onQrPress={t.status === 'reserved' ? () => setFullQr(t) : undefined}
                qrHint={t.status === 'reserved' ? 'Tap the code to enlarge it for scanning' : undefined}
                ticketCode={t.ticketCode}
                details={[
                  { label: 'Bus', value: t.plate },
                  { label: 'Seat', value: String(t.seatNo) },
                  { label: 'Pickup', value: t.pickup },
                  { label: 'Drop-off', value: t.dropoff },
                ]}
                backdrop={colors.bg.subtle}
              />
            </ScrollView>
          ))}
        </ScrollView>
      )}

      {tickets.length > 1 && (
        <View style={styles.dots} accessibilityLabel={`Ticket ${page + 1} of ${tickets.length}`}>
          {tickets.map((t, i) => (
            <View
              key={t.id}
              style={[styles.dot, { backgroundColor: i === page ? colors.ink.primary : colors.border.default }]}
            />
          ))}
        </View>
      )}

      <View style={[styles.pad, { paddingBottom: insets.bottom + space.md }]}>
        <SecondaryButton label="Back to Home" onPress={() => router.replace('/home')} />
      </View>

      <QrFullScreen
        value={fullQr ? qrPayload(fullQr.qrToken) : null}
        ticketCode={fullQr?.ticketCode ?? ''}
        onClose={() => setFullQr(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenX,
    minHeight: size.tapMin,
  },
  iconButton: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: { paddingHorizontal: space.screenX },
  page: { paddingHorizontal: space.screenX, paddingVertical: space.md },
  message: { gap: space.sm, paddingTop: space.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, paddingBottom: space.sm },
  dot: { width: space.xs, height: space.xs, borderRadius: radius.pill },
});
