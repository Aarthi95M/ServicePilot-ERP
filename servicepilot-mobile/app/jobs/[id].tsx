// app/jobs/[id].tsx — Job detail: info, dynamic status update, photo upload
// v2 fixes:
//   - Uses job.jobStatusName (not job.status which was undefined)
//   - Status transitions are dynamic — loaded from /api/lookups/job-statuses
//   - updateStatus now sends jobStatusId (GUID) not a status name
//   - Photo upload sends { photoBase64, photoType, caption } matching UploadJobPhotoDto
//   - Corrected field names: scheduledAt, customerPhone, photos[].photoUrl

import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Video, ResizeMode } from 'expo-av';
import { jobsApi } from '@/lib/api/jobs';
import { lookupsApi } from '@/lib/api/lookups';
import { Card } from '@/components/shared/Card';
import { Badge, statusVariant } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  // Load job detail
  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn:  () => jobsApi.getById(id!),
    staleTime: 30_000,
    enabled:  !!id,
  });

  // Load all available statuses for the company — used to build transition buttons
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['job-statuses-lookup'],
    queryFn:  lookupsApi.getJobStatuses,
    staleTime: 5 * 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ statusId }: { statusId: string }) =>
      jobsApi.updateStatus(id!, statusId, notes.trim() || undefined),
    onSuccess: (res) => {
      if (!res.success) { Alert.alert('Error', res.message || 'Update failed.'); return; }
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
      setNotes('');
      Alert.alert('✅ Updated', 'Job status changed successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Something went wrong.'),
  });

  const handleStatusChange = (statusId: string, statusName: string) => {
    Alert.alert(
      'Update Status',
      `Change status to "${statusName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateStatus.mutate({ statusId }) },
      ],
    );
  };

  const doPhotoUpload = async (base64: string, filename: string) => {
    setUploadingPhoto(true);
    try {
      const res = await jobsApi.uploadPhoto(id!, base64, filename);
      if (!res.success) { Alert.alert('Upload failed', res.message || 'Try again.'); return; }
      qc.invalidateQueries({ queryKey: ['job', id] });
      Alert.alert('✅ Photo uploaded');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message ?? e?.message ?? 'Something went wrong.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save a job photo to the device's camera roll / photo gallery.
  //
  // Photos are stored as base64 data URIs (data:image/jpeg;base64,…) rather
  // than hosted URLs — the original Linking.openURL approach failed because
  // the OS can't open arbitrary data URIs via an intent.
  //
  // Flow: request MediaLibrary permission → write base64 to a temp cache
  // file (expo-file-system) → saveToLibraryAsync (expo-media-library) →
  // delete temp file → done.  Both libraries are now installed (v56).
  const handleSavePhoto = async (dataUri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to save photos.');
        return;
      }

      // Extract base64 payload and detect the image extension from the MIME header
      const mimeMatch = dataUri.match(/^data:image\/(\w+);base64,/);
      const ext = mimeMatch?.[1] ?? 'jpg';
      const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');

      const localUri = `${FileSystem.cacheDirectory}sp_photo_${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(localUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await MediaLibrary.saveToLibraryAsync(localUri);

      // Clean up temp file — fire-and-forget, no need to await
      FileSystem.deleteAsync(localUri, { idempotent: true });

      Alert.alert('✅ Saved', 'Photo saved to your gallery.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Something went wrong.');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await jobsApi.deletePhoto(id!, photoId);
            if (!res.success) { Alert.alert('Error', res.message || 'Delete failed.'); return; }
            qc.invalidateQueries({ queryKey: ['job', id] });
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.');
          }
        },
      },
    ]);
  };

  const handleVideoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow media library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.5,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const ext = asset.uri.split('.').pop() ?? 'mp4';
      const res = await jobsApi.uploadPhoto(id!, base64, `video.${ext}`);
      if (!res.success) { Alert.alert('Upload failed', res.message || 'Try again.'); return; }
      qc.invalidateQueries({ queryKey: ['job', id] });
      Alert.alert('✅ Video uploaded');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message ?? e?.message ?? 'Something went wrong.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    // allowsEditing: false — skip the crop/edit step so the selected photo
    // uploads immediately (setting this to true was showing a crop screen
    // instead of starting the upload, which confused users).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'Could not read photo data.'); return; }
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    await doPhotoUpload(asset.base64, `photo.${ext}`);
  };

  const handleCameraCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'Could not read photo data.'); return; }
    await doPhotoUpload(asset.base64, 'photo.jpg');
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

  // Current status from API
  const currentStatusName = job.jobStatusName ?? job.status ?? '';
  const currentStatusId   = job.jobStatusId ?? '';

  // Build available status transitions: all statuses except the current one
  const availableTransitions = allStatuses.filter(s => s.id !== currentStatusId);
  const visibleTransitions = showAllStatuses
    ? availableTransitions
    : availableTransitions.slice(0, 3);

  const photoItems: { id: string; photoUrl: string; photoType: string; canDelete: boolean }[] =
    (job.photos ?? []).filter((p: any) => p.photoUrl);
  const isVideo = (url: string) => url.startsWith('data:video/');

  return (
    <>
      <Stack.Screen options={{ title: job.jobNumber ?? 'Job Detail', headerBackTitle: 'Jobs' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.jobNumber}>{job.jobNumber}</Text>
            <Badge label={currentStatusName} variant={statusVariant(currentStatusName)} />
          </View>
          <Text style={styles.customerName}>{job.customerName}</Text>
          {!!job.address && <Text style={styles.address}>📍 {job.address}</Text>}
          {!!job.scheduledAt && (
            <Text style={styles.meta}>🗓 Scheduled: {formatDate(job.scheduledAt)}</Text>
          )}
          {!!job.assignedEmployeeName && (
            <Text style={styles.meta}>👷 Assigned to: {job.assignedEmployeeName}</Text>
          )}
          {!!job.priorityLabel && job.priorityLabel !== 'Low' && (
            <Text style={[styles.meta, { color: priorityColor(job.priorityLabel) }]}>
              ⚑ Priority: {job.priorityLabel}
            </Text>
          )}
        </Card>

        {/* Notes / description */}
        {!!job.notes && (
          <Card>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.noteText}>{job.notes}</Text>
          </Card>
        )}

        {/* Status update */}
        {availableTransitions.length > 0 && (
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
              {visibleTransitions.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.statusBtn, updateStatus.isPending && styles.statusBtnDisabled]}
                  onPress={() => handleStatusChange(s.id, s.label)}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={styles.statusBtnText}>{s.label}</Text>
                  }
                </TouchableOpacity>
              ))}
            </View>

            {availableTransitions.length > 3 && (
              <TouchableOpacity
                style={styles.showMoreBtn}
                onPress={() => setShowAllStatuses(v => !v)}
              >
                <Text style={styles.showMoreText}>
                  {showAllStatuses ? 'Show fewer' : `+ ${availableTransitions.length - 3} more statuses`}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Photos & Videos */}
        <Card>
          <Text style={styles.sectionLabel}>
            Photos {photoItems.length > 0 ? `(${photoItems.length})` : ''}
          </Text>

          {photoItems.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
            >
              {photoItems.map((p: any) => (
                <View key={p.id} style={styles.photoWrap}>
                  {isVideo(p.photoUrl) ? (
                    <Video
                      source={{ uri: p.photoUrl }}
                      style={styles.photo}
                      resizeMode={ResizeMode.COVER}
                      useNativeControls
                      isLooping={false}
                    />
                  ) : (
                    <Image source={{ uri: p.photoUrl }} style={styles.photo} resizeMode="cover" />
                  )}
                  <View style={styles.mediaOverlay}>
                    {!isVideo(p.photoUrl) && (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleSavePhoto(p.photoUrl)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={styles.downloadBtnText}>⬇ Save</Text>
                      </TouchableOpacity>
                    )}
                    {p.canDelete && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeletePhoto(p.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {uploadingPhoto ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.uploadingText}>Uploading…</Text>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCameraCapture}>
                <Text style={styles.photoBtnText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePhotoUpload}>
                <Text style={styles.photoBtnText}>🖼 Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleVideoUpload}>
                <Text style={styles.photoBtnText}>🎬 Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Status history */}
        {(job.statusHistory ?? []).length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Status History</Text>
            {(job.statusHistory as any[]).slice(0, 5).map((h: any, i: number) => (
              <View key={i} style={styles.historyRow}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyStatus}>
                    {h.oldStatusName ? `${h.oldStatusName} → ` : ''}{h.newStatusName}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {h.changedByName ?? 'System'} · {h.changedAt ? formatDate(h.changedAt) : ''}
                  </Text>
                  {/* Comment entered when the status was changed — previously
                      captured in the UI but silently dropped by the API
                      (UpdateJobStatusDto had no Notes field, and
                      JobStatusHistory had no column to store it), so it never
                      showed up here or anywhere on the web dashboard. */}
                  {!!h.notes && (
                    <View style={styles.historyNoteBox}>
                      <Text style={styles.historyNoteText}>💬 {h.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Contact */}
        {(job.customerName || job.customerPhone) && (
          <Card>
            <Text style={styles.sectionLabel}>Customer</Text>
            {!!job.customerName  && <Text style={styles.meta}>👤 {job.customerName}</Text>}
            {!!job.customerPhone && <Text style={styles.meta}>📞 {job.customerPhone}</Text>}
          </Card>
        )}

      </ScrollView>
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function priorityColor(label: string) {
  const map: Record<string, string> = {
    Critical: '#dc2626',
    High:     '#ea580c',
    Medium:   '#d97706',
    Low:      Colors.textMuted,
  };
  return map[label] ?? Colors.textMuted;
}

const styles = StyleSheet.create({
  scroll:           { flex: 1, backgroundColor: Colors.background },
  content:          { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound:         { fontSize: FontSize.md, color: Colors.textSecondary },

  headerCard:       { gap: Spacing.xs },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  jobNumber:        { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent, fontFamily: 'monospace' },
  customerName:     { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  address:          { fontSize: FontSize.sm, color: Colors.textSecondary },
  meta:             { fontSize: FontSize.sm, color: Colors.textSecondary },

  sectionLabel:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  noteText:         { fontSize: FontSize.base, color: Colors.text, lineHeight: 22 },

  fieldGroup:       { gap: 6, marginBottom: 12 },
  fieldLabel:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  input:            { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  textarea:         { minHeight: 76, paddingTop: 12 },

  actionRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statusBtn:        {
    backgroundColor: Colors.primaryBtn,
    borderRadius: Radius.full,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  statusBtnDisabled:{ opacity: 0.55 },
  statusBtnText:    { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  showMoreBtn:      { marginTop: 8, alignItems: 'center' },
  showMoreText:     { fontSize: FontSize.sm, color: Colors.accent },

  photoRow:         { gap: 8, paddingBottom: 8 },
  photoWrap:        { position: 'relative' },
  photo:            { width: 140, height: 105, borderRadius: Radius.sm, backgroundColor: Colors.border },
  mediaOverlay:     { position: 'absolute', bottom: 4, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' },
  downloadBtn:      { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3 },
  downloadBtnText:  { color: '#fff', fontSize: 10, fontWeight: FontWeight.semibold },
  deleteBtn:        { backgroundColor: 'rgba(220,38,38,0.8)', borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  deleteBtnText:    { color: '#fff', fontSize: 11, fontWeight: FontWeight.bold },
  uploadingRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  uploadingText:    { fontSize: FontSize.sm, color: Colors.textSecondary },
  photoActions:     { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  photoBtn:         { flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  photoBtnText:     { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },

  historyRow:       { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  historyDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 5, flexShrink: 0 },
  historyContent:   { flex: 1 },
  historyStatus:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  historyMeta:      { fontSize: FontSize.xs, color: Colors.textMuted },
  historyNoteBox:   { marginTop: 6, backgroundColor: Colors.background, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  historyNoteText:  { fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
});
