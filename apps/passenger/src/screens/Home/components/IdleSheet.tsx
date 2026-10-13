import { GlydeText, motion, space, stagger, type SheetSnap } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { WhereToPrompt } from './WhereToPrompt';

type Props = { snap: SheetSnap; onWhereTo: () => void };

/**
 * Idle sheet (uix-spec 2.2 default state). Collapsed: just "Where to?". Expanded content fades
 * in with the snap (DESIGN.md §8.1); trip search itself is the next task (2.3).
 */
export function IdleSheet({ snap, onWhereTo }: Props) {
  const reduceMotion = useReducedMotion();
  const enter = (i: number) =>
    FadeIn.duration(reduceMotion ? motion.reduceMotionFade : motion.base).delay(reduceMotion ? 0 : i * stagger.list);

  return (
    <View style={styles.content}>
      <WhereToPrompt onPress={onWhereTo} />
      {snap !== 'collapsed' && (
        <Animated.View entering={enter(1)}>
          <GlydeText variant="callout" tone="secondary">
            Trip search is coming next.
          </GlydeText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingTop: space.xs },
});
