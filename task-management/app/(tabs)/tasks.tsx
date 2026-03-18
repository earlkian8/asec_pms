import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ScrollView, ActivityIndicator,
  Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, Filter, AlertCircle, Calendar,
  X, ArrowRight, Check, SlidersHorizontal,
} from 'lucide-react-native';
import { Task } from '@/types';
import { D, getStatusColor, getStatusBg } from '@/utils/colors';
import { formatDate, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import { apiService } from '@/services/api';
import AnimatedView from '@/components/AnimatedView';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type SortOption   = 'due_date_asc' | 'due_date_desc' | 'created_at_desc' | 'created_at_asc' | 'title_asc' | 'title_desc';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  all:         { label: 'All',         color: D.ink,   bg: '#F0EFED' },
  pending:     { label: 'Pending',     color: D.amber, bg: D.amberBg },
  in_progress: { label: 'In Progress', color: D.blue,  bg: D.blueBg  },
  completed:   { label: 'Completed',   color: D.green, bg: D.greenBg },
};

const SORT_OPTIONS = [
  { value: 'due_date_asc',    label: 'Due Date: Earliest First' },
  { value: 'due_date_desc',   label: 'Due Date: Latest First'   },
  { value: 'created_at_desc', label: 'Newest First'             },
  { value: 'created_at_asc',  label: 'Oldest First'             },
  { value: 'title_asc',       label: 'Title A → Z'              },
  { value: 'title_desc',      label: 'Title Z → A'              },
];

