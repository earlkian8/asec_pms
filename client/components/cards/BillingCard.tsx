import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Receipt } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedCard from '@/components/AnimatedCard';
import ProgressBar from '@/components/ui/ProgressBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';
import { getBillingStatusColors } from '@/utils/statusHelpers';
import { Billing } from '@/hooks/useBillings';

interface BillingCardProps {
  billing: Billing;
  index: number;
  onPress: () => void;
}

export default function BillingCard({ billing, index, onPress }: BillingCardProps) {
  const status = getBillingStatusColors(billing.status);
  const paymentPercent = billing.payment_percentage || 0;
  const isOverdue =
    billing.due_date &&
    new Date(billing.due_date) < new Date() &&
    (billing.status === 'unpaid' || billing.status === 'partial');

  return (
    <AnimatedCard
      index={index}
      delay={100}
      onPress={onPress}
      style={[styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
      {/* Invoice Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.codeRow}>
            <Receipt size={20} color={AppColors.primary} />
            <Text style={[styles.code, { color: AppColors.text }]}>
              {billing.billing_code}
            </Text>
          </View>
          <Text style={[styles.project, { color: AppColors.textSecondary }]} numberOfLines={1}>
            {billing.project.project_name}
          </Text>
        </View>
        <StatusBadge status={billing.status} type="billing" showDot />
      </View>

      {/* Invoice Amount - Prominent */}
      <View style={styles.amountSection}>
        <Text style={[styles.amountLabel, { color: AppColors.textSecondary }]}>
          Invoice Amount
        </Text>
        <Text style={[styles.amountValue, { color: AppColors.text }]}>
          {formatCurrency(billing.billing_amount)}
        </Text>
      </View>

      {/* Payment Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Ionicons name="checkmark-circle" size={16} color={AppColors.success} />
            <Text style={[styles.summaryLabel, { color: AppColors.textSecondary }]}>
              Amount Paid
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: AppColors.success }]}>
            {formatCurrency(billing.total_paid)}
          </Text>
        </View>
        {billing.remaining_amount > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="alert-circle" size={16} color={AppColors.error} />
              <Text style={[styles.summaryLabel, { color: AppColors.textSecondary }]}>
                Amount Due
              </Text>
            </View>
            <Text style={[styles.summaryValue, { color: AppColors.error }]}>
              {formatCurrency(billing.remaining_amount)}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Progress - Only show if not fully paid */}
      {billing.status !== 'paid' && (
        <View style={styles.progress}>
          <ProgressBar
            progress={paymentPercent}
            height={8}
            colors={paymentPercent === 100 ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
            showLabel
          />
        </View>
      )}

      {/* Invoice Details */}
      <View style={styles.details}>
        {billing.billing_date && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
            <Text style={[styles.detailLabel, { color: AppColors.textSecondary }]}>
              Invoice Date:
            </Text>
            <Text style={[styles.detailValue, { color: AppColors.text }]}>
              {new Date(billing.billing_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
        {billing.due_date && (
          <View style={[styles.detailRow, isOverdue && styles.detailRowOverdue]}>
            <Ionicons
              name={isOverdue ? 'alert-circle' : 'time-outline'}
              size={14}
              color={isOverdue ? AppColors.error : AppColors.textSecondary}
            />
            <Text
              style={[
                styles.detailLabel,
                { color: isOverdue ? AppColors.error : AppColors.textSecondary },
              ]}>
              Due Date:
            </Text>
            <Text
              style={[
                styles.detailValue,
                { color: isOverdue ? AppColors.error : AppColors.text },
              ]}>
              {new Date(billing.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {isOverdue && ' (Overdue)'}
            </Text>
          </View>
        )}
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  code: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  project: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 28,
    marginTop: 2,
  },
  amountSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summary: {
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progress: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  details: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailRowOverdue: {
    paddingTop: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
