// Design tokens do ParkUPB (iguais aos definidos no Figma).
export const colors = {
  primary: '#0F5C6E',
  primaryDark: '#0B4654',
  primarySoft: '#E7F1F3',
  accent: '#F28C28',
  accentSoft: '#FDF1E4',
  bg: '#F5F7F8',
  surface: '#FFFFFF',
  text: '#13232A',
  muted: '#5E6E75',
  faint: '#8A989E',
  border: '#E2E8EA',
  success: '#2E9E5B',
  successSoft: '#E6F5EC',
  danger: '#D64545',
  dangerSoft: '#FBEAEA',
  warning: '#E07B12',
  warningSoft: '#FDF1E4',
  disabled: '#9AA5AA',
  disabledSoft: '#EEF1F2',
  overlay: 'rgba(10, 30, 36, 0.45)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const font = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  small: { fontSize: 12, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.text },
};

export const shadow = {
  shadowColor: '#0F2A33',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};
