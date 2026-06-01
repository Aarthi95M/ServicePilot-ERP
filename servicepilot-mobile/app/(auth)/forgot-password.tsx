// app/(auth)/forgot-password.tsx

import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/shared/Button';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent,  setSent]  = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess:  () => setSent(true),
  });

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            If <Text style={{ fontWeight: FontWeight.bold }}>{email}</Text> is registered,
            you'll receive a reset link shortly.{'\n'}The link expires in 1 hour.
          </Text>
          <Button label="Back to Sign in" onPress={() => router.replace('/(auth)/login')} fullWidth />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send a reset link.</Text>

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.ae"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Button label="Send reset link" onPress={() => mutate(email)} loading={isPending} fullWidth style={{ marginTop: 8 }} />

        <TouchableOpacity style={styles.backWrap} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card:        { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%', gap: Spacing.sm, alignItems: 'center' },
  successIcon: { fontSize: 48, marginBottom: 4 },
  lockIcon:    { fontSize: 40, marginBottom: 4 },
  title:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  subtitle:    { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  label:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, alignSelf: 'flex-start' },
  input:       { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text, width: '100%' },
  backWrap:    { marginTop: 8 },
  backText:    { fontSize: FontSize.sm, color: Colors.textSecondary },
});
