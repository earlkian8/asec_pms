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

    return (
      <AnimatedCard
        index={index}
        delay={100}
        onPress={() => router.push(`/billing-detail?id=${billing.id}`)}
        style={StyleSheet.flatten([styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }])}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.titleRow}>
              <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
              <Text style={[styles.cardName, { color: AppColors.text }]} numberOfLines={2}>
                {billing.billing_code}
              </Text>
            </View>
            <Text style={[styles.cardProject, { color: AppColors.textSecondary }]} numberOfLines={1}>
              <Ionicons name="briefcase-outline" size={12} color={AppColors.textSecondary} /> {billing.project.project_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {billing.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardDescription, { color: AppColors.textSecondary }, !billing.description && styles.placeholderText]} numberOfLines={2}>
          {billing.description || 'No description provided'}
        </Text>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color={AppColors.textSecondary} />
            <Text style={[styles.statValue, { color: AppColors.text }]}>{formatCurrency(billing.billing_amount)}</Text>
            <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={AppColors.textSecondary} />
            <Text style={[styles.statValue, { color: AppColors.text }]}>{formatCurrency(billing.total_paid)}</Text>
            <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>Paid</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color={AppColors.textSecondary} />
            <Text style={[styles.statValue, { color: AppColors.text }]}>
              {billing.due_date ? new Date(billing.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }) : 'N/A'}
            </Text>
            <Text style={[styles.statLabel, { color: AppColors.textSecondary }]}>Due Date</Text>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <Text style={[styles.paymentLabel, { color: AppColors.textSecondary }]}>Payment Progress</Text>
            <Text style={[styles.paymentPercent, { color: AppColors.text }]}>{Math.round(paymentPercent)}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: AppColors.border }]}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(paymentPercent, 100)}%` }]}
            />
          </View>
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: AppColors.textSecondary }]}>Remaining Amount</Text>
            <Text style={[styles.amountValue, { color: billing.remaining_amount > 0 ? AppColors.error : AppColors.success }]}>
              {formatCurrency(billing.remaining_amount)}
            </Text>
          </View>
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
    const status = paymentStatusColors[transaction.payment_status] || paymentStatusColors.pending;

    return (
      <AnimatedCard
        index={index}
        delay={100}
        style={StyleSheet.flatten([styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }])}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardName, { color: AppColors.text }]} numberOfLines={1}>
              {transaction.payment_code}
            </Text>
            <Text style={[styles.cardProject, { color: AppColors.textSecondary }]} numberOfLines={1}>
              {transaction.billing?.billing_code || 'N/A'} - {transaction.billing?.project?.project_name || 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {transaction.payment_status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.transactionRow}>
            <Text style={[styles.transactionLabel, { color: AppColors.textSecondary }]}>Amount</Text>
            <Text style={[styles.transactionValue, { color: AppColors.text }]}>
              {formatCurrency(transaction.payment_amount)}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={[styles.transactionLabel, { color: AppColors.textSecondary }]}>Date</Text>
            <Text style={[styles.transactionValue, { color: AppColors.text }]}>
              {new Date(transaction.payment_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={[styles.transactionLabel, { color: AppColors.textSecondary }]}>Method</Text>
            <Text style={[styles.transactionValue, { color: AppColors.text }]}>
              {transaction.payment_method === 'paymongo' ? 'PayMongo' : transaction.payment_method.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {transaction.reference_number && (
            <View style={styles.transactionRow}>
              <Text style={[styles.transactionLabel, { color: AppColors.textSecondary }]}>Reference</Text>
              <Text style={[styles.transactionValue, { color: AppColors.text }]} numberOfLines={1}>
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
});

