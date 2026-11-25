import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { R, S, type Theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { TaskCategory } from '@/types/models';
import { BriefcaseIcon, CartIcon, ListIcon, PhoneIcon, PlusIcon } from './icons';

export function CategoryIcon({ category, size = 16, color }: { category: TaskCategory; size?: number; color?: string }) {
  const t = useTheme();
  const c = color ?? t.cat[category];
  if (category === 'shopping') return <CartIcon size={size} color={c} />;
  if (category === 'call') return <PhoneIcon size={size} color={c} />;
  if (category === 'project') return <BriefcaseIcon size={size} color={c} />;
  return <ListIcon size={size} color={c} />;
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; color?: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}

export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.segment, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && { backgroundColor: t.surface2, borderColor: o.color ?? t.border }]}>
            {o.icon}
            <Text style={[styles.segmentText, active && { color: o.color ?? t.text }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, color, icon }: { label: string; color?: string; icon?: ReactNode }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const c = color ?? t.textDim;
  return (
    <View style={[styles.chip, { borderColor: c + '55' }]}>
      {icon}
      <Text style={[styles.chipText, { color: c }]}>{label}</Text>
    </View>
  );
}

export function Fab({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Yeni görev ekle"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }] }]}>
      <PlusIcon size={28} color={t.onAccent} strokeWidth={3} />
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: t.surface,
    borderRadius: R.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: t.border,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: { color: t.textDim, fontSize: 13, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: S.lg,
    bottom: S.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: t.accent,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  sectionTitle: {
    color: t.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
