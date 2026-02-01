import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';
import { getPaymentStatusColors } from '@/utils/statusHelpers';

interface Transaction {
  id: string;
  payment_code?: string;
  payment_amount?: number;
  payment_date?: string;
  payment_method?: string;
  payment_status?: string;
  reference_number?: string;
  billing?: {
    billing_code?: string;
    project?: {
      project_name?: string;
    };
  };
}

interface TransactionCardProps {
  transaction: Transaction;
  index: number;
}

export default function TransactionCard({ transaction, index }: TransactionCardProps) {
  const paymentStatus = transaction.payment_status || 'pending';
  const paymentMethod = transaction.payment_method || 'unknown';

  return (
    <AnimatedCard
      index={index}
      delay={100}
      style={[styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <CreditCard size={18} color={AppColors.primary} />
            <Text style={[styles.code, { color: AppColors.text }]} numberOfLines={1}>
              {transaction.payment_code || 'N/A'}
            </Text>
          </View>
          <Text style={[styles.billing, { color: AppColors.textSecondary }]} numberOfLines={1}>
            {transaction.billing?.billing_code || 'N/A'} -{' '}
            {transaction.billing?.project?.project_name || 'N/A'}
          </Text>
        </View>
        <StatusBadge status={paymentStatus} type="payment" />
      </View>

      <View style={styles.amountSection}>
        <Text style={[styles.amountLabel, { color: AppColors.textSecondary }]}>
          Payment Amount
        </Text>
        <Text style={[styles.amountValue, { color: AppColors.text }]}>
          {formatCurrency(transaction.payment_amount || 0)}
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
          <Text style={[styles.detailLabel, { color: AppColors.textSecondary }]}>
            Payment Date:
          </Text>
          <Text style={[styles.detailValue, { color: AppColors.text }]}>
            {transaction.payment_date
              ? new Date(transaction.payment_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={14} color={AppColors.textSecondary} />
          <Text style={[styles.detailLabel, { color: AppColors.textSecondary }]}>
            Payment Method:
          </Text>
          <Text style={[styles.detailValue, { color: AppColors.text }]}>
            {paymentMethod === 'paymongo'
              ? 'PayMongo'
              : paymentMethod.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {transaction.reference_number && (
          <View style={styles.detailRow}>
            <Ionicons name="receipt-outline" size={14} color={AppColors.textSecondary} />
            <Text style={[styles.detailLabel, { color: AppColors.textSecondary }]}>
              Reference:
            </Text>
            <Text style={[styles.detailValue, { color: AppColors.text }]} numberOfLines={1}>
              {transaction.reference_number}
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
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
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
  billing: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 26,
    marginTop: 2,
  },
  amountSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  details: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    flex: 1,
  },
});
