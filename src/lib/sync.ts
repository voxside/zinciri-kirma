// Yerel öncelikli senkronizasyon: uygulama her zaman yerel veriyle çalışır,
// oturum açıksa değişiklikler arka planda Supabase'e gider ve oradan gelir.
//
// Kurallar
// - Çekme (pull): sunucudaki synced_at > son imleç olan satırlar.
// - Gönderme (push): yerelde updatedAt > son gönderim anı olan satırlar (upsert).
// - Çakışma: updatedAt'i daha yeni olan kazanır (son yazan kazanır).
// - Silme: yerelde hemen kaldırılır, sunucuda deleted_at ile işaretlenir.
// - Sabit kural ('family_call') iki cihazda ayrı oluşturulduysa sunucudaki benimsenir.

import { create } from 'zustand';

import { isTimeTraveling } from '@/lib/app-time';
import { ruleInstanceId } from '@/lib/ids';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import type { ChainDay, RecurringRule, Task } from '@/types/models';

type Row = Record<string, unknown>;
const undef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);
const nul = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

// ── Eşleme: yerel (camelCase) ↔ Postgres (snake_case) ─────────────────────
function taskToRow(t: Task, userId: string): Row {
  return {
    id: t.id,
    user_id: userId,
    category: t.category,
    face: t.face,
    title: t.title,
    notes: nul(t.notes),
    priority: t.priority,
    energy_required: t.energyRequired,
    est_minutes: nul(t.estMinutes),
    due_date: nul(t.dueDate),
    due_time: nul(t.dueTime),
    status: t.status,
    quantity: nul(t.quantity),
    price: nul(t.price),
    currency: nul(t.currency),
    contact_name: nul(t.contactName),
    contact_phone: nul(t.contactPhone),
    effort_minutes: nul(t.effortMinutes),
    span_days: nul(t.spanDays),
    progress: nul(t.progress),
    source: t.source,
    source_ref: nul(t.sourceRef),
    plan_date: t.planDate,
    is_minimum: t.isMinimum,
    rule_id: nul(t.ruleId),
    skill_task_id: nul(t.skillTaskId),
    ingest_id: nul(t.ingestId),
    needs_review: !!t.needsReview,
    hidden_at: nul(t.hiddenAt),
    completed_at: nul(t.completedAt),
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToTask(r: Row): Task {
  return {
    id: r.id as string,
    category: r.category as Task['category'],
    face: r.face as Task['face'],
    title: r.title as string,
    notes: undef(r.notes as string | null),
    priority: r.priority as Task['priority'],
    energyRequired: r.energy_required as Task['energyRequired'],
    estMinutes: undef(r.est_minutes as number | null),
    dueDate: undef(r.due_date as string | null),
    // Postgres time "HH:MM:SS" döner → "HH:MM"
    dueTime: undef((r.due_time as string | null)?.slice(0, 5) ?? null),
    status: r.status as Task['status'],
    quantity: undef(r.quantity as string | null),
    price: r.price == null ? undefined : Number(r.price),
    currency: undef(r.currency as Task['currency'] | null),
    contactName: undef(r.contact_name as string | null),
    contactPhone: undef(r.contact_phone as string | null),
    effortMinutes: undef(r.effort_minutes as number | null),
    spanDays: undef(r.span_days as number | null),
    progress: undef(r.progress as number | null),
    source: r.source as Task['source'],
    sourceRef: undef(r.source_ref as string | null),
    planDate: (r.plan_date as string | null) ?? null,
    isMinimum: !!r.is_minimum,
    ruleId: undef(r.rule_id as string | null),
    skillTaskId: undef(r.skill_task_id as string | null),
    ingestId: undef(r.ingest_id as string | null),
    needsReview: !!r.needs_review,
    hiddenAt: undef(r.hidden_at as string | null),
    completedAt: undef(r.completed_at as string | null),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function ruleToRow(r: RecurringRule, userId: string): Row {
  return {
    id: r.id,
    user_id: userId,
    system_key: nul(r.systemKey),
    category: r.category,
    face: r.face,
    title: r.title,
    interval_days: r.intervalDays,
    anchor_date: r.anchorDate,
    pin_order: nul(r.pinOrder),
    is_locked: r.isLocked,
    counts_for_chain: r.countsForChain,
    active: r.active,
    priority: r.priority,
    energy_required: r.energyRequired,
    est_minutes: nul(r.estMinutes),
    due_time: nul(r.dueTime),
    contact_phone: nul(r.contactPhone),
    is_minimum: r.isMinimum,
    updated_at: r.updatedAt,
  };
}

function rowToRule(r: Row): RecurringRule {
  return {
    id: r.id as string,
    systemKey: undef(r.system_key as string | null),
    category: r.category as RecurringRule['category'],
    face: r.face as RecurringRule['face'],
    title: r.title as string,
    intervalDays: (r.interval_days as RecurringRule['intervalDays']) ?? 1,
    anchorDate: r.anchor_date as string,
    pinOrder: undef(r.pin_order as number | null),
    isLocked: !!r.is_locked,
    countsForChain: !!r.counts_for_chain,
    active: !!r.active,
    priority: r.priority as RecurringRule['priority'],
    energyRequired: r.energy_required as RecurringRule['energyRequired'],
    estMinutes: undef(r.est_minutes as number | null),
    dueTime: undef((r.due_time as string | null)?.slice(0, 5) ?? null),
    contactPhone: undef(r.contact_phone as string | null),
    isMinimum: !!r.is_minimum,
    updatedAt: r.updated_at as string,
  };
}

function dayToRow(d: ChainDay, userId: string): Row {
  return {
    user_id: userId,
    day: d.day,
    status: d.status,
    target_points: d.targetPoints,
    earned_points: d.earnedPoints,
    mvd_mode: d.mvdMode,
    snapshot: d.snapshot,
    closed_at: nul(d.closedAt),
    updated_at: d.updatedAt,
  };
}

function rowToDay(r: Row): ChainDay {
  return {
    day: r.day as string,
    status: r.status as ChainDay['status'],
    targetPoints: r.target_points as number,
    earnedPoints: r.earned_points as number,
    mvdMode: !!r.mvd_mode,
    snapshot: (r.snapshot as ChainDay['snapshot']) ?? { done: [], missed: [] },
    closedAt: undef(r.closed_at as string | null),
    updatedAt: r.updated_at as string,
  };
}

// ── Durum (arayüz için) ────────────────────────────────────────────────────
export type SyncStatus = 'off' | 'signed_out' | 'idle' | 'syncing' | 'paused' | 'error';
export const useSyncStatus = create<{
  status: SyncStatus;
  email?: string;
  lastSyncedAt?: string;
  error?: string;
}>(() => ({ status: supabase ? 'signed_out' : 'off' }));

// ── Çekme ──────────────────────────────────────────────────────────────────
const PAGE = 1000;

async function pullTable(table: string, cursor: string): Promise<Row[]> {
  const out: Row[] = [];
  let from = cursor;
  for (;;) {
    const { data, error } = await supabase!
      .from(table)
      .select('*')
      .gt('synced_at', from)
      .order('synced_at', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    out.push(...(data as Row[]));
    if (!data || data.length < PAGE) break;
    from = data[data.length - 1].synced_at as string;
  }
  return out;
}

function maxCursor(cursor: string | null, ...sets: Row[][]): string | null {
  let c = cursor;
  for (const rows of sets) for (const r of rows) if (!c || (r.synced_at as string) > c) c = r.synced_at as string;
  return c;
}

function applyPull(remoteTasks: Row[], remoteRules: Row[], remoteDays: Row[]) {
  const s = useAppStore.getState();
  let rules = [...s.rules];
  let tasks = [...s.tasks];
  // Sadece gerçekten değişiklik varsa store'a yaz (yoksa senkron döngüsü tetiklenir).
  let changed = false;

  // 1) Kurallar (+ sistem kuralını benimseme)
  for (const row of remoteRules) {
    if (row.deleted_at) {
      if (rules.some((r) => r.id === row.id)) changed = true;
      rules = rules.filter((r) => r.id !== row.id);
      continue;
    }
    const incoming = rowToRule(row);
    const twin = incoming.systemKey
      ? rules.find((r) => r.systemKey === incoming.systemKey && r.id !== incoming.id)
      : undefined;
    if (twin) {
      // Bu cihazın kuralını sunucudakiyle değiştir; günlük kopyaları yeni kimliğe taşı.
      changed = true;
      rules = rules.filter((r) => r.id !== twin.id);
      tasks = tasks.map((t) =>
        t.ruleId === twin.id
          ? { ...t, ruleId: incoming.id, id: t.planDate ? ruleInstanceId(incoming.id, t.planDate) : t.id }
          : t,
      );
    }
    const i = rules.findIndex((r) => r.id === incoming.id);
    if (i < 0) {
      rules.push(incoming);
      changed = true;
    } else if (incoming.updatedAt > rules[i].updatedAt) {
      rules[i] = incoming;
      changed = true;
    }
  }

  // 2) Görevler
  const pendingDeletes = new Set(s.pendingDeletes);
  const map = new Map(tasks.map((t) => [t.id, t]));
  for (const row of remoteTasks) {
    const id = row.id as string;
    if (row.deleted_at) {
      if (map.delete(id)) changed = true;
      continue;
    }
    if (pendingDeletes.has(id)) continue;
    const incoming = rowToTask(row);
    const cur = map.get(id);
    if (!cur || incoming.updatedAt > cur.updatedAt) {
      map.set(id, incoming);
      changed = true;
    }
  }

  // 3) Zincir günleri
  const chainDays = { ...s.chainDays };
  for (const row of remoteDays) {
    const d = rowToDay(row);
    const cur = chainDays[d.day];
    if (!cur || d.updatedAt > cur.updatedAt) {
      chainDays[d.day] = d;
      changed = true;
    }
  }

  if (changed) useAppStore.getState().setSyncState({ rules, tasks: [...map.values()], chainDays });
}

// ── Gönderme ───────────────────────────────────────────────────────────────
async function upsertChunks(table: string, rows: Row[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase!.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw error;
  }
}

async function push(userId: string, startedAt: string) {
  const s = useAppStore.getState();
  const since = s.lastPushAt;
  const dirty = <T extends { updatedAt: string }>(xs: T[]) => xs.filter((x) => !since || x.updatedAt > since);

  // Sıra önemli: görevler kurallara referans verir.
  await upsertChunks('recurring_rules', dirty(s.rules).map((r) => ruleToRow(r, userId)), 'id');
  await upsertChunks('tasks', dirty(s.tasks).map((t) => taskToRow(t, userId)), 'id');
  await upsertChunks('chain_days', dirty(Object.values(s.chainDays)).map((d) => dayToRow(d, userId)), 'user_id,day');

  const deletes = s.pendingDeletes;
  if (deletes.length) {
    const { error } = await supabase!
      .from('tasks')
      .update({ deleted_at: startedAt, updated_at: startedAt })
      .in('id', deletes);
    if (error) throw error;
  }

  const after = useAppStore.getState();
  after.setSyncState(
    deletes.length
      ? { lastPushAt: startedAt, pendingDeletes: after.pendingDeletes.filter((id) => !deletes.includes(id)) }
      : { lastPushAt: startedAt },
  );
}

// ── Dışa açık ─────────────────────────────────────────────────────────────
let running: Promise<void> | null = null;
let again = false;

/** Çek → birleştir → gönder. Aynı anda tek çalışır; arada istek gelirse bir tur daha. */
export function syncNow(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        useSyncStatus.setState({ status: 'signed_out', email: undefined });
        return;
      }
      // Zaman simülasyonu açıkken test verisi buluta gitmesin.
      if (isTimeTraveling()) {
        useSyncStatus.setState({ status: 'paused', email: user.email });
        return;
      }
      useSyncStatus.setState({ status: 'syncing', email: user.email, error: undefined });
      try {
        const startedAt = new Date().toISOString();
        const cursor = useAppStore.getState().syncCursor ?? '1970-01-01T00:00:00Z';
        const [t, r, d] = await Promise.all([
          pullTable('tasks', cursor),
          pullTable('recurring_rules', cursor),
          pullTable('chain_days', cursor),
        ]);
        applyPull(t, r, d);
        useAppStore.getState().setSyncState({ syncCursor: maxCursor(useAppStore.getState().syncCursor, t, r, d) });
        await push(user.id, startedAt);
        useSyncStatus.setState({ status: 'idle', lastSyncedAt: new Date().toISOString() });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
        useSyncStatus.setState({ status: 'error', error: msg });
        again = false;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}
