// app/(tabs)/_layout.tsx — Bottom tab navigator

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import { Colors, FontSize } from '@/constants/theme';

// ── Tab icon component ────────────────────────────────────────────────────────
function TabIcon({ emoji, focused, badge }: { emoji: string; focused: boolean; badge?: number }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const { data: unread = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn:  notificationsApi.getUnreadCount,
    refetchInterval: 60_000,
    staleTime:       55_000,
  });

  return (
    <Tabs
      screenOptions={{
        tabBarStyle:           styles.tabBar,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle:      styles.tabLabel,
        headerStyle:           { backgroundColor: Colors.secondary },
        headerTitleStyle:      { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
        headerTintColor:       '#fff',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'ServicePilot',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} badge={unread} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar:       { backgroundColor: Colors.surface, borderTopColor: Colors.border, height: 60, paddingBottom: 8 },
  tabLabel:     { fontSize: FontSize.xs, fontWeight: '500' },
  iconWrap:     { position: 'relative', alignItems: 'center', justifyContent: 'center', width: 32, height: 28 },
  emoji:        { fontSize: 22, opacity: 0.5 },
  emojiFocused: { opacity: 1 },
  badge:        { position: 'absolute', top: -4, right: -6, backgroundColor: Colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:    { color: '#fff', fontSize: 9, fontWeight: '700' },
});
