import { StyleSheet, Switch, Text, View } from 'react-native';

import { AccountCard } from '@/components/account-card';
import { ComingSoon } from '@/components/coming-soon';
import { BookIcon } from '@/components/icons';
import { R, S, type Theme } from '@/constants/theme';
import { useTimeStore } from '@/lib/app-time';
import { useStyles, useTheme } from '@/theme/theme-context';

export default function MemoryScreen() {
  const t = useTheme();
  return (
    <ComingSoon
      title="Hafıza"
      phase="Faz 3"
      icon={<BookIcon size={32} color={t.accent} />}
      points={[
        'Kendini, hedeflerini ve kurallarını asistana öğret',
        'Not ve dosya yükleme (pgvector ile anlamsal arama)',
        'Koçun tüm yönlendirmeleri bu bağlama dayanır',
      ]}>
      <AccountCard />
      <DevCard />
    </ComingSoon>
  );
}

/** Geliştirici ayarları: Zaman Test Paneli düğmesini göster/gizle. */
function DevCard() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const enabled = useTimeStore((s) => s.panelEnabled);
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>⏱ Zaman Test Paneli</Text>
        <Text style={styles.text}>
          Saati ileri/geri alarak gündüz–akşam temasını ve gün dönümünü beklemeden test et.
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(v) => {
          useTimeStore.setState({ panelEnabled: v });
        }}
        trackColor={{ true: t.primary, false: t.surface2 }}
        thumbColor="#fff"
        accessibilityLabel="Zaman test panelini göster"
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      padding: S.lg,
      borderRadius: R.lg,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    title: { color: t.text, fontSize: 15, fontWeight: '800' },
    text: { color: t.textDim, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  });
