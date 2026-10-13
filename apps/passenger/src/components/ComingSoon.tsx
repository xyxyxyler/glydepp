import { GlydeText, space, useTheme } from '@glyde/ui';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from './ScreenHeader';

/** Honest placeholder for a spec'd screen that's scheduled in a later step (no fake content). */
export function ComingSoon({ title, body, back = false }: { title: string; body: string; back?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top + (back ? 0 : space.lg) }]}>
      <StatusBar style="dark" />
      {back && <ScreenHeader />}
      <View style={styles.body}>
        <GlydeText variant="title1">{title}</GlydeText>
        <GlydeText variant="body" tone="secondary">
          {body}
        </GlydeText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenX, gap: space.sm },
});
