import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ArrowRight, FolderKanban, MapPin, Filter, SlidersHorizontal, X, Check } from 'lucide-react-native';
import { D } from '@/utils/colors';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type Project = {
  id: number;
  projectCode?: string | null;
  projectName: string;
  status?: string | null;
  priority?: string | null;
  location?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  milestonesCount?: number;
  teamCount?: number;
};

type SortOption = 'name_asc' | 'name_desc' | 'start_date_asc' | 'start_date_desc' | 'end_date_asc' | 'end_date_desc';

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canViewProjects = hasPermission('tm.projects.view-assigned');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await apiService.get<Project[]>('/task-management/projects');
      if (res.success && res.data) {
        setProjects(Array.isArray(res.data) ? res.data : []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!canViewProjects) {
      // Ensure route cannot be used even if file exists
      router.replace('/(tabs)');
      return;
    }
    loadProjects();
  }, [canViewProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const name = (p.projectName || '').toLowerCase();
      const code = (p.projectCode || '').toLowerCase();
      const loc = (p.location || '').toLowerCase();
      const passesSearch = !q || name.includes(q) || code.includes(q) || loc.includes(q);
      const st = (p.status ?? '').toString().trim();
      const passesStatus = statusFilter === 'all' ? true : st.toLowerCase() === statusFilter.toLowerCase();
      return passesSearch && passesStatus;
    });
  }, [projects, search, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const timeOrEnd = (d?: string | null) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);
    const timeOrStart = (d?: string | null) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);

    switch (sortOption) {
      case 'name_asc':
        return arr.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
      case 'name_desc':
        return arr.sort((a, b) => (b.projectName || '').localeCompare(a.projectName || ''));
      case 'start_date_asc':
        return arr.sort((a, b) => timeOrStart(a.startDate) - timeOrStart(b.startDate));
      case 'start_date_desc':
        return arr.sort((a, b) => timeOrStart(b.startDate) - timeOrStart(a.startDate));
      case 'end_date_asc':
        return arr.sort((a, b) => timeOrEnd(a.plannedEndDate) - timeOrEnd(b.plannedEndDate));
      case 'end_date_desc':
        return arr.sort((a, b) => timeOrEnd(b.plannedEndDate) - timeOrEnd(a.plannedEndDate));
      default:
        return arr;
    }
  }, [filtered, sortOption]);

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    projects.forEach((p) => {
      const st = (p.status ?? '').toString().trim();
      if (st) unique.add(st);
    });
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [projects]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const renderItem = ({ item }: { item: Project }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/project-detail?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <FolderKanban size={16} color={D.blue} strokeWidth={2} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {item.projectName}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {(item.projectCode ? `${item.projectCode} • ` : '') + (item.status ?? '—')}
            </Text>
          </View>
          <ArrowRight size={16} color={D.inkLight} strokeWidth={2.5} />
        </View>

        {(item.location || item.milestonesCount !== undefined || item.teamCount !== undefined) && (
          <View style={styles.metaRow}>
            {item.location ? (
              <View style={styles.metaItem}>
                <MapPin size={12} color={D.inkLight} strokeWidth={2} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <Text style={styles.counts}>
              {`${item.milestonesCount ?? 0} milestones • ${item.teamCount ?? 0} team`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={D.ink} />
      </View>
    );
  }

  if (!canViewProjects) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.noAccessTitle}>No access</Text>
        <Text style={styles.noAccessSub}>You don’t have permission to view projects.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Projects</Text>
            <Text style={styles.headerSub}>
              {sorted.length} project{sorted.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, statusFilter !== 'all' && { backgroundColor: D.ink, borderColor: D.ink }]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={17} color={statusFilter !== 'all' ? '#FFF' : D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSortModal(true)}>
              <SlidersHorizontal size={17} color={D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Search size={15} color={D.inkLight} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects…"
            placeholderTextColor={D.inkLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={D.inkLight} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {statusOptions.map((opt) => {
            const active = statusFilter.toLowerCase() === opt.toLowerCase();
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => setStatusFilter(opt)}
                style={[styles.chip, active && { backgroundColor: '#F0EFED', borderColor: D.ink }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && { color: D.ink }]} numberOfLines={1}>
                  {opt === 'all' ? 'All' : opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <FolderKanban size={32} color={D.inkLight} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No projects found</Text>
            <Text style={styles.emptySubtitle}>Projects you’re assigned to appear here.</Text>
          </View>
        }
      />

      {/* Filter modal */}
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
              <ScrollView style={{ maxHeight: 380 }}>
                {statusOptions.map((opt) => {
                  const isActive = statusFilter.toLowerCase() === opt.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.sheetOption, isActive && { backgroundColor: '#F0EFED' }]}
                      onPress={() => {
                        setStatusFilter(opt);
                        setShowFilterModal(false);
                      }}
                    >
                      <Text style={[styles.sheetOptionText, isActive && { color: D.ink, fontWeight: '700' }]}>
                        {opt === 'all' ? 'All' : opt}
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

      {/* Sort modal */}
      <Modal visible={showSortModal} animationType="slide" transparent onRequestClose={() => setShowSortModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Sort Projects</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={22} color={D.ink} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              {[
                { value: 'name_asc', label: 'Name A → Z' },
                { value: 'name_desc', label: 'Name Z → A' },
                { value: 'start_date_asc', label: 'Start Date: Earliest First' },
                { value: 'start_date_desc', label: 'Start Date: Latest First' },
                { value: 'end_date_asc', label: 'Planned End: Earliest First' },
                { value: 'end_date_desc', label: 'Planned End: Latest First' },
              ].map((opt) => {
                const isActive = sortOption === (opt.value as SortOption);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sheetOption, isActive && { backgroundColor: '#F0EFED' }]}
                    onPress={() => {
                      setSortOption(opt.value as SortOption);
                      setShowSortModal(false);
                    }}
                  >
                    <Text style={[styles.sheetOptionText, isActive && { color: D.ink, fontWeight: '700' }]}>{opt.label}</Text>
                    {isActive && <Check size={17} color={D.ink} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: D.inkLight, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.ink },

  chipScroll: { marginHorizontal: -20 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
    maxWidth: 180,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: D.inkMid },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: D.blueBg,
  },
  cardTitleWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: D.ink, lineHeight: 20 },
  sub: { fontSize: 11, color: D.inkLight, marginTop: 2 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  metaText: { fontSize: 11, color: D.inkLight, flex: 1 },
  counts: { fontSize: 11, color: D.inkLight, fontWeight: '600' },

  emptyCard: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: D.ink, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: D.inkLight, marginTop: 4, textAlign: 'center' },

  noAccessTitle: { fontSize: 16, fontWeight: '800', color: D.ink },
  noAccessSub: { fontSize: 12, color: D.inkLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },

  // Modal / bottom sheet (copied pattern from tasks)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.hairlineMd,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: D.ink },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  sheetOptionText: { fontSize: 15, fontWeight: '500', color: D.inkMid },
});

