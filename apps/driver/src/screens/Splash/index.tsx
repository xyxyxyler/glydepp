import { easing, motion, PulseRing, splash } from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useDriverOnboarding } from '@/features/onboarding/useDriverOnboarding';

const logo = require('@/assets/images/glyde-logo.png');
const LOGO_HEIGHT = splash.logoWidth / splash.logoAspect;

/** uix-spec 3.1 Driver Splash — identical in structure to the passenger splash. */
export function SplashScreen() {
  const step = useDriverOnboarding();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [minShown, setMinShown] = useState(reduceMotion);

  useEffect(() => {
    if (minShown) return;
    const t = setTimeout(() => setMinShown(true), motion.pulse);
    return () => clearTimeout(t);
  }, [minShown]);

  const ready = step !== 'loading' && minShown;
  const target = step === 'loading' ? '/landing' : step;
  useEffect(() => {
    if (!ready) return;
    const go = () => router.replace(target);
    progress.set(
      withTiming(1, { duration: reduceMotion ? motion.reduceMotionFade : motion.base, easing: easing.exit }, (done) => {
        if (done) scheduleOnRN(go);
      }),
    );
  }, [ready, target, progress, reduceMotion]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ scale: reduceMotion ? 1 : 1 - (1 - splash.exitScale) * progress.get() }],
  }));

  return (
    <View style={styles.root} accessible accessibilityRole="image" accessibilityLabel="Glyde Driver">
      <StatusBar style="light" />
      <Animated.View style={[styles.centre, logoStyle]}>
        <PulseRing size={LOGO_HEIGHT} active={!ready} style={styles.ring} />
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: splash.background, alignItems: 'center', justifyContent: 'center' },
  centre: { width: splash.logoWidth, height: LOGO_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  logo: { width: splash.logoWidth, height: LOGO_HEIGHT },
});
