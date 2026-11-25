// Ana ekran: yalnızca zincir. Büyük halka + geriye uzanan geçmiş.
// Görev listesi alttaki çekmecede ("Şimdi bunu yap" şeridi → dokun → Bugün çekmecesi).

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChainScene } from '@/components/chain-scene';
import { DayInspectSheet } from '@/components/day-inspect-sheet';
import { CheckIcon, FlameIcon, PlusIcon } from '@/components/icons';
import { TaskSheet } from '@/components/task-sheet';
import { TodaySheet } from '@/components/today-sheet';
import { CategoryIcon } from '@/components/ui';
import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { useToday } from '@/hooks/use-day';
import { useAppNow } from '@/lib/app-time';
import { computeDay } from '@/lib/chain';
import { haptic } from '@/lib/haptics';
import { isLate, rankNextTasks, upcomingPurchases } from '@/lib/order';
import { useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { TaskFace } from '@/types/models';

export default function HomeScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const now = new Date(useAppNow());
  const { today, todayTasks, progress, streak, chainDays } = useToday();
  const firstDay = useAppStore((s) => s.firstDay);
  const rules = useAppStore((s) => s.rules);
  const allTasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);

  const [face, setFace] = useState<TaskFace>('front');
  const [drawer, setDrawer] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const backTasks = useMemo(() => todayTasks.filter((x) => x.face === 'back'), [todayTasks]);
  const backProgress = useMemo(() => computeDay(backTasks, false), [backTasks]);
  const alerts = useMemo(() => upcomingPurchases(allTasks, today).length, [allTasks, today]);

  const faceTasks = face === 'front' ? todayTasks.filter((x) => x.face === 'front') : backTasks;
  const next = rankNextTasks(faceTasks, rules, now)[0];
  const remaining = faceTasks.filter((x) => x.status === 'pending').length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + S.sm }]}>
      {/* Seri: rakam yok — alevin parlaklığı serinin gücünü gösterir */}
      <View style={styles.topRow}>
        <Pressable
          onPress={() => {
            haptic.tap();
            setAddOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Yeni görev ekle"
          style={styles.addBtn}>
          <PlusIcon size={20} color={t.onAccent} strokeWidth={3} />
        </Pressable>
        <View accessibilityLabel={`${streak} günlük seri`} style={{ opacity: streak > 0 ? Math.min(1, 0.45 + streak * 0.08) : 0.25 }}>
          <FlameIcon size={26} color={streak > 0 ? t.accent : t.textFaint} />
        </View>
      </View>

      <View style={styles.sceneWrap}>
        <ChainScene
          today={today}
          firstDay={firstDay}
          chainDays={chainDays}
          face={face}
          onFlip={() => setFace((f) => (f === 'front' ? 'back' : 'front'))}
          onInspect={setInspect}
          front={{ progress: progress.displayProgress, status: progress.status }}
          back={{ progress: backProgress.progress, status: backProgress.isFull ? 'full' : 'in_progress' }}
          alerts={alerts}
        />
      </View>

      {/* Çekmece şeridi: sıradaki tek görev */}
      <Pressable
        onPress={() => {
          haptic.tap();
          setDrawer(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Bugünün görevlerini aç"
        style={[styles.peek, face === 'back' && { borderColor: t.primary }]}>
        <View style={styles.grabber} />
        {next ? (
          <View style={styles.peekRow}>
            <CategoryIcon category={next.category} size={16} />
            <View style={{ flex: 1 }}>
              <Text style={styles.peekTitle} numberOfLines={1}>
                {next.title}
              </Text>
              <Text style={[styles.peekMeta, isLate(next, now) && { color: t.accent }]} numberOfLines={1}>
                {next.dueTime ? `🕘 ${next.dueTime}${isLate(next, now) ? ' · geç kaldın' : ''} · ` : ''}
                {remaining > 1 ? `+${remaining - 1} görev daha` : 'son görev'}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              accessibilityLabel="Tamamladım"
              onPress={() => {
                if (toggleTask(next.id)) haptic.complete();
              }}
              style={styles.doIt}>
              <CheckIcon size={20} color={t.onAccent} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.peekEmpty}>
            {faceTasks.length === 0
              ? face === 'front'
                ? 'Bugün için görev ekle'
                : 'Güne özel iş yok'
              : face === 'front'
                ? 'Hepsi bitti 🔥'
                : 'Güne özel işler bitti'}
          </Text>
        )}
      </Pressable>

      <TodaySheet visible={drawer} onClose={() => setDrawer(false)} face={face} onFaceChange={setFace} />
      <DayInspectSheet day={inspect} onClose={() => setInspect(null)} />
      <TaskSheet visible={addOpen} onClose={() => setAddOpen(false)} initialFace={face} />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: S.lg,
      height: 40,
    },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sceneWrap: { flex: 1 },
    peek: {
      marginHorizontal: S.lg,
      marginBottom: S.md,
      paddingHorizontal: S.lg,
      paddingTop: S.sm,
      paddingBottom: S.md,
      borderRadius: R.lg,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      gap: S.sm,
    },
    grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: t.border },
    peekRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    peekTitle: { color: t.text, fontSize: 16, fontWeight: '800' },
    peekMeta: { color: t.textDim, fontSize: 12, fontWeight: '600', marginTop: 2 },
    peekEmpty: { color: t.textDim, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
    doIt: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
