import { GlydeText, space, useTheme } from '@glyde/ui';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/** PLACEHOLDER — uix-spec 2.1 Landing is the next task. Exists so Splash has somewhere to go. */
export default function Landing() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base }]}>
      <GlydeText variant="title1">Landing</GlydeText>
      <GlydeText variant="body" tone="secondary">
        Placeholder — built in the next task.
      </GlydeText>
      {__DEV__ && (
        <Link href="/gallery" style={styles.devLink}>
          <GlydeText variant="callout" tone="secondary">
            Dev: open Gallery
          </GlydeText>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.screenX },
  devLink: { padding: space.md },
});
