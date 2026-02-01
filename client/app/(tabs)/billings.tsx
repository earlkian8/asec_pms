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
import BillingCard from '@/components/cards/BillingCard';
import TransactionCard from '@/components/cards/TransactionCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { AppColors } from '@/constants/colors';
import { useDialog } from '@/contexts/DialogContext';

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

  const statusCounts = useMemo(() => {
    return {
      all: billings.length,
      unpaid: billings.filter((b) => b.status === 'unpaid').length,
      partial: billings.filter((b) => b.status === 'partial').length,
      paid: billings.filter((b) => b.status === 'paid').length,
    };
  }, [billings]);

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
        <LoadingState />
      ) : (activeTab === 'transactions' && transactionsError) ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={AlertCircle}
            title="Error Loading Transactions"
            subtitle={transactionsError}
            iconColor={AppColors.error}
          />
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
              ? <BillingCard billing={item} index={index} onPress={() => router.push(`/billing-detail?id=${item.id}`)} />
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
            <EmptyState
              icon={activeTab === 'billings' ? Receipt : CreditCard}
              title={activeTab === 'billings' ? 'No billings found' : 'No transactions found'}
              subtitle={
                searchQuery
                  ? 'Try adjusting your search or filters'
                  : activeTab === 'billings' 
                    ? 'You have no billings'
                    : 'You have no transactions'
              }
            />
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
});

