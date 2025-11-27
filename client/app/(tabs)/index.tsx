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
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useDashboard, DashboardProject } from '@/hooks/useDashboard';
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
  Phone,
  Mail,
  Bell,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import NotificationCenter from '@/components/NotificationCenter';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const { favorites, toggleFavorite, unreadCount, refreshNotifications } = useApp();
  const { statistics, projects, loading, refresh } = useDashboard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const recentProjects = activeProjects.slice(0, 3);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshNotifications()]);
    setRefreshing(false);
  }, [refresh, refreshNotifications]);

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

  const handleContact = async (project: DashboardProject, method: 'call' | 'email') => {
    if (method === 'call') {
      const phoneUrl = `tel:${FIRM_CONTACT.phone}`;
      
      Alert.alert(
        'Contact Project Manager',
        `Would you like to call ${project.projectManager}?\n\nPhone: ${FIRM_CONTACT.phone}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL(phoneUrl);
                if (canOpen) {
                  await Linking.openURL(phoneUrl);
                } else {
                  Alert.alert('Error', 'Unable to open phone dialer');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to open phone dialer');
                console.error('Error opening phone:', error);
              }
            },
          },
        ]
      );
    } else {
      const emailUrl = `mailto:${FIRM_CONTACT.email}?subject=Project Update Request: ${project.name}`;
      
      Alert.alert(
        'Contact Project Manager',
        `Would you like to email ${project.projectManager}?\n\nEmail: ${FIRM_CONTACT.email}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Email',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL(emailUrl);
                if (canOpen) {
                  await Linking.openURL(emailUrl);
                } else {
                  Alert.alert('Error', 'Unable to open email client');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to open email client');
                console.error('Error opening email:', error);
              }
            },
          },
        ]
      );
    }
  };

  const handleRequestUpdate = (project: DashboardProject) => {
    setSelectedProject(project);
    setShowRequestUpdate(true);
  };

  const ProjectCard = ({ project }: { project: DashboardProject }) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#D1FAE5', text: '#065F46' }, // green-100/green-700
      'on-hold': { bg: '#FEF3C7', text: '#92400E' }, // yellow-100/yellow-700
      completed: { bg: '#DBEAFE', text: '#1E40AF' }, // blue-100/blue-700
      pending: { bg: '#F3F4F6', text: '#4B5563' }, // gray-100/gray-600
    };

    const status = statusColors[project.status] || statusColors.pending;
    const isFavorite = favorites.has(project.id);

    return (
      <View style={[styles.projectCard, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity
          onPress={() => router.push(`/project/${project.id}`)}
          activeOpacity={0.7}>
          <View style={styles.projectHeader}>
            <View style={styles.projectTitleContainer}>
              <View style={styles.projectTitleRow}>
                <Text style={[styles.projectName, { color: textColor }]} numberOfLines={1}>
                  {project.name}
                </Text>
                {/* <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(project.id);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Star
                    size={20}
                    color={isFavorite ? '#F59E0B' : textSecondary}
                    fill={isFavorite ? '#F59E0B' : 'none'}
                  />
                </TouchableOpacity> */}
              </View>
              <Text style={[styles.projectLocation, { color: textSecondary }]} numberOfLines={1}>
                {project.location}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>
                {project.status.replace('-', ' ').toUpperCase()}
              </Text>
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
            <View style={styles.projectInfo}>
              <Coins size={14} color={textSecondary} />
              <Text style={[styles.projectInfoText, { color: textSecondary }]}>
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
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSmall]}
            onPress={() => handleShare(project)}>
            <Share2 size={16} color={textSecondary} />
          </TouchableOpacity> */}
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

            {/* Budget Overview */}
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
          </>
        )}

        {loading && !statistics && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: textSecondary }]}>Loading dashboard...</Text>
          </View>
        )}

        {/* Recent Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Active Projects</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
              <Text style={[styles.seeAll, { color: '#3B82F6' }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: textSecondary }]}>No active projects</Text>
            </View>
          )}
        </View>
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
});
