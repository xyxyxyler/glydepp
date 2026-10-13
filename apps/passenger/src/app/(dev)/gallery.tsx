import {
  Banner,
  BusCard,
  SeatGrid,
  type SeatCell,
  LocationInput,
  OtpInput,
  TextField,
  TicketCard,
  CheckDraw,
  formatGHS,
  GlydeText,
  PrimaryButton,
  PulseRing,
  radius,
  RollingNumber,
  SecondaryButton,
  Skeleton,
  StatusChip,
  size,
  space,
  ThemeProvider,
  useTheme,
  useToast,
  type ThemeName,
  type ToastTone,
} from '@glyde/ui';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Dev-only. Every @glyde/ui primitive in every state, for reviewing motion on a device. */
export default function Gallery() {
  const [theme, setTheme] = useState<ThemeName>('light');
  return (
    <ThemeProvider theme={theme}>
      <GalleryBody theme={theme} onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} />
    </ThemeProvider>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border.default }]}>
      <GlydeText variant="title2">{title}</GlydeText>
      {children}
    </View>
  );
}

// Three rows of the Coaster layout for the gallery.
const GALLERY_GRID: SeatCell[][] = [
  [{ type: 'driver' }, { type: 'empty' }, { type: 'aisle' }, { type: 'empty' }, { type: 'door' }],
  [
    { type: 'seat', no: 1 },
    { type: 'seat', no: 2 },
    { type: 'aisle' },
    { type: 'seat', no: 3 },
    { type: 'seat', no: 4 },
  ],
  [
    { type: 'seat', no: 5 },
    { type: 'seat', no: 6 },
    { type: 'aisle' },
    { type: 'seat', no: 7 },
    { type: 'seat', no: 8 },
  ],
];

const SAMPLE_FARES = [1250, 1500, 2475, 980, 12000]; // pesewas — sample numbers, not real fares

