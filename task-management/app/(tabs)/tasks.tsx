import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
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
  User,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { mockTasks } from '@/data/mockData';
import { Task } from '@/types';
import { AppColors, getStatusColor, getPriorityColor } from '@/utils/colors';
import { formatDate, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import AnimatedCard from '@/components/AnimatedCard';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredTasks = useMemo(() => {
    let filtered = [...mockTasks];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.projectName.toLowerCase().includes(query) ||
          task.milestoneName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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
            {item.priority && (
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor:
                      getPriorityColor(item.priority) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(item.priority) },
                  ]}
                >
                  {item.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.taskDescription, { color: AppColors.textSecondary }]} numberOfLines={2}>
          {item.description}
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
              <User size={14} color={AppColors.textSecondary} />
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
      all: mockTasks.length,
      pending: mockTasks.filter((t) => t.status === 'pending').length,
      in_progress: mockTasks.filter((t) => t.status === 'in_progress').length,
      completed: mockTasks.filter((t) => t.status === 'completed').length,
    };
  }, []);

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
      </View>

      <View style={[styles.filterContainer, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'pending', 'in_progress', 'completed'] as StatusFilter[]).map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: statusFilter === status ? AppColors.primary : AppColors.card,
                    borderColor: statusFilter === status ? AppColors.primary : AppColors.border,
                  },
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: statusFilter === status ? '#FFFFFF' : AppColors.textSecondary,
                    },
                  ]}
                >
                  {status === 'all'
                    ? 'All'
                    : status.replace('_', ' ').toUpperCase()}{' '}
                  ({statusCounts[status]})
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

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
  searchInputContainer: {
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
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
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
});
