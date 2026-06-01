import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '@/constants/theme';

interface NotificationItemProps {
  notification: {
    id:        string;
    title:     string;
    message:   string;
    type:      string;
    isRead:    boolean;
    createdAt: string;
  };
  onPress: (id: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  leave:    '🏖️',
  overtime: '⏱️',
  job:      '🔧',
  system:   '🔔',
};

export function NotificationItem({ notification: n, onPress }: NotificationItemProps) {
  const timeAgo = formatTimeAgo(n.createdAt);
  const icon    = TYPE_ICONS[n.type] ?? '🔔';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(n.id)}
      style={[styles.row, !n.isRead && styles.unread]}
    >
      {/* Unread dot */}
      {!n.isRead && <View style={styles.dot} />}

      {/* Icon */}
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, !n.isRead && styles.titleUnread]} numberOfLines={1}>
          {n.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>{n.message}</Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: Spacing.sm, position: 'relative' },
  unread:      { backgroundColor: '#eff6ff' },
  dot:         { position: 'absolute', top: 18, left: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
  iconWrap:    { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  icon:        { fontSize: 18 },
  content:     { flex: 1, gap: 2 },
  title:       { fontSize: FontSize.base, color: Colors.text, fontWeight: FontWeight.medium },
  titleUnread: { fontWeight: FontWeight.bold },
  message:     { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  time:        { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
