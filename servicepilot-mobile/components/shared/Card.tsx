import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Shadow } from '@/constants/theme';

interface CardProps {
  children:  React.ReactNode;
  style?:    ViewStyle;
  padding?:  number;
}

export function Card({ children, style, padding = Spacing.md }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Shadow.sm,
  },
});
