// Merkezi uygulama saati. Uygulamadaki tüm "şu an" okumaları buradan geçer;
// Zaman Test Paneli bir kaydırma (offset) uygulayarak saati simüle eder.
//
// Not: Senkronizasyon meta verisi (updatedAt) bilinçli olarak GERÇEK saati kullanır
// (realNowIso) — simülasyon bulut verisini bozmasın.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TimeState {
  /** Gerçek saate eklenen ms. 0 = gerçek saat. */
  offsetMs: number;
  /** Simülasyon başlarken alınan veri yedeği (JSON). Gerçek saate dönünce geri yüklenir. */
  snapshot: string | null;
  /** Test paneli düğmesi görünsün mü? */
  panelEnabled: boolean;
  /** Kalıcı değil: son "tik" anı (gerçek ms). Ekranların saate tepki vermesi için. */
  tick: number;
}

export const useTimeStore = create<TimeState>()(
  persist(
    (): TimeState => ({
      offsetMs: 0,
      snapshot: null,
      panelEnabled: __DEV__,
      tick: Date.now(),
    }),
    {
      name: 'zinciri-kirma/time',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ offsetMs: s.offsetMs, snapshot: s.snapshot, panelEnabled: s.panelEnabled }),
    },
  ),
);

/** Uygulamanın "şu an"ı (simülasyon dahil). new Date() yerine bunu kullan. */
export function getCurrentAppTime(): Date {
  return new Date(Date.now() + useTimeStore.getState().offsetMs);
}

export const appNowIso = () => getCurrentAppTime().toISOString();
/** Senkronizasyon için gerçek saat. */
export const realNowIso = () => new Date().toISOString();

export const isTimeTraveling = () => useTimeStore.getState().offsetMs !== 0;

/** Kökte bir kez: saati her 30 sn'de bir "tikletir". */
export function startClock(): () => void {
  const id = setInterval(() => useTimeStore.setState({ tick: Date.now() }), 30_000);
  return () => clearInterval(id);
}

/** React: uygulama saatine abone ol (ms). Saat değişince / her tikte yeniden çizer. */
export function useAppNow(): number {
  const offset = useTimeStore((s) => s.offsetMs);
  const tick = useTimeStore((s) => s.tick);
  return tick + offset;
}
