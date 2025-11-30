import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects, Project } from '@/hooks/useProjects';
import { FIRM_CONTACT } from '@/constants/contact';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, Mail, ArrowUpDown, Filter } from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import { useDialog } from '@/contexts/DialogContext';

const { width } = Dimensions.get('window');

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

  const statusOptions = ['all', 'active', 'on-hold', 'completed', 'pending'];

  const filteredProjects = useMemo(() => {
    return projects;
  }, [projects]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleContact = async (project: Project, method: 'call' | 'email') => {
    if (method === 'call') {
      const phoneUrl = `tel:${FIRM_CONTACT.phone}`;
      
      dialog.showConfirm(
        `Would you like to call ${project.projectManager}?\n\nPhone: ${FIRM_CONTACT.phone}`,
        async () => {
          try {
            const canOpen = await Linking.canOpenURL(phoneUrl);
            if (canOpen) {
              await Linking.openURL(phoneUrl);
            } else {
              dialog.showError('Unable to open phone dialer');
            }
          } catch (error) {
            dialog.showError('Failed to open phone dialer');
            console.error('Error opening phone:', error);
          }
        },
        'Contact Project Manager',
        'Call',
        'Cancel'
      );
    } else {
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
    }
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

  const backgroundColor = '#F3F4F6'; // gray-100
  const cardBg = '#FFFFFF'; // white
  const textColor = '#111827'; // gray-900
  const textSecondary = '#4B5563'; // gray-600
  const borderColor = '#E5E7EB'; // gray-200
  const inputBg = '#FFFFFF'; // white

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' }, // green-100/green-700
    'on-hold': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }, // yellow-100/yellow-700
    completed: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' }, // blue-100/blue-700
    pending: { bg: '#F3F4F6', text: '#4B5563', dot: '#6B7280' }, // gray-100/gray-600
  };

  const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
    const status = statusColors[project.status] || statusColors.pending;
    const budgetPercent = (project.spent / project.budget) * 100;

    return (
      <AnimatedCard
        index={index}
        delay={100}
        onPress={() => router.push(`/project/${project.id}`)}
        style={StyleSheet.flatten([styles.projectCard, { backgroundColor: cardBg, borderColor }])}>
        <View style={styles.projectCardHeader}>
            <View style={styles.projectCardTitleContainer}>
              <View style={styles.projectTitleRow}>
                <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.projectCardName, { color: textColor }]} numberOfLines={2}>
                  {project.name}
                </Text>
              </View>
              <Text style={[styles.projectCardLocation, { color: textSecondary }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={textSecondary} /> {project.location || 'No location specified'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>
                {project.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

        <Text style={[styles.projectCardDescription, { color: textSecondary }, !project.description && styles.placeholderText]} numberOfLines={2}>
          {project.description || 'No description provided for this project.'}
        </Text>

        <View style={styles.projectCardStats}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up-outline" size={16} color={textSecondary} />
            <Text style={[styles.statValue, { color: textColor }]}>{project.progress}%</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Progress</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color={textSecondary} />
            <Text style={[styles.statValue, { color: textColor }]}>
              {new Date(project.expectedCompletion).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Due Date</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color={textSecondary} />
            <Text style={[styles.statValue, { color: textColor }]}>
              {Math.round(budgetPercent)}%
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Budget</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: textSecondary }]}>Overall Progress</Text>
            <Text style={[styles.progressPercent, { color: textColor }]}>{project.progress}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
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
                <Ionicons name="wallet-outline" size={16} color={textSecondary} />
                <Text style={[styles.budgetLabel, { color: textSecondary }]}>Budget Usage</Text>
              </View>
              <Text style={[styles.budgetPercent, { color: textColor }]}>
                {Math.round(budgetPercent)}%
              </Text>
            </View>
            <View style={styles.budgetDetails}>
              <View style={styles.budgetDetailItem}>
                <Text style={[styles.budgetDetailLabel, { color: textSecondary }]}>Spent</Text>
                <Text style={[styles.budgetDetailValue, { color: textColor }]}>
                  {formatCurrency(project.spent)}
                </Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetDetailItem}>
                <Text style={[styles.budgetDetailLabel, { color: textSecondary }]}>Total Budget</Text>
                <Text style={[styles.budgetDetailValue, { color: textColor }]}>
                  {formatCurrency(project.budget)}
                </Text>
              </View>
            </View>
            <View style={[styles.budgetBar, { backgroundColor: '#E5E7EB' }]}>
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
              <Ionicons name="person-outline" size={14} color={textSecondary} />
              <Text style={[styles.footerText, { color: textSecondary }, !project.projectManager && styles.placeholderText]}>
                {project.projectManager || 'No project manager assigned'}
              </Text>
            </View>
          </View>

        {/* Action Buttons */}
        <View style={styles.projectActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSmall]}
            onPress={() => handleContact(project, 'call')}>
            <Phone size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSmall]}
            onPress={() => handleContact(project, 'email')}>
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
    <View style={[styles.container, { backgroundColor }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: cardBg, borderBottomColor: borderColor, paddingTop: insets.top + 20 },
        ]}>
        <View>
          <Text style={[styles.headerTitle, { color: textColor }]}>My Projects</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: '#F3F4F6' }]}
            onPress={() => setShowSortModal(true)}>
            <ArrowUpDown size={18} color={textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }>
        {/* Search Bar with Filter and Sort */}
        <View style={[styles.searchContainer, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          <View style={styles.searchRow}>
            <View style={[styles.searchInputContainer, { backgroundColor: inputBg, borderColor }]}>
              <Ionicons name="search-outline" size={20} color={textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search projects..."
                placeholderTextColor={textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: filterStatus !== null ? '#3B82F6' : inputBg,
                  borderColor: filterStatus !== null ? '#3B82F6' : borderColor,
                },
              ]}
              onPress={() => setShowFilterModal(true)}>
              <Filter
                size={20}
                color={filterStatus !== null ? '#FFFFFF' : textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: inputBg, borderColor }]}
              onPress={() => setShowSortModal(true)}>
              <ArrowUpDown size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Projects List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={[styles.loadingText, { color: textSecondary }]}>Loading projects...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={64} color={textSecondary} />
            <Text style={[styles.emptyStateText, { color: textColor }]}>Error loading projects</Text>
            <Text style={[styles.emptyStateSubtext, { color: textSecondary }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: '#3B82F6' }]}
              onPress={onRefresh}>
              <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProjects.length > 0 ? (
          <View style={styles.projectsList}>
            {filteredProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={textSecondary} />
            <Text style={[styles.emptyStateText, { color: textColor }]}>No projects found</Text>
            <Text style={[styles.emptyStateSubtext, { color: textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: cardBg, borderColor }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Filter Projects</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
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
                        backgroundColor: isActive ? '#3B82F610' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setFilterStatus(status === 'all' ? null : status);
                      setShowFilterModal(false);
                    }}>
                    <Text style={[styles.filterOptionText, { color: textColor }]}>
                      {status === 'all'
                        ? 'All Projects'
                        : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}>
          <View style={[styles.sortModal, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sortModalTitle, { color: textColor }]}>Sort By</Text>
            {(['name', 'progress', 'budget', 'date', 'status'] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortOption,
                  {
                    backgroundColor: sortBy === option ? '#EFF6FF' : 'transparent',
                    borderColor: sortBy === option ? '#3B82F6' : borderColor,
                  },
                ]}
                onPress={() => {
                  if (sortBy === option) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(option);
                    setSortOrder('asc');
                  }
                }}>
                <Text style={[styles.sortOptionText, { color: textColor }]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {sortBy === option && (
                  <Ionicons
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color="#3B82F6"
                  />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.sortModalButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => setShowSortModal(false)}>
              <Text style={[styles.sortModalButtonText, { color: '#FFFFFF' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  searchIcon: {
    marginRight: 0,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  projectsList: {
    gap: 16,
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
    backgroundColor: '#E5E7EB',
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
    borderTopColor: '#E5E7EB',
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
    backgroundColor: '#E5E7EB',
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
    borderTopColor: '#E5E7EB',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    width: width - 80,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sortModalButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sortModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

