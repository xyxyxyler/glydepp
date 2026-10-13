import { BlurView, type BlurTint } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react-native';

import { elevation, radius, size } from '../../tokens';
import { useTheme } from '../theme';

/**
 * Frosted-glass surface for alerts floating over content (user request 2026-10-14).
 * iOS: the system thin material blur. Android: a translucent fill (true blur on Android needs a
 * BlurTargetView around the blurred content — not wired up yet).
 */
export function GlassSurface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.shadow, style]}>
      <View style={[styles.clip, { borderColor: colors.glass.border }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={size.glassBlur}
            tint={colors.glass.blurTint as BlurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass.fill }]} />
        )}
        {children}
      </View>
    </View>
  );
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

const ICONS = { success: CircleCheck, warning: TriangleAlert, danger: CircleX, info: Info } as const;

/** Status icon on a pale tinted circle: the status reads from the shape AND colour (DESIGN.md §12). */
export function StatusIcon({ tone }: { tone: StatusTone }) {
  const { colors } = useTheme();
  const Icon = ICONS[tone];
  return (
    <View
      style={[styles.icon, { backgroundColor: colors.statusTint[tone] }]}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon size={size.icon} strokeWidth={size.iconStroke} color={colors.status[tone]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { ...elevation.floating, borderRadius: radius.lg },
  clip: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: size.hairline },
  icon: {
    width: size.alertIcon,
    height: size.alertIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
