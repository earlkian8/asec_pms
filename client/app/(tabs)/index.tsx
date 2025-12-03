import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useDashboard, DashboardProject } from '@/hooks/useDashboard';
import { useBillings, Billing } from '@/hooks/useBillings';
import { FIRM_CONTACT } from '@/constants/contact';
import {
  Briefcase,
  Wallet,
  CheckCircle,
  Clock,
  Calendar,
  Coins,
  TrendingUp,
  Share2,
  Mail,
  Bell,
  Star,
  Receipt,
  AlertCircle,
  CreditCard,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import NotificationCenter from '@/components/NotificationCenter';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import { useDialog } from '@/contexts/DialogContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const { favorites, toggleFavorite, unreadCount, refreshNotifications } = useApp();
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

  const StatCard = ({
    title,
    value,
    Icon,
    color,
    gradient,
  }: {
    title: string;
    value: string | number;
    Icon: React.ComponentType<{ size: number; color: string }>;
    color: string;
    gradient: readonly [string, string];
  }) => (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
      <LinearGradient
        colors={gradient as [string, string]}
        style={styles.statIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Icon size={24} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: textSecondary }]}>{title}</Text>
      </View>
    </View>
  );

  const handleShare = async (project: DashboardProject) => {
    try {
      await Share.share({
        message: `Project: ${project.name}\nStatus: ${project.status}\nProgress: ${project.progress}%\nLocation: ${project.location}\nBudget: ${formatCurrency(project.budget)}`,
        title: project.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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

  const ProjectCard = ({ project, index }: { project: DashboardProject; index: number }) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#D1FAE5', text: '#065F46' }, // green-100/green-700
      'on-hold': { bg: '#FEF3C7', text: '#92400E' }, // yellow-100/yellow-700
      completed: { bg: '#DBEAFE', text: '#1E40AF' }, // blue-100/blue-700
      pending: { bg: '#F3F4F6', text: '#4B5563' }, // gray-100/gray-600
    };

    const paymentStatusColors: Record<string, { bg: string; text: string }> = {
      unpaid: { bg: '#FEE2E2', text: '#991B1B' },
      partial: { bg: '#FEF3C7', text: '#92400E' },
      paid: { bg: '#D1FAE5', text: '#065F46' },
    };

    const status = statusColors[project.status] || statusColors.pending;
    const isFavorite = favorites.has(project.id);
    const paymentStatus = getProjectPaymentStatus(project.id);
    const paymentColor = paymentStatus ? paymentStatusColors[paymentStatus.status] : null;

    return (
      <AnimatedCard
        index={index}
        delay={400}
        onPress={() => router.push(`/project/${project.id}`)}
        style={[styles.projectCard, { backgroundColor: cardBg, borderColor }]}>
        <View>
          <View style={styles.projectHeader}>
            <View style={styles.projectTitleContainer}>
              <View style={styles.projectTitleRow}>
                <Text style={[styles.projectName, { color: textColor }]} numberOfLines={1}>
                  {project.name}
                </Text>
              </View>
              <Text style={[styles.projectLocation, { color: textSecondary }]} numberOfLines={1}>
                {project.location || 'No location specified'}
              </Text>
            </View>
            <View style={styles.badgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.text }]}>
                  {project.status.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
              {paymentStatus && paymentStatus.status !== 'paid' && paymentColor && (
                <View style={[styles.paymentBadge, { backgroundColor: paymentColor.bg }]}>
                  <CreditCard size={10} color={paymentColor.text} />
                  <Text style={[styles.paymentBadgeText, { color: paymentColor.text }]}>
                    {paymentStatus.status === 'unpaid' ? 'UNPAID' : 'PARTIAL'}
                  </Text>
                </View>
              )}
            </View>
          </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: textSecondary }]}>Progress</Text>
            <Text style={[styles.progressPercent, { color: textColor }]}>{project.progress}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${project.progress}%`, backgroundColor: '#3B82F6' },
              ]}
            />
          </View>
        </View>

          <View style={styles.projectFooter}>
            <View style={styles.projectInfo}>
              <Calendar size={14} color={textSecondary} />
              <Text style={[styles.projectInfoText, { color: textSecondary }]}>
                Due: {new Date(project.expectedCompletion).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            {paymentStatus && paymentStatus.status !== 'paid' && (
              <View style={styles.paymentInfo}>
                <AlertCircle size={14} color={paymentStatus.status === 'unpaid' ? '#EF4444' : '#F59E0B'} />
                <Text style={[styles.paymentInfoText, { color: paymentStatus.status === 'unpaid' ? '#EF4444' : '#F59E0B' }]}>
                  {formatCurrency(paymentStatus.amount)} {paymentStatus.status === 'unpaid' ? 'unpaid' : 'remaining'}
                </Text>
              </View>
            )}
          </View>

          {/* Budget Section */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetInfoRow}>
                <Coins size={16} color={textSecondary} />
                <Text style={[styles.budgetLabel, { color: textSecondary }]}>Budget Usage</Text>
              </View>
              <Text style={[styles.budgetPercent, { color: textColor }]}>
                {Math.round((project.spent / project.budget) * 100)}%
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
                    width: `${Math.min((project.spent / project.budget) * 100, 100)}%`,
                    backgroundColor: (project.spent / project.budget) * 100 > 90 ? '#EF4444' : (project.spent / project.budget) * 100 > 75 ? '#F59E0B' : '#10B981',
                  },
                ]}
              />
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
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: textColor }]}>
              {user?.name || 'Client'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: cardBg, borderColor }]}
            onPress={() => setShowNotifications(true)}>
            <Bell size={20} color={textColor} />
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
                  <StatCard
                    title="Active Projects"
                    value={statistics.activeProjects}
                    Icon={Briefcase}
                    color="#3B82F6"
                    gradient={['#3B82F6', '#2563EB']}
                  />
                </View>
                <View style={styles.halfWidthCard}>
                  <StatCard
                    title="On Time"
                    value={statistics.onTimeProjects}
                    Icon={Clock}
                    color="#F59E0B"
                    gradient={['#F59E0B', '#D97706']}
                  />
                </View>
              </View>
              
              {/* Row 2: Total Budget - Full Width */}
              <View style={styles.fullWidthCard}>
                <StatCard
                  title="Total Budget"
                  value={formatCurrency(statistics.totalBudget)}
                  Icon={Wallet}
                  color="#10B981"
                  gradient={['#10B981', '#059669']}
                />
              </View>
              
              {/* Row 3: Completed - Full Width */}
              <View style={styles.fullWidthCard}>
                <StatCard
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
              <View style={[styles.budgetCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Budget Overview</Text>
              <View style={styles.budgetInfo}>
                <View style={styles.budgetRow}>
                  <Text style={[styles.budgetLabel, { color: textSecondary }]}>Total Spent</Text>
                  <Text style={[styles.budgetValue, { color: textColor }]}>
                    {formatCurrency(statistics.totalSpent)}
                  </Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={[styles.budgetLabel, { color: textSecondary }]}>Remaining</Text>
                  <Text style={[styles.budgetValue, { color: '#10B981' }]}>
                    {formatCurrency(statistics.totalBudget - statistics.totalSpent)}
                  </Text>
                </View>
              </View>
              <View style={[styles.budgetBar, { backgroundColor: '#E5E7EB' }]}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${statistics.totalBudget > 0 ? (statistics.totalSpent / statistics.totalBudget) * 100 : 0}%`,
                      backgroundColor: '#3B82F6',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.budgetPercent, { color: textSecondary }]}>
                {statistics.totalBudget > 0 ? Math.round((statistics.totalSpent / statistics.totalBudget) * 100) : 0}% of budget used
              </Text>
            </View>
            </AnimatedView>

            {/* Billing Summary */}
            <AnimatedView delay={250}>
              <View style={[styles.billingSummaryCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.billingSummaryHeader}>
                  <Receipt size={20} color={textColor} />
                  <Text style={[styles.sectionTitle, { color: textColor, marginLeft: 8 }]}>Billing Summary</Text>
                </View>
                <View style={styles.billingStatsGrid}>
                  <View style={styles.billingStatItem}>
                    <View style={[styles.billingStatDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.billingStatValue, { color: textColor }]}>{billingStats.unpaid}</Text>
                    <Text style={[styles.billingStatLabel, { color: textSecondary }]}>Unpaid</Text>
                  </View>
                  <View style={styles.billingStatItem}>
                    <View style={[styles.billingStatDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.billingStatValue, { color: textColor }]}>{billingStats.partial}</Text>
                    <Text style={[styles.billingStatLabel, { color: textSecondary }]}>Partial</Text>
                  </View>
                  <View style={styles.billingStatItem}>
                    <View style={[styles.billingStatDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.billingStatValue, { color: textColor }]}>{billingStats.paid}</Text>
                    <Text style={[styles.billingStatLabel, { color: textSecondary }]}>Paid</Text>
                  </View>
                  {billingStats.overdue > 0 && (
                    <View style={styles.billingStatItem}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text style={[styles.billingStatValue, { color: '#EF4444' }]}>{billingStats.overdue}</Text>
                      <Text style={[styles.billingStatLabel, { color: textSecondary }]}>Overdue</Text>
                    </View>
                  )}
                </View>
                {billingStats.totalUnpaid > 0 && (
                  <View style={styles.totalUnpaidSection}>
                    <Text style={[styles.totalUnpaidLabel, { color: textSecondary }]}>Total Outstanding</Text>
                    <Text style={[styles.totalUnpaidValue, { color: '#EF4444' }]}>
                      {formatCurrency(billingStats.totalUnpaid)}
                    </Text>
                  </View>
                )}
              </View>
            </AnimatedView>
          </>
        )}

        {loading && !statistics && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: textSecondary }]}>Loading dashboard...</Text>
          </View>
        )}

        {/* Recent Billings */}
        <AnimatedView delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Billings</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/billings')}>
                <Text style={[styles.seeAll, { color: '#3B82F6' }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {billingsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: textSecondary }]}>Loading billings...</Text>
              </View>
            ) : recentBillings.length > 0 ? (
              recentBillings.map((billing, index) => {
                const billingStatusColors: Record<string, { bg: string; text: string }> = {
                  unpaid: { bg: '#FEE2E2', text: '#991B1B' },
                  partial: { bg: '#FEF3C7', text: '#92400E' },
                  paid: { bg: '#D1FAE5', text: '#065F46' },
                };
                const billingStatus = billingStatusColors[billing.status] || billingStatusColors.unpaid;
                const isOverdue = billing.due_date && 
                  new Date(billing.due_date) < new Date() && 
                  (billing.status === 'unpaid' || billing.status === 'partial');

                return (
                  <AnimatedCard
                    key={billing.id}
                    index={index}
                    delay={350 + index * 50}
                    onPress={() => router.push(`/billing-detail?id=${billing.id}`)}
                    style={[styles.billingCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.billingCardHeader}>
                      <View style={styles.billingCardTitleContainer}>
                        <View style={styles.billingTitleRow}>
                          <View style={[styles.billingStatusDot, { backgroundColor: billingStatus.text }]} />
                          <Text style={[styles.billingCode, { color: textColor }]} numberOfLines={1}>
                            {billing.billing_code}
                          </Text>
                        </View>
                        <Text style={[styles.billingProject, { color: textSecondary }]} numberOfLines={1}>
                          {billing.project.project_name}
                        </Text>
                      </View>
                      <View style={[styles.billingStatusBadge, { backgroundColor: billingStatus.bg }]}>
                        <Text style={[styles.billingStatusText, { color: billingStatus.text }]}>
                          {billing.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.billingCardBody}>
                      <View style={styles.billingAmountRow}>
                        <Text style={[styles.billingAmountLabel, { color: textSecondary }]}>Amount</Text>
                        <Text style={[styles.billingAmountValue, { color: textColor }]}>
                          {formatCurrency(billing.billing_amount)}
                        </Text>
                      </View>
                      <View style={styles.billingAmountRow}>
                        <Text style={[styles.billingAmountLabel, { color: textSecondary }]}>Paid</Text>
                        <Text style={[styles.billingAmountValue, { color: '#10B981' }]}>
                          {formatCurrency(billing.total_paid)}
                        </Text>
                      </View>
                      {billing.remaining_amount > 0 && (
                        <View style={styles.billingAmountRow}>
                          <Text style={[styles.billingAmountLabel, { color: textSecondary }]}>Remaining</Text>
                          <Text style={[styles.billingAmountValue, { color: '#EF4444' }]}>
                            {formatCurrency(billing.remaining_amount)}
                          </Text>
                        </View>
                      )}
                      {billing.due_date && (
                        <View style={styles.billingDueDateRow}>
                          <Calendar size={12} color={isOverdue ? '#EF4444' : textSecondary} />
                          <Text style={[
                            styles.billingDueDate, 
                            { color: isOverdue ? '#EF4444' : textSecondary }
                          ]}>
                            Due: {new Date(billing.due_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                            {isOverdue && ' (Overdue)'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </AnimatedCard>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: textSecondary }]}>No recent billings</Text>
              </View>
            )}
          </View>
        </AnimatedView>

        {/* Recent Projects */}
        <AnimatedView delay={400}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Active Projects</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
              <Text style={[styles.seeAll, { color: '#3B82F6' }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentProjects.length > 0 ? (
            recentProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: textSecondary }]}>No active projects</Text>
            </View>
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
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
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
  projectCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  projectTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectLocation: {
    fontSize: 13,
    fontWeight: '400',
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
  progressContainer: {
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
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectInfoText: {
    fontSize: 12,
    fontWeight: '500',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  paymentInfoText: {
    fontSize: 12,
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
  billingCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  billingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billingCardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  billingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  billingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  billingCode: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  billingProject: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 16,
  },
  billingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  billingStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  billingCardBody: {
    gap: 8,
  },
  billingAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingAmountLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  billingAmountValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  billingDueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  billingDueDate: {
    fontSize: 12,
    fontWeight: '500',
  },
});
