import { Easing } from 'react-native-reanimated';

import { ease } from '../../tokens';

export const easing = {
  standard: Easing.bezier(...ease.standard),
  enter: Easing.bezier(...ease.enter),
  exit: Easing.bezier(...ease.exit),
} as const;
