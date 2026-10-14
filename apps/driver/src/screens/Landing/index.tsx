import {
  GlydeText,
  layout,
  motion,
  PrimaryButton,
  SecondaryButton,
  size,
  space,
  splash,
  stagger,
  useTheme,
} from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logo = require('@/assets/images/glyde-logo.png');
const LOGO_HEIGHT = size.logoMedium / splash.logoAspect;

/**
 * uix-spec 3.1 Driver Landing: minimal, a single 'Get Started' (new drivers). Returning drivers
 * use the Login screen (3.1) — offered as a quiet secondary link.
 */
export function LandingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const enter = (i: number) =>
    reduceMotion
      ? FadeIn.duration(motion.reduceMotionFade)
      : FadeInDown.duration(motion.slow).delay(i * stagger.list * 2);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingBottom: insets.bottom + space.lg }]}>
      <StatusBar style="light" />
      <View style={styles.brand}>
        <Animated.Image
          entering={enter(0)}
          source={logo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Glyde"
        />
        <Animated.View entering={enter(1)} style={styles.copy}>
          <GlydeText variant="display">Glyde Driver</GlydeText>
          <GlydeText variant="title2" tone="secondary">
            Commute, Simplified.
          </GlydeText>
        </Animated.View>
      </View>
      <Animated.View entering={enter(2)} style={styles.actions}>
        <PrimaryButton label="Get Started" size="driver" onPress={() => router.push('/register')} />
        <SecondaryButton
          label="I already have an account — Log in"
          size="driver"
          haptic="selection"
          onPress={() => router.push('/login')}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screenX },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl },
  logo: { width: size.logoMedium, height: LOGO_HEIGHT },
  copy: { alignItems: 'center', gap: space.xs },
  actions: { gap: space.md, width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center' },
});