function GalleryBody({ theme, onToggleTheme }: { theme: ThemeName; onToggleTheme: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [fare, setFare] = useState(SAMPLE_FARES[0]);
  const [seats, setSeats] = useState(12);
  const [checkKey, setCheckKey] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [pulsing, setPulsing] = useState(true);
  const [selectedCard, setSelectedCard] = useState<number | null>(0);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [extraStop, setExtraStop] = useState(false);
  const [gallerySeat, setGallerySeat] = useState<number | null>(4);
  const [otp, setOtp] = useState('');
  const [fieldText, setFieldText] = useState('');
  const [otpError, setOtpError] = useState(0);

  const toastSamples: Record<ToastTone, { title: string; message: string }> = {
    success: { title: 'Payment received', message: 'Sample success toast' },
    warning: { title: 'Bus approaching', message: 'Sample warning toast' },
    danger: { title: 'Payment failed', message: 'Sample error toast' },
    info: { title: 'Heads up', message: 'Sample info toast' },
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg.base }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xxxl,
        },
      ]}
    >
      <GlydeText variant="title1">Gallery</GlydeText>
      <GlydeText variant="callout" tone="secondary">
        Dev only · reduce motion: {reduceMotion ? 'on' : 'off'}
      </GlydeText>

      <View style={styles.row}>
        <GlydeText variant="body">Dark theme</GlydeText>
        <Switch accessibilityLabel="Dark theme" value={theme === 'dark'} onValueChange={onToggleTheme} />
      </View>

      <PrimaryButton
        label="Open map + bottom sheet demo"
        haptic="selection"
        onPress={() => router.push('/gallery-map')}
      />

      <Section title="Buttons">
        <GlydeText variant="caption" tone="secondary">
          Press and hold to see the pressed state.
        </GlydeText>
        <PrimaryButton label="Proceed to Payment" disabled={disabled} loading={loading} />
        <SecondaryButton label="Secondary action" disabled={disabled} loading={loading} />
        <View style={styles.row}>
          <GlydeText variant="body">Loading</GlydeText>
          <Switch accessibilityLabel="Loading" value={loading} onValueChange={setLoading} />
        </View>
        <View style={styles.row}>
          <GlydeText variant="body">Disabled</GlydeText>
          <Switch accessibilityLabel="Disabled" value={disabled} onValueChange={setDisabled} />
        </View>
      </Section>

      <Section title="Skeleton">
        {showSkeleton ? (
          <View style={styles.skeletonCard}>
            <Skeleton width={size.busMarker} height={size.busMarker} radius="md" />
            <View style={styles.skeletonLines}>
              <Skeleton height={space.md} width="60%" radius="sm" />
              <Skeleton height={space.sm} width="40%" radius="sm" />
            </View>
            <Skeleton width={space.xxxl + space.md} height={space.md} radius="sm" />
          </View>
        ) : (
          <View style={styles.skeletonCard}>
            <View style={[styles.fakeIcon, { backgroundColor: colors.brand.tint }]} />
            <View style={styles.skeletonLines}>
              <GlydeText variant="headline">Loaded content</GlydeText>
              <GlydeText variant="caption" tone="secondary">
                Same dimensions as the skeleton
              </GlydeText>
            </View>
            <GlydeText variant="headline">{formatGHS(1250)}</GlydeText>
          </View>
        )}
        <SecondaryButton
          label={showSkeleton ? 'Show loaded state' : 'Show loading state'}
          onPress={() => setShowSkeleton((s) => !s)}
        />
      </Section>

      <Section title="RollingNumber">
        <RollingNumber value={fare} format={formatGHS} variant="display" />
        <PrimaryButton
          label="Next sample fare"
          haptic="selection"
          onPress={() => setFare((f) => SAMPLE_FARES[(SAMPLE_FARES.indexOf(f) + 1) % SAMPLE_FARES.length])}
        />
        <View style={styles.row}>
          <SecondaryButton
            label="−"
            accessibilityHint="One fewer seat"
            onPress={() => setSeats((s) => Math.max(0, s - 1))}
          />
          <RollingNumber value={seats} format={(n) => `${n} seats left`} variant="headline" />
          <SecondaryButton label="+" accessibilityHint="One more seat" onPress={() => setSeats((s) => s + 1)} />
        </View>
      </Section>

      <Section title="CheckDraw">
        <View style={styles.centre}>
          <CheckDraw playKey={checkKey} haptic={checkKey > 0} />
        </View>
        <SecondaryButton label="Replay" onPress={() => setCheckKey((k) => k + 1)} />
      </Section>

      <Section title="PulseRing">
        <View style={[styles.centre, styles.pulseStage]}>
          <PulseRing size={size.busMarker} active={pulsing} style={styles.absolute} />
          <View style={[styles.userDot, { backgroundColor: colors.marker.userDot }]} />
        </View>
        <View style={styles.row}>
          <GlydeText variant="body">Active</GlydeText>
          <Switch accessibilityLabel="Pulse active" value={pulsing} onValueChange={setPulsing} />
        </View>
      </Section>

      <Section title="LocationInput">
        <LocationInput
          fields={[
            {
              id: 'p',
              kind: 'pickup',
              text: 'Current location · Madina',
              placeholder: 'Pickup stop',
              accessibilityLabel: 'Pickup',
            },
            {
              id: 'd',
              kind: 'dropoff',
              text: 'Ridge',
              placeholder: 'Where to?',
              accessibilityLabel: 'Drop-off',
            },
            ...(extraStop
              ? [
                  {
                    id: 'e',
                    kind: 'dropoff' as const,
                    text: '',
                    placeholder: 'Another passenger’s stop',
                    accessibilityLabel: 'Extra drop-off',
                    removable: true,
                  },
                ]
              : []),
          ]}
          activeId={activeField}
          onFocusField={setActiveField}
          onChangeText={() => {}}
          onAddStop={() => setExtraStop(true)}
          onRemoveStop={() => setExtraStop(false)}
        />
      </Section>

      <Section title="BusCard">
        {[
          { eta: 6, seats: 21, warning: null, fare: 1250 },
          { eta: 18, seats: 6, warning: 'almost-full' as const, fare: 1250 },
          { eta: 31, seats: 2, warning: 'last-seats' as const, fare: null },
        ].map((c, i) => (
          <BusCard
            key={i}
            etaMinutes={c.eta}
            detail={`Arrives 17:4${i} · GLYDE-TEST-0${i + 1}`}
            seatsFree={c.seats}
            warning={c.warning}
            farePesewas={c.fare}
            selected={selectedCard === i}
            onPress={() => setSelectedCard(i)}
          />
        ))}
        <GlydeText variant="caption" tone="secondary">
          Sample numbers only — not Glyde fares.
        </GlydeText>
      </Section>

      <Section title="TicketCard">
        <TicketCard
          title="Madina → Ridge"
          subtitle="Boarding ~07:12 (estimate)"
          qr={<QRCode value="GLYDE1:gallery-sample-not-a-real-ticket" size={size.qr} />}
          ticketCode="GLY-7K3QX9"
          qrHint="Sample only — not a real ticket"
          details={[
            { label: 'Bus', value: 'GLYDE-TEST-02' },
            { label: 'Seat', value: '5' },
            { label: 'Pickup', value: 'Madina' },
            { label: 'Drop-off', value: 'Ridge' },
          ]}
          backdrop={colors.bg.base}
        />
      </Section>

      <Section title="TextField">
        <TextField label="First name" placeholder="Ama" value={fieldText} onChangeText={setFieldText} />
        <TextField
          label="Company"
          placeholder="e.g. Ministry of Finance"
          value=""
          error="Name of company is required"
        />
      </Section>

      <Section title="OtpInput">
        <OtpInput
          value={otp}
          onChange={setOtp}
          errorKey={otpError}
          invalid={otpError > 0 && otp.length === 0}
          autoFocus={false}
        />
        <SecondaryButton
          label="Simulate wrong code"
          haptic="failure"
          onPress={() => {
            setOtp('');
            setOtpError((k) => k + 1);
          }}
        />
      </Section>

      <Section title="SeatGrid">
        <SeatGrid
          grid={GALLERY_GRID}
          stateOf={(n) => (n === gallerySeat ? 'selected' : [2, 7, 8].includes(n) ? 'unavailable' : 'available')}
          onSeatPress={(n) => setGallerySeat((s) => (s === n ? null : n))}
        />
        <GlydeText variant="caption" tone="secondary">
          Seats 2, 7, 8 are taken: tap one to see the “nope” nudge.
        </GlydeText>
      </Section>

      <Section title="Banner & StatusChip">
        <Banner
          tone="warning"
          message="Enable location services to view nearby buses and accurate routes."
          actionLabel="Open Settings"
          onAction={() => toast.show({ tone: 'info', title: 'Action pressed' })}
        />
        <Banner
          tone="danger"
          message="Couldn't load live buses."
          actionLabel="Retry"
          onAction={() => toast.show({ tone: 'info', title: 'Retry pressed' })}
        />
        <Banner tone="info" message="Offline — showing last known bus positions." />
        <StatusChip label="Finding buses…" />
        <StatusChip label="Almost full" tone="warning" />
      </Section>

      <Section title="Toast">
        {(Object.keys(toastSamples) as ToastTone[]).map((tone) => (
          <SecondaryButton
            key={tone}
            label={`Show ${tone}`}
            haptic={null}
            onPress={() => toast.show({ tone, ...toastSamples[tone] })}
          />
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screenX, gap: space.xl },
  section: {
    gap: space.sm,
    paddingTop: space.xl,
    borderTopWidth: size.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: size.tapMin,
  },
  centre: { alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute' },
  pulseStage: { height: size.busMarker * 2 },
  userDot: {
    width: size.userDot,
    height: size.userDot,
    borderRadius: radius.pill,
  },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  skeletonLines: { flex: 1, gap: space.xs },
  fakeIcon: {
    width: size.busMarker,
    height: size.busMarker,
    borderRadius: radius.md,
  },
});
