// app/jobs/[id].tsx — Job detail: info, status updates, notes, photo upload

import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Image, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { jobsApi } from '@/lib/api/jobs';
import { Card } from '@/components/shared/Card';
import { Badge, statusVariant } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

// Next-status transitions a technician can trigger
const STATUS_TRANSITIONS: Record<string, { label: string; next: string; variant: 'primary' | 'danger' | 'secondary' }[]> = {
  Pending:    [{ label: '▶ Start Job',    next: 'InProgress', variant: 'primary' }],
  InProgress: [
    { label: '✅ Complete',  next: 'Completed',  variant: 'primary' },
    { label: '⏸ Put On Hold', next: 'OnHold',   variant: 'secondary' },
  ],
  OnHold:     [{ label: '▶ Resume',       next: 'InProgress', variant: 'primary' }],
  Completed:  [],
  Cancelled:  [],
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [notes,         setNotes]         = useState('');
  const [savingNotes,   setSavingNotes]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn:  () => jobsApi.getById(id!),
    staleTime: 30_000,
    enabled:  !!id,
  });

  const updateStatus = useMutation({
    mutationFn: ({ status }: { status: string }) => jobsApi.updateStatus(id!, status, notes.trim() || undefined),
    onSuccess: (res) => {
      if (!res.success) { Alert.alert('Error', res.message || 'Update failed.'); return; }
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
      Alert.alert('✅ Updated', `Job status changed.`);
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const handleStatusChange = (next: string) => {
    Alert.alert(
      'Confirm',
      `Change status to "${next}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateStatus.mutate({ status: next }) },
      ]
    );
  };

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'Could not read photo data.'); return; }

    setUploadingPhoto(true);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const res = await jobsApi.uploadPhoto(id!, asset.base64, `photo.${ext}`);
      if (!res.success) { Alert.alert('Upload failed', res.message || 'Try again.'); return; }
      qc.invalidateQueries({ queryKey: ['job', id] });
      Alert.alert('✅ Photo uploaded');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCameraCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'Could not read photo data.'); return; }

    setUploadingPhoto(true);
    try {
      const res = await jobsApi.uploadPhoto(id!, asset.base64, 'photo.jpg');
      if (!res.success) { Alert.alert('Upload failed', res.message || 'Try again.'); return; }
      qc.invalidateQueries({ queryKey: ['job', id] });
      Alert.alert('✅ Photo captured & uploaded');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Job Detail' }} />
        <LoadingSpinner />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Job Detail' }} />
        <Text style={styles.notFound}>Job not found.</Text>
        <Button label="Go Back" onPress={() => router.back()} variant="ghost" />
      </View>
    );
  }

  const transitions = STATUS_TRANSITIONS[job.status] ?? [];
  const photos: string[] = job.photoUrls ?? job.photos ?? [];

  return (
    <>
      <Stack.Screen options={{ title: job.jobNumber ?? 'Job Detail', headerBackTitle: 'Jobs' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.jobNumber}>{job.jobNumber}</Text>
            <Badge label={job.status} variant={statusVariant(job.status)} />
          </View>
          <Text style={styles.customerName}>{job.customerName}</Text>
          {job.address && <Text style={styles.address}>📍 {job.address}</Text>}
          {job.scheduledDate && (
            <Text style={styles.meta}>🗓 Scheduled: {formatDate(job.scheduledDate)}</Text>
          )}
          {job.assignedDate && (
            <Text style={styles.meta}>📋 Assigned: {formatDate(job.assignedDate)}</Text>
          )}
        </Card>

        {/* Description */}
        {job.description && (
          <Card>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{job.description}</Text>
          </Card>
        )}

        {/* Status actions */}
        {transitions.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Update Status</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Add a note (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Parts replaced, customer informed…"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.actionRow}>
              {transitions.map(t => (
                <Button
                  key={t.next}
                  label={t.label}
                  onPress={() => handleStatusChange(t.next)}
                  loading={updateStatus.isPending}
                  variant={t.variant}
                  style={styles.actionBtn}
                />
              ))}
            </View>
          </Card>
        )}

        {/* Photos */}
        <Card>
          <Text style={styles.sectionLabel}>Photos</Text>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((url: string, i: number) => (
                <Image key={i} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
              ))}
            </ScrollView>
          )}

          {uploadingPhoto ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.uploadingText}>Uploading photo…</Text>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCameraCapture}>
                <Text style={styles.photoBtnText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePhotoUpload}>
                <Text style={styles.photoBtnText}>🖼 Upload from Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Job history / notes */}
        {(job.notes || job.completionNotes) && (
          <Card>
            <Text style={styles.sectionLabel}>Notes</Text>
            {job.notes         && <Text style={styles.noteText}>{job.notes}</Text>}
            {job.completionNotes && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Completion Notes</Text>
                <Text style={styles.noteText}>{job.completionNotes}</Text>
              </>
            )}
          </Card>
        )}

        {/* Contact info */}
        {(job.contactName || job.contactPhone) && (
          <Card>
            <Text style={styles.sectionLabel}>Contact</Text>
            {job.contactName  && <Text style={styles.meta}>👤 {job.contactName}</Text>}
            {job.contactPhone && <Text style={styles.meta}>📞 {job.contactPhone}</Text>}
          </Card>
        )}

      </ScrollView>
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  scroll:         { flex: 1, backgroundColor: Colors.background },
  content:        { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound:       { fontSize: FontSize.md, color: Colors.textSecondary },

  headerCard:     { gap: Spacing.xs },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobNumber:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary, fontFamily: 'monospace' },
  customerName:   { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  address:        { fontSize: FontSize.sm, color: Colors.textSecondary },
  meta:           { fontSize: FontSize.sm, color: Colors.textSecondary },

  sectionLabel:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  description:    { fontSize: FontSize.base, color: Colors.text, lineHeight: 22 },

  fieldGroup:     { gap: 6, marginBottom: 12 },
  fieldLabel:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  input:          { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  textarea:       { minHeight: 76, paddingTop: 12 },

  actionRow:      { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionBtn:      { flex: 1, minWidth: '45%' },

  photoRow:       { gap: 8, paddingBottom: 8 },
  photo:          { width: 120, height: 90, borderRadius: Radius.sm, backgroundColor: Colors.border },
  uploadingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  uploadingText:  { fontSize: FontSize.sm, color: Colors.textSecondary },
  photoActions:   { flexDirection: 'row', gap: Spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  photoBtn:       { flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  photoBtnText:   { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },

  noteText:       { fontSize: FontSize.base, color: Colors.text, lineHeight: 22 },
});
