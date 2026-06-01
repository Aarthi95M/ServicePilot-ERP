// app/(tabs)/jobs.tsx — My assigned jobs list with search + filter

import { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api/jobs';
import { JobCard } from '@/components/screens/JobCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

const STATUS_FILTERS = ['All', 'Pending', 'InProgress', 'Completed', 'Cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function JobsScreen() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState<StatusFilter>('All');
  const [page,       setPage]       = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-jobs', page, statusFilter],
    queryFn:  () => jobsApi.getMyJobs({
      page,
      pageSize: 20,
      status: statusFilter === 'All' ? undefined : statusFilter,
    }),
    staleTime: 30_000,
  });

  const jobs = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const hasMore = jobs.length < total;

  const filtered = search.trim()
    ? jobs.filter((j: any) =>
        j.jobNumber?.toLowerCase().includes(search.toLowerCase()) ||
        j.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        j.address?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  const onRefresh = useCallback(() => {
    setPage(1);
    qc.invalidateQueries({ queryKey: ['my-jobs'] });
  }, [qc]);

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

      {/* Status filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.pill, statusFilter === s && styles.pillActive]}
            onPress={() => { setStatus(s); setPage(1); }}
          >
            <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
              {s === 'InProgress' ? 'In Progress' : s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching jobs' : 'No jobs found'}
            subtitle={search ? 'Try a different search term.' : 'Assigned jobs will appear here.'}
            icon="🔧"
          />
        ) : (
          <>
            <Text style={styles.countLabel}>
              {filtered.length} job{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ''}
            </Text>

            {filtered.map((job: any) => (
              <JobCard key={job.id} job={job} />
            ))}

            {hasMore && !search && (
              <TouchableOpacity style={styles.loadMore} onPress={() => setPage(p => p + 1)}>
                <Text style={styles.loadMoreText}>Load more →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:         { flex: 1, backgroundColor: Colors.background },

  searchWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, gap: 8 },
  searchIcon:      { fontSize: 16 },
  searchInput:     { flex: 1, fontSize: FontSize.base, color: Colors.text, paddingVertical: 10 },
  clearIcon:       { fontSize: 14, color: Colors.textMuted, padding: 4 },

  filterRow:       { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8 },
  pill:            { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillActive:      { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  pillTextActive:  { color: '#fff' },

  list:            { flex: 1 },
  listContent:     { padding: Spacing.md, paddingTop: 0, paddingBottom: 32, gap: Spacing.sm },

  countLabel:      { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },

  loadMore:        { alignItems: 'center', paddingVertical: 16 },
  loadMoreText:    { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
});
