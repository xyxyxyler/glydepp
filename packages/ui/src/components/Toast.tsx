import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { elevation, gesture, motion, radius, size, space, spring, type HapticMoment } from '../../tokens';
import { hapticFor } from '../haptics';
import { easing } from '../motion/easing';
import { useTheme } from '../theme';
import { GlydeText } from './GlydeText';

export type ToastTone = 'success' | 'warning' | 'danger' | 'info';
export type ToastOptions = { title: string; message?: string; tone?: ToastTone; duration?: number };

const toneHaptic: Record<ToastTone, HapticMoment> = {
  success: 'paymentSuccess',
  warning: 'approaching',
  danger: 'failure',
  info: 'selection',
};

type ToastApi = { show: (options: ToastOptions) => void; hide: () => void };
const ToastContext = createContext<ToastApi>({ show: () => {}, hide: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * DESIGN.md §7 / §8.10: toast slides from the top with a spring, has a status.* accent,
 * auto-dismisses after 5 s, swipe up to dismiss, haptic on show.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const height = useSharedValue(0);
  /** Set when a new toast mounts; the enter animation runs once it has measured itself. */
  const pendingEnter = useRef(false);

  const clear = useCallback(() => setToast(null), []);

  /** Exit animation. Runs on either thread; touches no refs so gestures can call it. */
  const animateOut = useCallback(() => {
    'worklet';
    const out = { duration: reduceMotion ? motion.reduceMotionFade : motion.base, easing: easing.exit };
    opacity.set(withTiming(0, out));
    translateY.set(
      withTiming(reduceMotion ? 0 : -height.get() - insets.top, out, (done) => {
        if (done) scheduleOnRN(clear);
      }),
    );
  }, [clear, height, insets.top, opacity, reduceMotion, translateY]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    animateOut();
  }, [animateOut]);

  const show = useCallback((options: ToastOptions) => {
    setToast({ ...options, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    hapticFor(toneHaptic[toast.tone ?? 'info']);
    opacity.set(0);
    pendingEnter.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, toast.duration ?? motion.toastDismiss);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate once per toast id
  }, [toast?.id]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
    .onChange((e) => {
      translateY.set(Math.min(0, translateY.get() + e.changeY));
    })
    .onEnd((e) => {
      if (translateY.get() < -height.get() * gesture.dismissFraction || e.velocityY < -gesture.dismissVelocity) {
        animateOut(); // the auto-dismiss timer is cleared when the toast unmounts
      } else {
        translateY.set(withSpring(0, spring.sheet));
      }
    }),
    [animateOut, height, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  const api = useMemo(() => ({ show, hide }), [show, hide]);
  const accent = toast ? colors.status[toast.tone ?? 'info'] : colors.status.info;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <View key={toast.id} pointerEvents="box-none" style={[styles.host, { top: insets.top + space.xs }]}>
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                height.set(h);
                if (!pendingEnter.current) return;
                pendingEnter.current = false;
                if (reduceMotion) {
                  translateY.set(0);
                  opacity.set(withTiming(1, { duration: motion.reduceMotionFade }));
                } else {
                  translateY.set(-h - insets.top);
                  opacity.set(1);
                  translateY.set(withSpring(0, spring.sheet));
                }
              }}
              style={[styles.toast, { backgroundColor: colors.bg.sheet, borderLeftColor: accent }, animatedStyle]}
            >
              <GlydeText variant="headline">{toast.title}</GlydeText>
              {toast.message ? (
                <GlydeText variant="callout" tone="secondary">
                  {toast.message}
                </GlydeText>
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.screenX, right: space.screenX },
  toast: {
    ...elevation.floating,
    borderRadius: radius.lg,
    borderLeftWidth: size.toastAccent,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    minHeight: size.tapMin,
    gap: space.xxs,
  },
});
