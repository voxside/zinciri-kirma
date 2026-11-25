import { Pressable, StyleSheet, Text, View } from 'react-native';

import { R, S, type Theme } from '@/constants/theme';
import { diffDays } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { countdownLabel } from '@/lib/order';
import { useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { Task } from '@/types/models';
import { BriefcaseIcon, CheckIcon } from './icons';

const fmtHours = (min: number) => {
  const h = min / 60;
  return h >= 1 ? `${+h.toFixed(1)} sa` : `${min} dk`;
};

/** İş odaklı proje kartı: ilerleme çubuğu, teslim geri sayımı, günlük pay. */
export function ProjectCard({ task, onOpenActions }: { task: Task; onOpenActions: (t: Task) => void }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const today = useAppStore((s) => s.today);
  const setProgress = useAppStore((s) => s.setProgress);
  const addProjectSession = useAppStore((s) => s.addProjectSession);
  const sessionToday = useAppStore((s) =>
    s.tasks.some((x) => x.sourceRef === `project:${task.id}` && x.planDate === s.today),
  );

  const progress = task.progress ?? 0;
  const done = task.status === 'done';
  const daysLeft = task.dueDate ? diffDays(today, task.dueDate) : undefined;
  const urgent = daysLeft !== undefined && daysLeft <= 2 && !done;
  const remaining = task.effortMinutes ? Math.round(task.effortMinutes * (1 - progress / 100)) : undefined;
  const perDay =
    remaining && daysLeft !== undefined && daysLeft > 0 ? Math.round(remaining / daysLeft) : undefined;

  const step = (delta: number) => {
    haptic.tap();
    setProgress(task.id, progress + delta);
  };

  return (
    <Pressable
      onLongPress={() => {
        haptic.tap();
        onOpenActions(task);
      }}
      delayLongPress={350}
      accessibilityHint="Uzun bas: yeniden adlandır, düzenle veya sil."
      style={[styles.card, urgent && { borderColor: t.accent }, done && { opacity: 0.65 }]}>
      <View style={styles.top}>
        <BriefcaseIcon size={16} color={t.cat.project} />
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.dueDate ? (
          <View style={[styles.deadline, urgent && { backgroundColor: t.accent }]}>
            <Text style={[styles.deadlineText, urgent && { color: t.onAccent }]}>
              {done ? 'Teslim edildi' : countdownLabel(today, task.dueDate)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.barTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
        <View style={[styles.barFill, { width: `${progress}%`, backgroundColor: done ? t.primary : t.cat.project }]} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>%{progress}</Text>
        {task.effortMinutes ? <Text style={styles.meta}>Efor {fmtHours(task.effortMinutes)}</Text> : null}
        {task.spanDays ? <Text style={styles.meta}>{task.spanDays} güne yayılı</Text> : null}
        {perDay && !done ? <Text style={[styles.meta, { color: t.text }]}>günde ~{fmtHours(perDay)}</Text> : null}
      </View>

      {!done ? (
        <View style={styles.actions}>
          <Btn label="−10%" onPress={() => step(-10)} />
          <Btn label="+10%" onPress={() => step(10)} />
          <Btn
            label={sessionToday ? 'Bugün eklendi' : 'Bugüne ekle'}
            primary
            disabled={sessionToday}
            onPress={() => {
              haptic.complete();
              addProjectSession(task.id);
            }}
          />
          <Pressable
            hitSlop={8}
            accessibilityLabel="Projeyi tamamla"
            onPress={() => {
              haptic.complete();
              setProgress(task.id, 100);
            }}
            style={styles.doneBtn}>
            <CheckIcon size={16} color={t.primary} />
          </Pressable>
        </View>
      ) : (
        <Btn label="Yeniden aç" onPress={() => setProgress(task.id, 90)} />
      )}
    </Pressable>
  );
}

function Btn({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, primary && styles.btnPrimary, disabled && { opacity: 0.5 }]}>
      <Text style={[styles.btnText, primary && styles.btnPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      padding: S.lg,
      borderRadius: R.lg,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderLeftWidth: 4,
      borderLeftColor: t.cat.project,
      gap: S.sm,
    },
    top: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    title: { flex: 1, color: t.text, fontSize: 16, fontWeight: '800', lineHeight: 21 },
    titleDone: { textDecorationLine: 'line-through', color: t.textDim },
    deadline: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill, backgroundColor: t.surface2 },
    deadlineText: { color: t.text, fontSize: 12, fontWeight: '800' },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: t.surface2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
    meta: { color: t.textDim, fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: S.sm, alignItems: 'center', marginTop: 2 },
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: R.md,
      backgroundColor: t.surface2,
    },
    btnPrimary: { backgroundColor: t.accent, flex: 1, alignItems: 'center' },
    btnText: { color: t.text, fontSize: 13, fontWeight: '800' },
    btnPrimaryText: { color: t.onAccent },
    doneBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: t.primary,
    },
  });
