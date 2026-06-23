// app/(tabs)/requests.tsx — Leave & Overtime requests with submission forms + offline support

import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api/leave';
import { overtimeApi } from '@/lib/api/overtime';
import { enqueueAction } from '@/lib/offlineQueue';
import { RequestCard } from '@/components/screens/RequestCard';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DatePicker } from '@/components/shared/DatePicker';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

type Tab = 'leave' | 'overtime';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Leave form modal ─────────────────────────────────────────────────────────
function LeaveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [startDate, setStart] = useState('');
  const [endDate,   setEnd]   = useState('');
  const [reason,    setReason] = useState('');
  // Leave type IDs are GUIDs (LeaveTypeDropdownDto.id : Guid → string in JSON),
  // not numbers — this was mistyped as `number | null`, which silently mismatched
  // CreateLeavePayload.leaveTypeId: string at the API boundary.
  const [typeId,    setTypeId] = useState<string | null>(null);

  const { data: types = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn:  leaveApi.getLeaveTypes,
    staleTime: Infinity,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['my-leave-balance'],
    queryFn:  leaveApi.getMyBalance,
    enabled:  visible,
    staleTime: 30_000,
  });

  const balanceMap = Object.fromEntries(
    (balances as any[]).map((b: any) => [b.leaveTypeId, b])
  );

  const { mutate, isPending } = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: (res) => {
      if (!res.success) { Alert.alert('Error', res.message || 'Request failed.'); return; }
      Alert.alert('✅ Submitted', 'Your leave request has been submitted.');
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['my-leave-balance'] });
      reset(); onClose();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const reset = () => { setStart(''); setEnd(''); setReason(''); setTypeId(null); };

  const submit = async () => {
    if (!typeId)        { Alert.alert('Validation', 'Please select a leave type.'); return; }
    if (!startDate)     { Alert.alert('Validation', 'Please enter a start date (YYYY-MM-DD).'); return; }
    if (!endDate)       { Alert.alert('Validation', 'Please enter an end date (YYYY-MM-DD).'); return; }
    if (!reason.trim()) { Alert.alert('Validation', 'Please provide a reason.'); return; }

    const payload = { leaveTypeId: typeId, startDate, endDate, reason: reason.trim() };
    const net = await NetInfo.fetch();

    if (!net.isConnected) {
      await enqueueAction({ type: 'leave', payload, timestamp: new Date().toISOString() });
      Alert.alert('📴 Saved Offline', 'Your leave request has been saved and will submit automatically when connected.');
      reset(); onClose();
      return;
    }

    mutate(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Leave Request</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Leave type — API returns { id, label, maxDaysPerYear, isPaid } (LeaveTypeDropdownDto).
              Rendering t.name (which doesn't exist on the DTO) printed an empty
              string, collapsing each pill into a bare circle with no visible label. */}
          <Text style={styles.fieldLabel}>Leave Type</Text>
          <View style={styles.typeRow}>
            {(types as any[]).map((t) => {
              const bal = balanceMap[t.id];
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typePill, typeId === t.id && styles.typePillActive]}
                  onPress={() => setTypeId(t.id)}
                >
                  <Text style={[styles.typePillText, typeId === t.id && styles.typePillTextActive]}>
                    {t.label ?? t.name ?? 'Leave'}
                  </Text>
                  {bal != null && (
                    <Text style={[styles.balanceBadge, typeId === t.id && styles.balanceBadgeActive]}>
                      {bal.daysRemaining} left
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {types.length === 0 && (
              <Text style={styles.fieldHint}>No leave types configured for your company yet.</Text>
            )}
          </View>

          {typeId && balanceMap[typeId] && (
            <View style={styles.balanceBar}>
              <Text style={styles.balanceBarText}>
                📊  {balanceMap[typeId].daysRemaining} of {balanceMap[typeId].maxDaysPerYear} days remaining
                {balanceMap[typeId].daysPending > 0
                  ? `  ·  ${balanceMap[typeId].daysPending} pending`
                  : ''}
              </Text>
            </View>
          )}

          {/* Leave requests are forward-looking self-service requests — the
              calendar should not let an employee pick a date that's already
              gone. (Backdated leave on an employee's behalf is a separate,
              Admin/Supervisor/HR-only flow available from the web dashboard.)
              minDate=today blocks past dates; maxDate=endDate keeps the range valid. */}
          <DatePicker label="Start Date" value={startDate} onChange={setStart} minDate={todayISO()} maxDate={endDate || undefined} placeholder="Select start date" />
          <DatePicker label="End Date"   value={endDate}   onChange={setEnd}   minDate={startDate || todayISO()} placeholder="Select end date" />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Briefly describe your reason…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Button label="Submit Request" onPress={submit} loading={isPending} fullWidth style={{ marginTop: 8 }} />
          <Button label="Cancel" onPress={onClose} variant="ghost" fullWidth />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Overtime form modal ──────────────────────────────────────────────────────
function OvertimeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [date,   setDate]   = useState('');
  const [hours,  setHours]  = useState('');
  const [reason, setReason] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: overtimeApi.create,
    onSuccess: (res) => {
      if (!res.success) { Alert.alert('Error', res.message || 'Request failed.'); return; }
      Alert.alert('✅ Submitted', 'Your overtime request has been submitted.');
      qc.invalidateQueries({ queryKey: ['overtime-requests'] });
      setDate(''); setHours(''); setReason(''); onClose();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const submit = async () => {
    if (!date)          { Alert.alert('Validation', 'Please enter the date (YYYY-MM-DD).'); return; }
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 24) { Alert.alert('Validation', 'Please enter valid hours (0–24).'); return; }
    if (!reason.trim()) { Alert.alert('Validation', 'Please provide a reason.'); return; }

    const payload = { requestDate: date, hoursRequested: h, reason: reason.trim() };
    const net = await NetInfo.fetch();

    if (!net.isConnected) {
      await enqueueAction({ type: 'overtime', payload, timestamp: new Date().toISOString() });
      Alert.alert('📴 Saved Offline', 'Your overtime request has been saved and will submit automatically when connected.');
      setDate(''); setHours(''); setReason(''); onClose();
      return;
    }

    mutate(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log Overtime</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <DatePicker label="Date" value={date} onChange={setDate} maxDate={todayISO()} placeholder="Select the date overtime was worked" />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Hours Worked</Text>
            <TextInput
              style={styles.input}
              value={hours}
              onChangeText={setHours}
              placeholder="e.g. 2.5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Reason / Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={reason}
              onChangeText={setReason}
              placeholder="What work required overtime?"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Button label="Submit Overtime" onPress={submit} loading={isPending} fullWidth style={{ marginTop: 8 }} />
          <Button label="Cancel" onPress={onClose} variant="ghost" fullWidth />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function RequestsScreen() {
  const qc = useQueryClient();
  const [tab,         setTab]         = useState<Tab>('leave');
  const [leaveModal,  setLeaveModal]  = useState(false);
  const [otModal,     setOtModal]     = useState(false);

  const { data: leaveData,    isLoading: l1, refetch: refetchLeave } = useQuery({
    queryKey: ['leave-requests'],
    queryFn:  () => leaveApi.getMyRequests(),
    staleTime: 30_000,
  });

  const { data: overtimeData, isLoading: l2, refetch: refetchOT } = useQuery({
    queryKey: ['overtime-requests'],
    queryFn:  () => overtimeApi.getMyRequests(),
    staleTime: 30_000,
  });

  // getMyRequests returns the array directly (ApiResponse<IEnumerable<T>> → r.data.data)
  const leaveItems    = (leaveData    as any[]) ?? [];
  const overtimeItems = (overtimeData as any[]) ?? [];
  const isLoading    = tab === 'leave' ? l1 : l2;
  const items        = tab === 'leave' ? leaveItems : overtimeItems;

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ['leave-requests'] });
    qc.invalidateQueries({ queryKey: ['overtime-requests'] });
  };

  // ── Cancel request ──────────────────────────────────────────────────────
  // Previously this just invalidated the query cache without ever calling the
  // cancel endpoint, so the request stayed "Pending" on the server and the
  // card reappeared after refetch — making "Cancel" look broken/no-op.
  // Now it actually calls leaveApi.cancel / overtimeApi.cancel and only
  // refetches once the server confirms the cancellation.
  const { mutate: cancelRequest, isPending: isCancelling } = useMutation({
    mutationFn: (vars: { id: string; kind: Tab }) =>
      vars.kind === 'leave' ? leaveApi.cancel(vars.id) : overtimeApi.cancel(vars.id),
    onSuccess: (res, vars) => {
      if (!res?.success) {
        Alert.alert('Error', res?.message || 'Could not cancel the request.');
        return;
      }
      qc.invalidateQueries({ queryKey: [vars.kind === 'leave' ? 'leave-requests' : 'overtime-requests'] });
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong while cancelling the request.'),
  });

  return (
    <View style={styles.wrapper}>
      {/* Tab row + add button */}
      <View style={styles.topBar}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'leave' && styles.tabActive]}
            onPress={() => setTab('leave')}
          >
            <Text style={[styles.tabText, tab === 'leave' && styles.tabTextActive]}>🏖️ Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'overtime' && styles.tabActive]}
            onPress={() => setTab('overtime')}
          >
            <Text style={[styles.tabText, tab === 'overtime' && styles.tabTextActive]}>⏱️ Overtime</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => tab === 'leave' ? setLeaveModal(true) : setOtModal(true)}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <EmptyState
            title={`No ${tab === 'leave' ? 'leave' : 'overtime'} requests`}
            subtitle="Tap + New to submit a request."
            icon={tab === 'leave' ? '🏖️' : '⏱️'}
          />
        ) : (
          items.map((item: any) => (
            <RequestCard
              key={item.id}
              request={item}
              type={tab}
              onCancel={(id) => cancelRequest({ id, kind: tab })}
              cancelling={isCancelling}
            />
          ))
        )}
      </ScrollView>

      <LeaveModal   visible={leaveModal} onClose={() => setLeaveModal(false)} />
      <OvertimeModal visible={otModal}   onClose={() => setOtModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:          { flex: 1, backgroundColor: Colors.background },

  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  tabRow:           { flexDirection: 'row', flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tab:              { flex: 1, paddingVertical: 9, alignItems: 'center' },
  tabActive:        { backgroundColor: Colors.primary },
  tabText:          { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabTextActive:    { color: '#fff' },

  addBtn:           { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.md },
  addBtnText:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },

  list:             { flex: 1 },
  listContent:      { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 32 },

  // Modal
  modalWrap:        { flex: 1, backgroundColor: Colors.background },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  modalClose:       { fontSize: 18, color: Colors.textMuted, padding: 4 },
  modalBody:        { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },

  fieldGroup:       { gap: 6 },
  fieldLabel:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  fieldHint:        { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  input:            { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  textarea:         { minHeight: 80, paddingTop: 12 },

  typeRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typePill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typePillActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typePillText:     { fontSize: FontSize.sm, color: Colors.textSecondary },
  typePillTextActive: { color: '#fff', fontWeight: FontWeight.semibold },
  balanceBadge:     { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  balanceBadgeActive: { color: 'rgba(255,255,255,0.8)' },
  balanceBar:       { backgroundColor: '#e8f4fd', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4, borderWidth: 1, borderColor: '#bde0f5' },
  balanceBarText:   { fontSize: FontSize.sm, color: '#1a6ba0', fontWeight: FontWeight.medium },
});
