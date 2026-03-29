import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedCard from '@/components/AnimatedCard';
import ProgressBar from '@/components/ui/ProgressBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { AppColors } from '@/constants/colors';
import { ProjectDetailMilestone } from '@/hooks/useProjectDetail';

interface MilestoneCardProps {
  milestone: ProjectDetailMilestone;
  index: number;
  onPress?: (milestone: ProjectDetailMilestone) => void;
}

export default function MilestoneCard({ milestone, index, onPress }: MilestoneCardProps) {
  const formatMaybeDate = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    if (d.getFullYear() <= 1971) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const dueText = formatMaybeDate(milestone.dueDate);

  const progressColors: [string, string] =
    milestone.status === 'completed'
      ? ['#10B981', '#059669']
      : ['#3B82F6', '#2563EB'];

  const taskStatusColors: Record<string, { color: string; icon: string }> = {
    completed: { color: '#10B981', icon: 'checkmark-circle' },
    'in-progress': { color: '#3B82F6', icon: 'time' },
    pending: { color: '#6B7280', icon: 'ellipse-outline' },
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress ? () => onPress(milestone) : undefined}
      disabled={!onPress}>
      <AnimatedCard
        index={index}
        delay={100}
        style={[styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <StatusBadge status={milestone.status} type="milestone" showIcon />
            {onPress ? (
              <Ionicons name="chevron-forward" size={16} color={AppColors.textSecondary} />
            ) : null}
          </View>
          <Text
            style={[
              styles.name,
              { color: AppColors.text },
              !milestone.name && styles.placeholderText,
            ]}>
            {milestone.name || 'Unnamed Milestone'}
          </Text>
          <Text
            style={[
              styles.description,
              { color: AppColors.textSecondary },
              !milestone.description && styles.placeholderText,
            ]}>
            {milestone.description || 'No description provided for this milestone.'}
          </Text>
        </View>

        <View style={styles.progress}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: AppColors.textSecondary }]}>
              Progress
            </Text>
            <Text style={[styles.progressPercent, { color: AppColors.text }]}>
              {parseFloat(Number(milestone.progress).toFixed(2))}%
            </Text>
          </View>
          <ProgressBar progress={milestone.progress} height={10} colors={progressColors} />
        </View>

        <View style={styles.info}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={13} color={AppColors.textSecondary} />
            <Text style={[styles.infoText, { color: AppColors.textSecondary }]}>
              Due: {dueText ?? 'Not specified'}
            </Text>
          </View>
          {milestone.completedDate && (
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={13} color={AppColors.success} />
              <Text style={[styles.infoText, { color: AppColors.success }]}>
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
            <Text style={[styles.tasksTitle, { color: AppColors.text }]}>Tasks</Text>
            {milestone.tasks.map((task) => {
              const taskStatus = taskStatusColors[task.status] || taskStatusColors.pending;

              return (
                <View key={task.id} style={styles.taskItem}>
                  <Ionicons name={taskStatus.icon as any} size={14} color={taskStatus.color} />
                  <Text style={[styles.taskName, { color: AppColors.text }]}>
                    {task.name || 'Unnamed Task'}
                  </Text>
                  <Text
                    style={[
                      styles.taskAssignee,
                      { color: AppColors.textSecondary },
                      !task.assignedTo && styles.placeholderText,
                    ]}>
                    {task.assignedTo || 'Unassigned'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </AnimatedCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  progress: {
    marginBottom: 12,
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
  info: {
    gap: 6,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tasksContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
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
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
