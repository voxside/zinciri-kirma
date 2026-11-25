import { TabList, type TabListProps, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { S, type Theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useStyles, useTheme } from '@/theme/theme-context';
import { BookIcon, LinkIcon, ListIcon, SparkleIcon } from './icons';

type IconFn = (color: string) => ReactNode;

const TABS: { name: string; href: '/' | '/lists' | '/coach' | '/memory'; label: string; icon: IconFn }[] = [
  { name: 'today', href: '/', label: 'Bugün', icon: (c) => <LinkIcon size={23} color={c} /> },
  { name: 'lists', href: '/lists', label: 'Listeler', icon: (c) => <ListIcon size={23} color={c} /> },
  { name: 'coach', href: '/coach', label: 'Koç', icon: (c) => <SparkleIcon size={23} color={c} /> },
  { name: 'memory', href: '/memory', label: 'Hafıza', icon: (c) => <BookIcon size={22} color={c} /> },
];

/** Tek elle kullanım için alt menü (tüm platformlarda aynı görünüm). */
export function AppTabs() {
  const styles = useStyles(makeStyles);
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

// TabList kendi stil dizisini çocuğa geçirir; burada kendi stilimizle eziyoruz.
function TabBar({ children, style: _ignored, ...props }: TabListProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View {...(props as ViewProps)} style={{ ...styles.bar, paddingBottom: Math.max(insets.bottom, S.sm) }}>
      {children}
    </View>
  );
}

function TabButton({ children, isFocused, icon, onPress, ...props }: TabTriggerSlotProps & { icon: IconFn }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  // Turkuaz = uygulamanın karakteri; seçili sekme turkuaz.
  const color = isFocused ? t.primary : t.textFaint;
  return (
    <Pressable
      // expo-router/ui'nin ref tipi RN 0.88'in yeni ref tipleriyle henüz uyumlu değil.
      {...(props as PressableProps)}
      onPress={(e) => {
        if (!isFocused) haptic.tap();
        onPress?.(e);
      }}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}>
      {icon(color)}
      <Text style={[styles.tabLabel, { color }]}>{children}</Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  slot: { flex: 1 },
  bar: {
    flexDirection: 'row',
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderTopColor: t.border,
    paddingTop: S.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  tabLabel: { fontSize: 11, fontWeight: '700' },
});
