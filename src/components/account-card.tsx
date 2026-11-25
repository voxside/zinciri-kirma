import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { R, S, type Theme } from '@/constants/theme';
import { signInWithPassword, signOut, signUpWithPassword } from '@/lib/supabase';
import { syncNow, useSyncStatus } from '@/lib/sync';
import { useStyles, useTheme } from '@/theme/theme-context';

/** Bulut hesabı ve senkronizasyon durumu. */
export function AccountCard() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const { status, email, lastSyncedAt, error } = useSyncStatus();

  if (status === 'off') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Bulut senkronu kapalı</Text>
        <Text style={styles.text}>
          Veriler şu an sadece bu cihazda. Bulut bağlantı bilgileri bu sürüme eklenmemiş (Vercel ortam değişkenleri
          veya .env).
        </Text>
      </View>
    );
  }

  if (status === 'signed_out') return <SignIn />;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: status === 'error' ? t.danger : t.cat.shopping }]} />
        <Text style={styles.title}>{email}</Text>
      </View>
      <Text style={styles.text}>
        {status === 'syncing'
          ? 'Senkronize ediliyor…'
          : status === 'paused'
            ? 'Zaman simülasyonu açık — senkron duraklatıldı.'
          : status === 'error'
            ? `Senkron hatası: ${error}`
            : lastSyncedAt
              ? `Son senkron: ${new Date(lastSyncedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Bağlı'}
      </Text>
      <View style={styles.row}>
        <Button label="Şimdi senkronla" onPress={() => void syncNow()} busy={status === 'syncing'} />
        <Button label="Çıkış yap" ghost onPress={() => void signOut()} />
      </View>
    </View>
  );
}

function SignIn() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = email.includes('@') && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
      } else {
        const { needsConfirmation } = await signUpWithPassword(email, password);
        if (needsConfirmation) {
          setInfo(
            'Hesabın açıldı. E-postana gelen onay bağlantısına tıkla, sonra buraya dönüp aynı e-posta ve şifreyle giriş yap.',
          );
          setMode('signin');
        }
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Buluta bağlan</Text>
      <Text style={styles.text}>
        Verilerin buluta yedeklenir ve aynı hesapla girdiğin her cihazda görünür. Telefondaki mevcut görevlerin ilk
        girişte yüklenir.
      </Text>

      <View style={styles.tabs}>
        {(['signin', 'signup'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setMsg(null);
            }}
            style={[styles.tab, mode === m && { backgroundColor: t.primarySoft, borderColor: t.primary }]}>
            <Text style={[styles.tabText, mode === m && { color: t.text }]}>
              {m === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta"
        placeholderTextColor={t.textFaint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'signup' ? 'Şifre belirle (en az 6 karakter)' : 'Şifre'}
        placeholderTextColor={t.textFaint}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        onSubmitEditing={() => canSubmit && void submit()}
        style={styles.input}
      />
      <Button
        label={mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
        busy={busy}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />
      {info ? <Text style={[styles.text, { color: t.primary }]}>{info}</Text> : null}
      {msg ? <Text style={styles.error}>{msg}</Text> : null}
    </View>
  );
}

function Button({
  label,
  onPress,
  busy,
  disabled,
  ghost,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  ghost?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={[styles.btn, ghost ? styles.btnGhost : styles.btnPrimary, (busy || disabled) && { opacity: 0.5 }]}>
      {busy ? (
        <ActivityIndicator color={ghost ? t.text : t.onAccent} />
      ) : (
        <Text style={ghost ? styles.btnGhostText : styles.btnPrimaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  card: { padding: S.lg, borderRadius: R.lg, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, gap: S.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  tabs: { flexDirection: 'row', gap: S.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  tabText: { color: t.textDim, fontWeight: '700', fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { color: t.text, fontSize: 16, fontWeight: '800' },
  text: { color: t.textDim, fontSize: 13, lineHeight: 18 },
  error: { color: t.danger, fontSize: 13 },
  input: {
    backgroundColor: t.bg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: t.border,
    color: t.text,
    fontSize: 16,
    paddingHorizontal: S.lg,
    paddingVertical: 12,
  },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: R.md },
  btnPrimary: { backgroundColor: t.accent },
  btnPrimaryText: { color: t.onAccent, fontWeight: '800', fontSize: 15 },
  btnGhost: { backgroundColor: t.surface2 },
  btnGhostText: { color: t.text, fontWeight: '700', fontSize: 15 },
});
