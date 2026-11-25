import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appNowIso, realNowIso } from '@/lib/app-time';
import { closingStatus, computeDay } from '@/lib/chain';
import { addDays, dayKey, daysBetween, diffDays } from '@/lib/date';
import { ruleInstanceId } from '@/lib/ids';
import type {
  ChainDay,
  DaySnapshotItem,
  NewRuleInput,
  NewTaskInput,
  RecurringRule,
  Task,
} from '@/types/models';

export const FAMILY_RULE_KEY = 'family_call';

function makeTask(input: NewTaskInput, today: string): Task {
  return {
    id: randomUUID(),
    category: input.category,
    face: input.face ?? 'front',
    title: input.title.trim(),
    notes: input.notes,
    priority: input.priority ?? 'medium',
    energyRequired: input.energyRequired ?? 'medium',
    estMinutes: input.estMinutes,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    quantity: input.quantity,
    price: input.price,
    currency: input.currency,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    effortMinutes: input.effortMinutes,
    spanDays: input.spanDays,
    progress: input.progress,
    status: 'pending',
    source: input.source ?? 'manual',
    sourceRef: input.sourceRef,
    ruleId: input.ruleId,
    createdAt: appNowIso(),
    updatedAt: realNowIso(),
    planDate: input.planDate === undefined ? today : input.planDate,
    isMinimum: input.isMinimum ?? false,
  };
}

function makeRule(input: NewRuleInput, today: string, extra?: Partial<RecurringRule>): RecurringRule {
  return {
    id: randomUUID(),
    category: input.category,
    face: input.face ?? 'front',
    title: input.title.trim(),
    intervalDays: input.intervalDays,
    anchorDate: today,
    // Kullanıcının sabit görevleri kaldırılabilir; yalnızca sistem kuralı kilitli.
    isLocked: false,
    countsForChain: true,
    active: true,
    priority: input.priority ?? 'medium',
    energyRequired: input.energyRequired ?? 'medium',
    estMinutes: input.estMinutes,
    dueTime: input.dueTime,
    contactPhone: input.contactPhone,
    isMinimum: input.isMinimum ?? false,
    updatedAt: realNowIso(),
    ...extra,
  };
}

const familyRule = (today: string) =>
  makeRule(
    { category: 'call', title: 'Anne ve babanı aramayı unutma', intervalDays: 1, estMinutes: 5 },
    today,
    { systemKey: FAMILY_RULE_KEY, pinOrder: 0, isLocked: true },
  );

/** Kural bugün vadeli mi? (başlangıçtan itibaren her intervalDays günde bir) */
export function isRuleDue(r: RecurringRule, today: string): boolean {
  const d = diffDays(r.anchorDate, today);
  return d >= 0 && d % r.intervalDays === 0;
}

/**
 * Vadesi gelen her aktif kural için bugünün kopyasını üretir.
 * Seyrek kurallarda (3/7/14 gün) bekleyen bir kopya varsa yenisi açılmaz — önce o bitsin.
 */
export function ensureRuleInstances(tasks: Task[], rules: RecurringRule[], today: string): Task[] {
  const missing = rules.filter(
    (r) =>
      r.active &&
      isRuleDue(r, today) &&
      !tasks.some((t) => t.ruleId === r.id && (t.planDate === today || (r.intervalDays > 1 && t.status === 'pending'))),
  );
  if (missing.length === 0) return tasks;
  const created = missing.map((r) => ({
    ...makeTask(
      {
        category: r.category,
        face: r.face,
        title: r.title,
        ruleId: r.id,
        source: 'routine',
        priority: r.priority,
        energyRequired: r.energyRequired,
        estMinutes: r.estMinutes,
        dueTime: r.dueTime,
        contactPhone: r.contactPhone,
        isMinimum: r.isMinimum,
      },
      today,
    ),
    // Her cihazda aynı kimlik → senkronizasyonda çift kopya oluşmaz.
    id: ruleInstanceId(r.id, today),
  }));
  return [...created, ...tasks];
}

