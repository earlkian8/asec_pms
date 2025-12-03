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
import { LinearGradient } from 'expo-linear-gradient';
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
import AnimatedCard from '@/components/AnimatedCard';
import { useDialog } from '@/contexts/DialogContext';

// Use AppColors for consistent theming (matching tasks page)
const AppColors = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  card: '#FFFFFF',
  background: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
};

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

  const handleContact = async (project: Project) => {
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


  const handleRequestUpdate = (project: Project) => {
    setSelectedProject(project);
    setShowRequestUpdate(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' }, // green-100/green-700
    'on-hold': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }, // yellow-100/yellow-700
    completed: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' }, // blue-100/blue-700
  };

  const statusCounts = useMemo(() => {
    return {
      all: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      'on-hold': projects.filter((p) => p.status === 'on-hold').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    };
  }, [projects]);

  const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
    const status = statusColors[project.status] || statusColors.active;
    const budgetPercent = (project.spent / project.budget) * 100;

    return (
      <AnimatedCard
        index={index}
        delay={100}
        onPress={() => router.push(`/project/${project.id}`)}
        style={StyleSheet.flatten([styles.projectCard, { backgroundColor: AppColors.card, borderColor: AppColors.border }])}>
        <View style={styles.projectCardHeader}>
            <View style={styles.projectCardTitleContainer}>
              <View style={styles.projectTitleRow}>
                <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.projectCardName, { color: AppColors.text }]} numberOfLines={2}>
                  {project.name}
                </Text>
              </View>
              <Text style={[styles.projectCardLocation, { color: AppColors.textSecondary }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={AppColors.textSecondary} /> {project.location || 'No location specified'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>
                {project.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

        <Text style={[styles.projectCardDescription, { color: AppColors.textSecondary }, !project.description && styles.placeholderText]} numberOfLines={2}>
          {project.description || 'No description provided for this project.'}
        </Text>

        <View style={styles.projectCardStats}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up-outline" size={16} color={AppColors.textSecondary} />
            <Text style={[styles.statValue, { color: AppColors.text }]}>{project.progress}%</Text>
            <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>Progress</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color={AppColors.textSecondary} />
            <Text style={[styles.statValue, { color: AppColors.text }]}>
              {new Date(project.expectedCompletion).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>Due Date</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color={AppColors.textSecondary} />
            <Text style={[styles.statValue, { color: AppColors.text }]}>
              {Math.round(budgetPercent)}%
            </Text>
            <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>Budget</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: AppColors.textSecondary }]}>Overall Progress</Text>
            <Text style={[styles.progressPercent, { color: AppColors.text }]}>{project.progress}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: AppColors.border }]}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${project.progress}%` }]}
            />
          </View>
        </View>

          {/* Budget Section */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetInfoRow}>
                <Ionicons name="wallet-outline" size={16} color={AppColors.textSecondary} />
                <Text style={[styles.budgetLabel, { color: AppColors.textSecondary }]}>Budget Usage</Text>
              </View>
              <Text style={[styles.budgetPercent, { color: AppColors.text }]}>
                {Math.round(budgetPercent)}%
              </Text>
            </View>
            <View style={styles.budgetDetails}>
              <View style={styles.budgetDetailItem}>
                <Text style={[styles.budgetDetailLabel, { color: AppColors.textSecondary }]}>Spent</Text>
                <Text style={[styles.budgetDetailValue, { color: AppColors.text }]}>
                  {formatCurrency(project.spent)}
                </Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetDetailItem}>
                <Text style={[styles.budgetDetailLabel, { color: AppColors.textSecondary }]}>Total Budget</Text>
                <Text style={[styles.budgetDetailValue, { color: AppColors.text }]}>
                  {formatCurrency(project.budget)}
                </Text>
              </View>
            </View>
            <View style={[styles.budgetBar, { backgroundColor: AppColors.border }]}>
              <View
                style={[
                  styles.budgetBarFill,
                  {
                    width: `${Math.min(budgetPercent, 100)}%`,
                    backgroundColor: budgetPercent > 90 ? '#EF4444' : budgetPercent > 75 ? '#F59E0B' : '#10B981',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.projectCardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="person-outline" size={14} color={AppColors.textSecondary} />
              <Text style={[styles.footerText, { color: AppColors.textSecondary }, !project.projectManager && styles.placeholderText]}>
                {project.projectManager || 'No project manager assigned'}
              </Text>
            </View>
          </View>

        {/* Action Buttons */}
        <View style={styles.projectActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSmall]}
            onPress={() => handleContact(project)}>
            <Mail size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonText]}
            onPress={() => handleRequestUpdate(project)}>
            <Text style={[styles.actionButtonTextLabel, { color: '#3B82F6' }]}>Request Update</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>
    );
  };

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={({ item, index }) => <ProjectCard project={item} index={index} />}
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
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color={AppColors.textSecondary} />
              <Text style={[styles.emptyText, { color: AppColors.text }]}>No projects found</Text>
              <Text style={[styles.emptySubtext, { color: AppColors.textSecondary }]}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'You have no projects assigned'}
              </Text>
            </View>
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
  projectCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectCardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  projectCardName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  projectCardLocation: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  projectCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  projectCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: AppColors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  budgetSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  budgetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  budgetDetailItem: {
    flex: 1,
  },
  budgetDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetDetailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  budgetDivider: {
    width: 1,
    backgroundColor: AppColors.border,
  },
  budgetBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  projectCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSmall: {
    width: 40,
    height: 40,
    backgroundColor: '#EFF6FF',
  },
  actionButtonText: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  actionButtonTextLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

