import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, CheckCircle2, FileText, Calendar, Clock, X, ArrowRight } from 'lucide-react-native';
import { Task, ProgressUpdate } from '@/types';
import { D } from '@/utils/colors';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { apiService } from '@/services/api';

type HistoryFilter = 'all' | 'completed' | 'updates';

interface HistoryData {
  completedTasks:   Task[];
  progressUpdates:  Array<ProgressUpdate & { task?: Task }>;
}

const FILTER_META: Record<HistoryFilter, { label: string }> = {
  all:       { label: 'All'              },
  completed: { label: 'Completed Tasks'  },
  updates:   { label: 'Progress Updates' },
};

// ── Section header (reusing client-app pattern) ────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter,      setFilter]      = useState<HistoryFilter>('all');
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [completedTasks,    setCompletedTasks]    = useState<Task[]>([]);
  const [allProgressUpdates, setAllProgressUpdates] = useState<Array<ProgressUpdate & { task?: Task }>>([]);

  const loadHistoryData = async () => {
    try {
      setError(null);
      const response = await apiService.get<HistoryData>('/task-management/dashboard/history');
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setCompletedTasks(response.data.completedTasks || []);
          setAllProgressUpdates(response.data.progressUpdates || []);
        } else {
          setError(response.message || 'Failed to load history');
        }
      }
    } catch (err) {
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadHistoryData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadHistoryData(); };

  const filteredData = useMemo(() => {
    const data: Array<{ type: 'task' | 'update'; item: Task | (ProgressUpdate & { task?: Task }) }> = [];
    const q = searchQuery.toLowerCase();

    if (filter === 'all' || filter === 'completed') {
      completedTasks.forEach(task => {
        if (!q || task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q))
          data.push({ type: 'task', item: task });
      });
    }
    if (filter === 'all' || filter === 'updates') {
      allProgressUpdates.forEach(update => {
        if (!q || update.description?.toLowerCase().includes(q) || update.task?.title.toLowerCase().includes(q))
          data.push({ type: 'update', item: update });
      });
    }

    return data.sort((a, b) => {
      const dateA = a.type === 'task'
        ? new Date((a.item as Task).updatedAt).getTime()
        : new Date((a.item as ProgressUpdate).created_at).getTime();
      const dateB = b.type === 'task'
        ? new Date((b.item as Task).updatedAt).getTime()
        : new Date((b.item as ProgressUpdate).created_at).getTime();
      return dateB - dateA;
    });
  }, [searchQuery, filter, completedTasks, allProgressUpdates]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={D.ink} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadHistoryData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: typeof filteredData[0] }) => {
    if (item.type === 'task') {
      const task = item.item as Task;
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/task-detail?id=${task.id}`)}
          activeOpacity={0.7}>
          <View style={styles.cardLeft}>
            <View style={[styles.cardIconWrap, { backgroundColor: D.greenBg }]}>
              <CheckCircle2 size={16} color={D.green} strokeWidth={2} />
            </View>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{task.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {task.description || 'No description provided'}
            </Text>
            <View style={styles.cardFooter}>
              <View style={styles.metaItem}>
                <Calendar size={11} color={D.inkLight} strokeWidth={2} />
                <Text style={styles.metaText}>Completed {formatDate(task.updatedAt)}</Text>
              </View>
              <Text style={styles.cardProject} numberOfLines={1}>{task.projectName}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const update = item.item as ProgressUpdate & { task?: Task };
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => update.task && router.push(`/task-detail?id=${update.task.id}`)}
        activeOpacity={0.7}>
        <View style={styles.cardLeft}>
          <View style={[styles.cardIconWrap, { backgroundColor: D.blueBg }]}>
            <FileText size={16} color={D.blue} strokeWidth={2} />
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {update.task?.title ?? 'Unknown Task'}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {update.description || 'No description provided'}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.metaItem}>
              <Clock size={11} color={D.inkLight} strokeWidth={2} />
              <Text style={styles.metaText}>{formatDateTime(update.created_at)}</Text>
            </View>
            {update.original_name && (
              <View style={styles.filePill}>
                <FileText size={10} color={D.blue} />
                <Text style={styles.filePillText} numberOfLines={1}>{update.original_name}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSub}>{filteredData.length} item{filteredData.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={15} color={D.inkLight} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search history…"
            placeholderTextColor={D.inkLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color={D.inkLight} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {(Object.entries(FILTER_META) as [HistoryFilter, { label: string }][]).map(([key, meta]) => {
            const isActive = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[styles.chip, isActive && { backgroundColor: D.ink, borderColor: D.ink }]}>
                <Text style={[styles.chipText, isActive && { color: '#FFF' }]}>{meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item, idx) =>
          `${item.type}-${item.type === 'task' ? (item.item as Task).id : (item.item as ProgressUpdate).id}-${idx}`
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Clock size={32} color={D.inkLight} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No history found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Completed tasks and progress updates appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: D.chalk },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    backgroundColor: D.surface, borderBottomWidth: 1,
    borderBottomColor: D.hairline, paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: D.inkLight, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, paddingHorizontal: 12, height: 42, gap: 8, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.ink },

  // Chips
  chipScroll: { marginHorizontal: -20 },
  chipRow:    { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: D.hairline, backgroundColor: D.chalk,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: D.inkMid },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionBar:    { width: 3, height: 16, backgroundColor: D.ink, borderRadius: 2 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: D.ink },

  // Card
  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardLeft:     { paddingTop: 2 },
  cardIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardBody:     { flex: 1 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: D.ink, lineHeight: 20, marginBottom: 3 },
  cardDesc:     { fontSize: 12, color: D.inkMid, lineHeight: 17, marginBottom: 10 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 11, color: D.inkLight },
  cardProject:  { fontSize: 11, color: D.inkLight, maxWidth: 110 },
  filePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: D.blueBg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
  },
  filePillText: { fontSize: 10, color: D.blue, fontWeight: '500', maxWidth: 80 },

  // List
  listContent: { padding: 16, paddingBottom: 40 },

  // Empty
  emptyCard:     { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: D.ink, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: D.inkLight, marginTop: 4, textAlign: 'center' },

  // Error
  errorText:    { fontSize: 14, color: D.red, marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn:     { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});