function seedTasks(today: string): Task[] {
  return [
    makeTask({ category: 'todo', title: 'Günün en önemli işine 25 dk odaklan', priority: 'high', energyRequired: 'high', estMinutes: 25, isMinimum: true }, today),
    makeTask({ category: 'todo', title: '10 dakika yürüyüş', priority: 'medium', energyRequired: 'low', estMinutes: 10 }, today),
    makeTask({ category: 'shopping', title: 'Süt', quantity: '1 lt', priority: 'low' }, today),
  ];
}

const snap = (t: Task): DaySnapshotItem => ({ id: t.id, title: t.title, category: t.category, face: t.face });

/** Kalıcı alanlar — Zaman Test Paneli yedeği de bunları kullanır. */
export const PERSISTED_KEYS = [
  'tasks',
  'rules',
  'chainDays',
  'mvdByDay',
  'firstDay',
  'lastRolloverDay',
  'pendingDeletes',
  'syncCursor',
  'lastPushAt',
] as const;

interface AppState {
  tasks: Task[];
  rules: RecurringRule[];
  /** Kapanmış günler (geçmiş halkalar). */
  chainDays: Record<string, ChainDay>;
  /** Gün bazında Minimum Uygulanabilir Gün modu. */
  mvdByDay: Record<string, boolean>;
  firstDay: string;
  lastRolloverDay: string;
  /** Kalıcı değil — her açılışta ve gün dönümünde güncellenir. */
  today: string;

  // Senkronizasyon durumu
  pendingDeletes: string[];
  syncCursor: string | null;
  lastPushAt: string | null;

  addTask: (input: NewTaskInput) => void;
  /** Sabit (kilitli) tekrarlı görev ekler; vadesi bugünse kopyası hemen listeye düşer. */
  addRule: (input: NewRuleInput) => void;
  /** Kullanıcının sabit görevini tamamen kaldırır: tekrar durur, bekleyen kopyalar silinir. */
  deleteRule: (ruleId: string) => void;
  /** Proje ilerlemesi (0–100); 100'de proje tamamlanır. */
  setProgress: (id: string, progress: number) => void;
  /** Projeden bugünün halkasına bir çalışma oturumu ekler. */
  addProjectSession: (projectId: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  renameTask: (id: string, title: string) => void;
  /** true = tamamlandı, false = geri açıldı */
  toggleTask: (id: string) => boolean;
  hideTask: (id: string) => void;
  deleteTask: (id: string) => void;
  toggleMinimum: (id: string) => void;
  setMvdMode: (on: boolean) => void;
  rollover: () => void;
  setSyncState: (patch: Partial<Pick<AppState, 'tasks' | 'rules' | 'chainDays' | 'pendingDeletes' | 'syncCursor' | 'lastPushAt'>>) => void;
  resetSyncCursors: () => void;
}

/** Bu görev silinemez/yeniden adlandırılamaz mı? */
export function isLockedTask(t: Task, rules: RecurringRule[]): boolean {
  return !!t.ruleId && rules.some((r) => r.id === t.ruleId && r.isLocked);
}

const initialToday = dayKey();
const initialRules = [familyRule(initialToday)];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: ensureRuleInstances(seedTasks(initialToday), initialRules, initialToday),
      rules: initialRules,
      chainDays: {},
      mvdByDay: {},
      firstDay: initialToday,
      lastRolloverDay: initialToday,
      today: initialToday,
      pendingDeletes: [],
      syncCursor: null,
      lastPushAt: null,

      addTask: (input) => set((s) => ({ tasks: [makeTask(input, s.today), ...s.tasks] })),

      addRule: (input) =>
        set((s) => {
          const rule = makeRule(input, s.today, { pinOrder: 10 + s.rules.length });
          const rules = [...s.rules, rule];
          return { rules, tasks: ensureRuleInstances(s.tasks, rules, s.today) };
        }),

