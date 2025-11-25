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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { mockProjects, Milestone } from '@/data/mockData';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, Mail, Share2, Download, Star, FileText, AlertCircle } from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import IssueReportModal from '@/components/IssueReportModal';
import DocumentViewer from '@/components/DocumentViewer';

const { width } = Dimensions.get('window');

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { favorites, toggleFavorite } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);
  const [showIssueReport, setShowIssueReport] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  const project = mockProjects.find((p) => p.id === id);

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: '#F3F4F6' }]}>
        <Text style={{ color: '#111827' }}>Project not found</Text>
      </View>
    );
  }

  const [selectedTab, setSelectedTab] = useState<'overview' | 'milestones' | 'updates'>('overview');
  const isFavorite = favorites.has(project.id);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Success', 'Project data refreshed successfully');
    }, 1500);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Project: ${project.name}\nStatus: ${project.status}\nProgress: ${project.progress}%\nLocation: ${project.location}\nBudget: ${formatCurrency(project.budget)}\nDescription: ${project.description}`,
        title: project.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContact = (method: 'call' | 'email') => {
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

  const handleExport = () => {
    Alert.alert(
      'Export Project',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'PDF',
          onPress: () => Alert.alert('Info', 'PDF export functionality would generate a PDF report for this project'),
        },
        {
          text: 'Excel',
          onPress: () => Alert.alert('Info', 'Excel export functionality would generate an Excel file'),
        },
      ]
    );
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

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' }, // green-100/green-700
    'on-hold': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }, // yellow-100/yellow-700
    completed: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' }, // blue-100/blue-700
    pending: { bg: '#F3F4F6', text: '#4B5563', dot: '#6B7280' }, // gray-100/gray-600
  };

  const status = statusColors[project.status] || statusColors.pending;

  const StatBox = ({
    label,
    value,
    icon,
    color,
  }: {
    label: string;
    value: string | number;
    icon: string;
    color: string;
  }) => (
    <View style={[styles.statBox, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: textSecondary }]}>{label}</Text>
    </View>
  );

  const MilestoneCard = ({ milestone }: { milestone: Milestone }) => {
    const milestoneStatusColors: Record<string, { bg: string; text: string; icon: string }> = {
      completed: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' }, // green-100/green-700
      'in-progress': { bg: '#DBEAFE', text: '#1E40AF', icon: 'time' }, // blue-100/blue-700
      pending: { bg: '#F3F4F6', text: '#4B5563', icon: 'hourglass-outline' }, // gray-100/gray-600
      'on-hold': { bg: '#FEF3C7', text: '#92400E', icon: 'pause-circle' }, // yellow-100/yellow-700
    };

    const msStatus = milestoneStatusColors[milestone.status] || milestoneStatusColors.pending;

    return (
      <View style={[styles.milestoneCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.milestoneHeader}>
          <View style={styles.milestoneTitleRow}>
            <View style={[styles.milestoneStatusBadge, { backgroundColor: msStatus.bg }]}>
              <Ionicons name={msStatus.icon as any} size={14} color={msStatus.text} />
              <Text style={[styles.milestoneStatusText, { color: msStatus.text }]}>
                {milestone.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.milestoneName, { color: textColor }]}>{milestone.name}</Text>
          <Text style={[styles.milestoneDescription, { color: textSecondary }]}>
            {milestone.description}
          </Text>
        </View>

        <View style={styles.milestoneProgress}>
          <View style={styles.milestoneProgressHeader}>
            <Text style={[styles.milestoneProgressLabel, { color: textSecondary }]}>Progress</Text>
            <Text style={[styles.milestoneProgressPercent, { color: textColor }]}>
              {milestone.progress}%
            </Text>
          </View>
          <View style={[styles.milestoneProgressBar, { backgroundColor: '#E5E7EB' }]}>
            <LinearGradient
              colors={milestone.status === 'completed' ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.milestoneProgressFill, { width: `${milestone.progress}%` }]}
            />
          </View>
        </View>

        <View style={styles.milestoneInfo}>
          <View style={styles.milestoneInfoItem}>
            <Ionicons name="calendar-outline" size={14} color={textSecondary} />
            <Text style={[styles.milestoneInfoText, { color: textSecondary }]}>
              Due: {new Date(milestone.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          {milestone.completedDate && (
            <View style={styles.milestoneInfoItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
              <Text style={[styles.milestoneInfoText, { color: '#10B981' }]}>
                Completed: {new Date(milestone.completedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {milestone.tasks && milestone.tasks.length > 0 && (
          <View style={styles.tasksContainer}>
            <Text style={[styles.tasksTitle, { color: textColor }]}>Tasks</Text>
            {milestone.tasks.map((task) => {
              const taskStatusColors: Record<string, { color: string; icon: string }> = {
                completed: { color: '#10B981', icon: 'checkmark-circle' },
                'in-progress': { color: '#3B82F6', icon: 'time' },
                pending: { color: '#6B7280', icon: 'ellipse-outline' },
              };
              const taskStatus = taskStatusColors[task.status] || taskStatusColors.pending;

              return (
                <View key={task.id} style={styles.taskItem}>
                  <Ionicons name={taskStatus.icon as any} size={16} color={taskStatus.color} />
                  <Text style={[styles.taskName, { color: textColor }]}>{task.name}</Text>
                  <Text style={[styles.taskAssignee, { color: textSecondary }]}>
                    {task.assignedTo}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const UpdateCard = ({ update }: { update: typeof project.recentUpdates[0] }) => {
    const updateTypeColors: Record<string, { bg: string; icon: string }> = {
      progress: { bg: '#3B82F6', icon: 'trending-up' },
      milestone: { bg: '#10B981', icon: 'flag' },
      issue: { bg: '#EF4444', icon: 'alert-circle' },
      general: { bg: '#8B5CF6', icon: 'information-circle' },
    };

    const updateType = updateTypeColors[update.type] || updateTypeColors.general;

    return (
      <View style={[styles.updateCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.updateHeader}>
          <View style={[styles.updateIconContainer, { backgroundColor: `${updateType.bg}15` }]}>
            <Ionicons name={updateType.icon as any} size={20} color={updateType.bg} />
          </View>
          <View style={styles.updateContent}>
            <Text style={[styles.updateTitle, { color: textColor }]}>{update.title}</Text>
            <Text style={[styles.updateDate, { color: textSecondary }]}>
              {new Date(update.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} • {update.author}
            </Text>
          </View>
        </View>
        <Text style={[styles.updateDescription, { color: textSecondary }]}>
          {update.description}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
              {project.name}
            </Text>
            <TouchableOpacity
              onPress={() => toggleFavorite(project.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Star
                size={24}
                color={isFavorite ? '#F59E0B' : textSecondary}
                fill={isFavorite ? '#F59E0B' : 'none'}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.headerSubtitle}>
            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[styles.headerSubtitleText, { color: textSecondary }]}>
              {project.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => handleContact('call')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Phone size={20} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => handleContact('email')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Mail size={20} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Share2 size={20} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        {(['overview', 'milestones', 'updates'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[
              styles.tab,
              selectedTab === tab && styles.tabActive,
              selectedTab === tab && { borderBottomColor: '#3B82F6' },
            ]}>
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === tab ? '#3B82F6' : textSecondary },
              ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }>
        {selectedTab === 'overview' && (
          <>
            {/* Progress Overview */}
            <View style={[styles.progressCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Project Progress</Text>
              <View style={styles.progressOverview}>
                <Text style={[styles.progressPercent, { color: textColor }]}>
                  {project.progress}%
                </Text>
                <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${project.progress}%` }]}
                  />
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatBox
                label="Budget Spent"
                value={`${Math.round((project.spent / project.budget) * 100)}%`}
                icon="wallet"
                color="#3B82F6"
              />
              <StatBox
                label="Remaining"
                value={formatCurrency(project.budget - project.spent)}
                icon="cash"
                color="#10B981"
              />
              <StatBox
                label="Start Date"
                value={new Date(project.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                icon="calendar"
                color="#8B5CF6"
              />
              <StatBox
                label="Due Date"
                value={new Date(project.expectedCompletion).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                icon="time"
                color="#F59E0B"
              />
            </View>

            {/* Project Details */}
            <View style={[styles.detailsCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Project Details</Text>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={20} color={textSecondary} />
                <Text style={[styles.detailText, { color: textColor }]}>{project.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={20} color={textSecondary} />
                <Text style={[styles.detailText, { color: textColor }]}>
                  Project Manager: {project.projectManager}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={20} color={textSecondary} />
                <Text style={[styles.detailText, { color: textColor }]}>
                  {project.description}
                </Text>
              </View>
            </View>

            {/* Budget Breakdown */}
            <View style={[styles.budgetCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Budget Breakdown</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: textSecondary }]}>Total Budget</Text>
                  <Text style={[styles.budgetValue, { color: textColor }]}>
                    {formatCurrency(project.budget)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: textSecondary }]}>Spent</Text>
                  <Text style={[styles.budgetValue, { color: '#EF4444' }]}>
                    {formatCurrency(project.spent)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: textSecondary }]}>Remaining</Text>
                  <Text style={[styles.budgetValue, { color: '#10B981' }]}>
                    {formatCurrency(project.budget - project.spent)}
                  </Text>
                </View>
              </View>
              <View style={[styles.budgetBar, { backgroundColor: '#E5E7EB' }]}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${(project.spent / project.budget) * 100}%`,
                      backgroundColor: '#3B82F6',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Team Members */}
            {project.teamMembers.length > 0 && (
              <View style={[styles.teamCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Team Members</Text>
                {project.teamMembers.map((member) => (
                  <View key={member.id} style={styles.teamMember}>
                    <View style={[styles.teamAvatar, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="person" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: textColor }]}>{member.name}</Text>
                      <Text style={[styles.teamRole, { color: textSecondary }]}>{member.role}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EFF6FF', borderColor }]}
                onPress={() => setShowDocuments(true)}>
                <FileText size={20} color="#3B82F6" />
                <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                  Documents ({project.documents.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FEF3C7', borderColor }]}
                onPress={() => setShowRequestUpdate(true)}>
                <Ionicons name="chatbubble-outline" size={20} color="#F59E0B" />
                <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Request Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FEE2E2', borderColor }]}
                onPress={() => setShowIssueReport(true)}>
                <AlertCircle size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Report Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EFF6FF', borderColor }]}
                onPress={handleExport}>
                <Download size={20} color="#3B82F6" />
                <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Export</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {selectedTab === 'milestones' && (
          <View style={styles.milestonesList}>
            {project.milestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </View>
        )}

        {selectedTab === 'updates' && (
          <View style={styles.updatesList}>
            {project.recentUpdates.length > 0 ? (
              project.recentUpdates.map((update) => <UpdateCard key={update.id} update={update} />)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color={textSecondary} />
                <Text style={[styles.emptyStateText, { color: textColor }]}>No updates yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <RequestUpdateModal
        visible={showRequestUpdate}
        onClose={() => setShowRequestUpdate(false)}
        projectId={project.id}
        projectName={project.name}
        projectManager={project.projectManager}
      />

      <IssueReportModal
        visible={showIssueReport}
        onClose={() => setShowIssueReport(false)}
        projectId={project.id}
        projectName={project.name}
      />

      <DocumentViewer
        visible={showDocuments}
        onClose={() => setShowDocuments(false)}
        documents={project.documents}
        projectName={project.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 4,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerSubtitleText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  progressCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  progressOverview: {
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  budgetCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  budgetBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  teamCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  teamRole: {
    fontSize: 13,
    fontWeight: '400',
  },
  milestonesList: {
    gap: 16,
  },
  milestoneCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  milestoneHeader: {
    marginBottom: 16,
  },
  milestoneTitleRow: {
    marginBottom: 8,
  },
  milestoneStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  milestoneStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  milestoneName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  milestoneDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  milestoneProgress: {
    marginBottom: 16,
  },
  milestoneProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  milestoneProgressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  milestoneProgressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  milestoneProgressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  milestoneInfo: {
    gap: 8,
    marginBottom: 16,
  },
  milestoneInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneInfoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tasksContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tasksTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  taskName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  taskAssignee: {
    fontSize: 12,
    fontWeight: '400',
  },
  updatesList: {
    gap: 16,
  },
  updateCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  updateHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  updateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  updateDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  updateDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  },
  actionButtonsContainer: {
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

