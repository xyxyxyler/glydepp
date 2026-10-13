import { Circle } from 'react-native-maps';

import { mapDebug, size } from '../../tokens';
import { useTheme } from '../theme';
import type { LatLng } from './geo';

/**
 * Dev-only: the raw GPS fix drawn natively by the map (no view, no anchor), so you can see
 * whether a marker's glyph is centred on its real coordinate. It jumps between fixes by design.
 */
export function GpsDebugDot({ point }: { point: LatLng }) {
  const { colors } = useTheme();
  return (
    <Circle
      center={point}
      radius={mapDebug.dotRadiusMeters}
      fillColor={colors.status.info}
      strokeColor={colors.bg.base}
      strokeWidth={size.hairline}
      zIndex={1}
    />
  );
}
