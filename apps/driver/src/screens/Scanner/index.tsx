import {
  CheckDraw,
  GlydeText,
  hapticFor,
  layout,
  motion,
  PrimaryButton,
  radius,
  SecondaryButton,
  shake,
  size,
  space,
  StatusIcon,
  TextField,
  useTheme,
} from '@glyde/ui';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import { Keyboard as KeyboardIcon, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDriver } from '@/features/driver/useDriver';
import { useDriverTrip } from '@/features/trip/useDriverTrip';
import { supabase } from '@/lib/supabase';

/** uix-spec: the result overlay auto-dismisses after 2–3 seconds. */
const OVERLAY_MS = 2_500;

type ScanResult =
  { ok: true; seat: number; dropoff: string; code: string } | { ok: false; title: string; detail: string };

const FAILURES: Record<string, string> = {
  not_found: 'Ticket does not exist.',
  already_used: 'Ticket already used.',
  wrong_bus: 'This ticket is for a different bus.',
  not_paid: 'This ticket hasn’t been paid for.',
  not_valid: 'This ticket is no longer valid.',
  trip_not_running: 'This trip isn’t running.',
};

/**
 * Conductor scanner (uix-spec 3.4 QR Scan System; decision: conductor's handheld). Scans the
 * passenger QR — or the Ticket ID typed in as the fallback — against the current trip.
 * Success: "Passenger Verified", seat + drop-off, success haptic and spoken confirmation.
 * Failure: "Invalid or Already Used Ticket", shake, error haptic and spoken alert.
 * No overrides and no manual adds (CLAUDE.md §6).
 */
