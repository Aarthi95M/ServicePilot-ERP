import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface EmptyStateProps {
  title:    string;
  subtitle?: string;
  icon?:    string;
}

export function EmptyState({ title, subtitle, icon = '📭' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 8 },
  icon:      { fontSize: 40, marginBottom: 4 },
  title:     { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center' },
  subtitle:  { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
