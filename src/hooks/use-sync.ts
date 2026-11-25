import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { syncNow, useSyncStatus } from '@/lib/sync';
import { useAppStore } from '@/store/app-store';

/** Kökte bir kez: oturum, uygulama öne gelişi ve yerel değişikliklerde senkronize eder. */
export function useSyncEngine(enabled: boolean) {
  useEffect(() => {
    if (!supabase || !enabled) return;
    const sb = supabase;

    const { data: authSub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useAppStore.getState().resetSyncCursors();
        useSyncStatus.setState({ status: 'signed_out', email: undefined });
      } else if (session) {
        // Supabase: geri çağırma içinde doğrudan istemci çağrısı yapma — bir sonraki tura ertele.
        setTimeout(() => void syncNow(), 0);
      } else {
        useSyncStatus.setState({ status: 'signed_out' });
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useAppStore.subscribe((s, prev) => {
      if (
        s.tasks !== prev.tasks ||
        s.rules !== prev.rules ||
        s.chainDays !== prev.chainDays ||
        s.pendingDeletes !== prev.pendingDeletes
      ) {
        clearTimeout(timer);
        timer = setTimeout(() => void syncNow(), 2000);
      }
    });

    const appSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        sb.auth.startAutoRefresh();
        void syncNow();
      } else {
        sb.auth.stopAutoRefresh();
      }
    });

    const interval = setInterval(() => void syncNow(), 60_000);

    return () => {
      authSub.subscription.unsubscribe();
      unsubStore();
      appSub.remove();
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [enabled]);
}
