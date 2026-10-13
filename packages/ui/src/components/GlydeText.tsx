import { Text, type TextProps } from 'react-native';

import { a11y, tabularNums, type TypeToken, type as typeTokens } from '../../tokens';
import { useTheme } from '../theme';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse';

export type GlydeTextProps = TextProps & { variant?: TypeToken; tone?: Tone; tabular?: boolean };

/** Text bound to the type ramp. Use instead of raw <Text> so sizes come from tokens. */
export function GlydeText({ variant = 'body', tone = 'primary', tabular, style, ...rest }: GlydeTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={a11y.maxFontScale}
      style={[typeTokens[variant], { color: colors.ink[tone] }, tabular && { fontVariant: tabularNums }, style]}
      {...rest}
    />
  );
}
