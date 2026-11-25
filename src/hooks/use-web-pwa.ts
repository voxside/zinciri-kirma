// Yalnızca web/PWA: kalıcı depolama isteği + temaya göre tarayıcı/durum çubuğu rengi.
//
// Veriler zaten kalıcı: zustand "persist" → AsyncStorage → web'de localStorage
// (anahtarlar: "zinciri-kirma/v1" görevler/rutinler/projeler/zincir, "zinciri-kirma/time" saat ayarları).
// Tema ayrıca saklanmaz; saatten hesaplanır.

import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Theme } from '@/constants/theme';

export function useWebPwa(t: Theme) {
  // Tarayıcıdan verileri "kalıcı" işaretlemesini iste (depolama baskısında silinmesin).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  // Gündüz/akşam değişince tarayıcı arayüz rengini ve sayfa zeminini güncelle.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', t.bg);
    document.documentElement.style.backgroundColor = t.bg;
    document.body.style.backgroundColor = t.bg;
  }, [t.bg]);
}
