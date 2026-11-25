import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** .env doldurulmadıysa uygulama tamamen yerel çalışmaya devam eder. */
export const isSupabaseConfigured = !!url && !!key;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Giriş: e-posta + şifre. (Bağlantılı giriş iPhone ana ekran uygulamasında sorun çıkarır:
// bağlantı Safari'de açılır ve Safari ile ana ekran uygulamasının verisi ayrıdır.)

const TR_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
  [/email not confirmed/i, 'E-postanı henüz onaylamadın. Gelen kutundaki onay bağlantısına tıkla, sonra giriş yap.'],
  [/already registered|already been registered/i, 'Bu e-postayla zaten bir hesap var. “Giriş yap”ı seç.'],
  [/password should be at least/i, 'Şifre en az 6 karakter olmalı.'],
  [/rate limit|too many/i, 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.'],
  [/invalid email|unable to validate email/i, 'Geçerli bir e-posta adresi yaz.'],
];

function toTurkish(error: { message: string }): Error {
  const hit = TR_ERRORS.find(([re]) => re.test(error.message));
  return new Error(hit ? hit[1] : error.message);
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase yapılandırılmadı.');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toTurkish(error);
}

/** Hesap açar. E-posta onayı gerekiyorsa `needsConfirmation: true` döner. */
export async function signUpWithPassword(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  if (!supabase) throw new Error('Supabase yapılandırılmadı.');
  const emailRedirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo },
  });
  if (error) throw toTurkish(error);
  return { needsConfirmation: !data.session };
}

export async function signOut() {
  await supabase?.auth.signOut();
}
