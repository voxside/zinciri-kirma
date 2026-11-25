// Zinciri Kırma — Turkuaz (ana karakter) + Turuncu (aksiyon, doluluk, vurgu).
// Gündüz (06:00–18:59) ferah ve aydınlık; akşam (19:00–05:59) derin okyanus zemin.

export type ThemeMode = 'day' | 'night';

export interface Theme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  /** Turkuaz — markanın karakteri (seçili sekme, başlık vurguları, halka yuvası) */
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  /** Turuncu — aksiyon, doluluk, vurgu (butonlar, sıvı, FAB) */
  accent: string;
  accentDeep: string;
  onAccent: string;
  gold: string;
  goldDeep: string;
  silver: string;
  silverDeep: string;
  broken: string;
  danger: string;
  backdrop: string;
  textShadow: string;
  cat: { todo: string; project: string; shopping: string; call: string };
  prio: { low: string; medium: string; high: string };
  statusBar: 'light' | 'dark';
}

const day: Theme = {
  mode: 'day',
  bg: '#E8FAF7',
  surface: '#FFFFFF',
  surface2: '#D6F2EE',
  border: '#B9E3DD',
  text: '#06393A',
  textDim: '#3C6B69',
  textFaint: '#7FA5A1',
  primary: '#0EA5A0',
  primaryDeep: '#0B7E7A',
  primarySoft: '#C9EFEA',
  accent: '#FF7A1A',
  accentDeep: '#EE5A0B',
  onAccent: '#2A1200',
  gold: '#FFB627',
  goldDeep: '#FF8A00',
  silver: '#A9BCC6',
  silverDeep: '#6C8794',
  broken: '#E9B7B1',
  danger: '#DC3D43',
  backdrop: 'rgba(4,40,42,0.35)',
  textShadow: 'rgba(0,0,0,0.25)',
  cat: { todo: '#0EA5A0', project: '#7353D9', shopping: '#3B7BF0', call: '#DB4D74' },
  prio: { low: '#7FA5A1', medium: '#D98E00', high: '#DC3D43' },
  statusBar: 'dark',
};

const night: Theme = {
  mode: 'night',
  bg: '#03161B',
  surface: '#082630',
  surface2: '#0E3340',
  border: '#164653',
  text: '#E7FBF8',
  textDim: '#8DBDBE',
  textFaint: '#4F7F84',
  primary: '#2DD4BF',
  primaryDeep: '#14B8A6',
  primarySoft: '#0E3A3F',
  accent: '#FF8A3D',
  accentDeep: '#F2611C',
  onAccent: '#2A1200',
  gold: '#FFD36B',
  goldDeep: '#FF9F1C',
  silver: '#E3E9F0',
  silverDeep: '#8794A6',
  broken: '#5A2A30',
  danger: '#FF5A5F',
  backdrop: 'rgba(0,0,0,0.6)',
  textShadow: 'rgba(0,0,0,0.5)',
  cat: { todo: '#2DD4BF', project: '#B69CFF', shopping: '#7AA7FF', call: '#FF8FB1' },
  prio: { low: '#4F7F84', medium: '#F5B642', high: '#FF5A5F' },
  statusBar: 'light',
};

export const THEMES: Record<ThemeMode, Theme> = { day, night };

/** 06:00–18:59 gündüz, 19:00–05:59 akşam. */
export function themeModeAt(date: Date): ThemeMode {
  const h = date.getHours();
  return h >= 6 && h < 19 ? 'day' : 'night';
}

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

export const MaxContentWidth = 560;
