import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppTabs } from '@/components/tab-bar';
import { TimePanel } from '@/components/time-panel';
import { useDayRollover, useHydrated } from '@/hooks/use-day';
import { useSyncEngine } from '@/hooks/use-sync';
import { useWebPwa } from '@/hooks/use-web-pwa';
import { AppThemeProvider, useTheme } from '@/theme/theme-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useHydrated();
  useDayRollover(hydrated);
  useSyncEngine(hydrated);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <ThemedRoot hydrated={hydrated} />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedRoot({ hydrated }: { hydrated: boolean }) {
  const t = useTheme();
  useWebPwa(t);
  const navTheme = useMemo(() => {
    const base = t.mode === 'day' ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: { ...base.colors, background: t.bg, card: t.surface, primary: t.primary, border: t.border, text: t.text },
    };
  }, [t]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={t.statusBar} />
      {hydrated ? (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <AppTabs />
          <TimePanel />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: t.bg }} />
      )}
    </ThemeProvider>
  );
}
