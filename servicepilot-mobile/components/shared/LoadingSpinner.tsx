import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '@/constants/theme';

interface LoadingSpinnerProps {
  message?: string;
  size?:    'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ message, size = 'large', fullScreen }: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  fullScreen: { flex: 1 },
  message:    { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
});
