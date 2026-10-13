import { GlydeText, PrimaryButton, space, useTheme } from '@glyde/ui';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/** PLACEHOLDER — uix-spec 2.5 Ticket View (QR code, ticket ID, share link) is the next task. */
export default function Ticket() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base }]}>
      <GlydeText variant="title2">Your ticket</GlydeText>
      <GlydeText variant="body" tone="secondary">
        Booking confirmed. The ticket with its QR code is built next.
      </GlydeText>
      <PrimaryButton label="Back to Home" onPress={() => router.replace('/home')} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', gap: space.md, padding: space.screenX } });
