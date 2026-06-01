import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   'primary' | 'secondary' | 'danger' | 'ghost';
  size?:      'sm' | 'md' | 'lg';
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  style?:     ViewStyle;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'secondary' || variant === 'ghost' ? Colors.primary : '#fff'} />
        : <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:       { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, flexDirection: 'row' },
  fullWidth:  { width: '100%' },
  disabled:   { opacity: 0.6 },

  primary:    { backgroundColor: Colors.primary },
  secondary:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  danger:     { backgroundColor: Colors.danger },
  ghost:      { backgroundColor: 'transparent' },

  size_sm:    { paddingVertical: 8,  paddingHorizontal: 14 },
  size_md:    { paddingVertical: 12, paddingHorizontal: 20 },
  size_lg:    { paddingVertical: 15, paddingHorizontal: 24 },

  label:          { fontWeight: FontWeight.semibold },
  label_primary:  { color: '#fff' },
  label_secondary:{ color: Colors.text },
  label_danger:   { color: '#fff' },
  label_ghost:    { color: Colors.primary },

  labelSize_sm:   { fontSize: FontSize.sm },
  labelSize_md:   { fontSize: FontSize.base },
  labelSize_lg:   { fontSize: FontSize.md },
});
