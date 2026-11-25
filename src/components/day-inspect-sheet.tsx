// Geçmiş halkaya dokununca: o günün tamamlananları, yapılmayanları ve tamamlanma yüzdesi.
// (Yüzde yalnızca burada görünür.)

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { formatLongDate } from '@/lib/date';
import { useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { ChainStatus, DaySnapshotItem } from '@/types/models';
import { CheckIcon, CloseIcon } from './icons';
import { CategoryIcon } from './ui';

const STATUS_LABEL: Record<ChainStatus, string> = {
  full: 'Tam halka',
  saved: 'Kurtarıldı (zor gün)',
  broken: 'Kırık halka',
  frozen: 'Donduruldu',
  in_progress: 'Devam ediyor',
};

export function DayInspectSheet({ day, onClose }: { day: string | null; onClose: () => void }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const record = useAppStore((s) => (day ? s.chainDays[day] : undefined));
  const firstDay = useAppStore((s) => s.firstDay);
  if (!day) return null;

  const pct = record && record.targetPoints > 0 ? Math.round((record.earnedPoints / record.targetPoints) * 100) : 0;
  const statusColor =
    record?.status === 'full'
      ? t.gold
      : record?.status === 'saved'
        ? t.silverDeep
        : record?.status === 'broken'
          ? t.danger
          : t.textDim;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.handle} />
          <Text style={styles.date}>{formatLongDate(day)}</Text>

          {!record ? (
            <Text style={styles.empty}>
              {day < firstDay ? 'Zincir bu tarihte henüz başlamamıştı.' : 'Bu gün için kayıt yok.'}
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ gap: S.lg }}>
              <View style={styles.summary}>
                <Text style={[styles.pct, { color: statusColor }]}>%{pct}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.status, { color: statusColor }]}>{STATUS_LABEL[record.status]}</Text>
                  <Text style={styles.points}>
                    {record.earnedPoints}/{record.targetPoints} puan{record.mvdMode ? ' · zor gün modu' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: statusColor }]} />
              </View>

              <Section title={`Tamamlananlar · ${record.snapshot.done.length}`} items={record.snapshot.done} done />
              <Section title={`Yapılmayanlar · ${record.snapshot.missed.length}`} items={record.snapshot.missed} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, items, done }: { title: string; items: DaySnapshotItem[]; done?: boolean }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: S.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.none}>—</Text>
      ) : (
        items.map((it) => (
          <View key={it.id} style={styles.item}>
            {done ? <CheckIcon size={14} color={t.primary} /> : <CloseIcon size={13} color={t.danger} />}
            <CategoryIcon category={it.category} size={13} />
            <Text style={[styles.itemText, !done && { color: t.textDim }]} numberOfLines={2}>
              {it.title}
              {it.face === 'back' ? '  ↺' : ''}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
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
      maxHeight: '80%',
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.border },
    date: { color: t.text, fontSize: 20, fontWeight: '800' },
    empty: { color: t.textDim, fontSize: 14, paddingVertical: S.xl, textAlign: 'center' },
    summary: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
    pct: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 },
    status: { fontSize: 16, fontWeight: '800' },
    points: { color: t.textDim, fontSize: 13, marginTop: 2 },
    bar: { height: 8, borderRadius: 4, backgroundColor: t.surface2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    sectionTitle: { color: t.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    none: { color: t.textFaint },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.sm,
      padding: S.md,
      borderRadius: R.md,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    itemText: { flex: 1, color: t.text, fontSize: 14.5, fontWeight: '600' },
  });
