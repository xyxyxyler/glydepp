import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { color, type Palette } from '../tokens';

export type ThemeName = 'light' | 'dark';

type ThemeValue = { name: ThemeName; colors: Palette };

const ThemeContext = createContext<ThemeValue>({ name: 'light', colors: color.light });

export function ThemeProvider({ theme = 'light', children }: { theme?: ThemeName; children: ReactNode }) {
  const value = useMemo(() => ({ name: theme, colors: color[theme] }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
