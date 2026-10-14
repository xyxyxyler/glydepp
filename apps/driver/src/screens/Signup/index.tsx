import {
  Banner,
  GlydeText,
  hapticFor,
  layout,
  PrimaryButton,
  radius,
  SecondaryButton,
  size,
  space,
  TextField,
  useTheme,
} from '@glyde/ui';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/useSession';
import { supabase } from '@/lib/supabase';

import { LivenessCheck } from './components/LivenessCheck';

type Field = 'first' | 'last' | 'dob' | 'area' | 'password' | 'confirm' | 'ghanaCard' | 'licence' | 'invite';
const MIN_PASSWORD = 8;

/** "12081990" → "12/08/1990" while typing. */
const formatDob = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};
/** "123456789 0" → "GHA-123456789-0" while typing. */
const formatGhanaCard = (t: string) => {
  const d = t
    .replace(/^GHA-?/i, '')
    .replace(/\D/g, '')
    .slice(0, 10);
  return d ? `GHA-${d.slice(0, 9)}${d.length > 9 ? `-${d.slice(9)}` : ''}` : '';
};
const parseDob = (s: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
};

const INVITE_ERRORS: Record<string, string> = {
  invalid_invite: 'That invite code isn’t valid. Check it with your bus owner.',
  expired_invite: 'That invite code has expired (codes last 48 hours). Ask your bus owner to resend it.',
  used_invite: 'That invite code has already been used. Ask your bus owner for a new one.',
  already_registered: 'This account already has a driver profile. Log in instead.',
  bad_details: 'Some details aren’t valid. Check your date of birth (18+) and Ghana Card number.',
};

/**
 * uix-spec 3.1 Driver Profile Setup → liveness test → Pending Approval (linked to the owner who
 * issued the invite code). Ghana Card / licence validation and liveness are stubs (CLAUDE.md §4).
 */
