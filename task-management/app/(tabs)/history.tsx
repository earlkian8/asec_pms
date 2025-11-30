import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  CheckCircle2,
  FileText,
  Calendar,
  Filter,
  Clock,
} from 'lucide-react-native';
import { Task, ProgressUpdate } from '@/types';
import { AppColors } from '@/utils/colors';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import AnimatedCard from '@/components/AnimatedCard';
import { apiService } from '@/services/api';

type HistoryFilter = 'all' | 'completed' | 'updates';

interface HistoryData {
  completedTasks: Task[];
  progressUpdates: Array<ProgressUpdate & { task?: Task }>;
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [allProgressUpdates, setAllProgressUpdates] = useState<Array<ProgressUpdate & { task?: Task }>>([]);

  const loadHistoryData = async () => {
    try {
      setError(null);
      const response = await apiService.get<HistoryData>('/task-management/dashboard/history');

      // Type guard to check if response is ApiResponse
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setCompletedTasks(response.data.completedTasks || []);
          setAllProgressUpdates(response.data.progressUpdates || []);
        } else {
          setError(response.message || 'Failed to load history');
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistoryData();
  };

  const filteredData = useMemo(() => {
    let data: Array<{ type: 'task' | 'update'; item: Task | (ProgressUpdate & { task?: Task }) }> = [];

    if (filter === 'all' || filter === 'completed') {
      completedTasks.forEach((task) => {
        if (
          !searchQuery ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          data.push({ type: 'task', item: task });
        }
      });
    }

    if (filter === 'all' || filter === 'updates') {
      allProgressUpdates.forEach((update) => {
        if (
          !searchQuery ||
          update.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          update.task?.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          data.push({ type: 'update', item: update });
        }
      });
    }

    return data.sort((a, b) => {
      const dateA =
        a.type === 'task'
          ? new Date((a.item as Task).updatedAt).getTime()
          : new Date((a.item as ProgressUpdate).created_at).getTime();
      const dateB =
        b.type === 'task'
          ? new Date((b.item as Task).updatedAt).getTime()
          : new Date((b.item as ProgressUpdate).created_at).getTime();
      return dateB - dateA;
    });
  }, [searchQuery, filter, completedTasks, allProgressUpdates]);

  const renderItem = ({
    item,
    index,
  }: {
    item: { type: 'task' | 'update'; item: Task | (ProgressUpdate & { task?: Task }) };
    index: number;
  }) => {
    if (item.type === 'task') {
      const task = item.item as Task;
      return (
        <AnimatedCard
          index={index}
          delay={100}
          onPress={() => router.push(`/task-detail?id=${task.id}`)}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <CheckCircle2 size={20} color={AppColors.completed} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{task.title}</Text>
              <Text 
                style={[
                  styles.cardSubtitle,
                  !task.description && styles.placeholderText,
                ]} 
                numberOfLines={2}
              >
                {task.description || 'No description provided'}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <Calendar size={14} color={AppColors.textSecondary} />
              <Text style={styles.cardMetaText}>
                Completed on {formatDate(task.updatedAt)}
              </Text>
            </View>
            <Text style={styles.cardProject}>{task.projectName}</Text>
          </View>
        </AnimatedCard>
      );
    } else {
      const update = item.item as ProgressUpdate & { task?: Task };
      return (
        <AnimatedCard
          index={index}
          delay={100}
          onPress={() =>
            update.task && router.push(`/task-detail?id=${update.task.id}`)
          }
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <FileText size={20} color={AppColors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>
                Progress Update: {update.task?.title || 'Unknown Task'}
              </Text>
              <Text 
                style={[
                  styles.cardSubtitle,
                  !update.description && styles.placeholderText,
                ]} 
                numberOfLines={2}
              >
                {update.description || 'No description provided'}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <Clock size={14} color={AppColors.textSecondary} />
              <Text style={styles.cardMetaText}>
                {formatDateTime(update.created_at)}
              </Text>
            </View>
            {update.original_name && (
              <View style={styles.fileBadge}>
                <FileText size={12} color={AppColors.primary} />
                <Text style={styles.fileBadgeText} numberOfLines={1}>
                  {update.original_name}
                </Text>
              </View>
            )}
          </View>
        </AnimatedCard>
      );
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <Text style={[styles.loadingText, { color: AppColors.textSecondary }]}>
          Loading history...
        </Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.errorText, { color: AppColors.error || '#ef4444' }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: AppColors.primary }]}
          onPress={loadHistoryData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border, paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: AppColors.text }]}>History</Text>
          <Text style={[styles.headerSubtitle, { color: AppColors.textSecondary }]}>
            {filteredData.length} item{filteredData.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}>
          <Search size={20} color={AppColors.textSecondary} />
            <TextInput
            style={[styles.searchInput, { color: AppColors.text }]}
            placeholder="Search history..."
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
          {(['all', 'completed', 'updates'] as HistoryFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f ? AppColors.primary : AppColors.card,
                  borderColor: filter === f ? AppColors.primary : AppColors.border,
                },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: filter === f ? '#FFFFFF' : AppColors.textSecondary,
                  },
                ]}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'completed'
                  ? 'Completed Tasks'
                  : 'Progress Updates'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          `${item.type}-${item.type === 'task' ? (item.item as Task).id : (item.item as ProgressUpdate).id}-${index}`
        }
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
            <Clock size={48} color={AppColors.textSecondary} />
            <Text style={styles.emptyText}>No history found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Your completed tasks and progress updates will appear here'}
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
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  placeholderText: {
    fontStyle: 'italic',
    color: AppColors.textSecondary + '80',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  cardProject: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  fileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: AppColors.primary + '20',
    borderRadius: 6,
  },
  fileBadgeText: {
    fontSize: 11,
    color: AppColors.primary,
    fontWeight: '500',
    maxWidth: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

