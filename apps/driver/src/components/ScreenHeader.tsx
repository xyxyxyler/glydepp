import { radius, size, space, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

/** Back chevron row used by pushed screens (48dp target, label for screen readers). */
export function ScreenHeader({ backLabel = 'Back' }: { backLabel?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.bg.subtle }]}
      >
        <ChevronLeft size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.xs, paddingBottom: space.xs },
  back: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
