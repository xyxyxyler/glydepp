import { GlydeText, hapticFor, radius, size, space, useTheme } from "@glyde/ui";
import { Pressable, ScrollView, StyleSheet } from "react-native";

export type PassengerTab = {
  key: string;
  title: string;
  seatNo: number | undefined;
};

/** Multi-stop: pick which passenger the next seat tap is for. */
export function PassengerTabs({
  tabs,
  activeKey,
  onSelect,
}: {
  tabs: PassengerTab[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map((t, i) => {
        const active = t.key === activeKey;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Passenger ${i + 1}, ${t.title}, ${t.seatNo ? `seat ${t.seatNo}` : "no seat yet"}`}
            onPress={() => {
              hapticFor("selection");
              onSelect(t.key);
            }}
            style={[
              styles.tab,
              {
                backgroundColor: active ? colors.brand.tint : colors.bg.subtle,
                borderColor: active ? colors.brand.primary : colors.bg.subtle,
              },
            ]}
          >
            <GlydeText variant="callout">{`P${i + 1} · ${t.title}`}</GlydeText>
            <GlydeText variant="caption" tone="secondary">
              {t.seatNo ? `Seat ${t.seatNo}` : "Choose a seat"}
            </GlydeText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs },
  tab: {
    minHeight: size.tapMin,
    justifyContent: "center",
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: size.selectedBorder,
  },
});
