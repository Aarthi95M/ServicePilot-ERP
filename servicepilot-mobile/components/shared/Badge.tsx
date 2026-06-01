import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, FontWeight, Radius } from '@/constants/theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary';

const CONFIG: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#15803d' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  danger:  { bg: '#fee2e2', text: '#b91c1c' },
  info:    { bg: '#e0f2fe', text: '#0369a1' },
  default: { bg: '#f1f5f9', text: '#475569' },
  primary: { bg: '#dbeafe', text: '#1d4ed8' },
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
  const map: Record<string, Variant> = {
    Pending: 'warning', Approved: 'success', Rejected: 'danger',
    Cancelled: 'default', 'In Progress': 'info', Completed: 'success',
    CheckedIn: 'success', CheckedOut: 'default', NotCheckedIn: 'warning',
    Present: 'success', Absent: 'danger', Late: 'warning',
  };
  return map[status] ?? 'default';
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
