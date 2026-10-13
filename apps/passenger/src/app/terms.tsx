import { GlydeText, PrimaryButton, space, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/** PLACEHOLDER — uix-spec 2.1 Terms & Conditions is the next task. */
export default function Terms() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base }]}>
      <GlydeText variant="title2">Terms & Conditions</GlydeText>
      <GlydeText variant="body" tone="secondary">
        Profile saved. Terms & Conditions is built next.
      </GlydeText>
      {__DEV__ && <PrimaryButton label="Dev: continue to Home" onPress={() => router.replace('/home')} />}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', gap: space.md, padding: space.screenX } });
