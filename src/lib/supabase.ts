import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

/** E-postaya 6 haneli giriş kodu gönderir (hesap yoksa oluşturur). */
export async function sendLoginCode(email: string) {
  if (!supabase) throw new Error('Supabase yapılandırılmadı.');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyLoginCode(email: string, code: string) {
  if (!supabase) throw new Error('Supabase yapılandırılmadı.');
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
