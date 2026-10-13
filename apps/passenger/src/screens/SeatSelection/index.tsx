import {
  freeSeatsFor,
  invalidPicks,
  picksComplete,
  seatFare,
  seatStateFor,
  type Journey,
  type SeatPick,
} from "@glyde/domain";
import {
  Banner,
  elevation,
  formatGHS,
  GlydeText,
  hapticFor,
  PrimaryButton,
  radius,
  RollingNumber,
  SeatGrid,
  SecondaryButton,
  Skeleton,
  size,
  space,
  useTheme,
  useToast,
} from "@glyde/ui";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFareRules } from "@/features/fares/useFareRules";
import { useNetwork, type RouteInfo } from "@/features/network/useNetwork";
import { useSeatMap } from "@/features/seats/useSeatMap";

import { PassengerTabs } from "./components/PassengerTabs";

// Skeleton grid shape while the real layout loads (Coaster: 8 rows × 5 cells).
const SKELETON_ROWS = 8;
const SKELETON_COLS = 5;

/**
 * uix-spec 2.3 Seat Selection. Segment-aware: a seat is unavailable only if someone holds it on
 * a part of the route that overlaps this passenger's journey. One seat per passenger.
 */
export function SeatSelectionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{
    tripId: string;
    pickup: string;
    dropoffs: string;
  }>();
  const dropoffIds = useMemo(
    () => (params.dropoffs ?? "").split(",").filter(Boolean),
    [params.dropoffs],
  );

  const seatMap = useSeatMap(params.tripId ?? null);
  const { network } = useNetwork();
  const map = seatMap.status === "ready" ? seatMap.map : null;
  const route =
    map && network
      ? (network.routes.find((r) => r.id === map.routeId) ?? null)
      : null;
  const fareRules = useFareRules(route?.code ?? null);
  const stopName = (id: string) =>
    network?.stops.find((s) => s.id === id)?.name ?? "";

  // One journey per drop-off, all from the same pickup.
  const journeys = useMemo((): Journey[] | null => {
    if (!route || !params.pickup) return null;
    const p = route.stops.get(params.pickup);
    if (!p) return null;
    const out: Journey[] = [];
    for (const d of dropoffIds) {
      const s = route.stops.get(d);
      if (!s || s.idx <= p.idx) return null; // not served in this direction
      out.push({ key: d, pickupIdx: p.idx, dropoffIdx: s.idx });
    }
    return out;
  }, [route, params.pickup, dropoffIds]);

  const [picks, setPicks] = useState<SeatPick>({});
  const [activeKey, setActiveKey] = useState<string>(dropoffIds[0] ?? "");

  // Someone else may book a seat we picked while we choose: drop it and tell the user.
  const taken = useMemo(() => map?.taken ?? [], [map]);
  const lost = journeys ? invalidPicks(journeys, taken, picks) : [];
  const effective: SeatPick = { ...picks };
  lost.forEach((k) => delete effective[k]);
  const lostKey = lost.map((k) => `${k}:${picks[k]}`).join(",");
  useEffect(() => {
    if (!lostKey) return;
    hapticFor("failure");
    toast.show({
      tone: "warning",
      title: "A seat was just taken",
      message: "Please choose another seat.",
    });
  }, [lostKey, toast]);

  const active =
    journeys?.find((j) => j.key === activeKey) ?? journeys?.[0] ?? null;
  const complete = journeys ? picksComplete(journeys, taken, effective) : false;

  const onSeatPress = (seatNo: number) => {
    if (!journeys || !active) return;
    const next: SeatPick = { ...effective };
    if (next[active.key] === seatNo) {
      delete next[active.key];
    } else {
      next[active.key] = seatNo;
      // Move on to the next passenger still without a seat.
      const nextJourney = journeys.find(
        (j) => j.key !== active.key && next[j.key] === undefined,
      );
      if (nextJourney) setActiveKey(nextJourney.key);
    }
    setPicks(next);
  };

  const fares =
    journeys && route
      ? journeys.map((j) =>
          seatFare(distanceOf(route, params.pickup, j.key), fareRules),
        )
      : [];
  const total =
    fares.length && fares.every((f) => f)
      ? fares.reduce((s, f) => s + (f?.totalPesewas ?? 0), 0)
      : null;
  const chosen =
    journeys
      ?.map((j) => effective[j.key])
      .filter((n): n is number => n !== undefined) ?? [];
  const noSeatsLeft =
    !!map &&
    !!journeys &&
    !!active &&
    effective[active.key] === undefined &&
    freeSeatsFor(map.seatCount, active, journeys, taken, effective).length ===
      0;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg.base, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to buses"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.back,
            pressed && { backgroundColor: colors.bg.subtle },
          ]}
        >
          <ChevronLeft
            size={size.icon}
            strokeWidth={size.iconStroke}
            color={colors.ink.primary}
          />
        </Pressable>
        <View style={styles.headerText}>
          <GlydeText variant="title2">
            {dropoffIds.length > 1 ? "Choose seats" : "Choose your seat"}
          </GlydeText>
          <GlydeText variant="caption" tone="secondary" numberOfLines={1}>
            {stopName(params.pickup ?? "")} →{" "}
            {dropoffIds.map(stopName).join(", ")}
            {map ? ` · ${map.plate}` : ""}
          </GlydeText>
        </View>
      </View>

      {seatMap.status === "ready" && seatMap.stale && (
        <Banner
          tone="info"
          message="Offline — seat availability may be out of date."
          style={styles.banner}
        />
      )}

      <ScrollView contentContainerStyle={styles.body}>
        {seatMap.status === "loading" ||
        (seatMap.status === "ready" && !network) ? (
          <View style={styles.skeleton} accessibilityLabel="Loading seat map">
            {Array.from({ length: SKELETON_ROWS }, (_, r) => (
              <View key={r} style={styles.skeletonRow}>
                {Array.from({ length: SKELETON_COLS }, (_, c) => (
                  <Skeleton
                    key={c}
                    width={size.seat}
                    height={size.seat}
                    radius="sm"
                  />
                ))}
              </View>
            ))}
          </View>
        ) : seatMap.status === "error" || !journeys || !map ? (
          <View style={styles.message}>
            <GlydeText variant="body">
              Couldn’t load the seat map for this bus.
            </GlydeText>
            {seatMap.status === "error" && (
              <SecondaryButton label="Retry" onPress={seatMap.retry} />
            )}
          </View>
        ) : (
          <>
            {journeys.length > 1 && active && (
              <PassengerTabs
                tabs={journeys.map((j) => ({
                  key: j.key,
                  title: stopName(j.key),
                  seatNo: effective[j.key],
                }))}
                activeKey={active.key}
                onSelect={setActiveKey}
              />
            )}
            {noSeatsLeft ? (
              <View style={styles.message}>
                <GlydeText variant="headline">
                  No seats free for this journey
                </GlydeText>
                <GlydeText variant="callout" tone="secondary">
                  Every seat is taken for part of this trip. Try another bus.
                </GlydeText>
                <SecondaryButton
                  label="Choose another bus"
                  onPress={() => router.back()}
                />
              </View>
            ) : (
              active && (
                <SeatGrid
                  grid={map.grid}
                  stateOf={(n) =>
                    seatStateFor(n, active, journeys, taken, effective)
                  }
                  onSeatPress={onSeatPress}
                />
              )
            )}
            <Legend />
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.bg.sheet,
            paddingBottom: insets.bottom + space.sm,
          },
        ]}
      >
        <View style={styles.summary}>
          <GlydeText variant="callout" tone="secondary" style={styles.flex}>
            {chosen.length === 0
              ? "No seat selected"
              : `${chosen.length === 1 ? "Seat" : "Seats"} ${[...chosen].sort((a, b) => a - b).join(", ")}`}
          </GlydeText>
          {total === null ? (
            <GlydeText variant="callout" tone="secondary">
              Fare pending
            </GlydeText>
          ) : (
            <RollingNumber
              value={total}
              format={formatGHS}
              variant="headline"
              accessibilityLabel={`Total ${formatGHS(total)}`}
            />
          )}
        </View>
        <PrimaryButton
          label="Proceed to Payment"
          disabled={!complete}
          accessibilityHint={
            complete ? undefined : "Choose a seat for each passenger first"
          }
          onPress={() =>
            toast.show({
              tone: "info",
              title: "Payment is next",
              message: "Built in the next task.",
            })
          }
        />
      </View>
    </View>
  );
}

