import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, R, S, type Theme } from '@/constants/theme';
import { useStyles } from '@/theme/theme-context';

export function ComingSoon({
  icon,
  title,
  phase,
  points,
  children,
}: {
  icon: ReactNode;
  title: string;
  phase: string;
  points: string[];
  children?: ReactNode;
}) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + S.md }]}>
      <Text style={styles.title}>{title}</Text>
      {children}
      <View style={styles.card}>
        {icon}
        <Text style={styles.phase}>{phase}</Text>
        {points.map((p) => (
          <Text key={p} style={styles.point}>
            • {p}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: S.lg, paddingBottom: S.xxl, gap: S.lg, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  title: { color: t.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  card: { padding: S.xl, borderRadius: R.lg, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, gap: S.sm },
  phase: { color: t.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: S.sm },
  point: { color: t.textDim, fontSize: 14, lineHeight: 20 },
});
