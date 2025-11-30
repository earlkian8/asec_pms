import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Folder,
  ChevronRight,
  Plus,
  X,
  ArrowUpDown,
  Check,
} from 'lucide-react-native';
import { Task } from '@/types';
import { AppColors, getStatusColor } from '@/utils/colors';
import { formatDate, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import { apiService } from '@/services/api';
import AnimatedCard from '@/components/AnimatedCard';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'critical';
type SortOption = 'due_date_asc' | 'due_date_desc' | 'created_at_desc' | 'created_at_asc' | 'title_asc' | 'title_desc';

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('due_date_asc');
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, debouncedSearchQuery]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let endpoint = '/task-management/tasks';
      const params: string[] = [];
      
      if (statusFilter !== 'all') {
        params.push(`status=${statusFilter}`);
      }
      
      if (debouncedSearchQuery.trim()) {
        params.push(`search=${encodeURIComponent(debouncedSearchQuery.trim())}`);
      }
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }
      
      const response = await apiService.get<Task[]>(endpoint);

      if (response.success && response.data) {
        setTasks(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tasks are filtered by the API, but we sort them client-side
  const filteredTasks = useMemo(() => {
    const sorted = [...tasks];
    
    switch (sortOption) {
      case 'due_date_asc':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'due_date_desc':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        });
        break;
      case 'created_at_desc':
        sorted.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      case 'created_at_asc':
        sorted.sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;
      case 'title_asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title_desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
    
    return sorted;
  }, [tasks, sortOption]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const renderTaskCard = ({ item, index }: { item: Task; index: number }) => {
    const statusColor = getStatusColor(item.status);
    const overdue = item.dueDate && isOverdue(item.dueDate);
    const daysUntil = item.dueDate ? getDaysUntilDue(item.dueDate) : null;

    return (
      <AnimatedCard
        index={index}
        delay={100}
        onPress={() => router.push(`/task-detail?id=${item.id}`)}
        style={styles.taskCard}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: statusColor },
              ]}
            />
            <Text style={[styles.taskTitle, { color: AppColors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusColor + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: statusColor },
                ]}
              >
                {item.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.taskDescription, { color: AppColors.textSecondary }]} numberOfLines={2}>
          {item.description || 'No description provided for this task.'}
        </Text>

        <View style={styles.taskMeta}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar
                size={14}
                color={overdue ? AppColors.error : AppColors.textSecondary}
              />
              <Text
                style={[
                  styles.metaText,
                  { color: overdue ? AppColors.error : AppColors.textSecondary },
                  overdue && styles.overdueText,
                ]}
              >
                {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                {overdue && ' (Overdue)'}
                {!overdue && daysUntil !== null && daysUntil <= 3 && daysUntil > 0 && ` (${daysUntil}d left)`}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Folder size={14} color={AppColors.textSecondary} />
              <Text style={[styles.metaText, { color: AppColors.textSecondary }]}>{item.projectName}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.taskFooter, { borderTopColor: AppColors.border }]}>
          <Text style={[styles.milestoneText, { color: AppColors.textSecondary }]}>{item.milestoneName}</Text>
          <ChevronRight size={20} color={AppColors.textSecondary} />
        </View>
      </AnimatedCard>
    );
  };

  const statusCounts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border, paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: AppColors.text }]}>My Tasks</Text>
          <Text style={[styles.headerSubtitle, { color: AppColors.textSecondary }]}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}>
            <Search size={20} color={AppColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: AppColors.text }]}
              placeholder="Search tasks..."
              placeholderTextColor={AppColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: statusFilter !== 'all' ? AppColors.primary : AppColors.background,
                borderColor: statusFilter !== 'all' ? AppColors.primary : AppColors.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter
              size={20}
              color={statusFilter !== 'all' ? '#FFFFFF' : AppColors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}
            onPress={() => setShowSortModal(true)}
          >
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
          data={filteredTasks}
          renderItem={renderTaskCard}
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
              <Text style={[styles.emptyText, { color: AppColors.text }]}>No tasks found</Text>
              <Text style={[styles.emptySubtext, { color: AppColors.textSecondary }]}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'You have no tasks assigned'}
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
        onRequestClose={() => setShowFilterModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: AppColors.text }]}>Filter Tasks</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {(['all', 'pending', 'in_progress', 'completed'] as StatusFilter[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: statusFilter === status ? AppColors.primary + '10' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setStatusFilter(status);
                    setShowFilterModal(false);
                  }}
                >
                  <View style={styles.filterOptionContent}>
                    <Text style={[styles.filterOptionText, { color: AppColors.text }]}>
                      {status === 'all'
                        ? 'All Tasks'
                        : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                    <Text style={[styles.filterOptionCount, { color: AppColors.textSecondary }]}>
                      {statusCounts[status as keyof typeof statusCounts] || 0} tasks
                    </Text>
                  </View>
                  {statusFilter === status && (
                    <Check size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
        onRequestClose={() => setShowSortModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: AppColors.text }]}>Sort Tasks</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {[
                { value: 'due_date_asc', label: 'Due Date (Earliest First)' },
                { value: 'due_date_desc', label: 'Due Date (Latest First)' },
                { value: 'created_at_desc', label: 'Recently Created' },
                { value: 'created_at_asc', label: 'Oldest First' },
                { value: 'title_asc', label: 'Title (A-Z)' },
                { value: 'title_desc', label: 'Title (Z-A)' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: sortOption === option.value ? AppColors.primary + '10' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSortOption(option.value as SortOption);
                    setShowSortModal(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, { color: AppColors.text }]}>
                    {option.label}
                  </Text>
                  {sortOption === option.value && (
                    <Check size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
  taskCard: {
    marginBottom: 12,
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  taskTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  taskMeta: {
    gap: 12,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  overdueText: {
    fontWeight: '600',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '500',
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
});
