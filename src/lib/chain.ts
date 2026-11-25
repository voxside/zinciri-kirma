import type { ChainDay, ChainStatus, Level3, Task } from '@/types/models';
import { addDays } from './date';

const PRIORITY_POINTS: Record<Level3, number> = { low: 1, medium: 2, high: 3 };
const ENERGY_BONUS: Record<Level3, number> = { low: 0, medium: 1, high: 2 };

/** Görevin halkaya katkısı: öncelik + (yapılacaklarda) enerji bonusu. */
export function taskPoints(t: Task): number {
  return PRIORITY_POINTS[t.priority] + (t.category === 'todo' ? ENERGY_BONUS[t.energyRequired] : 0);
}

export interface DayProgress {
  targetPoints: number;
  earnedPoints: number;
  /** Tüm görevlere göre 0..1 */
  progress: number;
  /** Halkada gösterilen dolum. MVD açıkken kritik görevlere göre hesaplanır. */
  displayProgress: number;
  minimumTotal: number;
  minimumDone: number;
  isFull: boolean;
  isSaved: boolean;
  status: ChainStatus;
}

export function computeDay(tasksForDay: Task[], mvdMode: boolean): DayProgress {
  const counted = tasksForDay.filter((t) => t.status !== 'skipped');
  let target = 0;
  let earned = 0;
  let minTarget = 0;
  let minEarned = 0;
  let minimumTotal = 0;
  let minimumDone = 0;

  for (const t of counted) {
    const p = taskPoints(t);
    const done = t.status === 'done';
    target += p;
    if (done) earned += p;
    if (t.isMinimum) {
      minimumTotal++;
      minTarget += p;
      if (done) {
        minimumDone++;
        minEarned += p;
      }
    }
  }

  const progress = target > 0 ? Math.min(1, earned / target) : 0;
  const isFull = target > 0 && earned >= target;
  const isSaved = !isFull && mvdMode && minimumTotal > 0 && minimumDone === minimumTotal;
  const displayProgress =
    mvdMode && minimumTotal > 0 && !isFull ? Math.min(1, minEarned / minTarget) : progress;

  return {
    targetPoints: target,
    earnedPoints: earned,
    progress,
    displayProgress,
    minimumTotal,
    minimumDone,
    isFull,
    isSaved,
    status: isFull ? 'full' : isSaved ? 'saved' : 'in_progress',
  };
}

/** Gün kapanırken kesin durum: tam / kurtarıldı / kırık. */
export function closingStatus(p: DayProgress): ChainStatus {
  if (p.isFull) return 'full';
  if (p.isSaved) return 'saved';
  return 'broken';
}

export const isLinkIntact = (s: ChainStatus | undefined) =>
  s === 'full' || s === 'saved' || s === 'frozen';

/** Kesintisiz seri: dünden geriye sağlam halkalar (+ bugün sağlamsa bugün). */
export function computeStreak(
  chainDays: Record<string, ChainDay>,
  today: string,
  todayStatus: ChainStatus,
): number {
  let n = isLinkIntact(todayStatus) ? 1 : 0;
  for (let k = addDays(today, -1); isLinkIntact(chainDays[k]?.status); k = addDays(k, -1)) n++;
  return n;
}

// Sıralama kuralları: src/lib/order.ts
