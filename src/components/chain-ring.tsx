// Günün büyük halkası — rakam/metin yok. İlerleme yalnızca sıvı doluluğu,
// dış yay ve parıltının parlaklığıyla hissedilir.

import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import type { Theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { ChainStatus } from '@/types/models';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const RING_SIZE = 248;
const CENTER = RING_SIZE / 2;
export const RING_OUTER_R = 112; // dış ilerleme yayı
const RING_W = 10;
const LIQUID_R = 96; // sıvı haznesi
const CIRC = 2 * Math.PI * RING_OUTER_R;

export type RingVariant = 'front' | 'back';

function palette(t: Theme, variant: RingVariant, status: ChainStatus): [string, string] {
  if (status === 'full') return [t.gold, t.goldDeep];
  if (status === 'saved') return [t.silver, t.silverDeep];
  // Ön yüz: turuncu doluluk · Arka yüz (güne özel): turkuaz doluluk
  return variant === 'front' ? [t.accent, t.accentDeep] : [t.primary, t.primaryDeep];
}

function wavePath(level: number, amp: number, phase: number, wavelength: number) {
  'worklet';
  const left = CENTER - LIQUID_R - 12;
  const right = CENTER + LIQUID_R + 12;
  const bottom = CENTER + LIQUID_R + 12;
  let d = `M ${left} ${bottom} L ${left} ${level.toFixed(1)}`;
  for (let x = left; x <= right; x += 6) {
    const y = level + amp * Math.sin((x / wavelength) * 2 * Math.PI + phase);
    d += ` L ${x} ${y.toFixed(1)}`;
  }
  return d + ` L ${right} ${bottom} Z`;
}

function useWaveProps(progress: SharedValue<number>, phase: SharedValue<number>, offset: number, wavelength: number) {
  return useAnimatedProps(() => {
    const p = progress.value;
    const amp = 7 * Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) + (p > 0.001 && p < 0.999 ? 2 : 0);
    const level = CENTER + LIQUID_R + 10 - p * (2 * LIQUID_R + 20);
    return { d: wavePath(level, amp, phase.value + offset, wavelength) };
  });
}

interface Props {
  progress: number; // 0..1
  status: ChainStatus;
  variant?: RingVariant;
}

export function ChainRing({ progress, status, variant = 'front' }: Props) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const [c1, c2] = palette(t, variant, status);
  const id = variant; // SVG gradient kimlikleri iki yüzde çakışmasın

  const p = useSharedValue(0);
  const phase = useSharedValue(0);
  const pulse = useSharedValue(1);
  const burst = useSharedValue(0);
  const celebrate = useSharedValue(0);

  useEffect(() => {
    p.value = withSpring(progress, { damping: 15, stiffness: 70, mass: 1 });
  }, [progress, p]);

  useEffect(() => {
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [phase]);

  // Tamamlanma kutlaması: yalnızca "devam ediyor" → "tam/kurtarıldı" geçişinde.
  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    const nowDone = status === 'full' || status === 'saved';
    const wasDone = was === 'full' || was === 'saved';
    if (nowDone && !wasDone) {
      haptic.success();
      pulse.value = withSequence(
        withTiming(0.94, { duration: 120 }),
        withSpring(1.08, { damping: 6, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 120 }),
      );
      burst.value = 0;
      burst.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
      celebrate.value = withSequence(withTiming(1, { duration: 250 }), withDelay(600, withTiming(0, { duration: 900 })));
    }
  }, [status, pulse, burst, celebrate]);

  const backWave = useWaveProps(p, phase, Math.PI * 0.8, 150);
  const frontWave = useWaveProps(p, phase, 0, 190);
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - Math.min(1, Math.max(0, p.value))),
  }));

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  // Parlaklık ilerlemeyle artar; kutlamada kısa süre patlar.
  const glowStyle = useAnimatedStyle(() => {
    const base = 0.05 + 0.3 * Math.min(1, Math.max(0, p.value));
    const o = Math.max(base, 0.5 * celebrate.value);
    return { opacity: o, transform: [{ scale: 0.86 + o * 0.5 }] };
  });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={variant === 'front' ? 'Günün halkası' : 'Güne özel görevler halkası'}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Animated.View style={[styles.glow, { backgroundColor: c1, shadowColor: c1 }, glowStyle]} />

      {Array.from({ length: 18 }, (_, i) => (
        <Particle key={i} index={i} burst={burst} color={i % 3 === 0 ? c2 : c1} />
      ))}

      <Animated.View style={ringStyle}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <LinearGradient id={`liquid-${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
            <LinearGradient id={`arc-${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
            <ClipPath id={`vessel-${id}`}>
              <Circle cx={CENTER} cy={CENTER} r={LIQUID_R} />
            </ClipPath>
          </Defs>

          <Circle cx={CENTER} cy={CENTER} r={LIQUID_R} fill={t.surface} />
          <G clipPath={`url(#vessel-${id})`}>
            <AnimatedPath animatedProps={backWave} fill={c2} opacity={0.45} />
            <AnimatedPath animatedProps={frontWave} fill={`url(#liquid-${id})`} />
          </G>
          <Circle cx={CENTER} cy={CENTER} r={LIQUID_R} fill="none" stroke={t.primary} strokeOpacity={0.35} strokeWidth={2} />

          <Circle cx={CENTER} cy={CENTER} r={RING_OUTER_R} fill="none" stroke={t.primarySoft} strokeWidth={RING_W} />
          <G transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RING_OUTER_R}
              fill="none"
              stroke={`url(#arc-${id})`}
              strokeWidth={RING_W}
              strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`}
              animatedProps={arcProps}
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

function Particle({ index, burst, color }: { index: number; burst: SharedValue<number>; color: string }) {
  const styles = useStyles(makeStyles);
  const angle = (index / 18) * Math.PI * 2 + (index % 2 ? 0.17 : 0);
  const dist = RING_OUTER_R + 18 + (index % 4) * 14;
  const size = 6 + (index % 3) * 3;
  const style = useAnimatedStyle(() => {
    const b = burst.value;
    const visible = b > 0 && b < 1;
    return {
      opacity: visible ? 1 - b : 0,
      transform: [
        { translateX: Math.cos(angle) * dist * b },
        { translateY: Math.sin(angle) * dist * b },
        { scale: 1.2 - b * 0.8 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.particle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

const makeStyles = (_t: Theme) =>
  StyleSheet.create({
    wrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
    glow: {
      position: 'absolute',
      width: RING_SIZE * 0.82,
      height: RING_SIZE * 0.82,
      borderRadius: RING_SIZE,
      shadowOpacity: 0.9,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 0 },
      filter: [{ blur: 28 }],
    },
    particle: { position: 'absolute' },
  });
