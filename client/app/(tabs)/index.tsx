import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useDashboard, DashboardProject } from '@/hooks/useDashboard';
import { useBillings } from '@/hooks/useBillings';
import { FIRM_CONTACT } from '@/constants/contact';
import {
  Briefcase,
  Wallet,
  CheckCircle,
  Clock,
  Receipt,
  AlertCircle,
  Bell,
} from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import NotificationCenter from '@/components/NotificationCenter';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import StatBox from '@/components/ui/StatBox';
import ProjectCard from '@/components/cards/ProjectCard';
import BillingCard from '@/components/cards/BillingCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';
import { useDialog } from '@/contexts/DialogContext';

export default function HomeScreen() {
  const { user, displayBillingModule } = useAuth();
  const { unreadCount, refreshNotifications } = useApp();
  const { statistics, projects, loading, refresh } = useDashboard();
  const { billings, loading: billingsLoading, refresh: refreshBillings } = useBillings({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const recentProjects = activeProjects.slice(0, 3);
  const recentBillings = billings.slice(0, 5);

  // Calculate billing statistics
  const billingStats = React.useMemo(() => {
    const unpaid = billings.filter((b) => b.status === 'unpaid').length;
    const partial = billings.filter((b) => b.status === 'partial').length;
    const paid = billings.filter((b) => b.status === 'paid').length;
    const totalUnpaid = billings
      .filter((b) => b.status === 'unpaid' || b.status === 'partial')
      .reduce((sum, b) => sum + b.remaining_amount, 0);
    const overdue = billings.filter((b) => {
      if (!b.due_date) return false;
      const dueDate = new Date(b.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (b.status === 'unpaid' || b.status === 'partial') && dueDate < today;
    }).length;

    return { unpaid, partial, paid, totalUnpaid, overdue };
  }, [billings]);

  // Get payment status for a project
  const getProjectPaymentStatus = (projectId: string) => {
    const projectBillings = billings.filter((b) => b.project.id.toString() === projectId.toString());
    if (projectBillings.length === 0) return null;
    
    const hasUnpaid = projectBillings.some((b) => b.status === 'unpaid');
    const hasPartial = projectBillings.some((b) => b.status === 'partial');
    const totalUnpaid = projectBillings
      .filter((b) => b.status === 'unpaid' || b.status === 'partial')
      .reduce((sum, b) => sum + b.remaining_amount, 0);

    if (hasUnpaid) return { status: 'unpaid' as const, amount: totalUnpaid };
    if (hasPartial) return { status: 'partial' as const, amount: totalUnpaid };
    return { status: 'paid' as const, amount: 0 };
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshBillings(), refreshNotifications()]);
    setRefreshing(false);
  }, [refresh, refreshBillings, refreshNotifications]);

  const handleContact = async (project: DashboardProject) => {
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

  const handleRequestUpdate = (project: DashboardProject) => {
    setSelectedProject(project);
    setShowRequestUpdate(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: AppColors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: AppColors.text }]}>
              {user?.name || 'Client'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}
            onPress={() => setShowNotifications(true)}>
            <Bell size={20} color={AppColors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics Grid */}
        {statistics && (
          <>
            <AnimatedView delay={100}>
              <View style={styles.statsGrid}>
              {/* Row 1: Active Projects and On Time - 2 Columns */}
              <View style={styles.twoColumnRow}>
                <View style={styles.halfWidthCard}>
                  <StatBox
                    title="Active Projects"
                    value={statistics.activeProjects}
                    Icon={Briefcase}
                    color={AppColors.primary}
                    gradient={['#3B82F6', '#2563EB']}
                  />
                </View>
                <View style={styles.halfWidthCard}>
                  <StatBox
                    title="On Time"
                    value={statistics.onTimeProjects}
                    Icon={Clock}
                    color={AppColors.warning}
                    gradient={['#F59E0B', '#D97706']}
                  />
                </View>
              </View>
              
              {/* Row 2: Total Budget - Full Width */}
              <View style={styles.fullWidthCard}>
                <StatBox
                  title="Total Budget"
                  value={formatCurrency(statistics.totalBudget)}
                  Icon={Wallet}
                  color={AppColors.success}
                  gradient={['#10B981', '#059669']}
                />
              </View>
              
              {/* Row 3: Completed - Full Width */}
              <View style={styles.fullWidthCard}>
                <StatBox
                  title="Completed"
                  value={statistics.completedProjects}
                  Icon={CheckCircle}
                  color="#8B5CF6"
                  gradient={['#8B5CF6', '#7C3AED']}
                />
              </View>
            </View>
            </AnimatedView>

            {/* Budget Overview */}
            <AnimatedView delay={200}>
              <View style={[styles.budgetCard, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
              <Text style={[styles.sectionTitle, { color: AppColors.text }]}>Budget Overview</Text>
              <View style={styles.budgetInfo}>
                <View style={styles.budgetRow}>
                  <Text style={[styles.budgetLabel, { color: AppColors.textSecondary }]}>Total Spent</Text>
                  <Text style={[styles.budgetValue, { color: AppColors.text }]}>
                    {formatCurrency(statistics.totalSpent)}
                  </Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={[styles.budgetLabel, { color: AppColors.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.budgetValue, { color: AppColors.success }]}>
                    {formatCurrency(statistics.totalBudget - statistics.totalSpent)}
                  </Text>
                </View>
              </View>
              <View style={[styles.budgetBar, { backgroundColor: AppColors.border }]}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${statistics.totalBudget > 0 ? (statistics.totalSpent / statistics.totalBudget) * 100 : 0}%`,
                      backgroundColor: AppColors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.budgetPercent, { color: AppColors.textSecondary }]}>
                {statistics.totalBudget > 0 ? Math.round((statistics.totalSpent / statistics.totalBudget) * 100) : 0}% of budget used
              </Text>
            </View>
            </AnimatedView>

            {/* Billing Summary - only when billing module is enabled */}
            {displayBillingModule && (
              <AnimatedView delay={250}>
                <View style={[styles.billingSummaryCard, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
                  <View style={styles.billingSummaryHeader}>
                    <Receipt size={20} color={AppColors.text} />
                    <Text style={[styles.sectionTitle, { color: AppColors.text, marginLeft: 8 }]}>Billing Summary</Text>
                  </View>
                  <View style={styles.billingStatsGrid}>
                    <View style={styles.billingStatItem}>
                      <View style={[styles.billingStatDot, { backgroundColor: AppColors.error }]} />
                      <Text style={[styles.billingStatValue, { color: AppColors.text }]}>{billingStats.unpaid}</Text>
                      <Text style={[styles.billingStatLabel, { color: AppColors.textSecondary }]}>Unpaid</Text>
                    </View>
                    <View style={styles.billingStatItem}>
                      <View style={[styles.billingStatDot, { backgroundColor: AppColors.warning }]} />
                      <Text style={[styles.billingStatValue, { color: AppColors.text }]}>{billingStats.partial}</Text>
                      <Text style={[styles.billingStatLabel, { color: AppColors.textSecondary }]}>Partial</Text>
                    </View>
                    <View style={styles.billingStatItem}>
                      <View style={[styles.billingStatDot, { backgroundColor: AppColors.success }]} />
                      <Text style={[styles.billingStatValue, { color: AppColors.text }]}>{billingStats.paid}</Text>
                      <Text style={[styles.billingStatLabel, { color: AppColors.textSecondary }]}>Paid</Text>
                    </View>
                    {billingStats.overdue > 0 && (
                      <View style={styles.billingStatItem}>
                        <AlertCircle size={16} color={AppColors.error} />
                        <Text style={[styles.billingStatValue, { color: AppColors.error }]}>{billingStats.overdue}</Text>
                        <Text style={[styles.billingStatLabel, { color: AppColors.textSecondary }]}>Overdue</Text>
                      </View>
                    )}
                  </View>
                  {billingStats.totalUnpaid > 0 && (
                    <View style={styles.totalUnpaidSection}>
                      <Text style={[styles.totalUnpaidLabel, { color: AppColors.textSecondary }]}>Total Outstanding</Text>
                      <Text style={[styles.totalUnpaidValue, { color: AppColors.error }]}>
                        {formatCurrency(billingStats.totalUnpaid)}
                      </Text>
                    </View>
                  )}
                </View>
              </AnimatedView>
            )}
          </>
        )}

        {loading && !statistics && (
          <LoadingState message="Loading dashboard..." />
        )}

        {/* Recent Billings - only when billing module is enabled in client app */}
        {displayBillingModule && (
          <AnimatedView delay={300}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: AppColors.text }]}>Recent Billings</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/billings')}>
                  <Text style={[styles.seeAll, { color: AppColors.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              {billingsLoading ? (
                <LoadingState message="Loading billings..." />
              ) : recentBillings.length > 0 ? (
                recentBillings.map((billing, index) => (
                  <BillingCard
                    key={billing.id}
                    billing={billing}
                    index={index}
                    onPress={() => router.push(`/billing-detail?id=${billing.id}`)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No recent billings"
                  iconSize={48}
                />
              )}
            </View>
          </AnimatedView>
        )}

        {/* Recent Projects */}
        <AnimatedView delay={400}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: AppColors.text }]}>Active Projects</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
              <Text style={[styles.seeAll, { color: AppColors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentProjects.length > 0 ? (
            recentProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={{
                  id: project.id,
                  name: project.name,
                  location: project.location,
                  status: project.status,
                  progress: project.progress,
                  expectedCompletion: project.expectedCompletion,
                  budget: project.budget,
                  spent: project.spent,
                  projectManager: project.projectManager,
                }}
                index={index}
                onPress={() => router.push(`/project/${project.id}`)}
                onContact={(p) => handleContact(project)}
                onRequestUpdate={(p) => handleRequestUpdate(project)}
                paymentStatus={getProjectPaymentStatus(project.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No active projects"
              iconSize={48}
            />
          )}
          </View>
        </AnimatedView>
      </ScrollView>

      {/* Modals */}
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

      <NotificationCenter
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
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
  budgetCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  budgetInfo: {
    marginTop: 16,
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  budgetBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercent: {
    fontSize: 12,
    textAlign: 'center',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  billingSummaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  billingSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  billingStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  billingStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  billingStatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  billingStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  billingStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalUnpaidSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalUnpaidLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalUnpaidValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
