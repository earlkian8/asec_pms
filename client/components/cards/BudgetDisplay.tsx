import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coins } from 'lucide-react-native';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';

interface BudgetDisplayProps {
  budget: number;
  spent: number;
  showBreakdown?: boolean;
  breakdown?: {
    materialCosts?: number;
    laborCosts?: number;
    miscellaneousExpenses?: number;
  };
}

export default function BudgetDisplay({
  budget,
  spent,
  showBreakdown = false,
  breakdown,
}: BudgetDisplayProps) {
  const budgetPercent = (spent / budget) * 100;
  const budgetBarColor =
    budgetPercent > 90 ? '#EF4444' : budgetPercent > 75 ? '#F59E0B' : '#10B981';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Coins size={16} color={AppColors.textSecondary} />
          <Text style={[styles.label, { color: AppColors.textSecondary }]}>
            Budget Usage
          </Text>
        </View>
        <Text style={[styles.percent, { color: AppColors.text }]}>
          {Math.round(budgetPercent)}%
        </Text>
      </View>
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: AppColors.textSecondary }]}>Spent</Text>
          <Text style={[styles.detailValue, { color: AppColors.text }]}>
            {formatCurrency(spent)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: AppColors.textSecondary }]}>
            Total Budget
          </Text>
          <Text style={[styles.detailValue, { color: AppColors.text }]}>
            {formatCurrency(budget)}
          </Text>
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: AppColors.border }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(budgetPercent, 100)}%`,
              backgroundColor: budgetBarColor,
            },
          ]}
        />
      </View>
      {showBreakdown && breakdown && (
        <View style={styles.breakdown}>
          {breakdown.materialCosts !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: AppColors.textSecondary }]}>
                Materials
              </Text>
              <Text style={[styles.breakdownValue, { color: AppColors.text }]}>
                {formatCurrency(breakdown.materialCosts)}
              </Text>
            </View>
          )}
          {breakdown.laborCosts !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: AppColors.textSecondary }]}>
                Labor
              </Text>
              <Text style={[styles.breakdownValue, { color: AppColors.text }]}>
                {formatCurrency(breakdown.laborCosts)}
              </Text>
            </View>
          )}
          {breakdown.miscellaneousExpenses !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: AppColors.textSecondary }]}>
                Miscellaneous
              </Text>
              <Text style={[styles.breakdownValue, { color: AppColors.text }]}>
                {formatCurrency(breakdown.miscellaneousExpenses)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  percent: {
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: AppColors.border,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    gap: 10,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
