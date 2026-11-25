// Zaman Test Paneli eylemleri. Simülasyon başlarken verinin yedeği alınır;
// "Gerçek Saate Dön" yedeği geri yükler — testler gerçek zinciri bozmaz.

import { PERSISTED_KEYS, useAppStore } from '@/store/app-store';
import { getCurrentAppTime, useTimeStore } from './app-time';

const HOUR = 3_600_000;
export const TIME_STEPS = { minusHour: -HOUR, plusHour: HOUR, plus6Hours: 6 * HOUR, plusDay: 24 * HOUR };

function takeSnapshot(): string {
  const s = useAppStore.getState();
  return JSON.stringify(Object.fromEntries(PERSISTED_KEYS.map((k) => [k, s[k]])));
}

export function travelTo(target: Date) {
  const t = useTimeStore.getState();
  const snapshot = t.snapshot ?? takeSnapshot();
  const offsetMs = target.getTime() - Date.now();
  useTimeStore.setState({ offsetMs, snapshot, tick: Date.now() });
  useAppStore.getState().rollover();
}

export function shiftTime(ms: number) {
  travelTo(new Date(getCurrentAppTime().getTime() + ms));
}

/** Simüle edilen günün belirli bir saatine git (örn. 10:00, 21:30). */
export function setClock(hours: number, minutes: number) {
  const d = getCurrentAppTime();
  d.setHours(hours, minutes, 0, 0);
  travelTo(d);
}

/** Gerçek saate dön ve test sırasında yapılan tüm değişiklikleri geri al. */
export function returnToRealTime() {
  const { snapshot } = useTimeStore.getState();
  if (snapshot) useAppStore.setState(JSON.parse(snapshot));
  useTimeStore.setState({ offsetMs: 0, snapshot: null, tick: Date.now() });
  useAppStore.getState().rollover();
}
