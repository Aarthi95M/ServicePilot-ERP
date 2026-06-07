import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/shared/Card';
import { Badge, statusVariant } from '@/components/shared/Badge';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface JobCardProps {
  job: {
    id:             string;
    jobNumber:      string;
    customerName:   string;
    address?:       string;
    scheduledAt?:   string;
    jobStatusName?: string;   // API field name (camelCase from JobResponseDto)
    status?:        string;   // legacy fallback
    priority:       number;
    priorityLabel?: string;
  };
}

const PRIORITY_LABEL = ['', 'Low', 'Medium', 'High', 'Critical'];
const PRIORITY_COLOR = ['', Colors.textMuted, Colors.textSecondary, Colors.warning, Colors.danger];

export function JobCard({ job }: JobCardProps) {
  // Use jobStatusName (actual API field); fall back to status for backward compat
  const statusLabel = job.jobStatusName ?? job.status ?? '';

  const dateStr = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/jobs/${job.id}`)}>
      <Card style={styles.card}>
        {/* Header row */}
        <View style={styles.header}>
          <Text style={styles.jobNumber}>{job.jobNumber}</Text>
          <Badge label={statusLabel} variant={statusVariant(statusLabel)} />
        </View>

        {/* Customer */}
        <Text style={styles.customer} numberOfLines={1}>{job.customerName}</Text>

        {/* Address */}
        {!!job.address && (
          <Text style={styles.address} numberOfLines={1}>📍 {job.address}</Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.dateText}>🕐 {dateStr}</Text>
          {job.priority > 1 && (
            <Text style={[styles.priority, { color: PRIORITY_COLOR[job.priority] ?? Colors.textMuted }]}>
              ● {job.priorityLabel ?? PRIORITY_LABEL[job.priority] ?? ''}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:       { marginBottom: Spacing.sm },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  jobNumber:  { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent, fontFamily: 'monospace' },
  customer:   { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: 4 },
  address:    { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText:   { fontSize: FontSize.xs, color: Colors.textMuted },
  priority:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
