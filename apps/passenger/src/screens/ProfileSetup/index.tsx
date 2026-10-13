import { GlydeText, hapticFor, PrimaryButton, radius, size, Skeleton, space, TextField, useTheme } from '@glyde/ui';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Info } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetwork } from '@/features/network/useNetwork';
import { useProfile, type ProfileFields } from '@/features/profile/useProfile';

type Key = keyof ProfileFields;
const ORDER: Key[] = ['first_name', 'last_name', 'residential_area', 'work_location', 'company_name'];
const LABELS: Record<Key, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  residential_area: 'Residential area',
  work_location: 'Work location',
  company_name: 'Name of company',
};
const PLACEHOLDERS: Record<Key, string> = {
  first_name: 'Ama',
  last_name: 'Mensah',
  residential_area: 'Where you live, e.g. Madina',
  work_location: 'Where you work, e.g. Ridge',
  company_name: 'e.g. Ministry of Finance',
};
const INPUT: Record<Key, TextInputProps> = {
  first_name: {
    textContentType: 'givenName',
    autoComplete: 'name-given',
    autoCapitalize: 'words',
  },
  last_name: {
    textContentType: 'familyName',
    autoComplete: 'name-family',
    autoCapitalize: 'words',
  },
  residential_area: { autoCapitalize: 'words' },
  work_location: { autoCapitalize: 'words' },
  company_name: {
    textContentType: 'organizationName',
    autoCapitalize: 'words',
  },
};
const MAX_SUGGESTIONS = 3;

/** uix-spec 2.1 Basic Profile Setup. All fields required; empty ones are highlighted on Next. */
export function ProfileSetupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, save } = useProfile();
  const { network } = useNetwork();

  if (state.status === 'loading') {
    return (
      <View
        style={[
          styles.root,
          styles.pad,
          {
            backgroundColor: colors.bg.base,
            paddingTop: insets.top + space.xl,
          },
        ]}
      >
        <Skeleton height={size.button} width="60%" radius="md" />
        {ORDER.map((k) => (
          <Skeleton key={k} height={size.button} radius="md" />
        ))}
      </View>
    );
  }
  if (state.status === 'signed-out') return <Redirect href="/landing" />;
  return (
    <ProfileForm
      initial={state.profile}
      loadFailed={state.loadFailed}
      stopNames={network?.stops.map((s) => s.name) ?? []}
      save={save}
    />
  );
}

function ProfileForm({
  initial,
  loadFailed,
  stopNames,
  save,
}: {
  initial: ProfileFields | null;
  loadFailed: boolean;
  stopNames: string[];
  save: ReturnType<typeof useProfile>['save'];
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<ProfileFields>(() => ({
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    residential_area: initial?.residential_area ?? '',
    work_location: initial?.work_location ?? '',
    company_name: initial?.company_name ?? '',
  }));
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [focused, setFocused] = useState<Key | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const inputs = useRef<Partial<Record<Key, TextInput | null>>>({});
  const offsets = useRef<Partial<Record<Key, number>>>({});

  const set = (k: Key, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k] && v.trim()) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const next = async () => {
    const missing = ORDER.filter((k) => !values[k].trim());
    if (missing.length) {
      hapticFor('failure');
      setErrors(Object.fromEntries(missing.map((k) => [k, `${LABELS[k]} is required`])));
      scroll.current?.scrollTo({
        y: Math.max(0, (offsets.current[missing[0]] ?? 0) - space.lg),
        animated: true,
      });
      inputs.current[missing[0]]?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    const trimmed = Object.fromEntries(ORDER.map((k) => [k, values[k].trim()])) as ProfileFields;
    const result = await save(trimmed);
    setSaving(false);
    if (result === 'ok') {
      router.push('/terms');
      return;
    }
    hapticFor('failure');
    setSaveError(
      result === 'offline'
        ? 'You’re offline. Your details are kept here — tap Next again when you’re connected.'
        : 'We couldn’t save your details. Please try again.',
    );
  };

  const suggestionsFor = (k: Key): string[] => {
    if (k !== 'residential_area' && k !== 'work_location') return [];
    const q = values[k].trim().toLowerCase();
    if (focused !== k || !q) return [];
    return stopNames.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, MAX_SUGGESTIONS);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}
    >
      <StatusBar style="dark" />
      <ScrollView ref={scroll} contentContainerStyle={[styles.pad, styles.body]} keyboardShouldPersistTaps="handled">
        <View style={styles.copy}>
          <GlydeText variant="title1">About you</GlydeText>
          <View style={[styles.helper, { backgroundColor: colors.brand.tint }]}>
            <Info size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.primary} />
            <GlydeText variant="callout" style={styles.flex}>
              This information helps us optimize bus allocation and routing for you.
            </GlydeText>
          </View>
          {loadFailed && (
            <GlydeText variant="caption" tone="secondary">
              We couldn’t load any saved details, so the form starts empty.
            </GlydeText>
          )}
        </View>

        {ORDER.map((k, i) => (
          <View
            key={k}
            onLayout={(e) => {
              offsets.current[k] = e.nativeEvent.layout.y;
            }}
            style={styles.fieldBlock}
          >
            <TextField
              ref={(el) => {
                inputs.current[k] = el;
              }}
              label={LABELS[k]}
              value={values[k]}
              onChangeText={(v) => set(k, v)}
              onFocus={() => setFocused(k)}
              onBlur={() => setFocused((f) => (f === k ? null : f))}
              placeholder={PLACEHOLDERS[k]}
              error={errors[k]}
              returnKeyType={i === ORDER.length - 1 ? 'done' : 'next'}
              submitBehavior={i === ORDER.length - 1 ? 'blurAndSubmit' : 'submit'}
              onSubmitEditing={() => (i === ORDER.length - 1 ? void next() : inputs.current[ORDER[i + 1]]?.focus())}
              autoCorrect={false}
              {...INPUT[k]}
            />
            {suggestionsFor(k).length > 0 && (
              <View style={styles.chips} accessibilityLabel="Matching Glyde stops">
                {suggestionsFor(k).map((name) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${name}`}
                    onPress={() => {
                      hapticFor('selection');
                      set(k, name);
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: pressed ? colors.border.default : colors.bg.subtle,
                      },
                    ]}
                  >
                    <GlydeText variant="callout">{name}</GlydeText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.pad, styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        {saveError && (
          <GlydeText variant="callout" style={{ color: colors.status.danger }} accessibilityLiveRegion="polite">
            {saveError}
          </GlydeText>
        )}
        <PrimaryButton label="Next" loading={saving} haptic="confirm" onPress={() => void next()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pad: { paddingHorizontal: space.screenX, gap: space.md },
  body: { paddingTop: space.lg, paddingBottom: space.xl },
  copy: { gap: space.sm },
  helper: {
    flexDirection: 'row',
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  fieldBlock: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    minHeight: space.xxxl - space.xs,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
  },
  footer: { paddingTop: space.sm },
});
