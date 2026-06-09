// app/(tabs)/attendance.tsx — Check in/out with GPS + offline support + history

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { attendanceApi } from '@/lib/api/attendance';
import { enqueueAction, getQueueLength } from '@/lib/offlineQueue';
import { useLocation } from '@/lib/hooks/useLocation';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Badge, statusVariant } from '@/components/shared/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

export default function AttendanceScreen() {
  const qc = useQueryClient();
  const { getLocation, isLocating, permissionError } = useLocation();
  const [isOnline, setIsOnline]           = useState(true);
  const [queuedCount, setQueuedCount]     = useState(0);

  // Track network status + queued count
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    NetInfo.fetch().then(s => setIsOnline(!!s.isConnected));
    getQueueLength().then(setQueuedCount);
    return unsub;
  }, []);

  const { data: today, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance-today'],
    queryFn:  attendanceApi.getToday,
    staleTime: 20_000,
  });

  const { data: history, isLoading: loadingHistory, refetch } = useQuery({
    queryKey: ['attendance-history'],
    queryFn:  () => attendanceApi.getHistory(1, 15),
    staleTime: 60_000,
  });

  const checkIn  = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
  const checkOut = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const handleAction = async (type: 'in' | 'out') => {
    const coords = await getLocation();
    if (!coords) {
      Alert.alert('Location required', permissionError ?? 'Could not get GPS location.');
      return;
    }

    const timestamp = new Date().toISOString();
    const payload   = { latitude: coords.latitude, longitude: coords.longitude };

    // ── Offline: queue and return ──────────────────────────────────────
    if (!isOnline) {
      await enqueueAction({ type: type === 'in' ? 'checkin' : 'checkout', payload, timestamp });
      const newCount = await getQueueLength();
      setQueuedCount(newCount);
      Alert.alert(
        '📴 Saved Offline',
        `Your ${type === 'in' ? 'check-in' : 'check-out'} has been saved locally and will sync automatically when you're back online.`
      );
      return;
    }

    // ── Online: call API directly ──────────────────────────────────────
    const fn = type === 'in' ? checkIn : checkOut;
    fn.mutate(payload, {
      onSuccess: (res) => {
        if (!res.success) Alert.alert('Error', res.message || 'Action failed.');
        else {
          Alert.alert('✅', type === 'in' ? 'Checked in successfully!' : 'Checked out successfully!');
          qc.invalidateQueries({ queryKey: ['attendance-today'] });
          qc.invalidateQueries({ queryKey: ['attendance-history'] });
        }
      },
      onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.'),
    });
  };

  // today?.checkInTime set + no checkout → currently checked in
  const checkedIn  = !!today?.checkInTime && !today?.checkOutTime;
  // today?.checkInTime set + checkout set → completed a session today
  const checkedOut = !!today?.checkInTime && !!today?.checkOutTime;
  const pending    = checkIn.isPending || checkOut.isPending || isLocating;
  const records    = history?.items ?? (Array.isArray(history) ? history : []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            qc.invalidateQueries({ queryKey: ['attendance-today'] });
            refetch();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Offline / queued actions banner */}
      {(!isOnline || queuedCount > 0) && (
        <View style={[styles.banner, !isOnline ? styles.bannerOffline : styles.bannerPending]}>
          <Text style={styles.bannerText}>
            {!isOnline
              ? '📴 You are offline — actions will sync when connected'
              : `🔄 ${queuedCount} action${queuedCount > 1 ? 's' : ''} pending sync`}
          </Text>
        </View>
      )}

      {/* Today's card */}
      <Card style={[styles.todayCard, checkedIn && styles.todayCardIn]}>
        <Text style={styles.todayLabel}>TODAY</Text>

        {loadingToday ? <LoadingSpinner size="small" /> : (
          <>
            <View style={[
              styles.statusCircle,
              { backgroundColor: checkedIn ? '#dcfce7' : checkedOut ? '#f1f5f9' : '#fef9c3' }
            ]}>
              <Text style={styles.statusEmoji}>
                {checkedIn ? '✅' : checkedOut ? '🏁' : '⏳'}
              </Text>
            </View>

            <Text style={styles.statusText}>
              {checkedIn
                ? 'You are checked in'
                : checkedOut
                ? 'Session complete for today'
                : 'Not checked in'}
            </Text>

            {today?.checkInTime && (
              <View style={styles.timesRow}>
                <TimeChip label="Check In"  time={today.checkInTime} />
                {today.checkOutTime && <TimeChip label="Check Out" time={today.checkOutTime} />}
                {today.hoursWorked != null && (
                  <TimeChip label="Hours" time={`${today.hoursWorked?.toFixed(1)}h`} raw />
                )}
              </View>
            )}

            {/* Check In / Check Out button */}
            {!checkedOut && (
              <Button
                label={checkedIn ? '📤 Check Out' : '📍 Check In'}
                onPress={() => handleAction(checkedIn ? 'out' : 'in')}
                loading={pending}
                variant={checkedIn ? 'danger' : 'primary'}
                fullWidth
                style={styles.actionBtn}
              />
            )}

            {/* After checkout — allow another session the same day */}
            {checkedOut && (
              <Button
                label="📍 Check In Again"
                onPress={() => handleAction('in')}
                loading={pending}
                variant="outline"
                fullWidth
                style={styles.actionBtn}
              />
            )}

            {permissionError && (
              <Text style={styles.errorText}>{permissionError}</Text>
            )}
          </>
        )}
      </Card>

      {/* History */}
      <Text style={styles.historyTitle}>Recent History</Text>

      {loadingHistory ? <LoadingSpinner /> : records.length === 0 ? (
        <EmptyState
          title="No records yet"
          subtitle="Your attendance history will appear here."
          icon="📅"
        />
      ) : (
        records.map((rec: any) => (
          <Card key={rec.id} style={styles.histRow}>
            <View style={styles.histLeft}>
              <Text style={styles.histDate}>{formatDate(rec.checkInTime)}</Text>
              <View style={styles.histTimes}>
                <Text style={styles.histTime}>In: {formatTime(rec.checkInTime)}</Text>
                {rec.checkOutTime && (
                  <Text style={styles.histTime}>Out: {formatTime(rec.checkOutTime)}</Text>
                )}
              </View>
            </View>
            <View style={styles.histRight}>
              {rec.hoursWorked != null && (
                <Text style={styles.histHours}>{rec.hoursWorked?.toFixed(1)}h</Text>
              )}
              <Badge label={rec.status ?? 'Present'} variant={statusVariant(rec.status ?? 'Present')} />
              {rec.isOfflineSync && (
                <Text style={styles.offlineTag}>📴 synced</Text>
              )}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function TimeChip({ label, time, raw }: { label: string; time: string; raw?: boolean }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipTime}>{raw ? time : formatTime(time)}</Text>
    </View>
  );
}

// Ensure ISO string has a timezone marker — backend legacy switch was removed so
// strings will always carry "Z", but this guard future-proofs offline-synced records.
function toUtcIso(iso: string): string {
  return iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
}

function formatTime(iso: string) {
  return new Date(toUtcIso(iso)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(toUtcIso(iso)).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

const styles = StyleSheet.create({
  scroll:         { flex: 1, backgroundColor: Colors.background },
  content:        { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 32 },

  banner:         { borderRadius: Radius.md, padding: 12, marginBottom: 4 },
  bannerOffline:  { backgroundColor: '#fee2e2' },
  bannerPending:  { backgroundColor: '#fef9c3' },
  bannerText:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, textAlign: 'center' },

  todayCard:      { alignItems: 'center', gap: Spacing.md },
  todayCardIn:    { borderColor: '#bbf7d0', borderWidth: 2 },
  todayLabel:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },

  statusCircle:   { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statusEmoji:    { fontSize: 36 },
  statusText:     { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },

  timesRow:       { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', flexWrap: 'wrap' },
  chip:           { backgroundColor: Colors.background, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  chipLabel:      { fontSize: FontSize.xs, color: Colors.textMuted },
  chipTime:       { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  actionBtn:      { marginTop: 4 },
  errorText:      { fontSize: FontSize.xs, color: Colors.danger, textAlign: 'center' },

  historyTitle:   { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: 8 },
  histRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  histLeft:       { gap: 4 },
  histDate:       { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  histTimes:      { flexDirection: 'row', gap: 12 },
  histTime:       { fontSize: FontSize.xs, color: Colors.textSecondary },
  histRight:      { alignItems: 'flex-end', gap: 4 },
  histHours:      { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  offlineTag:     { fontSize: 10, color: Colors.textMuted },
});
