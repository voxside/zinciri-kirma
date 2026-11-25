import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { THEMES, type Theme, themeModeAt } from '@/constants/theme';
import { useAppNow } from '@/lib/app-time';

const ThemeCtx = createContext<Theme>(THEMES.night);

/** Uygulama saatine göre (Test Paneli dahil) gündüz/akşam temasını sağlar. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const now = useAppNow();
  const mode = themeModeAt(new Date(now));
  return <ThemeCtx.Provider value={THEMES[mode]}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/** Temaya bağlı StyleSheet: `const styles = useStyles(makeStyles)` */
export function useStyles<T>(factory: (t: Theme) => T): T {
  const t = useTheme();
  return useMemo(() => factory(t), [factory, t]);
}
