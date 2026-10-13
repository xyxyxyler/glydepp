import { GlydeText, motion, PrimaryButton, size, space, splash, stagger, useTheme } from '@glyde/ui';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const logo = require('@/assets/images/glyde-logo.png');

/**
 * uix-spec 2.1 Landing: minimal and focused, one call-to-action ("Get Started"), nothing else.
 * Tagline from the product doc. Content fades up after the splash (DESIGN.md §8.1 entry motion).
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
      <StatusBar style="dark" />
      <View style={styles.brand}>
        <Animated.Image
          entering={enter(0)}
          source={logo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Glyde"
        />
        <Animated.View entering={enter(1)} style={styles.copy}>
          <GlydeText variant="display">Glyde</GlydeText>
          <GlydeText variant="title2" tone="secondary">
            Commute, Simplified.
          </GlydeText>
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={styles.actions}>
        <PrimaryButton label="Get Started" onPress={() => router.push('/register')} />
        {__DEV__ && (
          <View style={styles.dev}>
            <Link href="/home">
              <GlydeText variant="caption" tone="tertiary">
                Dev: Home
              </GlydeText>
            </Link>
            <Link href="/gallery">
              <GlydeText variant="caption" tone="tertiary">
                Dev: Gallery
              </GlydeText>
            </Link>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const LOGO_HEIGHT = splash.logoWidth / splash.logoAspect;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screenX },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl },
  logo: { width: splash.logoWidth, height: LOGO_HEIGHT },
  copy: { alignItems: 'center', gap: space.xs },
  actions: { gap: space.md },
  dev: { flexDirection: 'row', justifyContent: 'center', gap: space.xl, minHeight: size.tapMin, alignItems: 'center' },
});
