import GorhomBottomSheet, { BottomSheetScrollView, BottomSheetView, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { BackHandler, Keyboard, StyleSheet, View } from 'react-native';
import { useAnimatedReaction, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { elevation, radius, sheetSnap, size, space, spring } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';

export type SheetSnap = keyof typeof sheetSnap; // 'collapsed' | 'half' | 'full'
const SNAP_ORDER: SheetSnap[] = ['collapsed', 'half', 'full'];
const SNAP_POINTS = SNAP_ORDER.map((k) => `${sheetSnap[k] * 100}%`);

type SheetHeightValue = {
  /** Sheet top edge, measured from the container top. Driven by the sheet on the UI thread. */
  position: SharedValue<number>;
  containerHeight: SharedValue<number>;
  /** Live visible sheet height (every frame, UI thread). */
  height: Readonly<SharedValue<number>>;
  /** Sheet height after it settles on a snap point. Use this for map camera padding. */
  settledHeight: SharedValue<number>;
};

const SheetHeightContext = createContext<SheetHeightValue | null>(null);

/**
 * Wrap a screen that has a map + sheet. Siblings (the map) read the sheet height with
 * useSheetHeight() and shift their camera padding so content stays centred above the sheet.
 */
export function SheetHeightProvider({ children }: { children: ReactNode }) {
  const position = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const settledHeight = useSharedValue(0);
  const height = useDerivedValue(() => Math.max(0, containerHeight.get() - position.get()));
  const value = useMemo(
    () => ({ position, containerHeight, height, settledHeight }),
    [position, containerHeight, height, settledHeight],
  );
  return (
    <SheetHeightContext.Provider value={value}>
      <View
        style={styles.fill}
        onLayout={(e) => {
          containerHeight.set(e.nativeEvent.layout.height);
        }}
      >
        {children}
      </View>
    </SheetHeightContext.Provider>
  );
}

export function useSheetHeight(): SheetHeightValue {
  const ctx = useContext(SheetHeightContext);
  if (!ctx) throw new Error('useSheetHeight must be used inside <SheetHeightProvider>');
  return ctx;
}

export type BottomSheetHandle = {
  /** Spring to a snap point (spring.sheet), as if the user had dragged there. */
  snapTo: (snap: SheetSnap) => void;
};

export type BottomSheetProps = {
  children: ReactNode;
  ref?: Ref<BottomSheetHandle>;
  initialSnap?: SheetSnap;
  /** Scroll content that is taller than the sheet (taps work while the keyboard is open). */
  scrollable?: boolean;
  onSnapChange?: (snap: SheetSnap) => void;
  accessibilityLabel?: string;
};

/**
 * DESIGN.md §7 / §8.1: collapsed / half / full snap points, spring physics (spring.sheet),
 * velocity-aware flicks, interruptible drag. Never closes — swipe-down and Android back
 * collapse it, so entered data is kept.
 */
export function BottomSheet({
  children,
  ref: handleRef,
  initialSnap = 'collapsed',
  scrollable = false,
  onSnapChange,
  accessibilityLabel,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { position, containerHeight, settledHeight } = useSheetHeight();
  const ref = useRef<GorhomBottomSheet>(null);
  const initialIndex = SNAP_ORDER.indexOf(initialSnap);
  const index = useRef(initialIndex);
  const animationConfigs = useBottomSheetSpringConfigs(spring.sheet);
  const settledFraction = useSharedValue<number>(sheetSnap[initialSnap]);

  // Keep settledHeight right before the first snap and on container resize (rotation, split view).
  useAnimatedReaction(
    () => containerHeight.get(),
    (h) => {
      settledHeight.set(h * settledFraction.get());
    },
  );

  const handleChange = useCallback(
    (i: number) => {
      if (i < 0) return;
      if (i !== index.current) hapticFor('sheetSnap');
      index.current = i;
      settledFraction.set(sheetSnap[SNAP_ORDER[i]]);
      settledHeight.set(containerHeight.get() * sheetSnap[SNAP_ORDER[i]]);
      onSnapChange?.(SNAP_ORDER[i]);
    },
    [containerHeight, onSnapChange, settledFraction, settledHeight],
  );

  useImperativeHandle(handleRef, () => ({
    snapTo: (snap) => ref.current?.snapToIndex(SNAP_ORDER.indexOf(snap)),
  }));

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index.current > 0) {
        ref.current?.snapToIndex(0);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  return (
    <GorhomBottomSheet
      ref={ref}
      index={initialIndex}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose={false}
      animationConfigs={animationConfigs}
      animatedPosition={position}
      onChange={handleChange}
      // Moving down (minimising) closes the keyboard as soon as the move starts.
      onAnimate={(from, to) => {
        if (to < from) Keyboard.dismiss();
      }}
      backgroundStyle={[styles.background, { backgroundColor: colors.bg.sheet }]}
      handleIndicatorStyle={[styles.grabber, { backgroundColor: colors.border.default }]}
      accessibilityLabel={accessibilityLabel}
    >
      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      )}
    </GorhomBottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  background: {
    ...elevation.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  grabber: { width: size.grabber.width, height: size.grabber.height },
  content: { paddingHorizontal: space.screenX, paddingBottom: space.xl },
});
