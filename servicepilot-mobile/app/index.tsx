// app/index.tsx — Entry redirect
// Redirects to tabs if logged in, login if not.
// Waits for SecureStore hydration before deciding.

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/store/auth';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { token, isReady } = useAuthStore();

  useEffect(() => {
    if (!isReady) return;
    if (token) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isReady, token]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.secondary }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
