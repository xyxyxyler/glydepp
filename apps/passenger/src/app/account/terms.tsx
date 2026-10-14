import { GlydeText, radius, space, useTheme } from '@glyde/ui';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { TERMS } from '@glyde/domain';
import { useProfile } from '@/features/profile/useProfile';
import { formatAccraTime } from '@/features/time/useNow';

/** Account → Terms & Conditions: what the passenger accepted, and when. */
export default function AcceptedTerms() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useProfile();
  const p = state.status === 'ready' ? state.profile : null;
  const accepted = p?.terms_accepted_at ? new Date(p.terms_accepted_at) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <ScreenHeader backLabel="Back to account" />
      <ScrollView contentContainerStyle={styles.body}>
        <GlydeText variant="title1">{TERMS.title}</GlydeText>
        {accepted && (
          <GlydeText variant="callout" tone="secondary">
            You accepted version {p?.terms_version} on {accepted.toISOString().slice(0, 10)} at{' '}
            {formatAccraTime(accepted.getTime())}.
            {p?.terms_version !== TERMS.version ? ' A newer version is shown below.' : ''}
          </GlydeText>
        )}
        <View style={[styles.notice, { backgroundColor: colors.bg.subtle }]}>
          <GlydeText variant="callout">{TERMS.notice}</GlydeText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenX, paddingBottom: space.xxl, gap: space.lg },
  notice: { padding: space.sm, borderRadius: radius.md },
  section: { gap: space.xs },
});
