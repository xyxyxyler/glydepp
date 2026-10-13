import { PulseRing, splash } from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useOnboardingStatus } from '@/features/onboarding/useOnboardingStatus';

import { useSplashExit } from './hooks/useSplashExit';

const logo = require('@/assets/images/glyde-logo.png');

/**
 * uix-spec 2.1 Splash. Pixel-matches the native splash (same background, logo size, centre) so
 * the handoff is invisible, then shows a soft green pulse while the app initialises.
 */
export function SplashScreen() {
  const status = useOnboardingStatus();
  const { logoStyle, exiting } = useSplashExit(status !== 'loading', () => {
    // TODO(Home): onboarded users go to '/home' (or their active trip) once it exists.
    router.replace('/landing');
  });

  return (
    <View style={styles.root} accessible accessibilityRole="image" accessibilityLabel="Glyde">
      <StatusBar style="light" />
      <Animated.View style={[styles.centre, logoStyle]}>
        <PulseRing size={splash.logoSize} active={!exiting} style={styles.ring} />
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: splash.background, alignItems: 'center', justifyContent: 'center' },
  centre: { width: splash.logoSize, height: splash.logoSize, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  logo: { width: splash.logoSize, height: splash.logoSize },
});
