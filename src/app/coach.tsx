import { ComingSoon } from '@/components/coming-soon';
import { SparkleIcon } from '@/components/icons';
import { useTheme } from '@/theme/theme-context';

export default function CoachScreen() {
  const t = useTheme();
  return (
    <ComingSoon
      title="Koç"
      phase="Faz 3"
      icon={<SparkleIcon size={32} color={t.accent} />}
      points={[
        'Sabah aktivasyonu ve enerji / ruh hali check-in',
        'Bağlama göre sıradaki tek görevi atama',
        '“Akşam süt al, yarın Ahmet’i ara” → otomatik görev',
      ]}
    />
  );
}
