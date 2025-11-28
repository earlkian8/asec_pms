import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mockTasks, mockUser } from '@/data/mockData';
import { AppColors, getStatusColor, getPriorityColor } from '@/utils/colors';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import Logo from '@/components/Logo';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const stats = useMemo(() => {
    const total = mockTasks.length;
    const pending = mockTasks.filter((t) => t.status === 'pending').length;
    const inProgress = mockTasks.filter((t) => t.status === 'in_progress').length;
    const completed = mockTasks.filter((t) => t.status === 'completed').length;
    const overdue = mockTasks.filter(
      (t) => t.dueDate && isOverdue(t.dueDate) && t.status !== 'completed'
    ).length;
    const critical = mockTasks.filter(
      (t) => t.priority === 'critical' && t.status !== 'completed'
    ).length;

    return { total, pending, inProgress, completed, overdue, critical };
  }, []);

  const upcomingTasks = useMemo(() => {
    return mockTasks
      .filter((t) => t.status !== 'completed' && t.dueDate)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, []);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: AppColors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: AppColors.text }]}>{user?.name || mockUser.name}</Text>
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

                return (
                  <AnimatedCard
                    key={task.id}
                    index={index}
                    delay={400}
                    onPress={() => router.push(`/task-detail?id=${task.id}`)}
                    style={styles.taskCard}
                  >
                <View style={styles.taskCardHeader}>
                  <View style={styles.taskCardTitleRow}>
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={[styles.taskCardTitle, { color: AppColors.text }]} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </View>
                  {task.priority && (
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor:
                            getPriorityColor(task.priority) + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(task.priority) },
                        ]}
                      >
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.taskCardMeta}>
                  <View style={styles.taskCardMetaItem}>
                    <Calendar
                      size={14}
                      color={overdue ? AppColors.error : AppColors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.taskCardMetaText,
                        { color: overdue ? AppColors.error : AppColors.textSecondary },
                        overdue && styles.overdueText,
                      ]}
                    >
                      {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                    </Text>
                  </View>
                    <Text style={[styles.taskCardProject, { color: AppColors.textSecondary }]}>{task.projectName}</Text>
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
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  taskCardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  taskCardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
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
  taskCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskCardMetaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  overdueText: {
    fontWeight: '600',
  },
  taskCardProject: {
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
});
