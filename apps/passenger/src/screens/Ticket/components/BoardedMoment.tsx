import { CheckDraw, GlydeText, hapticFor, motion, space, useTheme } from '@glyde/ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * DESIGN.md §8.7 scan success: the ticket gives way to a green check, success haptic, then the
 * app moves on to the In-Trip state (uix-spec 2.5: QR and ticket details clear from view).
 */
export function BoardedMoment({ dropoff, onDone }: { dropoff: string; onDone: () => void }) {
  const { colors } = useTheme();
  useEffect(() => {
    hapticFor('scanSuccess');
    const t = setTimeout(onDone, motion.draw + motion.slow * 3);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, []);
  return (
    <Animated.View
      entering={FadeIn.duration(motion.base)}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.bg.base }]}
      accessibilityLiveRegion="assertive"
    >
      <CheckDraw haptic={false} />
      <GlydeText variant="title1">You’re on board</GlydeText>
      <GlydeText variant="body" tone="secondary">
        Enjoy the ride to {dropoff}.
      </GlydeText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ root: { alignItems: 'center', justifyContent: 'center', gap: space.sm } });
