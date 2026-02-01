import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Mail, AlertCircle, CreditCard, Coins } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import ProgressBar from '@/components/ui/ProgressBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';
import { getProjectStatusColors, getBillingStatusColors } from '@/utils/statusHelpers';

export interface ProjectCardProject {
  id: string;
  name: string;
  location?: string;
  status: 'active' | 'on-hold' | 'completed' | 'pending';
  progress: number;
  expectedCompletion: string;
  budget: number;
  spent: number;
  projectManager: string;
  description?: string;
  startDate?: string;
}

interface ProjectCardProps {
  project: ProjectCardProject;
  index: number;
  onPress: () => void;
  onContact: (project: ProjectCardProject) => void;
  onRequestUpdate: (project: ProjectCardProject) => void;
  paymentStatus?: { status: 'unpaid' | 'partial' | 'paid'; amount: number } | null;
}

export default function ProjectCard({
  project,
  index,
  onPress,
  onContact,
  onRequestUpdate,
  paymentStatus,
}: ProjectCardProps) {
  const status = getProjectStatusColors(project.status);
  const paymentColor = paymentStatus && paymentStatus.status !== 'paid'
    ? getBillingStatusColors(paymentStatus.status)
    : null;

  const budgetPercent = (project.spent / project.budget) * 100;
  const budgetBarColor =
    budgetPercent > 90
      ? '#EF4444'
      : budgetPercent > 75
      ? '#F59E0B'
      : '#10B981';

  return (
    <AnimatedCard
      index={index}
      delay={400}
      onPress={onPress}
      style={StyleSheet.flatten([styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }])}>
      <View>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.name, { color: AppColors.text }]} numberOfLines={1}>
              {project.name}
            </Text>
            <Text style={[styles.location, { color: AppColors.textSecondary }]} numberOfLines={1}>
              {project.location || 'No location specified'}
            </Text>
          </View>
          <View style={styles.badgeContainer}>
            <StatusBadge status={project.status} type="project" />
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

        <ProgressBar
          progress={project.progress}
          height={8}
          showLabel
          style={styles.progressContainer}
        />

        <View style={styles.footer}>
          <View style={styles.info}>
            <Calendar size={14} color={AppColors.textSecondary} />
            <Text style={[styles.infoText, { color: AppColors.textSecondary }]}>
              Due: {new Date(project.expectedCompletion).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          {paymentStatus && paymentStatus.status !== 'paid' && (
            <View style={styles.paymentInfo}>
              <AlertCircle
                size={14}
                color={paymentStatus.status === 'unpaid' ? AppColors.error : AppColors.warning}
              />
              <Text
                style={[
                  styles.paymentInfoText,
                  {
                    color: paymentStatus.status === 'unpaid' ? AppColors.error : AppColors.warning,
                  },
                ]}>
                {formatCurrency(paymentStatus.amount)}{' '}
                {paymentStatus.status === 'unpaid' ? 'unpaid' : 'remaining'}
              </Text>
            </View>
          )}
        </View>

        {/* Budget Section */}
        <View style={styles.budgetSection}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetInfoRow}>
              <Coins size={16} color={AppColors.textSecondary} />
              <Text style={[styles.budgetLabel, { color: AppColors.textSecondary }]}>
                Budget Usage
              </Text>
            </View>
            <Text style={[styles.budgetPercent, { color: AppColors.text }]}>
              {Math.round(budgetPercent)}%
            </Text>
          </View>
          <View style={styles.budgetDetails}>
            <View style={styles.budgetDetailItem}>
              <Text style={[styles.budgetDetailLabel, { color: AppColors.textSecondary }]}>
                Spent
              </Text>
              <Text style={[styles.budgetDetailValue, { color: AppColors.text }]}>
                {formatCurrency(project.spent)}
              </Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetDetailItem}>
              <Text style={[styles.budgetDetailLabel, { color: AppColors.textSecondary }]}>
                Total Budget
              </Text>
              <Text style={[styles.budgetDetailValue, { color: AppColors.text }]}>
                {formatCurrency(project.budget)}
              </Text>
            </View>
          </View>
          <View style={[styles.budgetBar, { backgroundColor: AppColors.border }]}>
            <View
              style={[
                styles.budgetBarFill,
                {
                  width: `${Math.min(budgetPercent, 100)}%`,
                  backgroundColor: budgetBarColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSmall]}
            onPress={() => onContact(project)}>
            <Mail size={16} color={AppColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonText]}
            onPress={() => onRequestUpdate(project)}>
            <Text style={[styles.actionButtonTextLabel, { color: AppColors.primary }]}>
              Request Update
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    fontWeight: '400',
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
  progressContainer: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
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
  budgetSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
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
    backgroundColor: AppColors.border,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
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
});