      deleteRule: (ruleId) =>
        set((s) => {
          const rule = s.rules.find((r) => r.id === ruleId);
          if (!rule || rule.systemKey) return {};
          const doomed = s.tasks.filter((t) => t.ruleId === ruleId && t.status === 'pending').map((t) => t.id);
          return {
            rules: s.rules.map((r) =>
              r.id === ruleId ? { ...r, active: false, isLocked: false, updatedAt: realNowIso() } : r,
            ),
            tasks: s.tasks.filter((t) => !doomed.includes(t.id)),
            pendingDeletes: [...s.pendingDeletes, ...doomed],
          };
        }),

      setProgress: (id, progress) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const p = Math.max(0, Math.min(100, Math.round(progress)));
            const done = p >= 100;
            return {
              ...t,
              progress: p,
              status: done ? 'done' : 'pending',
              completedAt: done ? (t.completedAt ?? appNowIso()) : undefined,
              updatedAt: realNowIso(),
            };
          }),
        })),

      addProjectSession: (projectId) =>
        set((s) => {
          const p = s.tasks.find((t) => t.id === projectId);
          if (!p) return {};
          const perDay = p.effortMinutes && p.spanDays ? Math.max(15, Math.round(p.effortMinutes / p.spanDays)) : 30;
          const session = makeTask(
            {
              category: 'todo',
              title: `${p.title} — çalışma`,
              priority: p.priority,
              energyRequired: 'high',
              estMinutes: perDay,
              sourceRef: `project:${p.id}`,
            },
            s.today,
          );
          return { tasks: [session, ...s.tasks] };
        }),

      updateTask: (id, patch) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t) return {};
          const safe = { ...patch };
          if (isLockedTask(t, s.rules)) {
            // Sabit kuralın adı, kategorisi, günü ve yüzü değiştirilemez.
            delete safe.title;
            delete safe.category;
            delete safe.planDate;
            delete safe.face;
          }
          return { tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...safe, updatedAt: realNowIso() } : x)) };
        }),

      renameTask: (id, title) => {
        const clean = title.trim();
        if (!clean) return;
        get().updateTask(id, { title: clean });
      },

      toggleTask: (id) => {
        const { tasks, today } = get();
        const t = tasks.find((x) => x.id === id);
        if (!t) return false;
        const completing = t.status !== 'done';
        const updatedAt = realNowIso();
        set({
          tasks: tasks.map((x) =>
            x.id !== id
              ? x
              : completing
                ? { ...x, status: 'done', completedAt: appNowIso(), planDate: x.planDate ?? today, updatedAt }
                : { ...x, status: 'pending', completedAt: undefined, hiddenAt: undefined, updatedAt },
          ),
        });
        return completing;
      },

      hideTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id && t.status === 'done' && !isLockedTask(t, s.rules)
              ? { ...t, hiddenAt: appNowIso(), updatedAt: realNowIso() }
              : t,
          ),
        })),

      deleteTask: (id) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t || isLockedTask(t, s.rules)) return {};
          return { tasks: s.tasks.filter((x) => x.id !== id), pendingDeletes: [...s.pendingDeletes, id] };
        }),

      toggleMinimum: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, isMinimum: !t.isMinimum, planDate: t.planDate ?? s.today, updatedAt: realNowIso() }
              : t,
          ),
        })),

      setMvdMode: (on) => set((s) => ({ mvdByDay: { ...s.mvdByDay, [s.today]: on } })),

      rollover: () => {
        const today = dayKey();
        const s = get();
        if (s.lastRolloverDay === today) {
          const tasks = ensureRuleInstances(s.tasks, s.rules, today);
          if (s.today !== today || tasks !== s.tasks) set({ today, tasks });
          return;
        }

        const yesterday = addDays(today, -1);
        const from = s.lastRolloverDay > s.firstDay ? s.lastRolloverDay : s.firstDay;
        const chainDays = { ...s.chainDays };
        const updatedAt = realNowIso();

        if (from <= yesterday) {
          for (const day of daysBetween(from, yesterday)) {
            if (chainDays[day]) continue;
            const mvd = !!s.mvdByDay[day];
            const dayTasks = s.tasks.filter((t) => t.planDate === day);
            const p = computeDay(dayTasks, mvd);
            chainDays[day] = {
              day,
              status: closingStatus(p),
              targetPoints: p.targetPoints,
              earnedPoints: p.earnedPoints,
              mvdMode: mvd,
              snapshot: {
                done: dayTasks.filter((t) => t.status === 'done').map(snap),
                missed: dayTasks.filter((t) => t.status === 'pending').map(snap),
              },
              closedAt: appNowIso(),
              updatedAt,
            };
          }
        }

        const ruleById = new Map(s.rules.map((r) => [r.id, r]));
        const tasks = s.tasks.map((t) => {
          if (t.status !== 'pending' || t.planDate === null || t.planDate >= today) return t;
          const rule = t.ruleId ? ruleById.get(t.ruleId) : undefined;
          // Günlük sabit görev devretmez; yerine bugünün yenisi gelir.
          if (rule && rule.intervalDays === 1) return { ...t, status: 'skipped' as const, updatedAt };
          // Diğer yapılmamış işler (seyrek sabit görevler dahil) bugüne devreder.
          return { ...t, planDate: today, updatedAt };
        });

        set({ chainDays, tasks: ensureRuleInstances(tasks, s.rules, today), lastRolloverDay: today, today });
      },

      setSyncState: (patch) => set(patch),
      resetSyncCursors: () => set({ syncCursor: null, lastPushAt: null }),
    }),
    {
      name: 'zinciri-kirma/v1',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => Object.fromEntries(PERSISTED_KEYS.map((k) => [k, s[k]])) as Partial<AppState>,
      migrate: (persisted, version) => {
        let s = persisted as Record<string, unknown>;
        const today = dayKey();
        // v1 → v2: uuid kimlikler, ön/arka yüz, updatedAt, sabit aile kuralı, gün anlık görüntüleri.
        if (version < 2) {
          const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
          const tasks = ((s.tasks as Task[]) ?? []).map((t) => ({
            ...t,
            id: isUuid(t.id) ? t.id : randomUUID(),
            face: t.face ?? 'front',
            updatedAt: t.updatedAt ?? t.createdAt ?? realNowIso(),
          }));
          const chainDays = Object.fromEntries(
            Object.entries((s.chainDays as Record<string, ChainDay>) ?? {}).map(([k, d]) => [
              k,
              { ...d, snapshot: d.snapshot ?? { done: [], missed: [] }, updatedAt: d.updatedAt ?? d.closedAt ?? realNowIso() },
            ]),
          );
          s = { ...s, tasks, chainDays, rules: [], pendingDeletes: [], syncCursor: null, lastPushAt: null };
        }
        // v2 → v3: kurallarda tekrar aralığı + görev şablonu.
        if (version < 3) {
          type OldRule = Partial<RecurringRule> & { id: string; title: string; category: RecurringRule['category'] };
          const old = (s.rules as OldRule[]) ?? [];
          let rules: RecurringRule[] = old.map((r) => ({
            face: 'front',
            pinOrder: undefined,
            countsForChain: true,
            active: true,
            isLocked: true,
            priority: 'medium',
            energyRequired: 'medium',
            estMinutes: 5,
            isMinimum: false,
            updatedAt: realNowIso(),
            ...r,
            intervalDays: r.intervalDays ?? 1,
            anchorDate: r.anchorDate ?? (s.firstDay as string) ?? today,
          }));
          if (!rules.some((r) => r.systemKey === FAMILY_RULE_KEY)) rules = [familyRule(today), ...rules];
          s = { ...s, rules, tasks: ensureRuleInstances((s.tasks as Task[]) ?? [], rules, today) };
        }
        // v3 → v4: kullanıcının sabit görevleri artık kaldırılabilir (yalnızca sistem kuralı kilitli).
        if (version < 4) {
          const rules = ((s.rules as RecurringRule[]) ?? []).map((r) => (r.systemKey ? r : { ...r, isLocked: false }));
          s = { ...s, rules };
        }
        return s;
      },
    },
  ),
);