export function ScannerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [permission, requestPermission] = useCameraPermissions();
  const driver = useDriver();
  const { trip } = useDriverTrip();
  const voice = driver.status === 'ready' ? driver.driver.voice_alerts : true;
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const busy = useRef(false); // camera fires many events per QR
  const x = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      setResult(null);
      busy.current = false;
    }, OVERLAY_MS);
    return () => clearTimeout(t);
  }, [result]);
  useEffect(() => () => void Speech.stop(), []);

  const say = (text: string) => {
    if (!voice) return;
    Speech.stop();
    Speech.speak(text, { language: 'en-GB' });
  };

  const check = async (raw: string) => {
    if (!trip || busy.current) return;
    busy.current = true;
    setChecking(true);
    const { data, error } = await supabase.rpc('validate_ticket', { p_trip_id: trip.tripId, p_code: raw });
    setChecking(false);
    const r = data as { result: string; seat_no?: number; dropoff?: string; ticket_code?: string } | null;
    if (!error && r?.result === 'ok') {
      hapticFor('scanSuccess');
      say(`Passenger verified. Seat ${r.seat_no}.`);
      setResult({ ok: true, seat: r.seat_no ?? 0, dropoff: r.dropoff ?? '', code: r.ticket_code ?? '' });
      setCode('');
      Keyboard.dismiss();
      return;
    }
    hapticFor('failure');
    say('Invalid or already used ticket.');
    const detail = error
      ? /fetch|network/i.test(error.message)
        ? 'You’re offline. Check the connection and scan again.'
        : 'This device can’t scan for this trip.'
      : (FAILURES[r?.result ?? ''] ?? 'Ticket does not exist.');
    setResult({ ok: false, title: 'Invalid or Already Used Ticket', detail });
    if (!reduceMotion) {
      const leg = motion.shake / (shake.cycles * 2);
      x.set(
        withSequence(
          withRepeat(
            withSequence(
              withTiming(-shake.amplitude, { duration: leg }),
              withTiming(shake.amplitude, { duration: leg }),
            ),
            shake.cycles,
          ),
          withTiming(0, { duration: leg / 2 }),
        ),
      );
    }
  };

  const onScan = (e: BarcodeScanningResult) => {
    if (!result && !manual) void check(e.data);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/dashboard'));

  let body;
  if (trip === undefined) {
    body = (
      <GlydeText variant="body" tone="secondary" style={styles.center}>
        Loading trip…
      </GlydeText>
    );
  } else if (!trip) {
    body = (
      <View style={styles.message}>
        <GlydeText variant="title2" style={styles.center}>
          No trip running
        </GlydeText>
        <GlydeText variant="body" tone="secondary" style={styles.center}>
          Start the trip on the driver’s dashboard, then scan tickets here.
        </GlydeText>
      </View>
    );
  } else if (!permission) {
    body = null;
  } else if (!permission.granted && !manual) {
    body = (
      <View style={styles.message}>
        <GlydeText variant="title2" style={styles.center}>
          Camera needed to scan tickets
        </GlydeText>
        {permission.canAskAgain ? (
          <PrimaryButton label="Allow camera" size="driver" onPress={() => void requestPermission()} />
        ) : (
          <GlydeText variant="body" tone="secondary" style={styles.center}>
            Turn on camera access for Glyde Driver in Settings, or enter Ticket IDs by hand.
          </GlydeText>
        )}
        <SecondaryButton label="Enter Ticket ID" size="driver" onPress={() => setManual(true)} />
      </View>
    );
  } else {
    body = (
      <>
        {!manual && (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={result || checking ? undefined : onScan}
            />
            <View style={[styles.frame, { borderColor: colors.brand.primary }]} pointerEvents="none" />
          </View>
        )}
        {manual ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.manual}>
            <GlydeText variant="title2">Enter Ticket ID</GlydeText>
            <GlydeText variant="body" tone="secondary">
              Use this only when the QR won’t scan. The Ticket ID is printed under the passenger’s QR.
            </GlydeText>
            <TextField
              label="Ticket ID"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="GLY-XXXXXX"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={() => code.trim() && void check(code)}
            />
            <PrimaryButton
              label="Check ticket"
              size="driver"
              loading={checking}
              disabled={!code.trim()}
              onPress={() => void check(code)}
            />
            <SecondaryButton label="Back to camera" size="driver" onPress={() => setManual(false)} />
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.footer}>
            <GlydeText variant="headline" style={styles.center}>
              {checking ? 'Checking…' : 'Point at the passenger’s QR code'}
            </GlydeText>
            <SecondaryButton
              label="QR won’t scan? Enter Ticket ID"
              size="driver"
              haptic="selection"
              onPress={() => setManual(true)}
            />
          </View>
        )}
      </>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg.base, paddingTop: insets.top, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.head}>
        <View style={styles.flex}>
          <GlydeText variant="title2">Scan tickets</GlydeText>
          <GlydeText variant="callout" tone="secondary" numberOfLines={1}>
            {trip ? `${trip.routeName} · ${trip.plate}` : 'Conductor scanner'}
          </GlydeText>
        </View>
        {trip && permission?.granted && !manual && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter Ticket ID"
            onPress={() => setManual(true)}
            style={styles.iconButton}
          >
            <KeyboardIcon size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          onPress={close}
          style={styles.iconButton}
        >
          <X size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
        </Pressable>
      </View>
      <View style={styles.body}>{body}</View>

      {result && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.scrim }]}
          onPress={() => {
            setResult(null);
            busy.current = false;
          }}
          accessibilityLabel="Dismiss result"
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.bg.sheet,
                borderColor: result.ok ? colors.brand.primary : colors.status.danger,
              },
              shakeStyle,
            ]}
            accessibilityLiveRegion="assertive"
          >
            {result.ok ? <CheckDraw haptic={false} /> : <StatusIcon tone="danger" />}
            <GlydeText variant="title1" style={[styles.center, !result.ok && { color: colors.status.danger }]}>
              {result.ok ? 'Passenger Verified' : result.title}
            </GlydeText>
            {result.ok ? (
              <>
                <GlydeText variant="display" style={styles.center}>
                  Seat {result.seat}
                </GlydeText>
                <GlydeText variant="body" tone="secondary" style={styles.center}>
                  Drop-off: {result.dropoff} · {result.code}
                </GlydeText>
              </>
            ) : (
              <GlydeText variant="body" tone="secondary" style={styles.center}>
                {result.detail}
              </GlydeText>
            )}
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.screenX,
    paddingVertical: space.sm,
  },
  iconButton: { width: size.driverTap, height: size.driverTap, alignItems: 'center', justifyContent: 'center' },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: space.screenX,
    gap: space.md,
    justifyContent: 'center',
  },
  message: { gap: space.md },
  cameraWrap: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  frame: { width: size.qr, height: size.qr, borderWidth: size.selectedBorder * 2, borderRadius: radius.lg },
  footer: { gap: space.sm },
  manual: { gap: space.md },
  overlay: { alignItems: 'center', justifyContent: 'center', padding: space.screenX },
  card: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    borderRadius: radius.xl,
    borderWidth: size.selectedBorder,
    padding: space.xl,
    gap: space.sm,
    alignItems: 'center',
  },
});
