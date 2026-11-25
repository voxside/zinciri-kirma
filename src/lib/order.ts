// Görev sıralaması — tek kaynak. Gelişigüzel sıra yok:
//
// Liste sırası
//   1) Saati olan görevler, saat sırasına göre (geç kalınanlar doğal olarak en üstte)
//   2) Saati olmayanlar: sabitlenmiş kurallar → öncelik (Yüksek→Düşük) → kısa süre → eklenme sırası
//   Alınacaklar hedef tarihe, Projeler teslim tarihine göre önce sıralanır.
//
// "Şimdi bunu yap" sırası (uygulama saatine göre)
//   1) Saati gelmiş / 60 dk içinde gelecek görevler (saat sırasıyla)
//   2) Kritik (⭐) görevler
//   3) Saatsiz görevler (öncelik → kısa süre)
//   4) Saati daha ileride olanlar

import type { Level3, RecurringRule, Task } from '@/types/models';
import { diffDays } from './date';

const PRIO: Record<Level3, number> = { high: 3, medium: 2, low: 1 };

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function untimedCompare(a: Task, b: Task, pin: Map<string, number>): number {
  const pa = a.ruleId ? (pin.get(a.ruleId) ?? 99) : 1000;
  const pb = b.ruleId ? (pin.get(b.ruleId) ?? 99) : 1000;
  if (pa !== pb) return pa - pb;
  const pr = PRIO[b.priority] - PRIO[a.priority];
  if (pr !== 0) return pr;
  const est = (a.estMinutes ?? 30) - (b.estMinutes ?? 30);
  if (est !== 0) return est;
  return a.createdAt.localeCompare(b.createdAt);
}

/** Listeler için kalıcı, öngörülebilir sıra. */
export function sortTasks(tasks: Task[], rules: RecurringRule[]): Task[] {
  const pin = new Map(rules.map((r) => [r.id, r.pinOrder ?? 99]));
  return [...tasks].sort((a, b) => {
    // Tarihli kategoriler: önce tarih
    if ((a.category === 'shopping' || a.category === 'project') && a.category === b.category) {
      const ad = a.dueDate ?? '9999-12-31';
      const bd = b.dueDate ?? '9999-12-31';
      if (ad !== bd) return ad.localeCompare(bd);
    }
    if (a.dueTime && b.dueTime) {
      const d = timeToMinutes(a.dueTime) - timeToMinutes(b.dueTime);
      return d !== 0 ? d : untimedCompare(a, b, pin);
    }
    if (a.dueTime) return -1;
    if (b.dueTime) return 1;
    return untimedCompare(a, b, pin);
  });
}

/** "Şimdi bunu yap" için bekleyen görevlerin sırası. */
export function rankNextTasks(tasks: Task[], rules: RecurringRule[], now: Date): Task[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const pin = new Map(rules.map((r) => [r.id, r.pinOrder ?? 99]));
  const bucket = (t: Task) => {
    if (t.dueTime && timeToMinutes(t.dueTime) <= nowMin + 60) return 0;
    if (!t.dueTime && t.isMinimum) return 1;
    if (!t.dueTime) return 2;
    return 3;
  };
  return tasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      if (a.dueTime && b.dueTime) return timeToMinutes(a.dueTime) - timeToMinutes(b.dueTime);
      return untimedCompare(a, b, pin);
    });
}

/** Saati geçmiş ve hâlâ bekleyen görev mi? */
export function isLate(t: Task, now: Date): boolean {
  if (!t.dueTime || t.status !== 'pending') return false;
  return timeToMinutes(t.dueTime) < now.getHours() * 60 + now.getMinutes();
}

/** Hedef tarihi 0–3 gün içinde olan (ya da geçmiş) bekleyen alımlar. */
export function upcomingPurchases(tasks: Task[], today: string, withinDays = 3): Task[] {
  return tasks
    .filter((t) => t.category === 'shopping' && t.status === 'pending' && t.dueDate)
    .filter((t) => diffDays(today, t.dueDate!) <= withinDays)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
}

/** "3 gün kaldı" / "Bugün" / "2 gün geçti" */
export function countdownLabel(today: string, due: string): string {
  const d = diffDays(today, due);
  if (d === 0) return 'Bugün';
  if (d === 1) return 'Yarın';
  if (d > 0) return `${d} gün kaldı`;
  return `${-d} gün geçti`;
}
