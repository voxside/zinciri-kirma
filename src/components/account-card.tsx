import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { R, S, type Theme } from '@/constants/theme';
import { sendLoginCode, signOut, verifyLoginCode } from '@/lib/supabase';
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
          Veriler şu an sadece bu cihazda. Açmak için proje klasöründeki .env dosyasına Supabase adresini ve
          anahtarını ekleyip uygulamayı yeniden başlat.
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
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
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
        Hızlı yakalama (Apple Watch / Kestirmeler) ve cihazlar arası senkron için hesap gerekli. E-postana 6 haneli
        bir kod gelecek.
      </Text>
      {step === 'email' ? (
        <>
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
          <Button
            label="Kod gönder"
            busy={busy}
            disabled={!email.includes('@')}
            onPress={() =>
              run(async () => {
                await sendLoginCode(email);
                setStep('code');
              })
            }
          />
        </>
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6 haneli kod"
            placeholderTextColor={t.textFaint}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
            style={styles.input}
          />
          <View style={styles.row}>
            <Button
              label="Giriş yap"
              busy={busy}
              disabled={code.trim().length < 6}
              onPress={() => run(() => verifyLoginCode(email, code))}
            />
            <Button label="Geri" ghost onPress={() => setStep('email')} />
          </View>
        </>
      )}
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
