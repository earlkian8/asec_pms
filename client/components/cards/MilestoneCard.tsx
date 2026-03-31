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

const taskStatusMeta: Record<string, { color: string; icon: string }> = {
  completed:   { color: '#10B981', icon: 'checkmark-circle' },
  'in-progress': { color: '#3B82F6', icon: 'time' },
  pending:     { color: '#6B7280', icon: 'ellipse-outline' },
};

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

  // Compact task counts for the summary row
  const taskCounts = milestone.tasks
    ? {
        completed:    milestone.tasks.filter((t) => t.status === 'completed').length,
        'in-progress': milestone.tasks.filter((t) => t.status === 'in-progress').length,
        pending:      milestone.tasks.filter((t) => t.status === 'pending').length,
      }
    : null;
  const totalTasks = milestone.tasks?.length ?? 0;

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
            style={[styles.name, { color: AppColors.text }, !milestone.name && styles.placeholderText]}
            numberOfLines={2}>
            {milestone.name || 'Unnamed Milestone'}
          </Text>
          {milestone.description ? (
            <Text
              style={[styles.description, { color: AppColors.textSecondary }]}
              numberOfLines={2}>
              {milestone.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.progress}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: AppColors.textSecondary }]}>Progress</Text>
            <Text style={[styles.progressPercent, { color: AppColors.text }]}>
              {parseFloat(Number(milestone.progress).toFixed(2))}%
            </Text>
          </View>
          <ProgressBar progress={milestone.progress} height={6} colors={progressColors} />
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
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* ── Compact task summary ─────────────────────────────────────────── */}
        {taskCounts && totalTasks > 0 && (
          <View style={styles.taskSummary}>
            <Text style={[styles.taskSummaryLabel, { color: AppColors.textSecondary }]}>
              {totalTasks} task{totalTasks !== 1 ? 's' : ''}
            </Text>
            <View style={styles.taskPills}>
              {(Object.entries(taskCounts) as [string, number][]).map(([status, count]) => {
                if (count === 0) return null;
                const meta = taskStatusMeta[status] || taskStatusMeta.pending;
                return (
                  <View key={status} style={[styles.taskPill, { backgroundColor: meta.color + '1A' }]}>
                    <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                    <Text style={[styles.taskPillCount, { color: meta.color }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </AnimatedCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  header: {
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  progress: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    gap: 5,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  taskSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskPills: {
    flexDirection: 'row',
    gap: 5,
  },
  taskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskPillCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
