import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card } from '@/components/shared/Card';
import { Badge, statusVariant } from '@/components/shared/Badge';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface RequestCardProps {
  type:     'leave' | 'overtime';
  request:  any;   // renamed from item — matches usage in requests.tsx
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}

export function RequestCard({ type, request: item, onCancel, cancelling }: RequestCardProps) {
  if (!item) return null;
  const canCancel = item.status === 'Pending' && !!onCancel;

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Request', style: 'destructive', onPress: () => onCancel!(item.id) },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          {type === 'leave' ? (
            <Text style={styles.title}>{item.leaveTypeName ?? 'Leave'}</Text>
          ) : (
            <Text style={styles.title}>{item.hoursRequested}h Overtime</Text>
          )}
          <Text style={styles.date}>
            {type === 'leave'
              ? `${item.startDate} → ${item.endDate}`
              : item.requestDate}
          </Text>
        </View>
        <Badge label={item.status} variant={statusVariant(item.status)} />
      </View>

      {item.reason && (
        <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.meta}>
          Submitted {new Date(item.createdAt).toLocaleDateString('en-GB')}
        </Text>
        {canCancel && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} disabled={!!cancelling}>
            {cancelling ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <Text style={styles.cancelText}>Cancel</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card:       { marginBottom: Spacing.sm },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  title:      { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  date:       { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  reason:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta:       { fontSize: FontSize.xs, color: Colors.textMuted },
  cancelBtn:  { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#fee2e2' },
  cancelText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.danger },
});
