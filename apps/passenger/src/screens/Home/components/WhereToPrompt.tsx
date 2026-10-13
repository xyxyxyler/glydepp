import { GlydeText, hapticFor, radius, size, space, usePressScale, useTheme } from '@glyde/ui';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

/** uix-spec 2.2: the collapsed sheet's only prompt; tapping it starts the Trip Creation Flow. */
export function WhereToPrompt({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Where to?"
      accessibilityHint="Opens trip search"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        hapticFor('selection');
        onPress();
      }}
    >
      <Animated.View style={[styles.prompt, { backgroundColor: colors.bg.subtle }, style]}>
        <GlydeText variant="title2">Where to?</GlydeText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  prompt: {
    minHeight: size.button,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
});
