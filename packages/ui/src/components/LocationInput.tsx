import { Plus, X } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { a11y, radius, size, space, type as typeTokens } from '../../tokens';
import { hapticFor } from '../haptics';
import { useTheme } from '../theme';

export type LocationField = {
  id: string;
  kind: 'pickup' | 'dropoff';
  /** Shown in the field (chosen stop name, or what the user is typing). */
  text: string;
  placeholder: string;
  accessibilityLabel: string;
  /** Extra drop-offs (multi-stop) can be removed. */
  removable?: boolean;
};

export type LocationInputProps = {
  fields: LocationField[];
  activeId: string | null;
  onFocusField: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  onAddStop?: () => void;
  onRemoveStop?: (id: string) => void;
};

/**
 * DESIGN.md §7 LocationInput: stacked pickup + drop-off rows joined by a dotted connector,
 * '+' (add stop) at the end of the pickup row. Each row is a search field.
 */
export function LocationInput({ fields, activeId, onFocusField, onChangeText, onAddStop, onRemoveStop }: LocationInputProps) {
  const { colors } = useTheme();
  const inputs = useRef(new Map<string, TextInput>());

  // Focus follows activeId, so the screen can open a field programmatically (keyboard opens).
  useEffect(() => {
    if (activeId) inputs.current.get(activeId)?.focus();
  }, [activeId]);

  return (
    <View style={styles.root}>
      {fields.map((f, i) => {
        const active = f.id === activeId;
        const last = i === fields.length - 1;
        return (
          <View key={f.id} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.marker,
                  f.kind === 'pickup' ? styles.markerPickup : styles.markerDropoff,
                  { backgroundColor: colors.ink.primary },
                ]}
              />
              {!last && (
                <View style={styles.connector}>
                  {[0, 1, 2].map((d) => (
                    <View key={d} style={[styles.connectorDot, { backgroundColor: colors.ink.tertiary }]} />
                  ))}
                </View>
              )}
            </View>
            <View
              style={[
                styles.field,
                { backgroundColor: colors.bg.subtle, borderColor: active ? colors.ink.primary : colors.bg.subtle },
              ]}
            >
              <TextInput
                ref={(el) => {
                  if (el) inputs.current.set(f.id, el);
                  else inputs.current.delete(f.id);
                }}
                value={f.text}
                placeholder={f.placeholder}
                placeholderTextColor={colors.ink.tertiary}
                onFocus={() => onFocusField(f.id)}
                onChangeText={(t) => onChangeText(f.id, t)}
                selectTextOnFocus
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
                accessibilityLabel={f.accessibilityLabel}
                maxFontSizeMultiplier={a11y.maxFontScale}
                style={[typeTokens.body, styles.input, { color: colors.ink.primary }]}
              />
            </View>
            {f.kind === 'pickup' && onAddStop ? (
              <IconButton label="Add a stop for another passenger" onPress={onAddStop}>
                <Plus size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
              </IconButton>
            ) : f.removable && onRemoveStop ? (
              <IconButton label="Remove this stop" onPress={() => onRemoveStop(f.id)}>
                <X size={size.iconChip} strokeWidth={size.iconStroke} color={colors.ink.secondary} />
              </IconButton>
            ) : (
              <View style={styles.iconSpacer} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticFor('selection');
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.bg.subtle }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rail: { width: size.locationMarker, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  marker: { width: size.locationMarker, height: size.locationMarker },
  markerPickup: { borderRadius: radius.pill },
  markerDropoff: { borderRadius: 0 },
  connector: {
    position: 'absolute',
    top: size.locationRow / 2 + size.locationMarker,
    height: size.locationRow - size.locationMarker * 2 + space.xs,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  connectorDot: { width: size.connectorDot, height: size.connectorDot, borderRadius: radius.pill },
  field: {
    flex: 1,
    height: size.locationRow,
    borderRadius: radius.md,
    borderWidth: size.hairline,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  input: { padding: 0 },
  iconButton: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: { width: size.tapMin },
});
