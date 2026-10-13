import { GlydeText, space, useTheme } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';

/** PLACEHOLDER — Registration & Verification is being built next. */
export default function Register() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base }]}>
      <GlydeText variant="title2">Register</GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.screenX } });
