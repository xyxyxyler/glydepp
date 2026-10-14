import { CheckDraw, GlydeText, PrimaryButton, space } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';

/** uix-spec 2.5 Trip Completion: calm confirmation, then Home returns to its default state. */
export function TripCompleteCard({ stop, onDone }: { stop: string; onDone: () => void }) {
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <CheckDraw haptic={false} />
      <GlydeText variant="title2">You’ve arrived at {stop}</GlydeText>
      <GlydeText variant="body" tone="secondary" style={styles.center}>
        Trip complete. It’s saved in your Activity.
      </GlydeText>
      <PrimaryButton label="Done" style={styles.stretch} onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
});
