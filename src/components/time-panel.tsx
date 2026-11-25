import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, R, S, type Theme, themeModeAt } from '@/constants/theme';
import { useAppNow, useTimeStore } from '@/lib/app-time';
import { dayKey, formatLongDate, formatTime } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { returnToRealTime, setClock, shiftTime, TIME_STEPS } from '@/lib/time-travel';
import { useStyles, useTheme } from '@/theme/theme-context';

/**
 * Geliştirici Zaman Simülatörü. Açıkken sol altta bir saat düğmesi görünür;
 * simülasyon sürerken düğme turuncu yanar ve simüle edilen saati gösterir.
 */
export function TimePanel() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const enabled = useTimeStore((s) => s.panelEnabled);
  const offset = useTimeStore((s) => s.offsetMs);
  const now = new Date(useAppNow());
  const [open, setOpen] = useState(false);

  if (!enabled) return null;
  const traveling = offset !== 0;
  const mode = themeModeAt(now);

  const act = (fn: () => void) => () => {
    haptic.tap();
    fn();
  };

  return (
    <>
      {/* Üst ortada: alttaki çekmece şeridi ve + düğmesiyle çakışmaz */}
      <View style={[styles.fabRow, { top: insets.top + 4 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zaman test panelini aç"
          onPress={act(() => setOpen(true))}
          style={[styles.fab, traveling && { backgroundColor: t.accent, borderColor: t.accent }]}>
          <Text style={[styles.fabText, traveling && { color: t.onAccent }]}>
            ⏱{traveling ? ` ${formatTime(now)}` : ''}
          </Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.flex}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Kapat" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
            <View style={styles.handle} />
            <Text style={styles.kicker}>Zaman Test Paneli</Text>

            <View style={styles.clock}>
              <Text style={styles.time}>{formatTime(now)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>{formatLongDate(dayKey(now))}</Text>
                <Text style={[styles.mode, { color: mode === 'day' ? t.accent : t.primary }]}>
                  {mode === 'day' ? '☀️ Gündüz modu' : '🌙 Akşam modu'}
                  {traveling ? ' · simülasyon' : ' · gerçek saat'}
                </Text>
              </View>
            </View>

            <View style={styles.grid}>
              <Btn label="−1 Saat" onPress={act(() => shiftTime(TIME_STEPS.minusHour))} />
              <Btn label="+1 Saat" onPress={act(() => shiftTime(TIME_STEPS.plusHour))} />
              <Btn label="+6 Saat" onPress={act(() => shiftTime(TIME_STEPS.plus6Hours))} />
              <Btn label="+1 Gün" onPress={act(() => shiftTime(TIME_STEPS.plusDay))} />
            </View>
            <View style={styles.grid}>
              <Btn label="☀️ Gündüzü Gör (10:00)" wide onPress={act(() => setClock(10, 0))} />
              <Btn label="🌙 Akşamı Gör (21:30)" wide onPress={act(() => setClock(21, 30))} />
            </View>
            <Btn label="Gerçek Saate Dön" primary disabled={!traveling} onPress={act(returnToRealTime)} />

            <Text style={styles.note}>
              Simülasyon sırasında yapılan her değişiklik (tamamlanan görevler, kapanan günler) “Gerçek Saate Dön” ile
              geri alınır. Bu sürede bulut senkronu duraklatılır.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Btn({
  label,
  onPress,
  primary,
  wide,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  wide?: boolean;
  disabled?: boolean;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        wide && { flexBasis: '45%' },
        // Tek başına (ızgara dışı) düğme dikeyde büyümesin.
        primary && styles.btnPrimary,
        primary && { flexGrow: 0, flexBasis: 'auto' },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}>
      <Text style={[styles.btnText, primary && styles.btnPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    fabRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    fab: {
      paddingHorizontal: 12,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    fabText: { color: t.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    flex: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: t.backdrop },
    sheet: {
      backgroundColor: t.bg,
      borderTopLeftRadius: R.xl,
      borderTopRightRadius: R.xl,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: S.lg,
      paddingTop: S.sm,
      gap: S.md,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.border },
    kicker: { color: t.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    clock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.lg,
      padding: S.lg,
      borderRadius: R.lg,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    time: { color: t.text, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 },
    date: { color: t.text, fontSize: 15, fontWeight: '700' },
    mode: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    btn: {
      flexGrow: 1,
      flexBasis: '22%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      paddingHorizontal: 6,
      borderRadius: R.md,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    btnText: { color: t.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    btnPrimary: { backgroundColor: t.accent, borderColor: t.accent },
    btnPrimaryText: { color: t.onAccent, fontWeight: '800' },
    note: { color: t.textFaint, fontSize: 12, lineHeight: 17 },
  });
