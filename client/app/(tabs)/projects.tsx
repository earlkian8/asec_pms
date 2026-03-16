import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, TextInput, RefreshControl,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects, Project } from '@/hooks/useProjects';
import { FIRM_CONTACT } from '@/constants/contact';
import { Ionicons } from '@expo/vector-icons';
import {
  Search, Filter, ArrowUpDown, X, Check, AlertCircle, SlidersHorizontal,
} from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import ProjectCard from '@/components/cards/ProjectCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { AppColors } from '@/constants/colors';
import { useDialog } from '@/contexts/DialogContext';

type SortOption = 'name' | 'progress' | 'budget' | 'date' | 'status';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:       '#0F0F0E',
  inkMid:    '#4A4845',
  inkLight:  '#9A9691',
  chalk:     '#FAFAF8',
  surface:   '#FFFFFF',
  hairline:  '#E8E5DF',
  hairlineMd:'#D4D0C8',
  blue:      '#1D4ED8',
  blueBg:    '#EEF2FF',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  'all':       { label: 'All',       color: D.ink,    bg: '#F0EFED' },
  'active':    { label: 'Active',    color: '#1D4ED8', bg: '#EEF2FF' },
  'on-hold':   { label: 'On Hold',   color: '#B45309', bg: '#FFFBEB' },
  'completed': { label: 'Completed', color: '#2D7D52', bg: '#EDF7F2' },
};

