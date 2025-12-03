import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBillings, Billing } from '@/hooks/useBillings';
import { useBillingTransactions } from '@/hooks/useBillingTransactions';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Filter,
  ArrowUpDown,
  X,
  Check,
  AlertCircle,
  Receipt,
  CreditCard,
} from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import { useDialog } from '@/contexts/DialogContext';

const AppColors = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  card: '#FFFFFF',
  background: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
};

type SortOption = 'created_at' | 'billing_code' | 'billing_date' | 'due_date' | 'billing_amount' | 'status';

export default function BillingsScreen() {
  const [activeTab, setActiveTab] = useState<'billings' | 'transactions'>('billings');

  // Refresh transactions when switching to transactions tab
  useEffect(() => {
    if (activeTab === 'transactions') {
      refreshTransactions();
    }
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { billings, loading, error, refresh } = useBillings({
    status: filterStatus,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const { transactions, loading: transactionsLoading, error: transactionsError, refresh: refreshTransactions } = useBillingTransactions({
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const statusOptions = ['all', 'unpaid', 'partial', 'paid'];

  const filteredBillings = useMemo(() => {
    return billings;
  }, [billings]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'billings') {
      await refresh();
    } else {
      await refreshTransactions();
    }
    setRefreshing(false);
  }, [refresh, refreshTransactions, activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    unpaid: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
    partial: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    paid: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  };

  const statusCounts = useMemo(() => {
    return {
      all: billings.length,
      unpaid: billings.filter((b) => b.status === 'unpaid').length,
      partial: billings.filter((b) => b.status === 'partial').length,
      paid: billings.filter((b) => b.status === 'paid').length,
    };
  }, [billings]);

  const BillingCard = ({ billing, index }: { billing: Billing; index: number }) => {
    const status = statusColors[billing.status] || statusColors.unpaid;
    const paymentPercent = billing.payment_percentage || 0;
    const isOverdue = billing.due_date && 
      new Date(billing.due_date) < new Date() && 
      (billing.status === 'unpaid' || billing.status === 'partial');

    return (
      <AnimatedCard
        index={index}
        delay={100}
        onPress={() => router.push(`/billing-detail?id=${billing.id}`)}
        style={StyleSheet.flatten([styles.billingCard, { backgroundColor: AppColors.card, borderColor: AppColors.border }])}>
        {/* Invoice Header */}
        <View style={styles.billingInvoiceHeader}>
          <View style={styles.billingInvoiceHeaderLeft}>
            <View style={styles.billingInvoiceCodeRow}>
              <Receipt size={20} color={AppColors.primary} />
              <Text style={[styles.billingInvoiceCode, { color: AppColors.text }]}>
                {billing.billing_code}
              </Text>
            </View>
            <Text style={[styles.billingInvoiceProject, { color: AppColors.textSecondary }]} numberOfLines={1}>
              {billing.project.project_name}
            </Text>
          </View>
          <View style={[styles.billingInvoiceStatusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.billingStatusIndicator, { backgroundColor: status.dot }]} />
            <Text style={[styles.billingInvoiceStatusText, { color: status.text }]}>
              {billing.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Invoice Amount - Prominent */}
        <View style={styles.billingInvoiceAmountSection}>
          <Text style={[styles.billingInvoiceAmountLabel, { color: AppColors.textSecondary }]}>
            Invoice Amount
          </Text>
          <Text style={[styles.billingInvoiceAmountValue, { color: AppColors.text }]}>
            {formatCurrency(billing.billing_amount)}
          </Text>
        </View>

        {/* Payment Summary */}
        <View style={styles.billingInvoiceSummary}>
          <View style={styles.billingInvoiceSummaryRow}>
            <View style={styles.billingInvoiceSummaryLeft}>
              <Ionicons name="checkmark-circle" size={16} color={AppColors.success} />
              <Text style={[styles.billingInvoiceSummaryLabel, { color: AppColors.textSecondary }]}>
                Amount Paid
              </Text>
            </View>
            <Text style={[styles.billingInvoiceSummaryValue, { color: AppColors.success }]}>
              {formatCurrency(billing.total_paid)}
            </Text>
          </View>
          {billing.remaining_amount > 0 && (
            <View style={styles.billingInvoiceSummaryRow}>
              <View style={styles.billingInvoiceSummaryLeft}>
                <Ionicons name="alert-circle" size={16} color={AppColors.error} />
                <Text style={[styles.billingInvoiceSummaryLabel, { color: AppColors.textSecondary }]}>
                  Amount Due
                </Text>
              </View>
              <Text style={[styles.billingInvoiceSummaryValue, { color: AppColors.error }]}>
                {formatCurrency(billing.remaining_amount)}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Progress - Only show if not fully paid */}
        {billing.status !== 'paid' && (
          <View style={styles.billingInvoiceProgress}>
            <View style={styles.billingInvoiceProgressHeader}>
              <Text style={[styles.billingInvoiceProgressLabel, { color: AppColors.textSecondary }]}>
                Payment Progress
              </Text>
              <Text style={[styles.billingInvoiceProgressPercent, { color: AppColors.text }]}>
                {Math.round(paymentPercent)}%
              </Text>
            </View>
            <View style={[styles.billingInvoiceProgressBar, { backgroundColor: AppColors.border }]}>
              <LinearGradient
                colors={paymentPercent === 100 ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.billingInvoiceProgressFill, { width: `${Math.min(paymentPercent, 100)}%` }]}
              />
            </View>
          </View>
        )}

        {/* Invoice Details */}
        <View style={styles.billingInvoiceDetails}>
          {billing.billing_date && (
            <View style={styles.billingInvoiceDetailRow}>
              <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
              <Text style={[styles.billingInvoiceDetailLabel, { color: AppColors.textSecondary }]}>
                Invoice Date:
              </Text>
              <Text style={[styles.billingInvoiceDetailValue, { color: AppColors.text }]}>
                {new Date(billing.billing_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
          {billing.due_date && (
            <View style={[styles.billingInvoiceDetailRow, isOverdue && styles.billingInvoiceDetailRowOverdue]}>
              <Ionicons 
                name={isOverdue ? "alert-circle" : "time-outline"} 
                size={14} 
                color={isOverdue ? AppColors.error : AppColors.textSecondary} 
              />
              <Text style={[
                styles.billingInvoiceDetailLabel, 
                { color: isOverdue ? AppColors.error : AppColors.textSecondary }
              ]}>
                Due Date:
              </Text>
              <Text style={[
                styles.billingInvoiceDetailValue, 
                { color: isOverdue ? AppColors.error : AppColors.text }
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
  };

  const TransactionCard = ({ transaction, index }: { transaction: any; index: number }) => {
    const paymentStatusColors: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#FEF3C7', text: '#92400E' },
      paid: { bg: '#D1FAE5', text: '#065F46' },
      failed: { bg: '#FEE2E2', text: '#991B1B' },
      cancelled: { bg: '#E5E7EB', text: '#4B5563' },
    };
    const paymentStatus = transaction.payment_status || 'pending';
    const status = paymentStatusColors[paymentStatus] || paymentStatusColors.pending;
    const paymentMethod = transaction.payment_method || 'unknown';

    return (
      <AnimatedCard
        index={index}
        delay={100}
        style={StyleSheet.flatten([styles.transactionCard, { backgroundColor: AppColors.card, borderColor: AppColors.border }])}>
        <View style={styles.transactionCardHeader}>
          <View style={styles.transactionCardTitleContainer}>
            <View style={styles.transactionTitleRow}>
              <CreditCard size={18} color={AppColors.primary} />
              <Text style={[styles.transactionCardCode, { color: AppColors.text }]} numberOfLines={1}>
                {transaction.payment_code || 'N/A'}
              </Text>
            </View>
            <Text style={[styles.transactionCardBilling, { color: AppColors.textSecondary }]} numberOfLines={1}>
              {transaction.billing?.billing_code || 'N/A'} - {transaction.billing?.project?.project_name || 'N/A'}
            </Text>
          </View>
          <View style={[styles.transactionStatusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.transactionStatusText, { color: status.text }]}>
              {paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.transactionCardAmountSection}>
          <Text style={[styles.transactionCardAmountLabel, { color: AppColors.textSecondary }]}>
            Payment Amount
          </Text>
          <Text style={[styles.transactionCardAmountValue, { color: AppColors.text }]}>
            {formatCurrency(transaction.payment_amount || 0)}
          </Text>
        </View>

        <View style={styles.transactionCardDetails}>
          <View style={styles.transactionCardDetailRow}>
            <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
            <Text style={[styles.transactionCardDetailLabel, { color: AppColors.textSecondary }]}>
              Payment Date:
            </Text>
            <Text style={[styles.transactionCardDetailValue, { color: AppColors.text }]}>
              {transaction.payment_date 
                ? new Date(transaction.payment_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.transactionCardDetailRow}>
            <Ionicons name="card-outline" size={14} color={AppColors.textSecondary} />
            <Text style={[styles.transactionCardDetailLabel, { color: AppColors.textSecondary }]}>
              Payment Method:
            </Text>
            <Text style={[styles.transactionCardDetailValue, { color: AppColors.text }]}>
              {paymentMethod === 'paymongo' ? 'PayMongo' : paymentMethod.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {transaction.reference_number && (
            <View style={styles.transactionCardDetailRow}>
              <Ionicons name="receipt-outline" size={14} color={AppColors.textSecondary} />
              <Text style={[styles.transactionCardDetailLabel, { color: AppColors.textSecondary }]}>
                Reference:
              </Text>
              <Text style={[styles.transactionCardDetailValue, { color: AppColors.text }]} numberOfLines={1}>
                {transaction.reference_number}
              </Text>
            </View>
          )}
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border, paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: AppColors.text }]}>My Billings</Text>
          <Text style={[styles.headerSubtitle, { color: AppColors.textSecondary }]}>
            {activeTab === 'billings' 
              ? `${filteredBillings.length} billing${filteredBillings.length !== 1 ? 's' : ''}`
              : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'billings' && styles.activeTab]}
          onPress={() => setActiveTab('billings')}>
          <Receipt size={18} color={activeTab === 'billings' ? AppColors.primary : AppColors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'billings' ? AppColors.primary : AppColors.textSecondary }]}>
            Billings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}>
          <CreditCard size={18} color={activeTab === 'transactions' ? AppColors.primary : AppColors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'transactions' ? AppColors.primary : AppColors.textSecondary }]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: AppColors.card, borderBottomColor: AppColors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}>
            <Search size={20} color={AppColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: AppColors.text }]}
              placeholder={activeTab === 'billings' ? "Search billings..." : "Search transactions..."}
              placeholderTextColor={AppColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {activeTab === 'billings' && (
            <>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: filterStatus !== null ? AppColors.primary : AppColors.background,
                    borderColor: filterStatus !== null ? AppColors.primary : AppColors.border,
                  },
                ]}
                onPress={() => setShowFilterModal(true)}>
                <Filter
                  size={20}
                  color={filterStatus !== null ? '#FFFFFF' : AppColors.textSecondary}
                />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}
            onPress={() => setShowSortModal(true)}>
            <ArrowUpDown size={20} color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {(activeTab === 'billings' ? loading : transactionsLoading) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (activeTab === 'transactions' && transactionsError) ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={AppColors.error} />
          <Text style={[styles.emptyText, { color: AppColors.error }]}>
            Error Loading Transactions
          </Text>
          <Text style={[styles.emptySubtext, { color: AppColors.textSecondary }]}>
            {transactionsError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: AppColors.primary, marginTop: 16 }]}
            onPress={refreshTransactions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'billings' ? filteredBillings : transactions}
          renderItem={({ item, index }) => 
            activeTab === 'billings' 
              ? <BillingCard billing={item} index={index} />
              : <TransactionCard transaction={item} index={index} />
          }
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AppColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color={AppColors.textSecondary} />
              <Text style={[styles.emptyText, { color: AppColors.text }]}>
                {activeTab === 'billings' ? 'No billings found' : 'No transactions found'}
              </Text>
              <Text style={[styles.emptySubtext, { color: AppColors.textSecondary }]}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : activeTab === 'billings' 
                    ? 'You have no billings'
                    : 'You have no transactions'}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal - Only for billings */}
      {activeTab === 'billings' && (
        <Modal
          visible={showFilterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilterModal(false)}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowFilterModal(false)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: AppColors.text }]}>Filter Billings</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <X size={24} color={AppColors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll}>
                  {statusOptions.map((status) => {
                    const isActive = filterStatus === status || (status === 'all' && filterStatus === null);
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.filterOption,
                          {
                            backgroundColor: isActive ? AppColors.primary + '10' : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          setFilterStatus(status === 'all' ? null : status);
                          setShowFilterModal(false);
                        }}>
                        <View style={styles.filterOptionContent}>
                          <Text style={[styles.filterOptionText, { color: AppColors.text }]}>
                            {status === 'all'
                              ? 'All Billings'
                              : status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                          <Text style={[styles.filterOptionCount, { color: AppColors.textSecondary }]}>
                            {statusCounts[status as keyof typeof statusCounts] || 0} billings
                          </Text>
                        </View>
                        {isActive && (
                          <Check size={20} color={AppColors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: AppColors.text }]}>Sort {activeTab === 'billings' ? 'Billings' : 'Transactions'}</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={24} color={AppColors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {[
                  { value: 'created_at' as SortOption, order: 'desc' as const, label: 'Date (Newest First)' },
                  { value: 'created_at' as SortOption, order: 'asc' as const, label: 'Date (Oldest First)' },
                  { value: 'billing_code' as SortOption, order: 'asc' as const, label: 'Code (A-Z)' },
                  { value: 'billing_code' as SortOption, order: 'desc' as const, label: 'Code (Z-A)' },
                  { value: 'billing_amount' as SortOption, order: 'desc' as const, label: 'Amount (High to Low)' },
                  { value: 'billing_amount' as SortOption, order: 'asc' as const, label: 'Amount (Low to High)' },
                  { value: 'status' as SortOption, order: 'asc' as const, label: 'Status (A-Z)' },
                  { value: 'status' as SortOption, order: 'desc' as const, label: 'Status (Z-A)' },
                ].map((option) => {
                  const isActive = sortBy === option.value && sortOrder === option.order;
                  return (
                    <TouchableOpacity
                      key={`${option.value}-${option.order}`}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor: isActive ? AppColors.primary + '10' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSortBy(option.value);
                        setSortOrder(option.order);
                        setShowSortModal(false);
                      }}>
                      <Text style={[styles.filterOptionText, { color: AppColors.text }]}>
                        {option.label}
                      </Text>
                      {isActive && (
                        <Check size={20} color={AppColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: AppColors.primary + '10',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 400,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  filterOptionContent: {
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  filterOptionCount: {
    fontSize: 14,
    fontWeight: '400',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  billingCard: {
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
  billingInvoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  billingInvoiceHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  billingInvoiceCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  billingInvoiceCode: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  billingInvoiceProject: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 28,
    marginTop: 2,
  },
  billingInvoiceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  billingStatusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  billingInvoiceStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  billingInvoiceAmountSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    alignItems: 'center',
  },
  billingInvoiceAmountLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billingInvoiceAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  billingInvoiceSummary: {
    marginBottom: 20,
    gap: 12,
  },
  billingInvoiceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingInvoiceSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billingInvoiceSummaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  billingInvoiceSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  billingInvoiceProgress: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  billingInvoiceProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billingInvoiceProgressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  billingInvoiceProgressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  billingInvoiceProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  billingInvoiceProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  billingInvoiceDetails: {
    gap: 10,
  },
  billingInvoiceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billingInvoiceDetailRowOverdue: {
    paddingTop: 4,
  },
  billingInvoiceDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  billingInvoiceDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Keep old card styles for transaction cards
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  cardProject: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  placeholderText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: AppColors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  paymentPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  amountSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionDetails: {
    marginTop: 12,
    gap: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  transactionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // New transaction card styles
  transactionCard: {
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
  transactionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  transactionCardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  transactionCardCode: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transactionCardBilling: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 26,
    marginTop: 2,
  },
  transactionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  transactionCardAmountSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    alignItems: 'center',
  },
  transactionCardAmountLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionCardAmountValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  transactionCardDetails: {
    gap: 10,
  },
  transactionCardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionCardDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  transactionCardDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
});

