// app/(tabs)/home.tsx — Dashboard / Today summary

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import { jobsApi } from '@/lib/api/jobs';
import { notificationsApi } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/store/auth';
import { Card } from '@/components/shared/Card';
import { Badge, statusVariant } from '@/components/shared/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

export default function HomeScreen() {
  const qc   = useQueryClient();
  const user = useAuthStore(s => s.user);

  const { data: today,         isLoading: l1 } = useQuery({ queryKey: ['attendance-today'], queryFn: attendanceApi.getToday, staleTime: 30_000 });
  const { data: myJobsData,    isLoading: l2 } = useQuery({ queryKey: ['my-jobs'],          queryFn: () => jobsApi.getMyJobs({ page: 1, pageSize: 5 }), staleTime: 30_000 });
  const { data: unread = 0 }                   = useQuery({ queryKey: ['unread-count'],      queryFn: notificationsApi.getUnreadCount, refetchInterval: 60_000 });

  const isLoading = l1 || l2;
  const myJobs    = myJobsData?.items ?? [];

  const refresh = async () => {
    await qc.invalidateQueries();
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const checkInStatus = today?.checkInTime
    ? today.checkOutTime ? 'CheckedOut' : 'CheckedIn'
    : 'NotCheckedIn';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={Colors.primary} />}
    >
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.name}>{user?.email?.split('@')[0] ?? 'User'}</Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.alertPill} onPress={() => router.push('/(tabs)/notifications')}>
            <Text style={styles.alertText}>🔔 {unread} alert{unread !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? <LoadingSpinner /> : (
        <>
          {/* Attendance status card */}
          <Card style={styles.attendanceCard}>
            <Text style={styles.sectionLabel}>Today's Attendance</Text>
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceInfo}>
                <Badge label={checkInStatus.replace(/([A-Z])/g, ' $1').trim()} variant={statusVariant(checkInStatus)} />
                {today?.checkInTime && (
                  <Text style={styles.timeText}>In: {formatTime(today.checkInTime)}</Text>
                )}
                {today?.checkOutTime && (
                  <Text style={styles.timeText}>Out: {formatTime(today.checkOutTime)}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.checkBtn} onPress={() => router.push('/(tabs)/attendance')}>
                <Text style={styles.checkBtnText}>
                  {checkInStatus === 'NotCheckedIn' ? '→ Check In' : checkInStatus === 'CheckedIn' ? '→ Check Out' : '→ History'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Today's Jobs */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {myJobs.length === 0 ? (
            <Card><Text style={styles.emptyText}>No jobs assigned. Enjoy the day! ☀️</Text></Card>
          ) : (
            myJobs.slice(0, 3).map((job: any) => (
              <TouchableOpacity key={job.id} activeOpacity={0.85} onPress={() => router.push(`/jobs/${job.id}`)}>
                <Card style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobNumber}>{job.jobNumber}</Text>
                    <Badge label={job.status} variant={statusVariant(job.status)} />
                  </View>
                  <Text style={styles.customer}>{job.customerName}</Text>
                  <Text style={styles.address} numberOfLines={1}>📍 {job.address}</Text>
                </Card>
              </TouchableOpacity>
            ))
          )}

          {/* Quick actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {[
              { label: 'Request Leave',    icon: '🏖️', route: '/(tabs)/requests' },
              { label: 'Log Overtime',     icon: '⏱️', route: '/(tabs)/requests' },
              { label: 'View Profile',     icon: '👤', route: '/profile' },
              { label: 'Notifications',    icon: '🔔', route: '/(tabs)/notifications' },
            ].map(q => (
              <TouchableOpacity key={q.label} style={styles.quickCard} onPress={() => router.push(q.route as any)}>
                <Text style={styles.quickIcon}>{q.icon}</Text>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: Colors.background },
  content:         { padding: Spacing.md, gap: Spacing.md, paddingBottom: 32 },

  greetingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting:        { fontSize: FontSize.sm, color: Colors.textSecondary },
  name:            { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textTransform: 'capitalize' },
  alertPill:       { backgroundColor: '#fef3c7', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  alertText:       { fontSize: FontSize.sm, color: '#92400e', fontWeight: FontWeight.semibold },

  attendanceCard:  {},
  sectionLabel:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  attendanceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attendanceInfo:  { gap: 4 },
  timeText:        { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  checkBtn:        { backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md },
  checkBtnText:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#fff' },

  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:    { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  seeAll:          { fontSize: FontSize.sm, color: Colors.primary },

  emptyText:       { textAlign: 'center', color: Colors.textSecondary, fontSize: FontSize.sm, padding: 8 },

  jobCard:         { marginBottom: Spacing.xs },
  jobHeader:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  jobNumber:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary, fontFamily: 'monospace' },
  customer:        { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.text },
  address:         { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  quickGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickCard:       { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 6, flex: 1, minWidth: '45%', borderWidth: 1, borderColor: Colors.border },
  quickIcon:       { fontSize: 26 },
  quickLabel:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.text, textAlign: 'center' },
});
