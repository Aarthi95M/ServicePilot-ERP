// app/profile.tsx — View profile + change password

import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, Modal
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth';
import { unregisterPushToken } from '@/lib/utils/notifications';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';
import apiClient from '@/lib/api/client';

// ── Change-password modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', payload).then(r => r.data),
    onSuccess: (res) => {
      if (!res.success) { Alert.alert('Error', res.message || 'Failed to change password.'); return; }
      Alert.alert('✅ Success', 'Password changed successfully.');
      setCurrent(''); setNext(''); setConfirm('');
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const submit = () => {
    if (!current) { Alert.alert('Validation', 'Current password is required.'); return; }
    if (next.length < 8) { Alert.alert('Validation', 'New password must be at least 8 characters.'); return; }
    if (next !== confirm) { Alert.alert('Validation', 'Passwords do not match.'); return; }
    mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {[
            { label: 'Current Password', value: current, onChange: setCurrent },
            { label: 'New Password',     value: next,    onChange: setNext,    hint: 'At least 8 characters' },
            { label: 'Confirm Password', value: confirm, onChange: setConfirm },
          ].map(f => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={f.value}
                onChangeText={f.onChange}
                placeholder={f.hint ?? ''}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.showPassRow} onPress={() => setShowPass(p => !p)}>
            <Text style={styles.showPassText}>{showPass ? '🙈 Hide passwords' : '👁️ Show passwords'}</Text>
          </TouchableOpacity>

          <Button label="Change Password" onPress={submit} loading={isPending} fullWidth style={{ marginTop: 8 }} />
          <Button label="Cancel" onPress={onClose} variant="ghost" fullWidth />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [changePwModal, setChangePwModal] = useState(false);

  // Fetch own employee record
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-me'],
    queryFn:  () => apiClient.get('/employees/me').then(r => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await unregisterPushToken();   // deregisters push token from backend + SecureStore
          await logout();
          qc.clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const displayName =
    profile?.fullName ??
    profile?.name ??
    (profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : null) ??
    user?.email?.split('@')[0] ??
    'User';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  return (
    <>
      <Stack.Screen options={{ title: 'Profile', headerBackTitle: 'Home' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.role}>{user?.role ?? 'Employee'}</Text>
        </View>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Account info */}
            <Card>
              <Text style={styles.sectionLabel}>Account</Text>
              <InfoRow icon="📧" label="Email"       value={user?.email} />
              <InfoRow icon="🏢" label="Company ID"  value={user?.companyId ? String(user.companyId) : null} />
              <InfoRow icon="🎫" label="Role"        value={user?.role} />
            </Card>

            {/* Employee info */}
            {profile && (
              <Card>
                <Text style={styles.sectionLabel}>Employee Details</Text>
                <InfoRow icon="🪪" label="Employee ID"  value={profile.employeeId ?? profile.id ? String(profile.id) : null} />
                <InfoRow icon="📞" label="Phone"        value={profile.phone ?? profile.phoneNumber} />
                <InfoRow icon="🏗️" label="Department"   value={profile.departmentName ?? profile.department} />
                <InfoRow icon="💼" label="Position"     value={profile.position ?? profile.jobTitle} />
                <InfoRow icon="📅" label="Joined"       value={profile.joiningDate ? formatDate(profile.joiningDate) : null} />
              </Card>
            )}

            {/* Actions */}
            <Card>
              <Text style={styles.sectionLabel}>Security</Text>
              <TouchableOpacity style={styles.actionItem} onPress={() => setChangePwModal(true)}>
                <Text style={styles.actionIcon}>🔑</Text>
                <Text style={styles.actionLabel}>Change Password</Text>
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>
            </Card>

            {/* Logout */}
            <Button
              label="Sign Out"
              onPress={handleLogout}
              variant="danger"
              fullWidth
              style={styles.logoutBtn}
            />

            <Text style={styles.version}>ServicePilot Mobile v1.0</Text>
          </>
        )}
      </ScrollView>

      <ChangePasswordModal visible={changePwModal} onClose={() => setChangePwModal(false)} />
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: Colors.background },
  content:         { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 48, alignItems: 'stretch' },

  avatarSection:   { alignItems: 'center', paddingVertical: Spacing.md, gap: 6 },
  avatar:          { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { fontSize: 28, fontWeight: FontWeight.bold, color: '#fff' },
  displayName:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textTransform: 'capitalize' },
  role:            { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize' },

  sectionLabel:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  infoRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:        { fontSize: 18, width: 24, textAlign: 'center' },
  infoText:        { flex: 1 },
  infoLabel:       { fontSize: FontSize.xs, color: Colors.textMuted },
  infoValue:       { fontSize: FontSize.base, color: Colors.text, fontWeight: FontWeight.medium, marginTop: 1 },

  actionItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  actionIcon:      { fontSize: 18, width: 24, textAlign: 'center' },
  actionLabel:     { flex: 1, fontSize: FontSize.base, color: Colors.text },
  actionChevron:   { fontSize: 20, color: Colors.textMuted },

  logoutBtn:       { marginTop: 8 },
  version:         { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },

  // Modal
  modalWrap:       { flex: 1, backgroundColor: Colors.background },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  modalClose:      { fontSize: 18, color: Colors.textMuted, padding: 4 },
  modalBody:       { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },
  fieldGroup:      { gap: 6 },
  fieldLabel:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  input:           { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  showPassRow:     { alignItems: 'flex-start', marginTop: -4 },
  showPassText:    { fontSize: FontSize.sm, color: Colors.primary },
});