export default function ProjectsScreen() {
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterStatus,   setFilterStatus]   = useState<string | null>(null);
  const [sortBy,         setSortBy]         = useState<SortOption>('name');
  const [sortOrder,      setSortOrder]      = useState<'asc' | 'desc'>('asc');
  const [showSortModal,  setShowSortModal]  = useState(false);
  const [showFilterModal,setShowFilterModal]= useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [showRequestUpdate,setShowRequestUpdate] = useState(false);
  const [selectedProject,  setSelectedProject]   = useState<Project | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { projects, loading, refresh } = useProjects({
    status: filterStatus,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const statusOptions = ['all', 'active', 'on-hold', 'completed'];
  const filteredProjects = useMemo(() => projects, [projects]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleContact = async (project: Project | { name: string; projectManager: string }) => {
    const emailUrl = `mailto:${FIRM_CONTACT.email}?subject=Project Update Request: ${project.name}`;
    dialog.showConfirm(
      `Would you like to email ${project.projectManager}?\n\nEmail: ${FIRM_CONTACT.email}`,
      async () => {
        try {
          const canOpen = await Linking.canOpenURL(emailUrl);
          if (canOpen) await Linking.openURL(emailUrl);
          else dialog.showError('Unable to open email client');
        } catch { dialog.showError('Failed to open email client'); }
      },
      'Contact Project Manager', 'Email', 'Cancel'
    );
  };

  const handleRequestUpdate = (project: Project | { id: string; name: string; projectManager: string }) => {
    setSelectedProject(project as Project);
    setShowRequestUpdate(true);
  };

  const statusCounts = useMemo(() => ({
    all:       projects.length,
    active:    projects.filter((p) => p.status === 'active').length,
    'on-hold': projects.filter((p) => p.status === 'on-hold').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }), [projects]);

  const activeFilterMeta = STATUS_META[filterStatus ?? 'all'];

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Projects</Text>
            <Text style={styles.headerSub}>
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
              {filterStatus ? ` · ${activeFilterMeta.label}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                filterStatus && { backgroundColor: D.ink, borderColor: D.ink },
              ]}
              onPress={() => setShowFilterModal(true)}>
              <Filter size={18} color={filterStatus ? '#FFF' : D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowSortModal(true)}>
              <SlidersHorizontal size={18} color={D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={D.inkLight} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects…"
            placeholderTextColor={D.inkLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color={D.inkLight} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}>
          {statusOptions.map((s) => {
            const isActive = filterStatus === s || (s === 'all' && filterStatus === null);
            const meta = STATUS_META[s];
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterStatus(s === 'all' ? null : s)}
                style={[
                  styles.chip,
                  isActive && { backgroundColor: meta.bg, borderColor: meta.color },
                ]}>
                <Text style={[styles.chipText, isActive && { color: meta.color }]}>
                  {meta.label}
                </Text>
                <Text style={[styles.chipCount, isActive && { color: meta.color }]}>
                  {statusCounts[s as keyof typeof statusCounts]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={({ item, index }) => (
            <ProjectCard
              project={item}
              index={index}
              onPress={() => router.push(`/project/${item.id}`)}
              onContact={handleContact}
              onRequestUpdate={handleRequestUpdate}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={AlertCircle}
              title="No projects found"
              subtitle={searchQuery ? 'Try adjusting your search or filters' : 'You have no projects assigned'}
            />
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
              {statusOptions.map((status) => {
                const isActive = filterStatus === status || (status === 'all' && filterStatus === null);
                const meta = STATUS_META[status];
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.sheetOption, isActive && { backgroundColor: meta.bg }]}
                    onPress={() => { setFilterStatus(status === 'all' ? null : status); setShowFilterModal(false); }}>
                    <View style={styles.sheetOptionLeft}>
                      <View style={[styles.sheetDot, { backgroundColor: meta.color }]} />
                      <View>
                        <Text style={[styles.sheetOptionText, isActive && { color: meta.color }]}>
                          {meta.label}
                        </Text>
                        <Text style={styles.sheetOptionSub}>
                          {statusCounts[status as keyof typeof statusCounts]} projects
                        </Text>
                      </View>
                    </View>
                    {isActive && <Check size={18} color={meta.color} strokeWidth={2.5} />}
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
                <Text style={styles.sheetTitle}>Sort Projects</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={22} color={D.ink} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 380 }}>
                {([
                  { value: 'name'     as SortOption, order: 'asc'  as const, label: 'Name A → Z' },
                  { value: 'name'     as SortOption, order: 'desc' as const, label: 'Name Z → A' },
                  { value: 'progress' as SortOption, order: 'desc' as const, label: 'Progress: High → Low' },
                  { value: 'progress' as SortOption, order: 'asc'  as const, label: 'Progress: Low → High' },
                  { value: 'budget'   as SortOption, order: 'desc' as const, label: 'Budget: High → Low' },
                  { value: 'budget'   as SortOption, order: 'asc'  as const, label: 'Budget: Low → High' },
                  { value: 'date'     as SortOption, order: 'desc' as const, label: 'Newest First' },
                  { value: 'date'     as SortOption, order: 'asc'  as const, label: 'Oldest First' },
                ]).map((opt) => {
                  const isActive = sortBy === opt.value && sortOrder === opt.order;
                  return (
                    <TouchableOpacity
                      key={`${opt.value}-${opt.order}`}
                      style={[styles.sheetOption, isActive && { backgroundColor: '#F0EFED' }]}
                      onPress={() => { setSortBy(opt.value); setSortOrder(opt.order); setShowSortModal(false); }}>
                      <Text style={[styles.sheetOptionText, isActive && { color: D.ink, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                      {isActive && <Check size={18} color={D.ink} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {selectedProject && (
        <RequestUpdateModal
          visible={showRequestUpdate}
          onClose={() => { setShowRequestUpdate(false); setSelectedProject(null); }}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          projectManager={selectedProject.projectManager}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: D.chalk },

  // Header
  header: { backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.hairline, paddingHorizontal: 20, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: D.inkLight, marginTop: 2 },
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
  searchInput: { flex: 1, fontSize: 14, color: D.ink, fontFamily: 'Inter' },

  // Chips
  chipScroll: { marginHorizontal: -20 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: D.hairline,
    backgroundColor: D.chalk,
  },
  chipText:  { fontSize: 12, fontWeight: '600', color: D.inkMid },
  chipCount: { fontSize: 11, fontWeight: '700', color: D.inkLight },

  // List
  listContent: { padding: 16, paddingBottom: 40 },

  // Modal/Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: D.hairlineMd, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: D.ink },
  sheetOption: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  sheetOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetDot:        { width: 8, height: 8, borderRadius: 4 },
  sheetOptionText: { fontSize: 15, fontWeight: '500', color: D.inkMid },
  sheetOptionSub:  { fontSize: 12, color: D.inkLight, marginTop: 1 },
});