import type { LatLng } from '@glyde/ui';

import { useNetwork } from '@/features/network/useNetwork';

/** All stops served (any route). Used to frame the map when the user's location is unknown. */
export function useServiceArea(): LatLng[] | null {
  const { network } = useNetwork();
  return network?.stops ?? null;
}
