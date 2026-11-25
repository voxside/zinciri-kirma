import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { R, S, type Theme } from '@/constants/theme';
import { useAppNow } from '@/lib/app-time';
import { taskPoints } from '@/lib/chain';
import { diffDays } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { countdownLabel, isLate } from '@/lib/order';
import { isLockedTask, useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import { CURRENCY_SYMBOL, LEVEL_LABEL, REPEAT_LABEL, type Task } from '@/types/models';
import { BoltIcon, CheckIcon, CloseIcon, PhoneIcon, PinIcon, StarIcon } from './icons';
import { CategoryIcon, Chip } from './ui';

export const formatPrice = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

interface Props {
  task: Task;
  /** Uzun basınca: yeniden adlandır / kaldır / sil menüsü */
  onOpenActions: (task: Task) => void;
  showCategory?: boolean;
  showPlan?: boolean;
}

export function TaskItem({ task, onOpenActions, showCategory, showPlan }: Props) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const toggleMinimum = useAppStore((s) => s.toggleMinimum);
  const hideTask = useAppStore((s) => s.hideTask);
  const today = useAppStore((s) => s.today);
  const locked = useAppStore((s) => isLockedTask(task, s.rules));
  const rules = useAppStore((s) => s.rules);
  const rule = task.ruleId ? rules.find((r) => r.id === task.ruleId && r.active) : undefined;
  const now = new Date(useAppNow());
  const late = isLate(task, now);
  const dueSoon = !!task.dueDate && diffDays(today, task.dueDate) <= 3;
  const done = task.status === 'done';
  const color = t.cat[task.category];
  const scale = useSharedValue(1);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onToggle = () => {
    const completed = toggleTask(task.id);
    if (completed) {
      haptic.complete();
      scale.set(withSequence(withTiming(0.7, { duration: 80 }), withSpring(1, { damping: 5, stiffness: 260 })));
    } else {
      haptic.tap();
    }
  };

  const energyBolts = task.energyRequired === 'high' ? 3 : task.energyRequired === 'medium' ? 2 : 1;

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={() => {
        haptic.tap();
        onOpenActions(task);
      }}
      delayLongPress={350}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityHint="Dokun: tamamla. Uzun bas: yeniden adlandır, kaldır veya sil."
      style={({ pressed }) => [styles.row, locked && styles.rowPinned, pressed && { backgroundColor: t.surface2 }]}>
      <Animated.View
        style={[styles.check, { borderColor: done ? color : t.textFaint }, done && { backgroundColor: color }, checkStyle]}>
        {done ? <CheckIcon size={15} color={t.bg} /> : null}
      </Animated.View>

      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.meta}>
          {task.dueTime ? (
            <View style={[styles.timeTag, late && { backgroundColor: t.accent }]}>
              <Text style={[styles.timeText, late && { color: t.onAccent }]}>
                🕘 {task.dueTime}
                {late ? ' · geç' : ''}
              </Text>
            </View>
          ) : null}
          {rule ? (
            <View style={styles.pinTag}>
              <PinIcon size={11} color={t.cat.call} />
              <Text style={styles.pinText}>{REPEAT_LABEL[rule.intervalDays]}</Text>
            </View>
          ) : null}
          {task.face === 'back' ? <Text style={[styles.metaText, { color: t.primary }]}>↺ güne özel</Text> : null}
          {showCategory ? <CategoryIcon category={task.category} size={13} /> : null}
          {task.category === 'todo' ? (
            <>
              <Chip label={LEVEL_LABEL[task.priority]} color={t.prio[task.priority]} />
              <View style={styles.bolts}>
                {Array.from({ length: energyBolts }, (_, i) => (
                  <BoltIcon key={i} size={11} color={t.gold} />
                ))}
              </View>
            </>
          ) : null}
          {task.category === 'shopping' && task.quantity ? <Text style={styles.metaText}>{task.quantity}</Text> : null}
          {task.category === 'shopping' && task.price != null ? (
            <Text style={[styles.metaText, { color: t.text }]}>
              {formatPrice(task.price)} {CURRENCY_SYMBOL[task.currency ?? 'TRY']}
            </Text>
          ) : null}
          {task.category === 'shopping' && task.dueDate && !done ? (
            <Text style={[styles.metaText, dueSoon && { color: t.accent }]}>📅 {countdownLabel(today, task.dueDate)}</Text>
          ) : null}
          {task.category === 'call' && task.contactPhone ? <Text style={styles.metaText}>{task.contactPhone}</Text> : null}
          {task.category !== 'shopping' && task.estMinutes ? <Text style={styles.metaText}>{task.estMinutes} dk</Text> : null}
          {showPlan ? (
            <Text style={[styles.metaText, task.planDate === today && { color: t.accent }]}>
              {task.planDate === today ? 'Bugün' : task.planDate ? task.planDate : 'Sonra'}
            </Text>
          ) : null}
          {task.planDate === today ? <Text style={styles.points}>+{taskPoints(task)}</Text> : null}
        </View>
        {task.category === 'shopping' && task.notes ? (
          <Text style={styles.notes} numberOfLines={2}>
            {task.notes}
          </Text>
        ) : null}
      </View>

      {task.category === 'call' && task.contactPhone && !done ? (
        // Doğrudan telefonun arama ekranını açar (tel: protokolü).
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${task.contactPhone} numarasını ara`}
          onPress={() => {
            haptic.tap();
            void Linking.openURL(`tel:${task.contactPhone!.replace(/[^\d+]/g, '')}`);
          }}
          style={styles.callBtn}>
          <PhoneIcon size={14} color={t.onAccent} />
          <Text style={styles.callText}>Ara</Text>
        </Pressable>
      ) : null}

      {done && !locked ? (
        // Tamamlanan görev tek dokunuşla listeden kaldırılır (puan halkada kalır).
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Listeden kaldır"
          onPress={() => {
            haptic.tap();
            hideTask(task.id);
          }}
          style={styles.removeBtn}>
          <CloseIcon size={14} color={t.textDim} />
          <Text style={styles.removeText}>Kaldır</Text>
        </Pressable>
      ) : (
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={task.isMinimum ? 'Kritik işaretini kaldır' : 'Kritik görev olarak işaretle'}
          onPress={() => {
            haptic.tap();
            toggleMinimum(task.id);
          }}
          style={styles.star}>
          <StarIcon size={20} color={task.isMinimum ? t.gold : t.textFaint} filled={task.isMinimum} />
        </Pressable>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
    backgroundColor: t.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 5 },
  title: { color: t.text, fontSize: 16, fontWeight: '600', lineHeight: 21 },
  titleDone: { color: t.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flexWrap: 'wrap' },
  metaText: { color: t.textDim, fontSize: 12, fontWeight: '600' },
  bolts: { flexDirection: 'row' },
  points: { color: t.textFaint, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  star: { padding: 4 },
  rowPinned: { borderColor: t.cat.call + '55' },
  pinTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pinText: { color: t.cat.call, fontSize: 11, fontWeight: '800' },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
    backgroundColor: t.surface2,
  },
  removeText: { color: t.textDim, fontSize: 12, fontWeight: '700' },
  timeTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: R.pill, backgroundColor: t.primarySoft },
  timeText: { color: t.text, fontSize: 11.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  notes: { color: t.textFaint, fontSize: 12, lineHeight: 16 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: R.pill,
    backgroundColor: t.accent,
  },
  callText: { color: t.onAccent, fontSize: 13, fontWeight: '800' },
});
