import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProjectCard } from '@/components/project-card';
import { TaskActions } from '@/components/task-actions';
import { formatPrice, TaskItem } from '@/components/task-item';
import { TaskSheet } from '@/components/task-sheet';
import { CategoryIcon, Fab, SectionTitle, Segmented } from '@/components/ui';
import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { sortTasks } from '@/lib/order';
import { useAppStore } from '@/store/app-store';
import { useStyles, useTheme } from '@/theme/theme-context';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_SHORT, CURRENCY_SYMBOL, type Task, type TaskCategory } from '@/types/models';

const EMPTY: Record<TaskCategory, string> = {
  todo: 'Rutin boş. Zinciri besleyecek küçük bir alışkanlıkla başla.',
  project: 'Henüz proje yok. Başlık, efor, süre ve teslim tarihiyle bir proje ekle.',
  shopping: 'Alışveriş listesi boş.',
  call: 'Aranacak kimse yok. Uzun zamandır konuşmadığın biri var mı?',
};

export default function ListsScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const rules = useAppStore((s) => s.rules);
  const [category, setCategory] = useState<TaskCategory>('todo');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [actionsTask, setActionsTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  const counts = useMemo(() => {
    const c: Record<TaskCategory, number> = { todo: 0, project: 0, shopping: 0, call: 0 };
    for (const x of tasks) if (x.status === 'pending' && !(x.ruleId && x.planDate !== today)) c[x.category]++;
    return c;
  }, [tasks, today]);

  const { pending, done, total } = useMemo(() => {
    const inCat = tasks.filter((x) => x.category === category && !x.hiddenAt);
    // Sabit kuralın sadece bugünkü (veya devreden) kopyası listede görünür.
    const isOldRuleCopy = (x: Task) => !!x.ruleId && x.status !== 'pending' && x.planDate !== today;
    const pending = sortTasks(
      inCat.filter((x) => x.status === 'pending'),
      rules,
    );
    const done = inCat
      .filter((x) => x.status === 'done' && !isOldRuleCopy(x))
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, 30);
    // Alınacaklar: bekleyenlerin tahmini toplamı (para birimine göre)
    const total: Record<string, number> = {};
    if (category === 'shopping') {
      for (const x of pending) if (x.price) total[x.currency ?? 'TRY'] = (total[x.currency ?? 'TRY'] ?? 0) + x.price;
    }
    return { pending, done, total };
  }, [tasks, category, today, rules]);

  const openEdit = (x: Task) => {
    setEditing(x);
    setSheetOpen(true);
  };

  const renderItem = (x: Task) =>
    x.category === 'project' ? (
      <ProjectCard key={x.id} task={x} onOpenActions={setActionsTask} />
    ) : (
      <TaskItem key={x.id} task={x} onOpenActions={setActionsTask} showPlan={x.category !== 'shopping'} />
    );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + S.md }]}>
        <Text style={styles.title}>{CATEGORY_LABEL[category]}</Text>

        <Segmented
          value={category}
          onChange={setCategory}
          options={CATEGORIES.map((c) => ({
            value: c,
            label: `${CATEGORY_SHORT[c]}${counts[c] ? ` ${counts[c]}` : ''}`,
            color: t.cat[c],
            icon: <CategoryIcon category={c} size={13} color={c === category ? t.cat[c] : t.textDim} />,
          }))}
        />

        <SectionTitle
          right={
            Object.keys(total).length ? (
              <Text style={styles.total}>
                ≈{' '}
                {Object.entries(total)
                  .map(([cur, sum]) => `${formatPrice(sum)} ${CURRENCY_SYMBOL[cur as keyof typeof CURRENCY_SYMBOL]}`)
                  .join(' · ')}
              </Text>
            ) : undefined
          }>
          {category === 'project' ? `Devam eden · ${pending.length}` : `Bekleyen · ${pending.length}`}
        </SectionTitle>
        {pending.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{EMPTY[category]}</Text>
          </View>
        ) : (
          <View style={styles.list}>{pending.map(renderItem)}</View>
        )}

        {done.length > 0 ? (
          <>
            <Pressable onPress={() => setShowDone((v) => !v)} accessibilityRole="button">
              <SectionTitle right={<Text style={styles.toggle}>{showDone ? 'Gizle' : 'Göster'}</Text>}>
                {`Tamamlananlar · ${done.length}`}
              </SectionTitle>
            </Pressable>
            {showDone ? <View style={styles.list}>{done.map(renderItem)}</View> : null}
          </>
        ) : null}

        <Text style={styles.hint}>
          Sıra: saati olanlar saat sırasıyla, diğerleri önceliğe göre · Uzun bas: düzenle / sil
        </Text>
      </ScrollView>

      <Fab
        onPress={() => {
          setEditing(null);
          setSheetOpen(true);
        }}
      />
      <TaskSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} initialCategory={category} editing={editing} />
      <TaskActions
        task={actionsTask}
        onClose={() => setActionsTask(null)}
        onEditFull={(x) => {
          setActionsTask(null);
          openEdit(x);
        }}
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    content: {
      paddingHorizontal: S.lg,
      paddingBottom: 120,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    title: { color: t.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: S.lg },
    list: { gap: S.sm },
    empty: { padding: S.xl, borderRadius: R.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: t.border },
    emptyText: { color: t.textDim, fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
    toggle: { color: t.accent, fontSize: 13, fontWeight: '700' },
    total: { color: t.text, fontSize: 13, fontWeight: '800' },
    hint: { color: t.textFaint, fontSize: 11.5, textAlign: 'center', marginTop: S.xl },
  });
