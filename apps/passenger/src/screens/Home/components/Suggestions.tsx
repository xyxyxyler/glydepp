import { GlydeText, hapticFor, motion, radius, size, space, stagger, useTheme } from '@glyde/ui';
import { Clock, LocateFixed, MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import type { NearestStop } from '@/features/location/useNearestStop';
import type { Stop } from '@/features/network/useNetwork';

type Props = {
  query: string;
  candidates: Stop[];
  recentIds: string[];
  /** Offered for the pickup field only, when location is available. */
  nearest: NearestStop | null;
  onChoose: (stop: Stop, viaCurrentLocation?: boolean) => void;
};

/** "Current location", recent history, then stops matching the typed text (uix-spec 2.3). */
export function Suggestions({ query, candidates, recentIds, nearest, onChoose }: Props) {
  const reduceMotion = useReducedMotion();
  const q = query.trim().toLowerCase();
  const allowed = new Set(candidates.map((c) => c.id));
  const matches = q ? candidates.filter((s) => s.name.toLowerCase().includes(q)) : candidates;
  const recents = q ? [] : recentIds.map((id) => candidates.find((c) => c.id === id)).filter((s): s is Stop => !!s);
  const rest = matches.filter((s) => !recents.includes(s));
  const showNearest = !q && nearest && allowed.has(nearest.stop.id);

  const rows: { key: string; node: ReactNode }[] = [];
  if (showNearest) {
    rows.push({
      key: 'nearest',
      node: (
        <Row
          icon="locate"
          title="Current location"
          subtitle={`Nearest stop: ${nearest.stop.name} · ${formatWalk(nearest.walkM)}`}
          onPress={() => onChoose(nearest.stop, true)}
        />
      ),
    });
  }
  recents.forEach((s) =>
    rows.push({ key: `r-${s.id}`, node: <Row icon="recent" title={s.name} onPress={() => onChoose(s)} /> }),
  );
  rest.forEach((s) => rows.push({ key: s.id, node: <Row icon="stop" title={s.name} onPress={() => onChoose(s)} /> }));

  if (rows.length === 0) {
    return (
      <GlydeText variant="callout" tone="secondary" style={styles.empty}>
        {q ? `No Glyde stop matches "${query.trim()}".` : 'No stops available for this trip.'}
      </GlydeText>
    );
  }

  return (
    <View>
      {rows.map((r, i) => (
        <Animated.View
          key={r.key}
          entering={
            i < stagger.maxItems && !reduceMotion ? FadeIn.duration(motion.base).delay(i * stagger.list) : undefined
          }
        >
          {r.node}
        </Animated.View>
      ))}
    </View>
  );
}

function formatWalk(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m away` : `${(m / 1000).toFixed(1)} km away`;
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: 'locate' | 'recent' | 'stop';
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const Icon = icon === 'locate' ? LocateFixed : icon === 'recent' ? Clock : MapPin;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={() => {
        hapticFor('selection');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg.subtle }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.bg.subtle }]}>
        <Icon size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.primary} />
      </View>
      <View style={styles.text}>
        <GlydeText variant="body">{title}</GlydeText>
        {subtitle ? (
          <GlydeText variant="caption" tone="secondary">
            {subtitle}
          </GlydeText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.tapMin + space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.md,
  },
  icon: {
    width: size.tapMin - space.xs,
    height: size.tapMin - space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  empty: { paddingVertical: space.md },
});
