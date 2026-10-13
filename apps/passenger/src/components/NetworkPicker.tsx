import { GlydeText, hapticFor, radius, size, space, useTheme } from '@glyde/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MomoNetwork } from '@/features/booking/pay';
import { NETWORK_LABEL } from '@/features/payments/usePaymentMethods';

/** Mobile Money network choice (MTN / Telecel / AirtelTigo). */
export function NetworkPicker({ value, onChange }: { value: MomoNetwork; onChange: (n: MomoNetwork) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Mobile Money network">
      {(Object.keys(NETWORK_LABEL) as MomoNetwork[]).map((id) => {
        const active = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={NETWORK_LABEL[id]}
            onPress={() => {
              hapticFor('selection');
              onChange(id);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.ink.primary : colors.bg.base,
                borderColor: active ? colors.ink.primary : colors.border.default,
              },
            ]}
          >
            <GlydeText variant="callout" tone={active ? 'inverse' : 'primary'}>
              {NETWORK_LABEL[id]}
            </GlydeText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  chip: {
    flex: 1,
    minHeight: size.tapMin,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
