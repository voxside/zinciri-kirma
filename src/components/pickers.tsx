// Tek elle hızlı seçim: saat ve tarih seçiciler (her platformda aynı çalışır).

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { R, S, type Theme } from '@/constants/theme';
import { addDays, formatLongDate } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { countdownLabel } from '@/lib/order';
import { useStyles, useTheme } from '@/theme/theme-context';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6).concat([0, 1, 2, 3, 4, 5]); // 06..23, 00..05
const MINUTES = ['00', '15', '30', '45'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "Görevi yapacağım saat" — saat + dakika çipleri. */
export function TimePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const [h, m] = value ? value.split(':') : [undefined, undefined];

  return (
    <View style={{ gap: S.sm }}>
      <View style={styles.row}>
        <Text style={[styles.big, !value && { color: t.textFaint }]}>{value ? `🕘 ${value}` : 'Saat yok'}</Text>
        {value ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              haptic.tap();
              onChange(undefined);
            }}>
            <Text style={styles.clear}>Kaldır</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {HOURS.map((hour) => {
          const active = h === pad(hour);
          return (
            <Chip
              key={hour}
              label={pad(hour)}
              active={active}
              onPress={() => onChange(`${pad(hour)}:${m ?? '00'}`)}
            />
          );
        })}
      </ScrollView>
      {value ? (
        <View style={styles.chips}>
          {MINUTES.map((min) => (
            <Chip key={min} label={`:${min}`} active={m === min} onPress={() => onChange(`${h}:${min}`)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const DATE_PRESETS: { label: string; days: number }[] = [
  { label: 'Bugün', days: 0 },
  { label: 'Yarın', days: 1 },
  { label: '3 gün', days: 3 },
  { label: '1 hafta', days: 7 },
  { label: '2 hafta', days: 14 },
  { label: '1 ay', days: 30 },
];

/** Tarih: hızlı çipler + gün gün ileri/geri. */
export function DatePicker({
  value,
  onChange,
  today,
  allowClear,
}: {
  value?: string;
  onChange: (v?: string) => void;
  today: string;
  allowClear?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: S.sm }}>
      <View style={styles.row}>
        <Pressable
          hitSlop={8}
          disabled={!value}
          onPress={() => value && onChange(addDays(value, -1))}
          style={styles.step}
          accessibilityLabel="Bir gün geri">
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.dateText, !value && { color: t.textFaint }]}>
            {value ? formatLongDate(value) : 'Tarih yok'}
          </Text>
          {value ? <Text style={styles.countdown}>{countdownLabel(today, value)}</Text> : null}
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => onChange(addDays(value ?? today, value ? 1 : 0))}
          style={styles.step}
          accessibilityLabel="Bir gün ileri">
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {DATE_PRESETS.map((p) => {
          const d = addDays(today, p.days);
          return <Chip key={p.label} label={p.label} active={value === d} onPress={() => onChange(d)} />;
        })}
        {allowClear && value ? <Chip label="Temizle" onPress={() => onChange(undefined)} /> : null}
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    big: { color: t.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], flex: 1 },
    clear: { color: t.accent, fontWeight: '700', fontSize: 13 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: R.pill,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    chipActive: { borderColor: t.primary, backgroundColor: t.primarySoft },
    chipText: { color: t.textDim, fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums'] },
    chipTextActive: { color: t.text },
    step: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    stepText: { color: t.text, fontSize: 20, fontWeight: '700' },
    dateText: { color: t.text, fontSize: 16, fontWeight: '800' },
    countdown: { color: t.accent, fontSize: 12, fontWeight: '700', marginTop: 2 },
  });
