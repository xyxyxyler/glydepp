import { internalEmailForPhone, normaliseEmail, normaliseGhanaPhone } from '@glyde/domain';
import { GlydeText, hapticFor, layout, PrimaryButton, size, space, splash, TextField, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

const logo = require('@/assets/images/glyde-logo.png');

/**
 * uix-spec 3.1 Driver Login: email or phone + password, with error handling for wrong
 * credentials. Only accounts with a driver record can continue.
 */
export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logIn = async () => {
    const phone = normaliseGhanaPhone(identifier);
    const email = phone ? internalEmailForPhone(phone) : normaliseEmail(identifier);
    if (!email || !password) {
      hapticFor('failure');
      setError('Enter your phone number (or email) and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setBusy(false);
      hapticFor('failure');
      setError(
        /fetch|network/i.test(authError?.message ?? '')
          ? 'You’re offline. Check your connection and try again.'
          : 'That phone number, email or password isn’t right.',
      );
      return;
    }
    const { data: driver } = await supabase.from('drivers').select('id').eq('id', data.user.id).maybeSingle();
    setBusy(false);
    if (!driver) {
      await supabase.auth.signOut();
      hapticFor('failure');
      setError('This account isn’t registered as a Glyde driver. Ask your bus owner for an invite.');
      return;
    }
    hapticFor('paymentSuccess');
    router.replace('/'); // resumes onboarding (terms / permissions) or opens the dashboard
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base }]}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Glyde" />
          <View style={styles.copy}>
            <GlydeText variant="title1">Driver login</GlydeText>
            <GlydeText variant="body" tone="secondary">
              Use the phone number or email and password from your Glyde driver account.
            </GlydeText>
          </View>
          <TextField
            label="Phone number or email"
            value={identifier}
            onChangeText={(t) => {
              setIdentifier(t);
              setError(null);
            }}
            placeholder="024 123 4567"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void logIn()}
          />
          {error && (
            <GlydeText variant="callout" style={{ color: colors.status.danger }} accessibilityLiveRegion="polite">
              {error}
            </GlydeText>
          )}
          <PrimaryButton label="Log in" size="driver" loading={busy} haptic="confirm" onPress={() => void logIn()} />
          <Pressable accessibilityRole="button" onPress={() => router.replace('/register')} style={styles.link}>
            <GlydeText variant="callout" tone="secondary" style={styles.center}>
              New driver? Create an account
            </GlydeText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const LOGO_HEIGHT = size.logoMedium / splash.logoAspect;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.screenX },
  // Forms stay readable on a tablet instead of stretching edge to edge.
  form: { width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center', gap: space.lg },
  logo: { width: size.logoMedium, height: LOGO_HEIGHT },
  copy: { gap: space.xs },
  link: { minHeight: size.tapMin, justifyContent: 'center' },
  center: { textAlign: 'center' },
});
