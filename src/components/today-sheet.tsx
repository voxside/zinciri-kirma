// Bugünün çekmecesi: ana ekranı kalabalıklaştırmamak için günün görev listesi burada.
// Ön yüz = günlük akış · Arka yüz = güne özel / niş işler + yaklaşan alımlar.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { useToday } from '@/hooks/use-day';
import { haptic } from '@/lib/haptics';
import { sortTasks, upcomingPurchases } from '@/lib/order';
import { useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { Task, TaskFace } from '@/types/models';
import { PlusIcon } from './icons';
import { TaskActions } from './task-actions';
import { TaskItem } from './task-item';
import { TaskSheet } from './task-sheet';
import { SectionTitle, Segmented } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  face: TaskFace;
  onFaceChange: (f: TaskFace) => void;
}

export function TodaySheet({ visible, onClose, face, onFaceChange }: Props) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { today, todayTasks, mvdMode, progress } = useToday();
  const rules = useAppStore((s) => s.rules);
  const allTasks = useAppStore((s) => s.tasks);
  const setMvdMode = useAppStore((s) => s.setMvdMode);

  const [actionsTask, setActionsTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const ofFace = todayTasks.filter((x) => x.face === face && !x.hiddenAt);
  const pending = sortTasks(
    ofFace.filter((x) => x.status === 'pending'),
    rules,
  );
  const done = ofFace.filter((x) => x.status === 'done');
  const purchases = face === 'back' ? upcomingPurchases(allTasks, today) : [];
  const count = (f: TaskFace) => todayTasks.filter((x) => x.face === f && x.status === 'pending').length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.md }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Bugün</Text>
            <Pressable
              onPress={() => {
                haptic.tap();
                setEditing(null);
                setSheetOpen(true);
              }}
              style={styles.addBtn}
              accessibilityLabel="Bugüne görev ekle">
              <PlusIcon size={18} color={t.onAccent} />
            </Pressable>
          </View>

          <Segmented<TaskFace>
            value={face}
            onChange={onFaceChange}
            options={[
              { value: 'front', label: `Günlük akış${count('front') ? ` · ${count('front')}` : ''}`, color: t.accent },
              { value: 'back', label: `↺ Güne özel${count('back') ? ` · ${count('back')}` : ''}`, color: t.primary },
            ]}
          />

          <ScrollView contentContainerStyle={{ paddingBottom: S.lg }}>
            {face === 'front' ? (
              <View style={[styles.mvd, mvdMode && { borderColor: t.silverDeep }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mvdTitle}>Zor gün modu</Text>
                  <Text style={styles.mvdText}>
                    {mvdMode
                      ? progress.minimumTotal > 0
                        ? `Sadece ⭐ kritik görevler: ${progress.minimumDone}/${progress.minimumTotal}. Bitince halka gümüş kurtulur.`
                        : '⭐ ile en az bir kritik görev seç.'
                      : 'Enerjin düşük ya da günün dolu mu? Sadece ⭐ kritik görevleri bitir, halka kurtulsun.'}
                  </Text>
                </View>
                <Switch
                  value={mvdMode}
                  onValueChange={(v) => {
                    haptic.tap();
                    setMvdMode(v);
                  }}
                  trackColor={{ true: t.silverDeep, false: t.surface2 }}
                  thumbColor="#fff"
                  accessibilityLabel="Zor gün modu"
                />
              </View>
            ) : null}

            {purchases.length > 0 ? (
              <>
                <SectionTitle>{`🛒 Yaklaşan alımlar · ${purchases.length}`}</SectionTitle>
                <View style={styles.list}>
                  {purchases.map((x) => (
                    <TaskItem key={x.id} task={x} onOpenActions={setActionsTask} />
                  ))}
                </View>
              </>
            ) : null}

            <SectionTitle>{face === 'front' ? 'Sırada' : 'Güne özel işler'}</SectionTitle>
            {pending.length === 0 && done.length === 0 ? (
              <Text style={styles.empty}>
                {face === 'front'
                  ? 'Bugün için görev yok. + ile ekle.'
                  : 'Sadece bugüne özgü bir iş yok. Eklerken “Zincirin arka yüzü” seçeneğini aç.'}
              </Text>
            ) : (
              <View style={styles.list}>
                {pending.map((x) => (
                  <TaskItem key={x.id} task={x} onOpenActions={setActionsTask} showCategory />
                ))}
                {done.map((x) => (
                  <TaskItem key={x.id} task={x} onOpenActions={setActionsTask} showCategory />
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        <TaskActions
          task={actionsTask}
          onClose={() => setActionsTask(null)}
          onEditFull={(x) => {
            setActionsTask(null);
            setEditing(x);
            setSheetOpen(true);
          }}
        />
        <TaskSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} initialFace={face} />
      </View>
    </Modal>
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
      height: '86%',
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.border },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heading: { color: t.text, fontSize: 22, fontWeight: '800' },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mvd: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      padding: S.md,
      marginTop: S.xs,
      borderRadius: R.lg,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    mvdTitle: { color: t.text, fontSize: 14, fontWeight: '800' },
    mvdText: { color: t.textDim, fontSize: 12, lineHeight: 16, marginTop: 2 },
    list: { gap: S.sm },
    empty: { color: t.textDim, fontSize: 13.5, textAlign: 'center', paddingVertical: S.lg, lineHeight: 19 },
  });
