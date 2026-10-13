import { polylineBetween, RouteLine, StopPin, type GlydeMapHandle } from '@glyde/ui';
import { useMemo, type RefObject } from 'react';

import type { RouteInfo, Stop } from '@/features/network/useNetwork';
import { useRoutePath } from '@/features/routes/useRoutePath';

type Props = { map: RefObject<GlydeMapHandle | null>; route: RouteInfo; pickup: Stop; dropoffs: Stop[] };

/**
 * DESIGN.md §8.3: on route confirmation the line draws itself pickup → furthest drop-off, pins
 * drop in, then the camera fits the route above the sheet.
 */
export function TripRouteOverlay({ map, route, pickup, dropoffs }: Props) {
  const path = useRoutePath(route.id);
  const from = route.stops.get(pickup.id)?.distanceM ?? 0;
  const to = Math.max(...dropoffs.map((d) => route.stops.get(d.id)?.distanceM ?? 0));
  const segment = useMemo(
    () => (path ? polylineBetween(path, from / route.lengthM, to / route.lengthM) : null),
    [path, from, to, route.lengthM],
  );
  if (!segment) return null;
  const key = `${pickup.id}>${dropoffs.map((d) => d.id).join(',')}`;
  return (
    <>
      <RouteLine key={key} coordinates={segment} playKey={key} onDrawn={() => map.current?.fitTo(segment)} />
      <StopPin key={`p-${pickup.id}`} point={pickup} kind="pickup" accessibilityLabel={`Pickup: ${pickup.name}`} />
      {dropoffs.map((d) => (
        <StopPin key={`d-${d.id}`} point={d} kind="dropoff" accessibilityLabel={`Drop-off: ${d.name}`} />
      ))}
    </>
  );
}
