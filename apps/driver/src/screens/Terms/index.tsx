import { TERMS } from '@glyde/domain';
import { Checkbox, GlydeText, hapticFor, layout, PrimaryButton, radius, size, space, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

/** uix-spec 3.1 Terms (identical flow to the passenger app): scroll to the end, agree, continue. */
export function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [read, setRead] = useState(false);
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAgree = read || (viewport > 0 && contentHeight > 0 && contentHeight <= viewport);

  const accept = async () => {
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.rpc('driver_update_self', { p_terms_version: TERMS.version });
    setSaving(false);
    if (e) {
      hapticFor('failure');
      setError(
        /fetch|network/i.test(e.message)
          ? 'You’re offline. Try again when you’re connected.'
          : 'We couldn’t save that. Please try again.',
      );
      return;
    }
    router.replace('/permissions');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top + space.lg }]}>
      <StatusBar style="light" />
      <View style={styles.column}>
        <GlydeText variant="title1">{TERMS.title}</GlydeText>
        <ScrollView
          style={[styles.card, { borderColor: colors.border.default }]}
          contentContainerStyle={styles.cardBody}
          onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentHeight(h)}
          scrollEventThrottle={16}
          onScroll={({ nativeEvent: n }) => {
            if (!read && n.layoutMeasurement.height + n.contentOffset.y >= n.contentSize.height - space.lg)
              setRead(true);
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
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          {!canAgree && (
            <GlydeText variant="caption" tone="secondary">
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
            <GlydeText variant="callout" style={{ color: colors.status.danger }}>
              {error}
            </GlydeText>
          )}
          <PrimaryButton
            label="Continue"
            size="driver"
            disabled={!agreed}
            loading={saving}
            haptic="confirm"
            onPress={() => void accept()}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screenX },
  column: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth * 1.5, alignSelf: 'center', gap: space.md },
  flex: { flex: 1 },
  card: { flex: 1, borderWidth: size.hairline, borderRadius: radius.lg },
  cardBody: { padding: space.md, gap: space.lg },
  notice: { flexDirection: 'row', gap: space.xs, padding: space.sm, borderRadius: radius.md },
  section: { gap: space.xs },
  footer: { gap: space.sm },
});
