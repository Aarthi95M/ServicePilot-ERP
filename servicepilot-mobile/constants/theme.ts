// constants/theme.ts — single source of truth for colors, spacing, typography

export const Colors = {
  primary:    '#2563eb',
  primaryDark:'#1d4ed8',
  secondary:  '#0d1f5c',
  success:    '#16a34a',
  warning:    '#d97706',
  danger:     '#dc2626',
  info:       '#0891b2',

  background: '#f8fafc',
  surface:    '#ffffff',
  border:     '#e2e8f0',
  borderLight:'#f1f5f9',

  text:       '#0f172a',
  textSecondary: '#64748b',
  textMuted:  '#94a3b8',
  textInverse:'#ffffff',

  // Status badge colors
  statusCheckedIn:  { bg: '#dcfce7', text: '#15803d' },
  statusCheckedOut: { bg: '#f1f5f9', text: '#475569' },
  statusAbsent:     { bg: '#fef9c3', text: '#854d0e' },
  statusPending:    { bg: '#fef3c7', text: '#92400e' },
  statusApproved:   { bg: '#dcfce7', text: '#15803d' },
  statusRejected:   { bg: '#fee2e2', text: '#b91c1c' },
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 9999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 28,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
