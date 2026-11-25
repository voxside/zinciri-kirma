// Veri modeli — Supabase şemasıyla birebir (camelCase).
// Şema: supabase/migrations/20261125000000_init.sql — eşleme: src/lib/sync.ts
//
// Kategori anahtarları (veritabanında sabit kalır) → arayüz adları:
//   todo → Rutin · project → Projeler · shopping → Alınacaklar · call → Aranacaklar

export type TaskCategory = 'todo' | 'project' | 'shopping' | 'call';
export type Level3 = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'done' | 'skipped' | 'snoozed';
export type TaskSource = 'manual' | 'ai_chat' | 'calendar' | 'birthday' | 'routine' | 'skill' | 'ingest';
export type ChainStatus = 'in_progress' | 'full' | 'saved' | 'broken' | 'frozen';
/** front = günlük akış, back = zincirin arka yüzü (güne özel / niş) */
export type TaskFace = 'front' | 'back';
export type Currency = 'TRY' | 'USD' | 'EUR';

export interface Task {
  id: string; // uuid
  category: TaskCategory;
  face: TaskFace;
  title: string;
  /** Alınacaklar: çok satırlı hesap / taksit / mağaza notları */
  notes?: string;
  priority: Level3;
  energyRequired: Level3;
  estMinutes?: number;
  /** Alınacaklar: hedef alınma tarihi · Projeler: teslim tarihi (YYYY-MM-DD) */
  dueDate?: string;
  /** Görevi yapacağım saat (HH:mm) — sıralama buna göre */
  dueTime?: string;
  status: TaskStatus;
  quantity?: string; // shopping
  price?: number; // shopping
  currency?: Currency; // shopping
  contactName?: string; // call
  contactPhone?: string; // call
  /** Projeler: toplam efor (dk) */
  effortMinutes?: number;
  /** Projeler: kaç güne yayılacak */
  spanDays?: number;
  /** Projeler: ilerleme 0–100 */
  progress?: number;
  source: TaskSource;
  sourceRef?: string;
  completedAt?: string; // ISO
  createdAt: string; // ISO
  /** Hangi günün halkasına sayılıyor. null = "Sonra" (zincire sayılmaz). */
  planDate: string | null;
  /** Minimum Uygulanabilir Gün'de halkayı kurtaran kritik görev. */
  isMinimum: boolean;
  /** Sabit kuraldan üretildiyse kuralın id'si. */
  ruleId?: string;
  skillTaskId?: string;
  ingestId?: string;
  needsReview?: boolean;
  /** Tamamlandıktan sonra listeden kaldırıldı — halkadaki puanı korunur. */
  hiddenAt?: string;
  /** Son yerel değişiklik (senkronizasyonda son yazan kazanır). */
  updatedAt: string;
}

/** Tekrar aralığı (gün): her gün / 3 günde bir / haftada bir / 2 haftada bir */
export type RepeatInterval = 1 | 3 | 7 | 14;

export const REPEAT_LABEL: Record<RepeatInterval, string> = {
  1: 'Her gün',
  3: '3 günde bir',
  7: 'Haftada bir',
  14: '2 haftada bir',
};

/** Dar alanlar (seçici düğmeler) için kısa etiketler. */
export const REPEAT_SHORT: Record<RepeatInterval, string> = {
  1: 'Her gün',
  3: '3 günde',
  7: 'Haftada',
  14: '2 haftada',
};

/** Sabit (tekrarlı) görev kuralı. Her vade gününde bir görev kopyası üretir. */
export interface RecurringRule {
  id: string;
  systemKey?: string; // 'family_call' — sistem kuralı, kaldırılamaz
  category: TaskCategory;
  face: TaskFace;
  title: string;
  intervalDays: RepeatInterval;
  /** Tekrarın başladığı gün; vade günleri buna göre hesaplanır. */
  anchorDate: string;
  pinOrder?: number;
  /** Silinemez, yeniden adlandırılamaz (yalnızca sistem kuralı). */
  isLocked: boolean;
  countsForChain: boolean;
  active: boolean;
  // Üretilen görev kopyalarının şablonu
  priority: Level3;
  energyRequired: Level3;
  estMinutes?: number;
  dueTime?: string;
  contactPhone?: string;
  isMinimum: boolean;
  updatedAt: string;
}

export type NewRuleInput = Pick<RecurringRule, 'category' | 'title' | 'intervalDays'> &
  Partial<
    Pick<RecurringRule, 'face' | 'priority' | 'energyRequired' | 'estMinutes' | 'dueTime' | 'contactPhone' | 'isMinimum'>
  >;

export interface DaySnapshotItem {
  id: string;
  title: string;
  category: TaskCategory;
  face: TaskFace;
}

export interface ChainDay {
  day: string; // YYYY-MM-DD
  status: ChainStatus;
  targetPoints: number;
  earnedPoints: number;
  mvdMode: boolean;
  /** Gün kapanırken: tamamlananlar / yapılmayanlar (geçmiş gün kartı için). */
  snapshot: { done: DaySnapshotItem[]; missed: DaySnapshotItem[] };
  closedAt?: string;
  updatedAt: string;
}

export type NewTaskInput = Pick<Task, 'category' | 'title'> &
  Partial<
    Pick<
      Task,
      | 'face'
      | 'notes'
      | 'priority'
      | 'energyRequired'
      | 'estMinutes'
      | 'dueDate'
      | 'dueTime'
      | 'quantity'
      | 'price'
      | 'currency'
      | 'contactName'
      | 'contactPhone'
      | 'effortMinutes'
      | 'spanDays'
      | 'progress'
      | 'isMinimum'
      | 'planDate'
      | 'source'
      | 'sourceRef'
      | 'ruleId'
    >
  >;

export const CATEGORIES: TaskCategory[] = ['todo', 'project', 'shopping', 'call'];

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  todo: 'Rutin',
  project: 'Projeler',
  shopping: 'Alınacaklar',
  call: 'Aranacaklar',
};

/** Dar sekmeler için */
export const CATEGORY_SHORT: Record<TaskCategory, string> = {
  todo: 'Rutin',
  project: 'Proje',
  shopping: 'Alınacak',
  call: 'Aranacak',
};

export const LEVEL_LABEL: Record<Level3, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

export const CURRENCY_SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' };
