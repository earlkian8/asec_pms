import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import {
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
  Trash2,
  Download,
  X,
  Paperclip,
} from 'lucide-react-native';
import { Task, ProgressUpdate, Issue } from '@/types';
import { AppColors, getStatusColor, getPriorityColor, getIssueStatusColor } from '@/utils/colors';
import { formatDate, formatDateTime, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import { apiService } from '@/services/api';
import ProgressUpdateModal from '@/components/ProgressUpdateModal';
import IssueReportModal from '@/components/IssueReportModal';
import StatusSelectorModal from '@/components/StatusSelectorModal';
import { ArrowLeft } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import AnimatedView from '@/components/AnimatedView';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';

export default function TaskDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = parseInt(id || '0', 10);
  
  const [task, setTask] = useState<Task | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingProgressUpdate, setEditingProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  
  // Animation values for FAB options - start from bottom (0) and move up (negative values)
  const progressUpdateOpacity = useSharedValue(0);
  const progressUpdateTranslateY = useSharedValue(0); // Start at FAB position
  const issueOpacity = useSharedValue(0);
  const issueTranslateY = useSharedValue(0); // Start at FAB position

  // Create animated styles at the top level (hooks must be called unconditionally)
  const progressUpdateAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progressUpdateOpacity.value,
    transform: [{ translateY: progressUpdateTranslateY.value }],
  }));

  const issueAnimatedStyle = useAnimatedStyle(() => ({
    opacity: issueOpacity.value,
    transform: [{ translateY: issueTranslateY.value }],
  }));

  // Animate FAB options when expanded
  useEffect(() => {
    if (fabExpanded) {
      // Progress Update button - rises first
      progressUpdateOpacity.value = withTiming(1, { duration: 200 });
      progressUpdateTranslateY.value = withTiming(-5, { duration: 200 });
      
      // Issue button - rises second
      setTimeout(() => {
        issueOpacity.value = withTiming(1, { duration: 200 });
        issueTranslateY.value = withTiming(-1, { duration: 200 });
      }, 50);
    } else {
      // Collapse animations
      progressUpdateOpacity.value = withTiming(0, { duration: 150 });
      progressUpdateTranslateY.value = withTiming(0, { duration: 150 });
      issueOpacity.value = withTiming(0, { duration: 150 });
      issueTranslateY.value = withTiming(0, { duration: 150 });
    }
  }, [fabExpanded]);

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTask(),
        loadProgressUpdates(),
        loadIssues(),
      ]);
    } catch (error) {
      console.error('Error loading task data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTask = async () => {
    try {
      const response = await apiService.get<Task>(`/task-management/tasks/${taskId}`);
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setTask(response.data);
        } else {
          dialog.showError(response.message || 'Failed to load task', 'Error');
          setTimeout(() => router.back(), 1500);
        }
      }
    } catch (error) {
      dialog.showError('Failed to load task', 'Error');
      setTimeout(() => router.back(), 1500);
    }
  };

  const loadProgressUpdates = async () => {
    try {
      const response = await apiService.get<ProgressUpdate[]>(`/task-management/tasks/${taskId}/progress-updates`);
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setProgressUpdates(Array.isArray(response.data) ? response.data : []);
        }
      }
    } catch (error) {
      console.error('Error loading progress updates:', error);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await apiService.get<Issue[]>(`/task-management/tasks/${taskId}/issues`);
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setIssues(Array.isArray(response.data) ? response.data : []);
        }
      }
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTaskData();
  };

  const handleAddProgress = () => {
    setEditingProgressUpdate(null);
    setShowProgressModal(true);
  };

  const handleEditProgress = (update: ProgressUpdate) => {
    setEditingProgressUpdate(update);
    setShowProgressModal(true);
  };

  const handleDeleteProgress = (update: ProgressUpdate) => {
    dialog.showConfirm(
      'Are you sure you want to delete this progress update?',
      async () => {
        try {
          const response = await apiService.delete(`/task-management/tasks/${taskId}/progress-updates/${update.id}`);
          if (typeof response === 'object' && 'success' in response) {
            if (response.success) {
              dialog.showSuccess('Progress update deleted successfully');
              loadProgressUpdates();
            } else {
              dialog.showError(response.message || 'Failed to delete progress update');
            }
          }
        } catch (error) {
          dialog.showError('Failed to delete progress update');
        }
      },
      'Delete Progress Update',
      'Delete',
      'Cancel'
    );
  };

  const handleDownloadFile = async (update: ProgressUpdate) => {
    try {
      const response = await apiService.get(`/task-management/tasks/${taskId}/progress-updates/${update.id}/download`, {
        responseType: 'blob',
      });
      
      if (response instanceof Blob) {
        // For web
        if (typeof window !== 'undefined' && window.URL) {
          const url = window.URL.createObjectURL(response);
          const link = document.createElement('a');
          link.href = url;
          link.download = update.original_name || 'file';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          dialog.showSuccess('File download started');
        } else {
          // For React Native, you would use expo-file-system or similar
          dialog.showInfo('File download started', 'Download');
        }
      }
    } catch (error) {
      dialog.showError('Failed to download file');
    }
  };

  const handleReportIssue = () => {
    setEditingIssue(null);
    setShowIssueModal(true);
  };

  const handleEditIssue = (issue: Issue) => {
    setEditingIssue(issue);
    setShowIssueModal(true);
  };

  const handleDeleteIssue = (issue: Issue) => {
    dialog.showConfirm(
      'Are you sure you want to delete this issue?',
      async () => {
        try {
          const response = await apiService.delete(`/task-management/tasks/${taskId}/issues/${issue.id}`);
          if (typeof response === 'object' && 'success' in response) {
            if (response.success) {
              dialog.showSuccess('Issue deleted successfully');
              loadIssues();
            } else {
              dialog.showError(response.message || 'Failed to delete issue');
            }
          }
        } catch (error) {
          dialog.showError('Failed to delete issue');
        }
      },
      'Delete Issue',
      'Delete',
      'Cancel'
    );
  };

  const handleUpdateStatus = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!task || task.status === newStatus || updatingStatus) {
      return;
    }

    // Validate: Cannot mark as completed without at least 1 progress update
    if (newStatus === 'completed' && progressUpdates.length === 0) {
      dialog.showError(
        'Cannot mark task as completed. Please add at least one progress update first.',
        'Progress Update Required'
      );
      return;
    }

    try {
      setUpdatingStatus(true);
      const response = await apiService.put(`/task-management/tasks/${taskId}/status`, {
        status: newStatus,
      });

      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data && typeof response.data === 'object' && 'id' in response.data) {
          // Update local task state with full task data from API
          setTask(response.data as Task);
          dialog.showSuccess('Task status updated successfully');
        } else {
          dialog.showError(response.message || 'Failed to update task status');
        }
      } else {
        dialog.showError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      dialog.showError('Failed to update task status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusSelector = () => {
    if (!task || updatingStatus) return;
    setShowStatusSelector(true);
  };

  const handleStatusSelect = (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!task || task.status === newStatus || updatingStatus) {
      return;
    }

    handleUpdateStatus(newStatus);
  };

  if (loading && !task) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={AppColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Not Found</Text>
          <View style={styles.headerRight} />
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(task.status);
  const overdue = task.dueDate && isOverdue(task.dueDate);
  const daysUntil = task.dueDate ? getDaysUntilDue(task.dueDate) : null;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
      >
        {/* Task Header Card */}
        <AnimatedView delay={100}>
          <AnimatedCard index={0} delay={150} style={styles.card}>
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleRow}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <TouchableOpacity
                onPress={openStatusSelector}
                disabled={updatingStatus}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusColor + '20',
                      opacity: updatingStatus ? 0.6 : 1,
                    },
                  ]}
                >
                  {updatingStatus ? (
                    <ActivityIndicator size="small" color={statusColor} />
                  ) : (
                    <>
                      <View
                        style={[styles.statusDot, { backgroundColor: statusColor }]}
                      />
                      <Text
                        style={[styles.statusText, { color: statusColor }]}
                      >
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.description}>{task.description || 'No description provided for this task.'}</Text>

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

            <View style={styles.infoItem}>
              <CheckCircle2 size={18} color={statusColor} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <TouchableOpacity
                  onPress={openStatusSelector}
                  disabled={updatingStatus}
                  activeOpacity={0.7}
                  style={styles.statusUpdateButton}
                >
                  <View
                    style={[
                      styles.statusBadgeSmall,
                      {
                        backgroundColor: statusColor + '20',
                        opacity: updatingStatus ? 0.6 : 1,
                      },
                    ]}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color={statusColor} />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.statusTextSmall,
                            { color: statusColor },
                          ]}
                        >
                          {task.status.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={[styles.statusChangeHint, { color: statusColor }]}>
                          Tap to change
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </AnimatedCard>
        </AnimatedView>


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
            progressUpdates.map((update, index) => (
              <AnimatedView key={update.id} delay={100 + index * 50}>
                <AnimatedCard index={index} delay={150 + index * 50} style={styles.updateCard}>
                  <View style={styles.updateHeader}>
                    <View style={styles.updateAuthor}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(update.created_by_name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.updateAuthorInfo}>
                        <Text style={styles.updateAuthorName}>
                          {update.created_by_name || 'Unknown User'}
                        </Text>
                        <View style={styles.updateMetaRow}>
                          <Clock size={12} color={AppColors.textSecondary} />
                          <Text style={styles.updateDate}>
                            {formatDateTime(update.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {update.created_by === user?.id && (
                      <View style={styles.updateActions}>
                        <TouchableOpacity
                          onPress={() => handleEditProgress(update)}
                          style={styles.actionButton}
                        >
                          <Edit size={18} color={AppColors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteProgress(update)}
                          style={styles.actionButton}
                        >
                          <Trash2 size={18} color={AppColors.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.updateContent}>
                    <Text style={styles.updateDescription}>
                      {update.description || 'No description provided.'}
                    </Text>
                    
                    {update.file_path ? (
                      <TouchableOpacity
                        style={styles.fileAttachment}
                        onPress={() => {
                          if (update.file_url) {
                            // Open file URL in browser/app
                            if (typeof window !== 'undefined') {
                              window.open(update.file_url, '_blank');
                            } else {
                              handleDownloadFile(update);
                            }
                          } else {
                            handleDownloadFile(update);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.fileIconContainer}>
                          <FileText size={18} color={AppColors.primary} />
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {update.original_name || 'File'}
                          </Text>
                          {update.file_size && (
                            <Text style={styles.fileSize}>
                              {(update.file_size / 1024).toFixed(1)} KB
                            </Text>
                          )}
                        </View>
                        <Download size={18} color={AppColors.primary} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.noFilePlaceholder}>
                        <Paperclip size={16} color={AppColors.textSecondary} />
                        <Text style={styles.noFileText}>
                          No file attached
                        </Text>
                      </View>
                    )}
                  </View>
                </AnimatedCard>
              </AnimatedView>
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
            issues.map((issue, index) => (
              <AnimatedView key={issue.id} delay={100 + index * 50}>
                <AnimatedCard index={index} delay={150 + index * 50} style={styles.issueCard}>
                  <View style={styles.issueHeader}>
                    <View style={styles.issueTitleContainer}>
                      <Text style={styles.issueTitle} numberOfLines={2}>{issue.title}</Text>
                      <View
                        style={[
                          styles.issueStatusBadge,
                          {
                            backgroundColor:
                              getIssueStatusColor(issue.status) + '20',
                            borderColor: getIssueStatusColor(issue.status) + '40',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDotSmall,
                            { backgroundColor: getIssueStatusColor(issue.status) },
                          ]}
                        />
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
                    {issue.reported_by && user?.id && Number(issue.reported_by) === Number(user.id) && (
                      <View style={styles.issueActions}>
                        <TouchableOpacity
                          onPress={() => handleEditIssue(issue)}
                          style={styles.actionButton}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Edit size={18} color={AppColors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteIssue(issue)}
                          style={styles.actionButton}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={18} color={AppColors.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.issueContent}>
                    <Text style={styles.issueDescription}>
                      {issue.description || 'No description provided.'}
                    </Text>
                    
                    <View style={styles.issueMeta}>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              getPriorityColor(issue.priority) + '20',
                            borderColor: getPriorityColor(issue.priority) + '40',
                          },
                        ]}
                      >
                        <Flag size={12} color={getPriorityColor(issue.priority)} />
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(issue.priority) },
                          ]}
                        >
                          {issue.priority.toUpperCase()} PRIORITY
                        </Text>
                      </View>
                      <View style={styles.issueDateContainer}>
                        <Clock size={12} color={AppColors.textSecondary} />
                        <Text style={styles.issueDate}>
                          {formatDateTime(issue.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </AnimatedCard>
              </AnimatedView>
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

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <Animated.View
          style={[
            styles.fabOptionWrapper,
            progressUpdateAnimatedStyle,
          ]}
          pointerEvents={fabExpanded ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.fabOption]}
            onPress={() => {
              setFabExpanded(false);
              handleAddProgress();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.fabOptionContent, { backgroundColor: '#EFF6FF' }]}>
              <Plus size={20} color={AppColors.primary} />
            </View>
            <View style={styles.fabOptionLabel}>
              <Text style={styles.fabOptionText}>Progress Update</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.fabOptionWrapper,
            issueAnimatedStyle,
          ]}
          pointerEvents={fabExpanded ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.fabOption]}
            onPress={() => {
              setFabExpanded(false);
              handleReportIssue();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.fabOptionContent, { backgroundColor: '#FEF2F2' }]}>
              <AlertCircle size={20} color={AppColors.error} />
            </View>
            <View style={styles.fabOptionLabel}>
              <Text style={styles.fabOptionText}>Report Issue</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.fab, fabExpanded && styles.fabExpanded]}
          onPress={() => setFabExpanded(!fabExpanded)}
          activeOpacity={0.8}
        >
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            {fabExpanded ? (
              <X size={24} color="#FFFFFF" />
            ) : (
              <Plus size={24} color="#FFFFFF" />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ProgressUpdateModal
        visible={showProgressModal && !!task}
        onClose={() => {
          setShowProgressModal(false);
          setEditingProgressUpdate(null);
        }}
        taskTitle={task?.title || 'Task'}
        taskId={task?.id || 0}
        editingUpdate={editingProgressUpdate}
        onSubmit={async (description, file) => {
          if (!task) return;
          
          try {
            const formData = new FormData();
            formData.append('description', description);
            if (file) {
              // Handle both web File objects and Expo file objects
              if (file.uri) {
                // React Native/Expo file object - use uri directly
                const fileName = file.name || `file_${Date.now()}`;
                const fileType = file.mimeType || 'application/octet-stream';
                formData.append('file', {
                  uri: file.uri,
                  type: fileType,
                  name: fileName,
                } as any);
              } else if (file instanceof File) {
                // Web File object
                formData.append('file', file, file.name || `file_${Date.now()}`);
              } else if (file instanceof Blob) {
                // Web Blob object (no name property)
                formData.append('file', file, `file_${Date.now()}`);
              } else {
                // Fallback - try to append as-is
                formData.append('file', file);
              }
            }

            let response;
            if (editingProgressUpdate) {
              response = await apiService.put(
                `/task-management/tasks/${task.id}/progress-updates/${editingProgressUpdate.id}`,
                formData,
                true
              );
            } else {
              response = await apiService.post(
                `/task-management/tasks/${task.id}/progress-updates`,
                formData,
                true
              );
            }

            if (typeof response === 'object' && 'success' in response) {
              if (response.success) {
                dialog.showSuccess(editingProgressUpdate ? 'Progress update updated successfully' : 'Progress update added successfully');
                setShowProgressModal(false);
                setEditingProgressUpdate(null);
                loadProgressUpdates();
              } else {
                const errorMessage = response.message || (response.errors ? Object.values(response.errors).flat().join(', ') : 'Failed to save progress update');
                dialog.showError(errorMessage);
              }
            } else {
              dialog.showError('Invalid response from server');
            }
          } catch (error: any) {
            const errorMessage = error?.message || 'Failed to save progress update';
            dialog.showError(errorMessage);
          }
        }}
      />

      <IssueReportModal
        visible={showIssueModal && !!task}
        onClose={() => {
          setShowIssueModal(false);
          setEditingIssue(null);
        }}
        taskTitle={task?.title || 'Task'}
        projectId={task?.projectId || 0}
        projectMilestoneId={task?.milestoneId || null}
        projectTaskId={task?.id || 0}
        editingIssue={editingIssue}
        onSubmit={async (title, description, priority) => {
          if (!task) return;
          
          try {
            let response;
            if (editingIssue) {
              response = await apiService.put(`/task-management/tasks/${task.id}/issues/${editingIssue.id}`, {
                title,
                description,
                priority,
              });
            } else {
              response = await apiService.post(`/task-management/tasks/${task.id}/issues`, {
                title,
                description,
                priority,
              });
            }

            if (typeof response === 'object' && 'success' in response) {
              if (response.success) {
                dialog.showSuccess(editingIssue ? 'Issue updated successfully' : 'Issue reported successfully');
                setShowIssueModal(false);
                setEditingIssue(null);
                loadIssues();
              } else {
                dialog.showError(response.message || 'Failed to save issue');
              }
            }
          } catch (error) {
            dialog.showError('Failed to save issue');
          }
        }}
      />

      {/* Status Selector Modal */}
      {task && (
        <StatusSelectorModal
          visible={showStatusSelector}
          currentStatus={task.status}
          progressUpdatesCount={progressUpdates.length}
          onClose={() => setShowStatusSelector(false)}
          onSelect={handleStatusSelect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
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
  card: {
    marginBottom: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusUpdateButton: {
    alignSelf: 'flex-start',
  },
  statusChangeHint: {
    fontSize: 9,
    fontWeight: '400',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabExpanded: {
    backgroundColor: AppColors.error,
  },
  fabOptionWrapper: {
    marginBottom: 12,
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabOptionContent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabOptionLabel: {
    backgroundColor: AppColors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  fabOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  updateAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  updateAuthorInfo: {
    flex: 1,
  },
  updateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  updateActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.background,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  updateAuthorName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  updateDate: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  updateContent: {
    gap: 12,
  },
  updateDescription: {
    fontSize: 15,
    color: AppColors.text,
    lineHeight: 22,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: AppColors.primary + '30',
    borderStyle: 'solid',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: AppColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  noFilePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
  },
  noFileText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  issueCard: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    gap: 12,
  },
  issueTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    minWidth: 0, // Allow shrinking
  },
  issueTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    lineHeight: 24,
    minWidth: 0, // Allow shrinking
  },
  issueActions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0, // Prevent shrinking
    zIndex: 10, // Ensure buttons are on top
  },
  issueStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  issueStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  issueContent: {
    gap: 12,
  },
  issueDescription: {
    fontSize: 15,
    color: AppColors.text,
    lineHeight: 22,
  },
  issueMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  issueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
});

