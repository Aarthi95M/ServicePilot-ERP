// app/_layout.tsx — Root layout
// Hydrates auth from SecureStore, then routes to login or tabs.
// Wraps the entire app in QueryClientProvider for React Query.

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/lib/store/auth';
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
  const hydrate = useAuthStore(s => s.hydrate);

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
