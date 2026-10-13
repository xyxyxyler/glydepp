import Svg, { Rect } from 'react-native-svg';

import { radius } from '../../tokens';

/**
 * Top-down bus, nose pointing up (north at rotation 0). DESIGN.md §6.
 * Proportions are shape geometry relative to `size`, not design tokens.
 */
export function BusGlyph({ size, fill, windows }: { size: number; fill: string; windows: string }) {
  const w = size * 0.5;
  const h = size;
  const x = (size - w) / 2;
  return (
    <Svg width={size} height={size}>
      <Rect x={x} y={0} width={w} height={h} rx={radius.sm} fill={fill} />
      {/* windscreen */}
      <Rect x={x + w * 0.15} y={h * 0.08} width={w * 0.7} height={h * 0.14} rx={radius.sm / 2} fill={windows} />
      {/* roof hatch */}
      <Rect x={x + w * 0.3} y={h * 0.45} width={w * 0.4} height={h * 0.18} rx={radius.sm / 4} fill={windows} opacity={0.5} />
    </Svg>
  );
}
