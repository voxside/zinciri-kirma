// Ana sahne: altta günün büyük halkası, üstünde geriye (derinliğe) doğru uzanan
// geçmiş günlerin halkaları. Halkaya dokununca ön/arka yüz arasında 3B çevrilir;
// geçmiş halkaya dokununca o günün detay kartı açılır.

import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';

import type { Theme } from '@/constants/theme';
import { addDays } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useStyles, useTheme } from '@/theme/theme-context';
import type { ChainDay, ChainStatus, TaskFace } from '@/types/models';
import { ChainRing, RING_OUTER_R, RING_SIZE } from './chain-ring';
import { CartIcon, FlipIcon } from './icons';

const HISTORY = 14;

interface Props {
  today: string;
  firstDay: string;
  chainDays: Record<string, ChainDay>;
  face: TaskFace;
  onFlip: () => void;
  onInspect: (day: string) => void;
  front: { progress: number; status: ChainStatus };
  back: { progress: number; status: ChainStatus };
  /** Yaklaşan alım sayısı (arka yüzde rozet, ön yüzde nokta) */
  alerts: number;
}

type LinkState = ChainStatus | 'none';

function linkStyle(state: LinkState, t: Theme): { color: string; opacity: number; dash?: string } {
  switch (state) {
    case 'full':
      return { color: t.gold, opacity: 1 };
    case 'saved':
      return { color: t.silver, opacity: 1 };
    case 'frozen':
      return { color: t.primary, opacity: 0.8 };
    case 'broken':
      return { color: t.broken, opacity: 1, dash: '6 5' };
    default:
      return { color: t.border, opacity: 0.5 };
  }
}

export function ChainScene({ today, firstDay, chainDays, face, onFlip, onInspect, front, back, alerts }: Props) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  // 3B çevirme
  const rot = useSharedValue(face === 'back' ? 180 : 0);
  useEffect(() => {
    rot.value = withTiming(face === 'back' ? 180 : 0, { duration: 520, easing: Easing.inOut(Easing.cubic) });
  }, [face, rot]);
  const frontStyle = useAnimatedStyle(() => ({
    opacity: rot.value < 90 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${rot.value}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: rot.value >= 90 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${rot.value - 180}deg` }],
  }));

  // Geometri: halka altta ortada; geçmiş halkalar yukarı doğru küçülerek uzaklaşır.
  const cx = size.w / 2;
  const ringCy = size.h - RING_SIZE / 2 - 8;
  const links: { day: string; cx: number; cy: number; rx: number; ry: number; sw: number; o: number; z: number }[] = [];
  if (size.h > 0) {
    let prevTop = ringCy - RING_OUTER_R; // halkanın tepe noktası
    for (let i = 1; i <= HISTORY; i++) {
      const s = 0.62 * Math.pow(0.84, i - 1);
      const base = 150 * s;
      // Sırayla dik (yandan görünen) ve yatık (üstten görünen) halkalar → zincir görünümü
      const vertical = i % 2 === 1;
      const rx = vertical ? base * 0.22 : base * 0.5;
      const ry = vertical ? base * 0.42 : base * 0.2;
      const cy = prevTop - ry * 0.45;
      if (cy - ry < 4) break;
      links.push({
        day: addDays(today, -i),
        cx,
        cy,
        rx,
        ry,
        sw: Math.max(2, 9 * s),
        o: Math.max(0.25, 1 - (i - 1) * 0.06),
        z: HISTORY - i,
      });
      prevTop = cy - ry;
    }
  }

  return (
    <View style={styles.scene} onLayout={onLayout}>
      {links.map((l) => {
        const record = chainDays[l.day];
        const state: LinkState = l.day < firstDay ? 'none' : (record?.status ?? 'none');
        const st = linkStyle(state, t);
        const w = (l.rx + l.sw) * 2;
        const h = (l.ry + l.sw) * 2;
        return (
          <Pressable
            key={l.day}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${l.day} gününü incele`}
            onPress={() => {
              haptic.tap();
              onInspect(l.day);
            }}
            style={[styles.link, { left: l.cx - w / 2, top: l.cy - h / 2, width: w, height: h, zIndex: l.z, opacity: l.o }]}>
            <Svg width={w} height={h}>
              <Ellipse
                cx={w / 2}
                cy={h / 2}
                rx={l.rx}
                ry={l.ry}
                fill="none"
                stroke={st.color}
                strokeOpacity={st.opacity}
                strokeWidth={l.sw}
                strokeDasharray={st.dash}
              />
            </Svg>
          </Pressable>
        );
      })}

      {size.h > 0 ? (
        <Pressable
          onPress={() => {
            haptic.tap();
            onFlip();
          }}
          accessibilityRole="button"
          accessibilityLabel={face === 'front' ? 'Halkayı çevir: güne özel görevler' : 'Halkayı çevir: günlük akış'}
          style={[styles.ringSlot, { left: cx - RING_SIZE / 2, top: ringCy - RING_SIZE / 2 }]}>
          <Animated.View style={[styles.face, frontStyle]} pointerEvents="none">
            <ChainRing progress={front.progress} status={front.status} variant="front" />
          </Animated.View>
          <Animated.View style={[styles.face, backStyle]} pointerEvents="none">
            <ChainRing progress={back.progress} status={back.status} variant="back" />
          </Animated.View>

          {/* Bildirim katmanı: yaklaşan alımlar */}
          {alerts > 0 && face === 'back' ? (
            <View style={styles.badge} accessibilityLabel={`${alerts} yaklaşan alım`}>
              <CartIcon size={14} color={t.onAccent} />
              <Text style={styles.badgeText}>{alerts}</Text>
            </View>
          ) : null}
          {alerts > 0 && face === 'front' ? <View style={styles.dot} /> : null}

          <View style={styles.flipHint} pointerEvents="none">
            <FlipIcon size={14} color={face === 'front' ? t.textFaint : t.primary} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    scene: { flex: 1, minHeight: RING_SIZE + 140 },
    link: { position: 'absolute' },
    ringSlot: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, zIndex: 100 },
    face: { ...StyleSheet.absoluteFill, backfaceVisibility: 'hidden' },
    badge: {
      position: 'absolute',
      top: 18,
      right: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 9,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.accent,
      borderWidth: 2,
      borderColor: t.bg,
    },
    badgeText: { color: t.onAccent, fontWeight: '800', fontSize: 13 },
    dot: {
      position: 'absolute',
      top: 26,
      right: 26,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: t.accent,
      borderWidth: 2,
      borderColor: t.bg,
    },
    flipHint: { position: 'absolute', bottom: -4, alignSelf: 'center', left: RING_SIZE / 2 - 7 },
  });