export function SignupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [v, setV] = useState<Record<Field, string>>({
    first: '',
    last: '',
    dob: '',
    area: '',
    password: '',
    confirm: '',
    ghanaCard: '',
    licence: '',
    invite: '',
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field | 'photo', string>>>({});
  const [step, setStep] = useState<'form' | 'liveness' | 'saving'>('form');
  const [failure, setFailure] = useState<string | null>(null);

  const set = (k: Field, t: string) => {
    setV((s) => ({ ...s, [k]: k === 'dob' ? formatDob(t) : k === 'ghanaCard' ? formatGhanaCard(t) : t }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const pickPhoto = async (camera: boolean) => {
    if (camera) {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) {
        setErrors((e) => ({ ...e, photo: 'Allow camera access, or choose a photo instead.' }));
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    };
    const r = camera
      ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front })
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!r.canceled && r.assets[0]) {
      setPhoto(r.assets[0].uri);
      setErrors((e) => ({ ...e, photo: undefined }));
    }
  };

  const validate = (): boolean => {
    const e: Partial<Record<Field | 'photo', string>> = {};
    if (!v.first.trim()) e.first = 'First name is required';
    if (!v.last.trim()) e.last = 'Last name is required';
    if (!parseDob(v.dob)) e.dob = 'Enter your date of birth as DD/MM/YYYY';
    if (!v.area.trim()) e.area = 'Residential area is required';
    if (v.password.length < MIN_PASSWORD) e.password = `At least ${MIN_PASSWORD} characters`;
    if (v.confirm !== v.password) e.confirm = 'Passwords don’t match';
    if (!/^GHA-\d{9}-\d$/.test(v.ghanaCard)) e.ghanaCard = 'Format: GHA-123456789-0';
    if (v.licence.trim().length < 4) e.licence = 'Enter your driver’s licence number';
    if (!v.invite.trim()) e.invite = 'Ask your bus owner for an invite code';
    if (!photo) e.photo = 'Add a clear photo of your face';
    setErrors(e);
    if (Object.keys(e).length) hapticFor('failure');
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    const uid = session.status === 'signed-in' ? session.session.user.id : null;
    if (!uid || !photo) return;
    setStep('saving');
    setFailure(null);
    const fail = (msg: string) => {
      hapticFor('failure');
      setFailure(msg);
      setStep('form');
    };
    const pw = await supabase.auth.updateUser({ password: v.password });
    if (pw.error) return fail('We couldn’t set your password. Please try again.');

    const path = `${uid}/profile.jpg`;
    const bytes = await (await fetch(photo)).arrayBuffer();
    const up = await supabase.storage
      .from('driver-photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (up.error) return fail('We couldn’t upload your photo. Check your connection and try again.');

    const { error } = await supabase.rpc('complete_driver_signup', {
      p_first_name: v.first,
      p_last_name: v.last,
      p_date_of_birth: parseDob(v.dob) as string,
      p_residential_area: v.area,
      p_ghana_card_number: v.ghanaCard,
      p_licence_number: v.licence,
      p_invite_code: v.invite,
      p_photo_path: path,
    });
    if (error) return fail(INVITE_ERRORS[error.message] ?? 'Something went wrong. Please try again.');
    hapticFor('paymentSuccess');
    router.replace('/'); // → Terms → Permissions → Dashboard (Pending Approval)
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top + space.lg }]}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {step !== 'form' ? (
          <LivenessCheck onPassed={() => void submit()} />
        ) : (
          <>
            <GlydeText variant="title1">Your driver profile</GlydeText>
            <GlydeText variant="body" tone="secondary">
              Your bus owner approves your account after this. You can’t start trips until then.
            </GlydeText>
            {failure && <Banner tone="danger" message={failure} />}

            <View style={styles.photoRow}>
              <View
                style={[
                  styles.photo,
                  {
                    backgroundColor: colors.bg.subtle,
                    borderColor: errors.photo ? colors.status.danger : colors.border.default,
                  },
                ]}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={StyleSheet.absoluteFill}
                    accessibilityLabel="Your profile photo"
                  />
                ) : (
                  <Camera size={size.icon * 1.5} strokeWidth={size.iconStroke} color={colors.ink.tertiary} />
                )}
              </View>
              <View style={styles.flex}>
                <SecondaryButton
                  label="Take photo"
                  size="driver"
                  haptic="selection"
                  onPress={() => void pickPhoto(true)}
                />
                <Pressable accessibilityRole="button" onPress={() => void pickPhoto(false)} style={styles.link}>
                  <GlydeText variant="callout" tone="secondary" style={styles.underline}>
                    Choose from library
                  </GlydeText>
                </Pressable>
              </View>
            </View>
            {errors.photo && (
              <GlydeText variant="caption" style={{ color: colors.status.danger }}>
                {errors.photo}
              </GlydeText>
            )}

            <View style={styles.pair}>
              <View style={styles.flex}>
                <TextField
                  label="First name"
                  value={v.first}
                  onChangeText={(t) => set('first', t)}
                  error={errors.first}
                  autoCapitalize="words"
                  textContentType="givenName"
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Last name"
                  value={v.last}
                  onChangeText={(t) => set('last', t)}
                  error={errors.last}
                  autoCapitalize="words"
                  textContentType="familyName"
                />
              </View>
            </View>
            <TextField
              label="Date of birth"
              value={v.dob}
              onChangeText={(t) => set('dob', t)}
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              error={errors.dob}
            />
            <TextField
              label="Residential area"
              value={v.area}
              onChangeText={(t) => set('area', t)}
              placeholder="e.g. Adenta"
              autoCapitalize="words"
              error={errors.area}
            />
            <TextField
              label="Ghana Card number"
              value={v.ghanaCard}
              onChangeText={(t) => set('ghanaCard', t)}
              placeholder="GHA-123456789-0"
              keyboardType="number-pad"
              error={errors.ghanaCard}
            />
            <TextField
              label="Driver’s licence number"
              value={v.licence}
              onChangeText={(t) => set('licence', t)}
              autoCapitalize="characters"
              error={errors.licence}
            />
            <TextField
              label="Password"
              value={v.password}
              onChangeText={(t) => set('password', t)}
              secureTextEntry
              textContentType="newPassword"
              error={errors.password}
            />
            <TextField
              label="Confirm password"
              value={v.confirm}
              onChangeText={(t) => set('confirm', t)}
              secureTextEntry
              textContentType="newPassword"
              error={errors.confirm}
            />
            <TextField
              label="Invite code (from your bus owner)"
              value={v.invite}
              onChangeText={(t) => set('invite', t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.invite}
            />
            <PrimaryButton
              label="Continue to face check"
              size="driver"
              haptic="confirm"
              onPress={() => validate() && setStep('liveness')}
            />
          </>
        )}
        {step === 'saving' && (
          <GlydeText variant="callout" tone="secondary" style={styles.center}>
            Saving your profile…
          </GlydeText>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, gap: space.xs },
  center: { textAlign: 'center' },
  underline: { textDecorationLine: 'underline' },
  body: {
    paddingHorizontal: space.screenX,
    gap: space.md,
    width: '100%',
    maxWidth: layout.formMaxWidth * 1.5,
    alignSelf: 'center',
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  photo: {
    width: size.driverTap * 1.5,
    height: size.driverTap * 1.5,
    borderRadius: radius.pill,
    borderWidth: size.selectedBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { minHeight: size.tapMin, justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: space.sm },
});
