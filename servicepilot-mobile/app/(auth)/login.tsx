// app/(auth)/login.tsx — Login screen

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth';
import { registerForPushNotifications } from '@/lib/utils/notifications';
import { Button } from '@/components/shared/Button';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (res) => {
      if (!res.success || !res.data) {
        setErrorMsg(res.message || 'Invalid email or password.');
        return;
      }
      await login({
        userId:    res.data.userId,
        companyId: res.data.companyId,
        email:     res.data.email,
        role:      res.data.role,
        token:     res.data.token,
      });
      // Register for push notifications — best-effort, don't block navigation
      registerForPushNotifications().catch(() => {});
      router.replace('/(tabs)/home');
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message ?? 'Login failed. Check your connection.');
    },
  });

  const handleLogin = () => {
    setErrorMsg('');
    if (!email.trim()) { setErrorMsg('Email is required.'); return; }
    if (!password)     { setErrorMsg('Password is required.'); return; }
    mutate({ email: email.trim().toLowerCase(), password });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >


        {/* Brand header */}
        <View style={styles.brandWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⚙️</Text>
          </View>
          <Text style={styles.brandName}>ServicePilot</Text>
          <Text style={styles.brandSub}>Workforce & Field Service</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Enter your company credentials to continue</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldWrap}>
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
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 48 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button label="Sign In" onPress={handleLogin} loading={isPending} fullWidth size="lg" style={styles.signInBtn} />
        </View>

        <Text style={styles.version}>ServicePilot Mobile v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flexGrow: 1, backgroundColor: Colors.secondary, paddingHorizontal: Spacing.lg, paddingTop: 80, paddingBottom: 32 },
  brandWrap:  { alignItems: 'center', marginBottom: 40, gap: 8 },
  logoBox:    { width: 64, height: 64, borderRadius: Radius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoIcon:   { fontSize: 28 },
  brandName:  { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#fff' },
  brandSub:   { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.55)' },

  card:       { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md },
  title:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle:   { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: -8 },

  errorBox:   { backgroundColor: '#fee2e2', borderRadius: Radius.sm, padding: Spacing.sm },
  errorText:  { fontSize: FontSize.sm, color: Colors.danger },

  fieldWrap:  { gap: 6 },
  label:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  input:      { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },

  passWrap:   { position: 'relative' },
  eyeBtn:     { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  eyeIcon:    { fontSize: 16 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.primary },

  signInBtn:  { marginTop: 4 },
  version:    { textAlign: 'center', marginTop: 24, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.3)' },
});
