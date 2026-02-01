import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects, Project } from '@/hooks/useProjects';
import { FIRM_CONTACT } from '@/constants/contact';
import { Ionicons } from '@expo/vector-icons';
import {
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  X,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import ProjectCard from '@/components/cards/ProjectCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';
import { useDialog } from '@/contexts/DialogContext';

type SortOption = 'name' | 'progress' | 'budget' | 'date' | 'status';

export default function ProjectsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  // Use API hook with debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { projects, loading, error, refresh } = useProjects({
    status: filterStatus,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const statusOptions = ['all', 'active', 'on-hold', 'completed'];

  const filteredProjects = useMemo(() => {
    return projects;
  }, [projects]);

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
          if (canOpen) {
            await Linking.openURL(emailUrl);
          } else {
            dialog.showError('Unable to open email client');
          }
        } catch (error) {
          dialog.showError('Failed to open email client');
          console.error('Error opening email:', error);
        }
      },
      'Contact Project Manager',
      'Email',
      'Cancel'
    );
  };

  const handleRequestUpdate = (project: Project | { id: string; name: string; projectManager: string }) => {
    setSelectedProject(project as Project);
    setShowRequestUpdate(true);
  };

  const statusCounts = useMemo(() => {
    return {
      all: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      'on-hold': projects.filter((p) => p.status === 'on-hold').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    };
  }, [projects]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border, paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: AppColors.text }]}>My Projects</Text>
          <Text style={[styles.headerSubtitle, { color: AppColors.textSecondary }]}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}>
            <Search size={20} color={AppColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: AppColors.text }]}
              placeholder="Search projects..."
              placeholderTextColor={AppColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: filterStatus !== null ? AppColors.primary : AppColors.background,
                borderColor: filterStatus !== null ? AppColors.primary : AppColors.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}>
            <Filter
              size={20}
              color={filterStatus !== null ? '#FFFFFF' : AppColors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}
            onPress={() => setShowSortModal(true)}>
            <ArrowUpDown size={20} color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AppColors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={AlertCircle}
              title="No projects found"
              subtitle={
                searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'You have no projects assigned'
              }
            />
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: AppColors.text }]}>Filter Projects</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <X size={24} color={AppColors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {statusOptions.map((status) => {
                  const isActive = filterStatus === status || (status === 'all' && filterStatus === null);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor: isActive ? AppColors.primary + '10' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setFilterStatus(status === 'all' ? null : status);
                        setShowFilterModal(false);
                      }}>
                      <View style={styles.filterOptionContent}>
                        <Text style={[styles.filterOptionText, { color: AppColors.text }]}>
                          {status === 'all'
                            ? 'All Projects'
                            : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                        </Text>
                        <Text style={[styles.filterOptionCount, { color: AppColors.textSecondary }]}>
                          {statusCounts[status as keyof typeof statusCounts] || 0} projects
                        </Text>
                      </View>
                      {isActive && (
                        <Check size={20} color={AppColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: AppColors.text }]}>Sort Projects</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={24} color={AppColors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {[
                  { value: 'name' as SortOption, order: 'asc' as const, label: 'Name (A-Z)' },
                  { value: 'name' as SortOption, order: 'desc' as const, label: 'Name (Z-A)' },
                  { value: 'progress' as SortOption, order: 'asc' as const, label: 'Progress (Low to High)' },
                  { value: 'progress' as SortOption, order: 'desc' as const, label: 'Progress (High to Low)' },
                  { value: 'budget' as SortOption, order: 'asc' as const, label: 'Budget (Low to High)' },
                  { value: 'budget' as SortOption, order: 'desc' as const, label: 'Budget (High to Low)' },
                  { value: 'date' as SortOption, order: 'desc' as const, label: 'Date (Newest First)' },
                  { value: 'date' as SortOption, order: 'asc' as const, label: 'Date (Oldest First)' },
                  { value: 'status' as SortOption, order: 'asc' as const, label: 'Status (A-Z)' },
                  { value: 'status' as SortOption, order: 'desc' as const, label: 'Status (Z-A)' },
                ].map((option) => {
                  const isActive = sortBy === option.value && sortOrder === option.order;
                  return (
                    <TouchableOpacity
                      key={`${option.value}-${option.order}`}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor: isActive ? AppColors.primary + '10' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSortBy(option.value);
                        setSortOrder(option.order);
                        setShowSortModal(false);
                      }}>
                      <Text style={[styles.filterOptionText, { color: AppColors.text }]}>
                        {option.label}
                      </Text>
                      {isActive && (
                        <Check size={20} color={AppColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Request Update Modal */}
      {selectedProject && (
        <RequestUpdateModal
          visible={showRequestUpdate}
          onClose={() => {
            setShowRequestUpdate(false);
            setSelectedProject(null);
          }}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          projectManager={selectedProject.projectManager}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 400,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  filterOptionContent: {
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  filterOptionCount: {
    fontSize: 14,
    fontWeight: '400',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