function distanceOf(
  route: RouteInfo,
  pickupId: string | undefined,
  dropoffId: string,
): number {
  return (
    (route.stops.get(dropoffId)?.distanceM ?? 0) -
    (route.stops.get(pickupId ?? "")?.distanceM ?? 0)
  );
}

function Legend() {
  const { colors } = useTheme();
  const items = [
    {
      label: "Available",
      fill: colors.seat.available.fill,
      border: colors.seat.available.border,
    },
    {
      label: "Selected",
      fill: colors.seat.selected.fill,
      border: colors.seat.selected.fill,
    },
    {
      label: "Taken",
      fill: colors.seat.unavailable.fill,
      border: colors.seat.unavailable.fill,
    },
  ];
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: i.fill, borderColor: i.border },
            ]}
          />
          <GlydeText variant="caption" tone="secondary">
            {i.label}
          </GlydeText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingBottom: space.sm,
  },
  back: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: space.xxs },
  banner: { marginHorizontal: space.screenX, marginBottom: space.xs },
  body: {
    paddingHorizontal: space.screenX,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  skeleton: { gap: size.seatGap, alignSelf: "center" },
  skeletonRow: { flexDirection: "row", gap: size.seatGap },
  message: { gap: space.xs, paddingVertical: space.md },
  legend: { flexDirection: "row", justifyContent: "center", gap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
  swatch: {
    width: space.md,
    height: space.md,
    borderRadius: radius.sm / 2,
    borderWidth: size.seatBorder,
  },
  footer: {
    ...elevation.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.screenX,
    paddingTop: space.md,
    gap: space.sm,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
