import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FIRM_CONTACT } from '@/constants/contact';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail } from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import { useProjectDetail, ProjectDetail, ProgressUpdate } from '@/hooks/useProjectDetail';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import { useDialog } from '@/contexts/DialogContext';

const { width } = Dimensions.get('window');

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dialog = useDialog();
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);

  const { project, loading, error, refresh } = useProjectDetail(id as string);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'milestones' | 'updates' | 'issues' | 'materials' | 'budget'>('overview');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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

  const MilestoneCard = ({ milestone, index }: { milestone: ProjectDetail['milestones'][0]; index: number }) => {
    const milestoneStatusColors: Record<string, { bg: string; text: string; icon: string }> = {
      completed: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' }, // green-100/green-700
      'in-progress': { bg: '#DBEAFE', text: '#1E40AF', icon: 'time' }, // blue-100/blue-700
      pending: { bg: '#F3F4F6', text: '#4B5563', icon: 'hourglass-outline' }, // gray-100/gray-600
      'on-hold': { bg: '#FEF3C7', text: '#92400E', icon: 'pause-circle' }, // yellow-100/yellow-700
    };

    const msStatus = milestoneStatusColors[milestone.status] || milestoneStatusColors.pending;

    return (
      <AnimatedCard
        index={index}
        delay={100}
        style={[styles.milestoneCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.milestoneHeader}>
          <View style={styles.milestoneTitleRow}>
            <View style={[styles.milestoneStatusBadge, { backgroundColor: msStatus.bg }]}>
              <Ionicons name={msStatus.icon as any} size={14} color={msStatus.text} />
              <Text style={[styles.milestoneStatusText, { color: msStatus.text }]}>
                {milestone.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.milestoneName, { color: textColor }, !milestone.name && styles.placeholderText]}>
            {milestone.name || 'Unnamed Milestone'}
          </Text>
          <Text style={[styles.milestoneDescription, { color: textSecondary }, !milestone.description && styles.placeholderText]}>
            {milestone.description || 'No description provided for this milestone.'}
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
            <Ionicons name="calendar-outline" size={13} color={textSecondary} />
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
              <Ionicons name="checkmark-circle-outline" size={13} color="#10B981" />
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
                  <Ionicons name={taskStatus.icon as any} size={14} color={taskStatus.color} />
                  <Text style={[styles.taskName, { color: textColor }]}>{task.name || 'Unnamed Task'}</Text>
                  <Text style={[styles.taskAssignee, { color: textSecondary }, !task.assignedTo && styles.placeholderText]}>
                    {task.assignedTo || 'Unassigned'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </AnimatedCard>
    );
  };

  const UpdateCard = ({ update, index }: { update: ProgressUpdate; index: number }) => {
    const updateTypeColors: Record<string, { bg: string; icon: string }> = {
      request: { bg: '#F59E0B', icon: 'chatbubble-ellipses' },
      progress: { bg: '#3B82F6', icon: 'trending-up' },
      milestone: { bg: '#10B981', icon: 'flag' },
      issue: { bg: '#EF4444', icon: 'alert-circle' },
      general: { bg: '#8B5CF6', icon: 'information-circle' },
    };

    const updateType = updateTypeColors[update.type] || updateTypeColors.general;

    return (
      <AnimatedCard
        index={index}
        delay={100}
        style={[styles.updateCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.updateHeader}>
          <View style={[styles.updateIconContainer, { backgroundColor: `${updateType.bg}15` }]}>
            <Ionicons name={updateType.icon as any} size={20} color={updateType.bg} />
          </View>
          <View style={styles.updateContent}>
            <Text style={[styles.updateTitle, { color: textColor }, !update.title && styles.placeholderText]}>
              {update.title || 'Untitled Update'}
            </Text>
            <Text style={[styles.updateDate, { color: textSecondary }]}>
              {new Date(update.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} • {update.author || 'Unknown Author'}
            </Text>
            {(update.taskName || update.milestoneName) && (
              <View style={styles.updateContext}>
                {update.milestoneName && (
                  <View style={styles.updateContextItem}>
                    <Ionicons name="flag-outline" size={12} color={textSecondary} />
                    <Text style={[styles.updateContextText, { color: textSecondary }]}>
                      {update.milestoneName}
                    </Text>
                  </View>
                )}
                {update.taskName && (
                  <View style={styles.updateContextItem}>
                    <Ionicons name="list-outline" size={12} color={textSecondary} />
                    <Text style={[styles.updateContextText, { color: textSecondary }]}>
                      {update.taskName}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.updateDescription, { color: textSecondary }, !update.description && styles.placeholderText]}>
          {update.description || 'No description provided for this update.'}
        </Text>
      </AnimatedCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#4B5563', marginTop: 12 }}>Loading project details...</Text>
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={[styles.container, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={{ color: '#111827', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          {error || 'Project not found'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: '#3B82F6', marginTop: 16 }]}
          onPress={refresh}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleContact = async () => {
    if (!project) return;
    
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

  // Final safety check - should never reach here if project is null, but just in case
  if (!project) {
    return null;
  }

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
              {project?.name || 'Loading...'}
            </Text>
          </View>
          <View style={styles.headerSubtitle}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[project?.status || 'pending']?.dot || statusColors.pending.dot }]} />
            <Text style={[styles.headerSubtitleText, { color: textSecondary }]}>
              {(project?.status || 'pending').replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => handleContact()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Mail size={20} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}>
          {(['overview', 'milestones', 'updates', 'issues', 'materials', 'budget'] as const).map((tab) => (
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
        </ScrollView>
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
                <Ionicons name="location-outline" size={18} color={textSecondary} />
                <Text style={[styles.detailText, { color: textColor }, !project.location && styles.placeholderText]}>
                  {project.location || 'No location specified'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={18} color={textSecondary} />
                <Text style={[styles.detailText, { color: textColor }, !project.description && styles.placeholderText]}>
                  {project.description || 'No description provided for this project.'}
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
              {project.budgetBreakdown && (
                <View style={styles.budgetBreakdown}>
                  <View style={styles.budgetBreakdownItem}>
                    <Text style={[styles.budgetBreakdownLabel, { color: textSecondary }]}>Materials</Text>
                    <Text style={[styles.budgetBreakdownValue, { color: textColor }]}>
                      {formatCurrency(project.budgetBreakdown.materialCosts)}
                    </Text>
                  </View>
                  <View style={styles.budgetBreakdownItem}>
                    <Text style={[styles.budgetBreakdownLabel, { color: textSecondary }]}>Labor</Text>
                    <Text style={[styles.budgetBreakdownValue, { color: textColor }]}>
                      {formatCurrency(project.budgetBreakdown.laborCosts)}
                    </Text>
                  </View>
                  <View style={styles.budgetBreakdownItem}>
                    <Text style={[styles.budgetBreakdownLabel, { color: textSecondary }]}>Miscellaneous</Text>
                    <Text style={[styles.budgetBreakdownValue, { color: textColor }]}>
                      {formatCurrency(project.budgetBreakdown.miscellaneousExpenses)}
                    </Text>
                  </View>
                </View>
              )}
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
                      <Text style={[styles.teamName, { color: textColor }, !member.name && styles.placeholderText]}>
                        {member.name || 'Unnamed Team Member'}
                      </Text>
                      <Text style={[styles.teamRole, { color: textSecondary }, !member.role && styles.placeholderText]}>
                        {member.role || 'No role specified'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FEF3C7', borderColor }]}
                onPress={() => setShowRequestUpdate(true)}>
                <Ionicons name="chatbubble-outline" size={18} color="#F59E0B" />
                <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Request Update</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {selectedTab === 'milestones' && (
          <View style={styles.milestonesList}>
            {project.milestones.map((milestone, index) => (
              <MilestoneCard key={milestone.id} milestone={milestone} index={index} />
            ))}
          </View>
        )}

        {selectedTab === 'updates' && (
          <View style={styles.updatesList}>
            {project.recentUpdates.length > 0 ? (
              project.recentUpdates.map((update, index) => <UpdateCard key={update.id} update={update} index={index} />)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={64} color={textSecondary} />
                <Text style={[styles.emptyStateText, { color: textColor }]}>No updates yet</Text>
                <Text style={[styles.emptyStateSubtext, { color: textSecondary }]}>
                  Updates and progress reports will appear here
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'issues' && (
          <View style={styles.issuesList}>
            {project.issues && project.issues.length > 0 ? (
              project.issues.map((issue, index) => {
                const priorityColors: Record<string, { bg: string; text: string }> = {
                  high: { bg: '#FEE2E2', text: '#DC2626' },
                  medium: { bg: '#FEF3C7', text: '#D97706' },
                  low: { bg: '#DBEAFE', text: '#2563EB' },
                };
                const statusColors: Record<string, { bg: string; text: string }> = {
                  open: { bg: '#FEE2E2', text: '#DC2626' },
                  'in-progress': { bg: '#DBEAFE', text: '#2563EB' },
                  resolved: { bg: '#D1FAE5', text: '#059669' },
                  closed: { bg: '#E5E7EB', text: '#6B7280' },
                };
                const priority = priorityColors[issue.priority] || priorityColors.medium;
                const status = statusColors[issue.status] || statusColors.open;

                return (
                  <AnimatedCard
                    key={issue.id}
                    index={index}
                    delay={100}
                    style={[styles.issueCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.issueHeader}>
                      <View style={styles.issueTitleRow}>
                        <Text style={[styles.issueTitle, { color: textColor }]}>{issue.title}</Text>
                        <View style={[styles.issueBadge, { backgroundColor: priority.bg }]}>
                          <Text style={[styles.issueBadgeText, { color: priority.text }]}>
                            {issue.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.issueStatusRow}>
                        <View style={[styles.issueStatusBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.issueStatusText, { color: status.text }]}>
                            {issue.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.issueDescription, { color: textSecondary }]}>
                      {issue.description || 'No description provided'}
                    </Text>
                    <View style={styles.issueInfo}>
                      <View style={styles.issueInfoItem}>
                        <Ionicons name="person-outline" size={13} color={textSecondary} />
                        <Text style={[styles.issueInfoText, { color: textSecondary }]}>
                          Reported by: {issue.reportedBy}
                        </Text>
                      </View>
                      {issue.assignedTo && issue.assignedTo !== 'Unassigned' && (
                        <View style={styles.issueInfoItem}>
                          <Ionicons name="person-add-outline" size={13} color={textSecondary} />
                          <Text style={[styles.issueInfoText, { color: textSecondary }]}>
                            Assigned to: {issue.assignedTo}
                          </Text>
                        </View>
                      )}
                      {issue.dueDate && (
                        <View style={styles.issueInfoItem}>
                          <Ionicons name="calendar-outline" size={13} color={textSecondary} />
                          <Text style={[styles.issueInfoText, { color: textSecondary }]}>
                            Due: {new Date(issue.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                      )}
                      {issue.resolvedAt && (
                        <View style={styles.issueInfoItem}>
                          <Ionicons name="checkmark-circle-outline" size={13} color="#10B981" />
                          <Text style={[styles.issueInfoText, { color: '#10B981' }]}>
                            Resolved: {new Date(issue.resolvedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </AnimatedCard>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color={textSecondary} />
                <Text style={[styles.emptyStateText, { color: textColor }]}>No issues reported</Text>
                <Text style={[styles.emptyStateSubtext, { color: textSecondary }]}>
                  All issues have been resolved
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'materials' && (
          <View style={styles.materialsList}>
            {project.materialAllocations && project.materialAllocations.length > 0 ? (
              project.materialAllocations.map((allocation, index) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  received: { bg: '#D1FAE5', text: '#059669' },
                  partial: { bg: '#FEF3C7', text: '#D97706' },
                  pending: { bg: '#E5E7EB', text: '#6B7280' },
                };
                const status = statusColors[allocation.status] || statusColors.pending;

                return (
                  <AnimatedCard
                    key={allocation.id}
                    index={index}
                    delay={100}
                    style={[styles.materialCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.materialHeader}>
                      <View style={styles.materialTitleRow}>
                        <Text style={[styles.materialTitle, { color: textColor }]}>
                          {allocation.itemName}
                        </Text>
                        <View style={[styles.materialStatusBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.materialStatusText, { color: status.text }]}>
                            {allocation.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.materialCode, { color: textSecondary }]}>
                        Code: {allocation.itemCode}
                      </Text>
                    </View>
                    <View style={styles.materialDetails}>
                      <View style={styles.materialDetailRow}>
                        <Text style={[styles.materialDetailLabel, { color: textSecondary }]}>Allocated</Text>
                        <Text style={[styles.materialDetailValue, { color: textColor }]}>
                          {allocation.quantityAllocated} {allocation.unit}
                        </Text>
                      </View>
                      <View style={styles.materialDetailRow}>
                        <Text style={[styles.materialDetailLabel, { color: textSecondary }]}>Received</Text>
                        <Text style={[styles.materialDetailValue, { color: '#10B981' }]}>
                          {allocation.quantityReceived} {allocation.unit}
                        </Text>
                      </View>
                      <View style={styles.materialDetailRow}>
                        <Text style={[styles.materialDetailLabel, { color: textSecondary }]}>Remaining</Text>
                        <Text style={[styles.materialDetailValue, { color: textColor }]}>
                          {allocation.quantityRemaining} {allocation.unit}
                        </Text>
                      </View>
                      <View style={styles.materialDetailRow}>
                        <Text style={[styles.materialDetailLabel, { color: textSecondary }]}>Unit Price</Text>
                        <Text style={[styles.materialDetailValue, { color: textColor }]}>
                          {formatCurrency(allocation.unitPrice)}
                        </Text>
                      </View>
                      <View style={styles.materialDetailRow}>
                        <Text style={[styles.materialDetailLabel, { color: textSecondary }]}>Total Cost</Text>
                        <Text style={[styles.materialDetailValue, { color: '#3B82F6', fontWeight: '700' }]}>
                          {formatCurrency(allocation.totalCost)}
                        </Text>
                      </View>
                    </View>
                    {allocation.notes && (
                      <View style={styles.materialNotes}>
                        <Text style={[styles.materialNotesLabel, { color: textSecondary }]}>Notes:</Text>
                        <Text style={[styles.materialNotesText, { color: textSecondary }]}>
                          {allocation.notes}
                        </Text>
                      </View>
                    )}
                  </AnimatedCard>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color={textSecondary} />
                <Text style={[styles.emptyStateText, { color: textColor }]}>No material allocations</Text>
                <Text style={[styles.emptyStateSubtext, { color: textSecondary }]}>
                  Material allocations will appear here when added
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'budget' && (
          <View style={styles.budgetDetailList}>
            {/* Labor Costs */}
            <View style={[styles.budgetSectionCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Labor Costs</Text>
              {project.laborCosts && project.laborCosts.length > 0 ? (
                project.laborCosts.map((laborCost, index) => (
                  <View key={laborCost.id} style={styles.budgetItemRow}>
                    <View style={styles.budgetItemInfo}>
                      <Text style={[styles.budgetItemName, { color: textColor }]}>
                        {laborCost.assignableName}
                      </Text>
                      <Text style={[styles.budgetItemMeta, { color: textSecondary }]}>
                        {laborCost.workDate
                          ? new Date(laborCost.workDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}{' '}
                        • {laborCost.hoursWorked} hrs @ {formatCurrency(laborCost.hourlyRate)}/hr
                      </Text>
                      {laborCost.description && (
                        <Text style={[styles.budgetItemDescription, { color: textSecondary }]}>
                          {laborCost.description}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.budgetItemAmount, { color: textColor }]}>
                      {formatCurrency(laborCost.totalCost)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: textSecondary }]}>No labor costs recorded</Text>
              )}
              {project.budgetBreakdown && (
                <View style={styles.budgetSectionTotal}>
                  <Text style={[styles.budgetSectionTotalLabel, { color: textColor }]}>Total Labor Costs</Text>
                  <Text style={[styles.budgetSectionTotalValue, { color: '#3B82F6' }]}>
                    {formatCurrency(project.budgetBreakdown.laborCosts)}
                  </Text>
                </View>
              )}
            </View>

            {/* Miscellaneous Expenses */}
            <View style={[styles.budgetSectionCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Miscellaneous Expenses</Text>
              {project.miscellaneousExpenses && project.miscellaneousExpenses.length > 0 ? (
                project.miscellaneousExpenses.map((expense, index) => (
                  <View key={expense.id} style={styles.budgetItemRow}>
                    <View style={styles.budgetItemInfo}>
                      <Text style={[styles.budgetItemName, { color: textColor }]}>
                        {expense.expenseName}
                      </Text>
                      <Text style={[styles.budgetItemMeta, { color: textSecondary }]}>
                        {expense.expenseType}{' '}
                        {expense.expenseDate
                          ? '• ' +
                            new Date(expense.expenseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : ''}
                      </Text>
                      {expense.description && (
                        <Text style={[styles.budgetItemDescription, { color: textSecondary }]}>
                          {expense.description}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.budgetItemAmount, { color: textColor }]}>
                      {formatCurrency(expense.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: textSecondary }]}>No miscellaneous expenses recorded</Text>
              )}
              {project.budgetBreakdown && (
                <View style={styles.budgetSectionTotal}>
                  <Text style={[styles.budgetSectionTotalLabel, { color: textColor }]}>
                    Total Miscellaneous Expenses
                  </Text>
                  <Text style={[styles.budgetSectionTotalValue, { color: '#3B82F6' }]}>
                    {formatCurrency(project.budgetBreakdown.miscellaneousExpenses)}
                  </Text>
                </View>
              )}
            </View>
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
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 70,
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
    padding: 16,
    paddingBottom: 32,
  },
  progressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  progressOverview: {
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    width: (width - 42) / 2,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  budgetCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  teamCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  teamRole: {
    fontSize: 12,
    fontWeight: '400',
  },
  milestonesList: {
    gap: 12,
  },
  milestoneCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  milestoneHeader: {
    marginBottom: 12,
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  milestoneDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  milestoneProgress: {
    marginBottom: 12,
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
    gap: 6,
    marginBottom: 12,
  },
  milestoneInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tasksContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tasksTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  taskName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  taskAssignee: {
    fontSize: 11,
    fontWeight: '400',
  },
  updatesList: {
    gap: 12,
  },
  updateCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  updateHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  updateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  updateDate: {
    fontSize: 11,
    fontWeight: '400',
  },
  updateDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  updateContext: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  updateContextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateContextText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    fontWeight: '400',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionButtonsContainer: {
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    width: '100%',
  },
  budgetBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  budgetBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetBreakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  budgetBreakdownValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  issuesList: {
    gap: 12,
  },
  issueCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  issueHeader: {
    marginBottom: 12,
  },
  issueTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  issueStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  issueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  issueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  issueStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  issueStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  issueDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  issueInfo: {
    gap: 6,
  },
  issueInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueInfoText: {
    fontSize: 13,
    fontWeight: '400',
  },
  materialsList: {
    gap: 12,
  },
  materialCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  materialHeader: {
    marginBottom: 12,
  },
  materialTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  materialStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  materialStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  materialCode: {
    fontSize: 12,
    fontWeight: '400',
  },
  materialDetails: {
    gap: 10,
    marginBottom: 10,
  },
  materialDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  materialDetailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  materialNotes: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  materialNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  materialNotesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  budgetDetailList: {
    gap: 12,
  },
  budgetSectionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  budgetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  budgetItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  budgetItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  budgetItemMeta: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 3,
  },
  budgetItemDescription: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  budgetItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetSectionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
  },
  budgetSectionTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetSectionTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

