// app/(tabs)/notifications.tsx — Full notification list with mark-read

import { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import { NotificationItem } from '@/components/screens/NotificationItem';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.getAll(1, 50),
    staleTime: 20_000,
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn:  notificationsApi.getUnreadCount,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const notifications = data?.items ?? [];

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
  }, [qc]);

  const handleMarkAll = () => {
    if (unread === 0) return;
    Alert.alert('Mark all as read?', 'All notifications will be marked as read.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark All', onPress: () => markAll.mutate() },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          Notifications {unread > 0 ? <Text style={styles.unreadCount}>({unread} unread)</Text> : null}
        </Text>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAll} disabled={markAll.isPending}>
            <Text style={styles.markAllBtn}>
              {markAll.isPending ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="All caught up!"
            subtitle="No notifications at the moment."
            icon="🔔"
          />
        ) : (
          notifications.map((n: any) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onPress={() => {
                if (!n.isRead) markRead.mutate(n.id);
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:      { flex: 1, backgroundColor: Colors.background },

  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  unreadCount:  { color: Colors.primary },
  markAllBtn:   { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  list:         { flex: 1 },
  listContent:  { paddingBottom: 32 },
});
