// app/(tabs)/jobs.tsx — My assigned jobs list with search + filter
//
// WHAT CHANGED (v2):
//   1. Status pills are now dynamic — fetched from /api/lookups/job-statuses
//      instead of being hardcoded.  The old list ('InProgress', 'Cancelled', …)
//      did not match the actual DB status names so filtering never worked.
//   2. Filter now sends jobStatusId (a GUID) to the API instead of a display name.
//   3. getMyJobs now returns { items, totalCount, page, pageSize } (paged).
//      The old code expected .items but the backend returned a flat array,
//      which is why 0 jobs were always shown.

import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api/jobs';
import { lookupsApi, type JobStatusLookup } from '@/lib/api/lookups';
import { JobCard } from '@/components/screens/JobCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

export default function JobsScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null); // null = All
  const [page, setPage] = useState(1);

  // ── Fetch available job statuses once (cached for the session) ──
  const { data: statuses = [] } = useQuery<JobStatusLookup[]>({
    queryKey: ['job-statuses-lookup'],
    queryFn:  lookupsApi.getJobStatuses,
    staleTime: 5 * 60_000, // 5 min — rarely changes
  });

  // ── Fetch my jobs — re-runs when page or status filter changes ──
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['my-jobs', page, selectedStatusId],
    queryFn: () =>
      jobsApi.getMyJobs({
        page,
        pageSize: 20,
        jobStatusId: selectedStatusId ?? undefined,
      }),
    staleTime: 30_000,
  });

  const jobs      = data?.items ?? [];
  const total     = data?.totalCount ?? 0;
  const hasMore   = jobs.length < total;

  // Client-side text search on the already-fetched page
  const filtered = search.trim()
    ? jobs.filter((j: any) =>
        j.jobNumber?.toLowerCase().includes(search.toLowerCase()) ||
        j.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        j.address?.toLowerCase().includes(search.toLowerCase()),
      )
    : jobs;

  const onRefresh = useCallback(() => {
    setPage(1);
    qc.invalidateQueries({ queryKey: ['my-jobs'] });
  }, [qc]);

  const handleStatusSelect = (statusId: string | null) => {
    setSelectedStatusId(statusId);
    setPage(1);
  };

  return (
    <View style={styles.wrapper}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search job #, customer, address…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter pills — dynamic from API */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {/* "All" pill is always first */}
        <TouchableOpacity
          style={[styles.pill, selectedStatusId === null && styles.pillActive]}
          onPress={() => handleStatusSelect(null)}
        >
          <Text style={[styles.pillText, selectedStatusId === null && styles.pillTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {statuses
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.pill, selectedStatusId === s.id && styles.pillActive]}
              onPress={() => handleStatusSelect(s.id)}
            >
              <Text style={[styles.pillText, selectedStatusId === s.id && styles.pillTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching jobs' : 'No jobs found'}
            subtitle={
              search
                ? 'Try a different search term.'
                : 'Assigned jobs will appear here.'
            }
            icon="🔧"
          />
        ) : (
          <>
            <Text style={styles.countLabel}>
              {filtered.length} job{filtered.length !== 1 ? 's' : ''}
              {search ? ' matched' : ''}
            </Text>

            {filtered.map((job: any) => (
              <JobCard key={job.id} job={job} />
            ))}

            {hasMore && !search && (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setPage((p) => p + 1)}
                disabled={isFetching}
              >
                {isFetching ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more →</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:        { flex: 1, backgroundColor: Colors.background },

  searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, gap: 8 },
  searchIcon:     { fontSize: 16 },
  searchInput:    { flex: 1, fontSize: FontSize.base, color: Colors.text, paddingVertical: 10 },
  clearIcon:      { fontSize: 14, color: Colors.textMuted, padding: 4 },

  filterScroll:   { flexGrow: 0, flexShrink: 0 },
  filterRow:      { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8, alignItems: 'center' },
  pill:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-start' },
  pillActive:     { backgroundColor: Colors.primaryBtn, borderColor: Colors.primaryBtn },
  pillText:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },

  list:           { flex: 1 },
  listContent:    { padding: Spacing.md, paddingTop: 0, paddingBottom: 32, gap: Spacing.sm },

  countLabel:     { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },

  loadMore:       { alignItems: 'center', paddingVertical: 16 },
  loadMoreText:   { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.semibold },
});
