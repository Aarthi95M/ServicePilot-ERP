// app/(tabs)/requests.tsx — Leave & Overtime requests with submission forms

import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, Platform
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api/leave';
import { overtimeApi } from '@/lib/api/overtime';
import { RequestCard } from '@/components/screens/RequestCard';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

type Tab = 'leave' | 'overtime';

// ── Date picker (simple inline) ──────────────────────────────────────────────
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textMuted}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
        maxLength={10}
      />
    </View>
  );
}

// ── Leave form modal ─────────────────────────────────────────────────────────
function LeaveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [startDate, setStart] = useState('');
  const [endDate,   setEnd]   = useState('');
  const [reason,    setReason] = useState('');
  const [typeId,    setTypeId] = useState<number | null>(null);

  const { data: types = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn:  leaveApi.getLeaveTypes,
    staleTime: Infinity,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: (res) => {
      if (!res.success) { Alert.alert('Error', res.message || 'Request failed.'); return; }
      Alert.alert('✅ Submitted', 'Your leave request has been submitted.');
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      reset(); onClose();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const reset = () => { setStart(''); setEnd(''); setReason(''); setTypeId(null); };

  const submit = () => {
    if (!typeId)     { Alert.alert('Validation', 'Please select a leave type.'); return; }
    if (!startDate)  { Alert.alert('Validation', 'Please enter a start date (YYYY-MM-DD).'); return; }
    if (!endDate)    { Alert.alert('Validation', 'Please enter an end date (YYYY-MM-DD).'); return; }
    if (!reason.trim()) { Alert.alert('Validation', 'Please provide a reason.'); return; }
    mutate({ leaveTypeId: typeId, startDate, endDate, reason: reason.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Leave Request</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Leave type */}
          <Text style={styles.fieldLabel}>Leave Type</Text>
          <View style={styles.typeRow}>
            {(types as any[]).map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typePill, typeId === t.id && styles.typePillActive]}
                onPress={() => setTypeId(t.id)}
              >
                <Text style={[styles.typePillText, typeId === t.id && styles.typePillTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
            {types.length === 0 && (
              <TouchableOpacity style={[styles.typePill, typeId === 1 && styles.typePillActive]} onPress={() => setTypeId(1)}>
                <Text style={[styles.typePillText, typeId === 1 && styles.typePillTextActive]}>Annual</Text>
              </TouchableOpacity>
            )}
          </View>

          <DateField label="Start Date" value={startDate} onChange={setStart} />
          <DateField label="End Date"   value={endDate}   onChange={setEnd} />

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

  const submit = () => {
    if (!date)   { Alert.alert('Validation', 'Please enter the date (YYYY-MM-DD).'); return; }
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 24) { Alert.alert('Validation', 'Please enter valid hours (0–24).'); return; }
    if (!reason.trim()) { Alert.alert('Validation', 'Please provide a reason.'); return; }
    mutate({ requestDate: date, hoursRequested: h, reason: reason.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log Overtime</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <DateField label="Date" value={date} onChange={setDate} />

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
              onCancel={() => {
                qc.invalidateQueries({ queryKey: [tab === 'leave' ? 'leave-requests' : 'overtime-requests'] });
              }}
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
  input:            { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  textarea:         { minHeight: 80, paddingTop: 12 },

  typeRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typePill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  typePillActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typePillText:     { fontSize: FontSize.sm, color: Colors.textSecondary },
  typePillTextActive: { color: '#fff', fontWeight: FontWeight.semibold },
});
