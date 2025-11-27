import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  User,
  Flag,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  Plus,
  Edit,
} from 'lucide-react-native';
import { mockTasks, mockProgressUpdates, mockIssues } from '@/data/mockData';
import { Task, ProgressUpdate, Issue } from '@/types';
import { AppColors, getStatusColor, getPriorityColor, getIssueStatusColor } from '@/utils/colors';
import { formatDate, formatDateTime, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import ProgressUpdateModal from '@/components/ProgressUpdateModal';
import IssueReportModal from '@/components/IssueReportModal';

export default function TaskDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = parseInt(id || '0', 10);
  const task = mockTasks.find((t) => t.id === taskId);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  if (!task) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={AppColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Not Found</Text>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(task.status);
  const overdue = task.dueDate && isOverdue(task.dueDate);
  const daysUntil = task.dueDate ? getDaysUntilDue(task.dueDate) : null;
  const progressUpdates = mockProgressUpdates[task.id] || [];
  const issues = mockIssues[task.id] || [];

  const handleAddProgress = () => {
    setShowProgressModal(true);
  };

  const handleReportIssue = () => {
    setShowIssueModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Header Card */}
        <View style={styles.card}>
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleRow}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor + '20' },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text
                  style={[styles.statusText, { color: statusColor }]}
                >
                  {task.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.description}>{task.description}</Text>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Calendar size={18} color={AppColors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Due Date</Text>
                <Text
                  style={[
                    styles.infoValue,
                    overdue && styles.overdueText,
                  ]}
                >
                  {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                  {overdue && ' (Overdue)'}
                  {!overdue && daysUntil !== null && daysUntil <= 3 && daysUntil > 0 && ` (${daysUntil}d left)`}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <User size={18} color={AppColors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Project</Text>
                <Text style={styles.infoValue}>{task.projectName}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Flag size={18} color={AppColors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Milestone</Text>
                <Text style={styles.infoValue}>{task.milestoneName}</Text>
              </View>
            </View>

            {task.priority && (
              <View style={styles.infoItem}>
                <AlertCircle size={18} color={getPriorityColor(task.priority)} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Priority</Text>
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
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleAddProgress}
          >
            <Plus size={20} color={AppColors.primary} />
            <Text style={[styles.primaryButtonText, { color: AppColors.primary }]}>Add Progress Update</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleReportIssue}
          >
            <AlertCircle size={20} color={AppColors.error} />
            <Text style={[styles.secondaryButtonText, { color: AppColors.error }]}>Report Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Updates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <FileText size={20} color={AppColors.text} />
              <Text style={styles.sectionTitle}>
                Progress Updates ({progressUpdates.length})
              </Text>
            </View>
          </View>

          {progressUpdates.length > 0 ? (
            progressUpdates.map((update) => (
              <View key={update.id} style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  <View style={styles.updateAuthor}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(update.created_by_name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.updateAuthorName}>
                        {update.created_by_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.updateDate}>
                        {formatDateTime(update.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.updateDescription}>
                  {update.description || 'No description'}
                </Text>
                {update.file_path && (
                  <View style={styles.fileAttachment}>
                    <FileText size={16} color={AppColors.primary} />
                    <Text style={styles.fileName}>{update.original_name || 'File'}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <FileText size={32} color={AppColors.textSecondary} />
              <Text style={styles.emptyText}>No progress updates yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first progress update to track your work
              </Text>
            </View>
          )}
        </View>

        {/* Issues Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AlertCircle size={20} color={AppColors.text} />
              <Text style={styles.sectionTitle}>
                Issues ({issues.length})
              </Text>
            </View>
          </View>

          {issues.length > 0 ? (
            issues.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                <View style={styles.issueHeader}>
                  <Text style={styles.issueTitle}>{issue.title}</Text>
                  <View
                    style={[
                      styles.issueStatusBadge,
                      {
                        backgroundColor:
                          getIssueStatusColor(issue.status) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.issueStatusText,
                        { color: getIssueStatusColor(issue.status) },
                      ]}
                    >
                      {issue.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.issueDescription}>{issue.description}</Text>
                <View style={styles.issueMeta}>
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor:
                          getPriorityColor(issue.priority) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(issue.priority) },
                      ]}
                    >
                      {issue.priority.toUpperCase()} PRIORITY
                    </Text>
                  </View>
                  <Text style={styles.issueDate}>
                    {formatDateTime(issue.created_at)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <CheckCircle2 size={32} color={AppColors.success} />
              <Text style={styles.emptyText}>No issues reported</Text>
              <Text style={styles.emptySubtext}>
                Great! No issues have been reported for this task
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <ProgressUpdateModal
        visible={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        taskTitle={task.title}
        taskId={task.id}
        onSubmit={(description, file) => {
          // In a real app, this would call an API with project_task_id: task.id
          console.log('Progress update:', { 
            project_task_id: task.id,
            description, 
            file 
          });
        }}
      />

      <IssueReportModal
        visible={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        taskTitle={task.title}
        projectId={1} // Mock - would come from task.projectId
        projectMilestoneId={1} // Mock - would come from task.milestoneId
        projectTaskId={task.id}
        onSubmit={(title, description, priority) => {
          // In a real app, this would call an API with auto-filled IDs
          console.log('Issue reported:', { 
            project_id: 1,
            project_milestone_id: 1,
            project_task_id: task.id,
            title, 
            description, 
            priority 
          });
        }}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
    backgroundColor: AppColors.card,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  taskHeader: {
    marginBottom: 16,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    lineHeight: 32,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: AppColors.text,
    fontWeight: '600',
  },
  overdueText: {
    color: AppColors.error,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
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
    color: AppColors.text,
  },
  updateCard: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  updateHeader: {
    marginBottom: 12,
  },
  updateAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateAuthorName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  updateDate: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  updateDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  fileName: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  issueCard: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  issueTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  issueStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  issueStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  issueMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueDate: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: AppColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