export default function TasksScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [searchQuery,     setSearchQuery]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('all');
  const [sortOption,      setSortOption]      = useState<SortOption>('due_date_asc');
  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal,   setShowSortModal]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { loadTasks(); }, [statusFilter, debouncedSearch]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let endpoint = '/task-management/tasks';
      const params: string[] = [];
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      if (debouncedSearch.trim()) params.push(`search=${encodeURIComponent(debouncedSearch.trim())}`);
      if (params.length) endpoint += `?${params.join('&')}`;

      const response = await apiService.get<Task[]>(endpoint);
      if (response.success && response.data)
        setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Error loading tasks:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortedTasks = useMemo(() => {
    const arr = [...tasks];
    switch (sortOption) {
      case 'due_date_asc':
        return arr.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      case 'due_date_desc':
        return arr.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        });
      case 'created_at_desc':
        return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'created_at_asc':
        return arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'title_asc':
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case 'title_desc':
        return arr.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return arr;
    }
  }, [tasks, sortOption]);

  const statusCounts = useMemo(() => ({
    all:         tasks.length,
    pending:     tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed:   tasks.filter(t => t.status === 'completed').length,
  }), [tasks]);

  const onRefresh = () => { setRefreshing(true); loadTasks(); };

  const renderTask = ({ item }: { item: Task }) => {
    const statusColor = getStatusColor(item.status);
    const statusBg    = getStatusBg(item.status);
    const overdue     = item.dueDate && isOverdue(item.dueDate);
    const daysUntil   = item.dueDate ? getDaysUntilDue(item.dueDate) : null;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => router.push(`/task-detail?id=${item.id}`)}
        activeOpacity={0.7}>
        <View style={[styles.taskAccentBar, { backgroundColor: statusColor }]} />
        <View style={styles.taskCardInner}>
          <View style={styles.taskCardTop}>
            <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.taskMeta}>
            <View style={styles.metaItem}>
              <Calendar size={12} color={overdue ? D.red : D.inkLight} strokeWidth={2} />
              <Text style={[styles.metaText, overdue && { color: D.red, fontWeight: '600' }]}>
                {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                {overdue ? ' · Overdue' : (daysUntil !== null && daysUntil <= 3 && daysUntil > 0 ? ` · ${daysUntil}d left` : '')}
              </Text>
            </View>
            <Text style={styles.taskProject} numberOfLines={1}>{item.projectName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const activeFilterMeta = STATUS_META[statusFilter];

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Tasks</Text>
            <Text style={styles.headerSub}>
              {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' ? ` · ${activeFilterMeta.label}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, statusFilter !== 'all' && { backgroundColor: D.ink, borderColor: D.ink }]}
              onPress={() => setShowFilterModal(true)}>
              <Filter size={17} color={statusFilter !== 'all' ? '#FFF' : D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSortModal(true)}>
              <SlidersHorizontal size={17} color={D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={15} color={D.inkLight} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks…"
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

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const isActive = statusFilter === key || (key === 'all' && statusFilter === 'all');
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setStatusFilter(key as StatusFilter)}
                style={[styles.chip, isActive && { backgroundColor: meta.bg, borderColor: meta.color }]}>
                <Text style={[styles.chipText, isActive && { color: meta.color }]}>{meta.label}</Text>
                <Text style={[styles.chipCount, isActive && { color: meta.color }]}>
                  {statusCounts[key as keyof typeof statusCounts] ?? 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={D.ink} />
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          renderItem={renderTask}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <AlertCircle size={32} color={D.inkLight} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search or filters' : 'No tasks assigned yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Filter modal ────────────────────────────────────────────────────── */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filter by Status</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <X size={22} color={D.ink} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const isActive = statusFilter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.sheetOption, isActive && { backgroundColor: meta.bg }]}
                    onPress={() => { setStatusFilter(key as StatusFilter); setShowFilterModal(false); }}>
                    <View style={styles.sheetOptionLeft}>
                      <View style={[styles.sheetDot, { backgroundColor: meta.color }]} />
                      <View>
                        <Text style={[styles.sheetOptionText, isActive && { color: meta.color }]}>{meta.label}</Text>
                        <Text style={styles.sheetOptionSub}>{statusCounts[key as keyof typeof statusCounts] ?? 0} tasks</Text>
                      </View>
                    </View>
                    {isActive && <Check size={17} color={meta.color} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Sort modal ──────────────────────────────────────────────────────── */}
      <Modal visible={showSortModal} animationType="slide" transparent onRequestClose={() => setShowSortModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Sort Tasks</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={22} color={D.ink} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 380 }}>
                {SORT_OPTIONS.map(opt => {
                  const isActive = sortOption === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.sheetOption, isActive && { backgroundColor: '#F0EFED' }]}
                      onPress={() => { setSortOption(opt.value as SortOption); setShowSortModal(false); }}>
                      <Text style={[styles.sheetOptionText, isActive && { color: D.ink, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                      {isActive && <Check size={17} color={D.ink} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    backgroundColor: D.surface, borderBottomWidth: 1,
    borderBottomColor: D.hairline, paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle:   { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  headerSub:     { fontSize: 12, color: D.inkLight, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, paddingHorizontal: 12, height: 42, gap: 8, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.ink },

  // Filter chips
  chipScroll: { marginHorizontal: -20 },
  chipRow:    { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: D.hairline, backgroundColor: D.chalk,
  },
  chipText:  { fontSize: 12, fontWeight: '600', color: D.inkMid },
  chipCount: { fontSize: 11, fontWeight: '700', color: D.inkLight },

  // Task card
  taskCard: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline, borderRadius: 12,
    marginBottom: 10, overflow: 'hidden',
  },
  taskAccentBar:  { width: 4 },
  taskCardInner:  { flex: 1, padding: 14 },
  taskCardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  taskTitle:      { flex: 1, fontSize: 14, fontWeight: '700', color: D.ink, lineHeight: 20 },
  statusPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  taskDesc:       { fontSize: 12, color: D.inkMid, lineHeight: 17, marginBottom: 10 },
  taskMeta:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:       { fontSize: 11, color: D.inkLight, fontWeight: '500' },
  taskProject:    { fontSize: 11, color: D.inkLight, fontWeight: '500', maxWidth: 120 },

  // List
  listContent: { padding: 16, paddingBottom: 40 },

  // Empty
  emptyCard:     { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: D.ink, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: D.inkLight, marginTop: 4, textAlign: 'center' },

  // Modal / bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: D.hairlineMd, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  sheetTitle:       { fontSize: 16, fontWeight: '700', color: D.ink },
  sheetOption:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.hairline },
  sheetOptionLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetDot:         { width: 8, height: 8, borderRadius: 4 },
  sheetOptionText:  { fontSize: 15, fontWeight: '500', color: D.inkMid },
  sheetOptionSub:   { fontSize: 12, color: D.inkLight, marginTop: 1 },
});