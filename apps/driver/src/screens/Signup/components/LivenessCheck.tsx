import { CheckDraw, GlydeText, hapticFor, PrimaryButton, radius, size, space, useTheme } from '@glyde/ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const PROMPTS = ['Look straight at the camera', 'Blink slowly', 'Turn your head slightly left', 'Now slightly right'];
/** How long each prompt shows (prototype stub — no real face analysis). */
const STEP_MS = 1600;

/**
 * uix-spec 3.1 liveness test — a STUB that always succeeds (CLAUDE.md §4: liveness and Ghana
 * Card / licence validation are mocked). Guides the driver through real-time prompts on the
 * front camera, then reports success.
 */
export function LivenessCheck({ onPassed }: { onPassed: () => void }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState(-1); // -1 = not started
  const done = step >= PROMPTS.length;

  useEffect(() => {
    if (step < 0 || done) return;
    const t = setTimeout(() => {
      hapticFor('selection');
      setStep((s) => s + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [step, done]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onPassed, STEP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after success
  }, [done]);

  return (
    <View style={styles.root}>
      <GlydeText variant="title1">Face check</GlydeText>
      <GlydeText variant="body" tone="secondary">
        We check that you’re really you and match your Ghana Card and licence. Prototype: this check is simulated.
      </GlydeText>
      <View
        style={[
          styles.frame,
          { borderColor: done ? colors.brand.primary : colors.border.default, backgroundColor: colors.bg.subtle },
        ]}
      >
        {permission?.granted && !done ? (
          <CameraView style={StyleSheet.absoluteFill} facing="front" />
        ) : done ? (
          <CheckDraw haptic />
        ) : (
          <GlydeText variant="callout" tone="secondary" style={styles.center}>
            Camera preview appears here
          </GlydeText>
        )}
      </View>
      <GlydeText variant="title2" style={styles.center} accessibilityLiveRegion="polite">
        {done ? 'Verified' : step >= 0 ? PROMPTS[step] : 'Ready when you are'}
      </GlydeText>
      {step < 0 &&
        (permission?.granted ? (
          <PrimaryButton label="Start face check" size="driver" onPress={() => setStep(0)} />
        ) : (
          <>
            <PrimaryButton
              label="Allow camera"
              size="driver"
              onPress={() => void requestPermission().then((p) => p.granted && setStep(0))}
            />
            {permission && !permission.canAskAgain && (
              <PrimaryButton label="Continue without camera (prototype)" size="driver" onPress={() => setStep(0)} />
            )}
          </>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  center: { textAlign: 'center' },
  frame: {
    alignSelf: 'center',
    width: size.qr,
    height: size.qr * 1.25,
    borderRadius: radius.pill,
    borderWidth: size.selectedBorder * 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
