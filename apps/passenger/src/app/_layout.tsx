import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { ThemeProvider, ToastProvider } from '@glyde/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const ready = fontsLoaded || !!fontError; // fall back to system font rather than block

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider theme="light">
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              {/* Splash fades out to black; Landing fades in. Onboarding steps use the native push. */}
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="landing" options={{ animation: 'fade' }} />
              {/* Signed in: no way back into the code screen. */}
              <Stack.Screen name="profile" options={{ animation: 'fade', gestureEnabled: false }} />
              {/* Tabs: Home · Payments · Activity · Account (uix-spec 2.9). No swipe back into onboarding. */}
              <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
              {/* Short push from Home's results (DESIGN.md §8.5). */}
              <Stack.Screen name="seats" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="account/edit" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="payments/add-funds" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="payments/add-method" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="account/terms" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="account/[topic]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="payment" options={{ animation: 'slide_from_right' }} />
              {/* Paid: no swiping back into the payment form. */}
              <Stack.Screen name="payment-success" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="ticket" options={{ animation: 'fade' }} />
              <Stack.Screen name="share/[token]" options={{ animation: 'fade' }} />
            </Stack>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
