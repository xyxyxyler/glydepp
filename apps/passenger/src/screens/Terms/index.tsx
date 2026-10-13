import { Checkbox, GlydeText, hapticFor, PrimaryButton, radius, size, space, useTheme } from '@glyde/ui';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { TERMS } from '@/features/legal/terms';
import { useProfile } from '@/features/profile/useProfile';

/**
 * uix-spec 2.1 Terms & Conditions: full text in a scrollable area; the passenger must actively
 * accept, and acceptance only becomes possible once the text has been scrolled to the end.
 */
export function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, acceptTerms } = useProfile();
  const [read, setRead] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // Read = scrolled to the end, or short enough to fit without scrolling.
  const canAgree = read || (viewport > 0 && contentHeight > 0 && contentHeight <= viewport);

  if (state.status === 'signed-out') return <Redirect href="/landing" />;

  const accept = async () => {
    setSaving(true);
    setError(null);
    const r = await acceptTerms(TERMS.version);
    setSaving(false);
    if (r === 'ok') {
      router.push('/permissions');
      return;
    }
    hapticFor('failure');
    setError(
      r === 'offline'
        ? 'You’re offline. Tap Continue again when you’re connected.'
        : 'We couldn’t save that. Please try again.',
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader backLabel="Back to your details" />
      <View style={styles.pad}>
        <GlydeText variant="title1">{TERMS.title}</GlydeText>
      </View>

      <ScrollView
        style={[styles.card, { borderColor: colors.border.default }]}
        contentContainerStyle={styles.cardBody}
        accessibilityLabel="Terms and conditions text"
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent: n }) => {
          if (!read && n.layoutMeasurement.height + n.contentOffset.y >= n.contentSize.height - space.lg) setRead(true);
        }}
      >
        <View style={[styles.notice, { backgroundColor: colors.bg.subtle }]}>
          <TriangleAlert size={size.iconChip} strokeWidth={size.iconStroke} color={colors.status.warning} />
          <GlydeText variant="callout" style={styles.flex}>
            {TERMS.notice}
          </GlydeText>
        </View>
        {TERMS.sections.map((s, i) => (
          <View key={s.heading} style={styles.section}>
            <GlydeText variant="headline">
              {i + 1}. {s.heading}
            </GlydeText>
            <GlydeText variant="body" tone="secondary">
              {s.body}
            </GlydeText>
          </View>
        ))}
        <GlydeText variant="caption" tone="tertiary">
          Version {TERMS.version}
        </GlydeText>
      </ScrollView>

      <View style={[styles.pad, styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        {!canAgree && (
          <GlydeText variant="caption" tone="secondary" accessibilityLiveRegion="polite">
            Scroll to the end to continue.
          </GlydeText>
        )}
        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          disabled={!canAgree}
          disabledHint="Scroll to the end of the terms first"
          label="I have read and agree to the Terms & Conditions"
        />
        {error && (
          <GlydeText variant="callout" style={{ color: colors.status.danger }} accessibilityLiveRegion="polite">
            {error}
          </GlydeText>
        )}
        <PrimaryButton
          label="Continue"
          disabled={!agreed}
          loading={saving}
          haptic="confirm"
          onPress={() => void accept()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pad: { paddingHorizontal: space.screenX },
  card: {
    flex: 1,
    marginHorizontal: space.screenX,
    marginVertical: space.md,
    borderWidth: size.hairline,
    borderRadius: radius.lg,
  },
  cardBody: { padding: space.md, gap: space.lg },
  notice: { flexDirection: 'row', gap: space.xs, padding: space.sm, borderRadius: radius.md, alignItems: 'flex-start' },
  section: { gap: space.xs },
  footer: { gap: space.sm },
});
