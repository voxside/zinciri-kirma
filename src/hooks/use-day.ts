import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { startClock, useTimeStore } from '@/lib/app-time';
import { computeDay, computeStreak } from '@/lib/chain';
import { useAppStore } from '@/store/app-store';

/** Kalıcı store diskten yüklendi mi? */
/** Kalıcı store'lar (veri + uygulama saati) diskten yüklendi mi? */
export function useHydrated(): boolean {
  const data = useSyncExternalStore(
    (cb) => useAppStore.persist.onFinishHydration(cb),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
  const time = useSyncExternalStore(
    (cb) => useTimeStore.persist.onFinishHydration(cb),
    () => useTimeStore.persist.hasHydrated(),
    () => false,
  );
  return data && time;
}

/** Gün dönümünü izler (uygulama öne gelince + her 30 sn). Kökte bir kez çağrılır. */
export function useDayRollover(enabled: boolean) {
  const rollover = useAppStore((s) => s.rollover);
  useEffect(() => {
    if (!enabled) return;
    rollover();
    const stopClock = startClock();
    const id = setInterval(rollover, 30_000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && rollover());
    return () => {
      stopClock();
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, rollover]);
}

/** Bugünün görevleri, halka ilerlemesi ve seri. */
export function useToday() {
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const mvdMode = useAppStore((s) => !!s.mvdByDay[s.today]);
  const chainDays = useAppStore((s) => s.chainDays);

  return useMemo(() => {
    const todayTasks = tasks.filter((t) => t.planDate === today);
    const progress = computeDay(todayTasks, mvdMode);
    const streak = computeStreak(chainDays, today, progress.status);
    return { today, todayTasks, progress, mvdMode, streak, chainDays };
  }, [tasks, today, mvdMode, chainDays]);
}
