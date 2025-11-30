import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  FileText,
  ArrowRight,
  BarChart3,
  Folder,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors, getStatusColor, getPriorityColor } from '@/utils/colors';
import { formatDate, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Task } from '@/types';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import Logo from '@/components/Logo';

interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  critical: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    critical: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics and upcoming tasks in parallel
      const [statsResponse, tasksResponse] = await Promise.all([
        apiService.get<DashboardStats>('/task-management/dashboard/statistics'),
        apiService.get<Task[]>('/task-management/dashboard/upcoming-tasks?limit=5'),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (tasksResponse.success && tasksResponse.data) {
        setUpcomingTasks(Array.isArray(tasksResponse.data) ? tasksResponse.data : []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    gradient,
    onPress,
  }: {
    icon: any;
    label: string;
    value: number;
    color: string;
    gradient: readonly [string, string];
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradient as [string, string]}
        style={styles.statIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon size={24} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: AppColors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={AppColors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: AppColors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: AppColors.text }]}>{user?.name || 'User'}</Text>
        </View>
        <Logo width={120} height={30} />
      </View>

        {/* Stats Grid */}
        <AnimatedView delay={100}>
          <View style={styles.statsGrid}>
            <View style={styles.twoColumnRow}>
              <View style={styles.halfWidthCard}>
                <StatCard
                  icon={BarChart3}
                  label="Total Tasks"
                  value={stats.total}
                  color={AppColors.primary}
                  gradient={['#3B82F6', '#2563EB']}
                  onPress={() => router.push('/(tabs)/tasks')}
                />
              </View>
              <View style={styles.halfWidthCard}>
                <StatCard
                  icon={Clock}
                  label="In Progress"
                  value={stats.inProgress}
                  color={AppColors.inProgress}
                  gradient={['#3B82F6', '#2563EB']}
                  onPress={() => router.push('/(tabs)/tasks?filter=in_progress')}
                />
              </View>
            </View>
            <View style={styles.fullWidthCard}>
              <StatCard
                icon={CheckCircle2}
                label="Completed"
                value={stats.completed}
                color={AppColors.completed}
                gradient={['#10B981', '#059669']}
                onPress={() => router.push('/(tabs)/history')}
              />
            </View>
            <View style={styles.fullWidthCard}>
              <StatCard
                icon={AlertCircle}
                label="Overdue"
                value={stats.overdue}
                color={AppColors.error}
                gradient={['#EF4444', '#DC2626']}
                onPress={() => router.push('/(tabs)/tasks?filter=overdue')}
              />
            </View>
          </View>
        </AnimatedView>

        {/* Priority Alert */}
        {stats.critical > 0 && (
          <AnimatedView delay={200}>
            <AnimatedCard
              onPress={() => router.push('/(tabs)/tasks?filter=critical')}
              style={[styles.alertCard, { backgroundColor: AppColors.warning + '10', borderColor: AppColors.warning + '30' }]}>
              <View style={[styles.alertIconContainer, { backgroundColor: AppColors.warning + '20' }]}>
                <AlertCircle size={24} color={AppColors.critical} />
              </View>
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: AppColors.text }]}>Critical Tasks</Text>
                <Text style={[styles.alertText, { color: AppColors.textSecondary }]}>
                  You have {stats.critical} critical task{stats.critical !== 1 ? 's' : ''} requiring immediate attention
                </Text>
              </View>
              <ArrowRight size={20} color={AppColors.critical} />
            </AnimatedCard>
          </AnimatedView>
        )}

        {/* Upcoming Tasks */}
        <AnimatedView delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Calendar size={20} color={AppColors.text} />
                <Text style={[styles.sectionTitle, { color: AppColors.text }]}>Upcoming Tasks</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={[styles.seeAllText, { color: AppColors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, index) => {
                const statusColor = getStatusColor(task.status);
                const overdue = task.dueDate && isOverdue(task.dueDate);
                const daysUntil = task.dueDate ? getDaysUntilDue(task.dueDate) : null;

                return (
                  <AnimatedCard
                    key={task.id}
                    index={index}
                    delay={400}
                    onPress={() => router.push(`/task-detail?id=${task.id}`)}
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
                          {task.title}
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
                            {task.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.taskDescription, { color: AppColors.textSecondary }]} numberOfLines={2}>
                      {task.description || 'No description provided for this task.'}
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
                            {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                            {overdue && ' (Overdue)'}
                            {!overdue && daysUntil !== null && daysUntil <= 3 && daysUntil > 0 && ` (${daysUntil}d left)`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Folder size={14} color={AppColors.textSecondary} />
                          <Text style={[styles.metaText, { color: AppColors.textSecondary }]}>{task.projectName}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.taskFooter, { borderTopColor: AppColors.border }]}>
                      <Text style={[styles.milestoneText, { color: AppColors.textSecondary }]}>{task.milestoneName}</Text>
                      <ChevronRight size={20} color={AppColors.textSecondary} />
                    </View>
                  </AnimatedCard>
                );
              })
            ) : (
              <AnimatedView delay={400}>
                <View style={[styles.emptyState, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
                  <CheckCircle2 size={32} color={AppColors.success} />
                  <Text style={[styles.emptyText, { color: AppColors.text }]}>All caught up!</Text>
                  <Text style={[styles.emptySubtext, { color: AppColors.textSecondary }]}>
                    You have no upcoming tasks
                  </Text>
                </View>
              </AnimatedView>
            )}
          </View>
        </AnimatedView>

        {/* Quick Actions */}
        <AnimatedView delay={500}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: AppColors.text }]}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <AnimatedCard
                index={0}
                delay={600}
                onPress={() => router.push('/(tabs)/tasks')}
                style={styles.quickActionCard}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: AppColors.primary + '20' }]}>
                  <FileText size={24} color={AppColors.primary} />
                </View>
                <Text style={[styles.quickActionText, { color: AppColors.text }]}>View All Tasks</Text>
              </AnimatedCard>
              <AnimatedCard
                index={1}
                delay={650}
                onPress={() => router.push('/(tabs)/history')}
                style={styles.quickActionCard}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: AppColors.success + '20' }]}>
                  <TrendingUp size={24} color={AppColors.success} />
                </View>
                <Text style={[styles.quickActionText, { color: AppColors.text }]}>View History</Text>
              </AnimatedCard>
            </View>
          </View>
        </AnimatedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidthCard: {
    flex: 1,
  },
  fullWidthCard: {
    width: '100%',
  },
  statCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertButton: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
});
