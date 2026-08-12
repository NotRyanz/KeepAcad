// Design tokens derived from cal.com design system, adapted to a premium
// grey/black/white academic-manager aesthetic (ElevenLabs-inspired), with
// full light + dark theme support.

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  surfaceCard: string;
  surfaceCardAlt: string;
  surfaceSoft: string;
  surfaceStrong: string;

  ink: string;
  body: string;
  muted: string;
  mutedSoft: string;
  onPrimary: string;
  onDark: string;
  onDarkSoft: string;

  hairline: string;
  hairlineSoft: string;
  hairlineStrong: string;

  primary: string;
  primaryActive: string;
  primaryDisabled: string;

  accentBlue: string;
  accentBlueSoft: string;
  accentViolet: string;
  accentVioletSoft: string;
  accentPink: string;
  accentPinkSoft: string;
  accentEmerald: string;
  accentEmeraldSoft: string;
  accentOrange: string;
  accentOrangeSoft: string;
  accentAmber: string;
  accentAmberSoft: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;

  overlay: string;
};

export const darkColors: ThemeColors = {
  bg: '#0a0a0b',
  bgElevated: '#111113',
  surfaceCard: '#161618',
  surfaceCardAlt: '#1c1c1f',
  surfaceSoft: '#1a1a1d',
  surfaceStrong: '#2a2a2e',

  ink: '#f5f5f6',
  body: '#c7c7cc',
  muted: '#8e8e93',
  mutedSoft: '#636368',
  onPrimary: '#0a0a0b',
  onDark: '#ffffff',
  onDarkSoft: '#a1a1aa',

  hairline: 'rgba(255,255,255,0.08)',
  hairlineSoft: 'rgba(255,255,255,0.05)',
  hairlineStrong: 'rgba(255,255,255,0.16)',

  primary: '#f5f5f6',
  primaryActive: '#d4d4d8',
  primaryDisabled: '#3a3a3d',

  accentBlue: '#7aa2f7',
  accentBlueSoft: 'rgba(122,162,247,0.16)',
  accentViolet: '#a78bfa',
  accentVioletSoft: 'rgba(167,139,250,0.16)',
  accentPink: '#f5a3c7',
  accentPinkSoft: 'rgba(245,163,199,0.16)',
  accentEmerald: '#6ee7b7',
  accentEmeraldSoft: 'rgba(110,231,183,0.16)',
  accentOrange: '#fdba74',
  accentOrangeSoft: 'rgba(253,186,116,0.16)',
  accentAmber: '#fcd34d',
  accentAmberSoft: 'rgba(252,211,77,0.16)',

  success: '#4ade80',
  successSoft: 'rgba(74,222,128,0.16)',
  warning: '#facc15',
  warningSoft: 'rgba(250,204,21,0.16)',
  error: '#f87171',
  errorSoft: 'rgba(248,113,113,0.16)',

  overlay: 'rgba(0,0,0,0.6)',
};

export const lightColors: ThemeColors = {
  bg: '#ffffff',
  bgElevated: '#ffffff',
  surfaceCard: '#f5f5f6',
  surfaceCardAlt: '#eef0f2',
  surfaceSoft: '#f8f9fa',
  surfaceStrong: '#e5e7eb',

  ink: '#111113',
  body: '#374151',
  muted: '#6b7280',
  mutedSoft: '#9aa0aa',
  onPrimary: '#ffffff',
  onDark: '#ffffff',
  onDarkSoft: '#a1a1aa',

  hairline: 'rgba(17,17,19,0.09)',
  hairlineSoft: 'rgba(17,17,19,0.05)',
  hairlineStrong: 'rgba(17,17,19,0.16)',

  primary: '#131316',
  primaryActive: '#2c2c31',
  primaryDisabled: '#e5e7eb',

  accentBlue: '#3b6fe0',
  accentBlueSoft: 'rgba(59,111,224,0.12)',
  accentViolet: '#7c5cf0',
  accentVioletSoft: 'rgba(124,92,240,0.12)',
  accentPink: '#e0538f',
  accentPinkSoft: 'rgba(224,83,143,0.12)',
  accentEmerald: '#0f9d68',
  accentEmeraldSoft: 'rgba(15,157,104,0.12)',
  accentOrange: '#e0721f',
  accentOrangeSoft: 'rgba(224,114,31,0.12)',
  accentAmber: '#c68a06',
  accentAmberSoft: 'rgba(198,138,6,0.12)',

  success: '#0f9d68',
  successSoft: 'rgba(15,157,104,0.12)',
  warning: '#c68a06',
  warningSoft: 'rgba(198,138,6,0.12)',
  error: '#e0392f',
  errorSoft: 'rgba(224,57,47,0.12)',

  overlay: 'rgba(15,15,20,0.35)',
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 22,
  pill: 999,
  full: 999,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const font = {
  displayLg: { fontSize: 32, fontWeight: '600' as const, letterSpacing: -0.8 },
  displayMd: { fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.6 },
  displaySm: { fontSize: 21, fontWeight: '600' as const, letterSpacing: -0.4 },
  titleLg: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  titleMd: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0 },
  titleSm: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0 },
  bodyMd: { fontSize: 15, fontWeight: '400' as const, letterSpacing: 0 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.1 },
  button: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0 },
};

export type ThemeShadows = {
  soft: object;
  card: object;
  glow: object;
};

export function shadowFor(scheme: 'light' | 'dark'): ThemeShadows {
  if (scheme === 'dark') {
    return {
      soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
      glow: { shadowColor: '#7aa2f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
    };
  }
  return {
    soft: { shadowColor: '#1a1f2b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    card: { shadowColor: '#1a1f2b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    glow: { shadowColor: '#3b6fe0', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 5 },
  };
}

export const SUBJECT_ACCENT_KEYS = [
  'accentBlue',
  'accentViolet',
  'accentPink',
  'accentEmerald',
  'accentOrange',
  'accentAmber',
] as const;

export function subjectColor(seed: string, colors: ThemeColors): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const key = SUBJECT_ACCENT_KEYS[Math.abs(hash) % SUBJECT_ACCENT_KEYS.length];
  return colors[key];
}

export function subjectSoftColor(seed: string, colors: ThemeColors): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const key = SUBJECT_ACCENT_KEYS[Math.abs(hash) % SUBJECT_ACCENT_KEYS.length];
  const softKey = (key + 'Soft') as keyof ThemeColors;
  return colors[softKey];
}
