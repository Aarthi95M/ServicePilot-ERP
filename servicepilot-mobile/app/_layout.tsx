// app/_layout.tsx — Root layout
// Hydrates auth from SecureStore, then routes to login or tabs.
// Wraps the entire app in QueryClientProvider for React Query.
// Listens for network reconnects and flushes the offline queue automatically.

import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@/lib/store/auth';
import { flushOfflineQueue } from '@/lib/syncQueue';
import { Colors } from '@/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  30_000,
      retry:      1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const hydrate    = useAuthStore(s => s.hydrate);
  const wasOnline  = useRef<boolean | null>(null);

  // Flush offline queue whenever the device reconnects to the internet
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!state.isConnected;
      if (online && wasOnline.current === false) {
        // Transitioned from offline → online: flush queued actions
        flushOfflineQueue().catch(() => {});
      }
      wasOnline.current = online;
    });
    return unsub;
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={Colors.secondary} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)"  options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)"  options={{ animation: 'fade' }} />
          <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Job Details', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' }} />
          <Stack.Screen name="profile"   options={{ headerShown: true, title: 'My Profile',  headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
