import { GlydeText, space, useTheme } from '@glyde/ui';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/** Placeholder until the Splash screen is built (CLAUDE.md §9 step 3). Dev builds open the Gallery. */
export default function Index() {
  const { colors } = useTheme();
  if (__DEV__) return <Redirect href="/gallery" />;
  return (
    <View style={[styles.centre, { backgroundColor: colors.bg.base }]}>
      <GlydeText variant="title2">Glyde</GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({ centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.screenX } });
