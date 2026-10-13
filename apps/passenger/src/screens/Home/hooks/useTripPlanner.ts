import { useCallback, useMemo, useState } from 'react';

import { routeFor, type Network, type Stop } from '@/features/network/useNetwork';

export type FieldId = 'pickup' | `dropoff-${number}`;
type Choice = { stopId: string; viaCurrentLocation?: boolean } | null;

/**
 * Trip search state (uix-spec 2.3). Lives in Home so collapsing the sheet never loses it
 * (DESIGN.md §8.1). Extra drop-offs are separate passengers' journeys from the same pickup.
 */
export function useTripPlanner(network: Network | null) {
  const [pickup, setPickup] = useState<Choice>(null);
  const [dropoffs, setDropoffs] = useState<{ key: number; choice: Choice }[]>([{ key: 0, choice: null }]);
  const [nextKey, setNextKey] = useState(1);
  const [active, setActive] = useState<FieldId | null>(null);
  const [query, setQuery] = useState('');

  const stopById = useMemo(() => new Map((network?.stops ?? []).map((s) => [s.id, s])), [network]);
  const dropoffIds = dropoffs.map((d) => d.choice?.stopId).filter((id): id is string => !!id);
  const complete = !!pickup && !!dropoffs[0]?.choice;
  const route = network && pickup && dropoffs[0]?.choice ? routeFor(network, pickup.stopId, dropoffs[0].choice.stopId) : null;

  const focus = useCallback((id: FieldId) => {
    setActive(id);
    setQuery('');
  }, []);

  const choose = useCallback(
    (stop: Stop, viaCurrentLocation = false) => {
      if (!active) return;
      const choice = { stopId: stop.id, viaCurrentLocation };
      if (active === 'pickup') {
        setPickup(choice);
        // A new pickup can make existing drop-offs invalid (same stop / other direction): clear them.
        setDropoffs((ds) => ds.map((d) => (d.choice?.stopId === stop.id ? { ...d, choice: null } : d)));
      } else {
        const key = Number(active.slice('dropoff-'.length));
        setDropoffs((ds) => ds.map((d) => (d.key === key ? { ...d, choice } : d)));
      }
      setActive(null);
      setQuery('');
    },
    [active],
  );

  /** Default pickup = nearest stop to the device ('Current location'), if nothing chosen yet. */
  const defaultPickup = useCallback((stop: Stop) => {
    setPickup((p) => p ?? { stopId: stop.id, viaCurrentLocation: true });
  }, []);

  const addStop = useCallback(() => {
    const key = nextKey;
    setNextKey(key + 1);
    setDropoffs((ds) => [...ds, { key, choice: null }]);
    setActive(`dropoff-${key}`);
    setQuery('');
  }, [nextKey]);

  const removeStop = useCallback((id: FieldId) => {
    const key = Number(id.slice('dropoff-'.length));
    setDropoffs((ds) => (ds.length > 1 ? ds.filter((d) => d.key !== key) : ds));
    setActive((a) => (a === id ? null : a));
  }, []);

  /** Stops that make sense for the active field. */
  const candidates = useMemo((): Stop[] => {
    if (!network || !active) return [];
    if (active === 'pickup') return network.stops;
    const taken = new Set([pickup?.stopId, ...dropoffs.map((d) => d.choice?.stopId)]);
    const isPrimary = active === `dropoff-${dropoffs[0]?.key}`;
    return network.stops.filter((s) => {
      if (taken.has(s.id)) return false;
      if (!pickup) return true;
      // Extra drop-offs must be on the primary journey's route, after the pickup.
      if (!isPrimary && route) {
        const p = route.stops.get(pickup.stopId);
        const d = route.stops.get(s.id);
        return !!p && !!d && d.idx > p.idx;
      }
      return !!routeFor(network, pickup.stopId, s.id);
    });
  }, [network, active, pickup, dropoffs, route]);

  return {
    pickup,
    dropoffs,
    dropoffIds,
    active,
    query,
    setQuery,
    complete,
    route,
    stopById,
    candidates,
    focus,
    choose,
    defaultPickup,
    addStop,
    removeStop,
  };
}

export type TripPlanner = ReturnType<typeof useTripPlanner>;
