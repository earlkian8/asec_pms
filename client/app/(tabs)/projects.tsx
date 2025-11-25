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
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects, Project } from '@/hooks/useProjects';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, Mail, ArrowUpDown } from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';

const { width } = Dimensions.get('window');

type SortOption = 'name' | 'progress' | 'budget' | 'date' | 'status';

export default function ProjectsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const handleContact = (project: Project, method: 'call' | 'email') => {
    if (method === 'call') {
      Alert.alert('Contact Project Manager', `Would you like to call ${project.projectManager}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Alert.alert('Info', 'Call functionality would open phone dialer') },
      ]);
    } else {
      Alert.alert('Contact Project Manager', `Would you like to email ${project.projectManager}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email', onPress: () => Alert.alert('Info', 'Email functionality would open email client') },
      ]);
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

  const ProjectCard = ({ project }: { project: Project }) => {
    const status = statusColors[project.status] || statusColors.pending;
    const budgetPercent = (project.spent / project.budget) * 100;

    return (
      <View style={[styles.projectCard, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity
          onPress={() => router.push(`/project/${project.id}`)}
          activeOpacity={0.7}>
          <View style={styles.projectCardHeader}>
            <View style={styles.projectCardTitleContainer}>
              <View style={styles.projectTitleRow}>
                <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.projectCardName, { color: textColor }]} numberOfLines={2}>
                  {project.name}
                </Text>
              </View>
              <Text style={[styles.projectCardLocation, { color: textSecondary }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={textSecondary} /> {project.location}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>
                {project.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

        <Text style={[styles.projectCardDescription, { color: textSecondary }]} numberOfLines={2}>
          {project.description}
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

          <View style={styles.projectCardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="person-outline" size={14} color={textSecondary} />
              <Text style={[styles.footerText, { color: textSecondary }]}>
                {project.projectManager}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="wallet-outline" size={14} color={textSecondary} />
              <Text style={[styles.footerText, { color: textSecondary }]}>
                {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

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
      </View>
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
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: inputBg, borderColor }]}>
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

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}>
          {statusOptions.map((status) => {
            const isActive = filterStatus === status || (status === 'all' && filterStatus === null);
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status === 'all' ? null : status)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? '#3B82F6' : cardBg,
                    borderColor: isActive ? '#3B82F6' : borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? '#FFFFFF' : textSecondary },
                  ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
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

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterContent: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 12,
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
    marginBottom: 16,
  },
  projectCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
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
  modalOverlay: {
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

