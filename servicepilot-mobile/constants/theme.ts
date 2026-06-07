// constants/theme.ts — ServicePilot Design System

export const Colors = {
  // Brand
  primary:      '#0D1F5C',   // Deep Navy (header bg, brand)
  primaryBtn:   '#16307A',   // Royal Navy (button backgrounds)
  primaryHover: '#2142A3',   // Button hover
  secondary:    '#4A67A1',   // Steel Blue
  accent:       '#2563EB',   // Sky Blue (links, active indicators)

  // Semantic
  success:  '#16A34A',
  warning:  '#F59E0B',
  danger:   '#DC2626',
  info:     '#4A67A1',

  // Layout
  background: '#F8FAFC',
  surface:    '#FFFFFF',
  border:     '#E5E7EB',
  borderLight:'#F3F4F6',

  // Text
  text:          '#1F2937',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  textInverse:   '#FFFFFF',

  // Status badge colors (kept for Badge component)
  statusCheckedIn:  { bg: '#DCFCE7', text: '#15803D' },
  statusCheckedOut: { bg: '#F1F5F9', text: '#475569' },
  statusAbsent:     { bg: '#FEF9C3', text: '#854D0E' },
  statusPending:    { bg: '#FEF3C7', text: '#92400E' },
  statusApproved:   { bg: '#DCFCE7', text: '#15803D' },
  statusRejected:   { bg: '#FEE2E2', text: '#B91C1C' },
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
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
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
