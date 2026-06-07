import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, FontWeight, Radius } from '@/constants/theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary';

const CONFIG: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#15803d' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  danger:  { bg: '#fee2e2', text: '#b91c1c' },
  info:    { bg: '#E8EDF8', text: '#4A67A1' },
  default: { bg: '#f1f5f9', text: '#475569' },
  primary: { bg: '#E8EDF8', text: '#16307A' },
};

interface BadgeProps {
  label:    string;
  variant?: Variant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const cfg = CONFIG[variant];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{label}</Text>
    </View>
  );
}

// Helper to map status strings to variants
export function statusVariant(status: string): Variant {
  if (!status) return 'default';
  const s = status.toLowerCase();

  // Job statuses (company-configurable names — match by keyword)
  if (s.includes('pending'))                         return 'warning';
  if (s.includes('assigned'))                        return 'info';
  if (s.includes('transit') || s.includes('route'))  return 'info';
  if (s.includes('on site') || s.includes('onsite')) return 'primary';
  if (s.includes('complet') || s.includes('done'))   return 'success';
  if (s.includes('cancel'))                          return 'danger';
  if (s.includes('hold') || s.includes('paused'))    return 'warning';
  if (s.includes('progress'))                        return 'info';

  // Attendance / leave statuses
  if (s.includes('approved') || s.includes('present')) return 'success';
  if (s.includes('reject') || s.includes('absent'))    return 'danger';
  if (s.includes('late'))                              return 'warning';
  if (s.includes('checkedin'))                         return 'success';
  if (s.includes('checkedout'))                        return 'default';

  return 'default';
}

const styles = StyleSheet.create({
  badge: {
    alignSelf:      'flex-start',
    borderRadius:   Radius.full,
    paddingVertical:   3,
    paddingHorizontal: 9,
  },
  text: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
