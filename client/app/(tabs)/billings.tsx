import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, TextInput, RefreshControl,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBillings } from '@/hooks/useBillings';
import { useBillingTransactions } from '@/hooks/useBillingTransactions';
import {
  Search, X, Check, AlertCircle, Receipt,
  CreditCard, SlidersHorizontal, Filter,
} from 'lucide-react-native';
import BillingCard from '@/components/cards/BillingCard';
import TransactionCard from '@/components/cards/TransactionCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useDialog } from '@/contexts/DialogContext';

type SortOption = 'created_at' | 'billing_code' | 'billing_date' | 'due_date' | 'billing_amount' | 'status';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:       '#0F0F0E',
  inkMid:    '#4A4845',
  inkLight:  '#9A9691',
  chalk:     '#FAFAF8',
  surface:   '#FFFFFF',
  hairline:  '#E8E5DF',
  hairlineMd:'#D4D0C8',
  red:       '#C0392B',
  redBg:     '#FDF1F0',
  amber:     '#B45309',
  amberBg:   '#FFFBEB',
  green:     '#2D7D52',
  greenBg:   '#EDF7F2',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  all:     { label: 'All',     color: D.ink,   bg: '#F0EFED' },
  unpaid:  { label: 'Unpaid',  color: D.red,   bg: D.redBg  },
  partial: { label: 'Partial', color: D.amber, bg: D.amberBg },
  paid:    { label: 'Paid',    color: D.green, bg: D.greenBg },
};

export default function BillingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  const [activeTab,      setActiveTab]      = useState<'billings' | 'transactions'>('billings');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterStatus,   setFilterStatus]   = useState<string | null>(null);
  const [sortBy,         setSortBy]         = useState<SortOption>('created_at');
  const [sortOrder,      setSortOrder]      = useState<'asc' | 'desc'>('desc');
  const [showSortModal,  setShowSortModal]  = useState(false);
  const [showFilterModal,setShowFilterModal]= useState(false);
  const [refreshing,     setRefreshing]     = useState(false);

  useEffect(() => {
    if (activeTab === 'transactions') refreshTransactions();
  }, [activeTab]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { billings, loading, refresh } = useBillings({
    status: filterStatus, search: debouncedSearch, sortBy, sortOrder,
  });
  const { transactions, loading: txLoading, error: txError, refresh: refreshTransactions } =
    useBillingTransactions({ search: debouncedSearch, sortBy, sortOrder });

  const statusOptions = ['all', 'unpaid', 'partial', 'paid'];
  const filteredBillings = useMemo(() => billings, [billings]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'billings') await refresh();
    else await refreshTransactions();
    setRefreshing(false);
  }, [refresh, refreshTransactions, activeTab]);

  const statusCounts = useMemo(() => ({
    all:     billings.length,
    unpaid:  billings.filter((b) => b.status === 'unpaid').length,
    partial: billings.filter((b) => b.status === 'partial').length,
    paid:    billings.filter((b) => b.status === 'paid').length,
  }), [billings]);

  const isLoading = activeTab === 'billings' ? loading : txLoading;
  const itemCount = activeTab === 'billings' ? filteredBillings.length : transactions.length;

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Billings</Text>
            <Text style={styles.headerSub}>
              {itemCount} {activeTab === 'billings' ? 'invoice' : 'transaction'}{itemCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {activeTab === 'billings' && (
              <TouchableOpacity
                style={[styles.iconBtn, filterStatus && { backgroundColor: D.ink, borderColor: D.ink }]}
                onPress={() => setShowFilterModal(true)}>
                <Filter size={18} color={filterStatus ? '#FFF' : D.inkMid} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSortModal(true)}>
              <SlidersHorizontal size={18} color={D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab switcher — segmented control style */}
        <View style={styles.segmented}>
          {(['billings', 'transactions'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.segment, activeTab === tab && styles.segmentActive]}
              onPress={() => setActiveTab(tab)}>
              {tab === 'billings'
                ? <Receipt size={14} color={activeTab === tab ? D.ink : D.inkLight} strokeWidth={2} />
                : <CreditCard size={14} color={activeTab === tab ? D.ink : D.inkLight} strokeWidth={2} />}
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={15} color={D.inkLight} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'billings' ? 'Search billings…' : 'Search transactions…'}
            placeholderTextColor={D.inkLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color={D.inkLight} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status chips — billings only */}
        {activeTab === 'billings' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {statusOptions.map((s) => {
              const isActive = filterStatus === s || (s === 'all' && filterStatus === null);
              const meta = STATUS_META[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFilterStatus(s === 'all' ? null : s)}
                  style={[styles.chip, isActive && { backgroundColor: meta.bg, borderColor: meta.color }]}>
                  <Text style={[styles.chipText, isActive && { color: meta.color }]}>{meta.label}</Text>
                  <Text style={[styles.chipCount, isActive && { color: meta.color }]}>
                    {statusCounts[s as keyof typeof statusCounts]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState />
      ) : activeTab === 'transactions' && txError ? (
        <View style={styles.errContainer}>
          <EmptyState icon={AlertCircle} title="Error Loading Transactions" subtitle={txError} iconColor={D.red} />
          <TouchableOpacity style={styles.retryBtn} onPress={refreshTransactions}>
            <Text style={styles.retryBtnText}>Retry</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === 'billings' ? Receipt : CreditCard}
              title={activeTab === 'billings' ? 'No billings found' : 'No transactions found'}
              subtitle={searchQuery ? 'Try adjusting your search' : undefined}
            />
          }
        />
      )}

      {/* ── Filter modal ─────────────────────────────────────────────────────── */}
      {activeTab === 'billings' && (
        <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
              <View style={styles.sheet} onStartShouldSetResponder={() => true}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Filter by Status</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <X size={22} color={D.ink} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                {statusOptions.map((status) => {
                  const isActive = filterStatus === status || (status === 'all' && filterStatus === null);
                  const meta = STATUS_META[status];
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.sheetOption, isActive && { backgroundColor: meta.bg }]}
                      onPress={() => { setFilterStatus(status === 'all' ? null : status); setShowFilterModal(false); }}>
                      <View style={styles.sheetOptionLeft}>
                        <View style={[styles.sheetDot, { backgroundColor: meta.color }]} />
                        <View>
                          <Text style={[styles.sheetOptionText, isActive && { color: meta.color }]}>
                            {meta.label}
                          </Text>
                          <Text style={styles.sheetOptionSub}>
                            {statusCounts[status as keyof typeof statusCounts]} billings
                          </Text>
                        </View>
                      </View>
                      {isActive && <Check size={18} color={meta.color} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── Sort modal ────────────────────────────────────────────────────────── */}
      <Modal visible={showSortModal} animationType="slide" transparent onRequestClose={() => setShowSortModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Sort {activeTab === 'billings' ? 'Billings' : 'Transactions'}</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <X size={22} color={D.ink} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 380 }}>
                {([
                  { value: 'created_at'     as SortOption, order: 'desc' as const, label: 'Date: Newest First' },
                  { value: 'created_at'     as SortOption, order: 'asc'  as const, label: 'Date: Oldest First' },
                  { value: 'billing_amount' as SortOption, order: 'desc' as const, label: 'Amount: High → Low' },
                  { value: 'billing_amount' as SortOption, order: 'asc'  as const, label: 'Amount: Low → High' },
                  { value: 'billing_code'   as SortOption, order: 'asc'  as const, label: 'Code A → Z' },
                  { value: 'billing_code'   as SortOption, order: 'desc' as const, label: 'Code Z → A' },
                  { value: 'status'         as SortOption, order: 'asc'  as const, label: 'Status A → Z' },
                ]).map((opt) => {
                  const isActive = sortBy === opt.value && sortOrder === opt.order;
                  return (
                    <TouchableOpacity
                      key={`${opt.value}-${opt.order}`}
                      style={[styles.sheetOption, isActive && { backgroundColor: '#F0EFED' }]}
                      onPress={() => { setSortBy(opt.value); setSortOrder(opt.order); setShowSortModal(false); }}>
                      <Text style={[styles.sheetOptionText, isActive && { color: D.ink, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                      {isActive && <Check size={18} color={D.ink} strokeWidth={2.5} />}
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
  root: { flex: 1, backgroundColor: D.chalk },

  header: {
    backgroundColor: D.surface, borderBottomWidth: 1,
    borderBottomColor: D.hairline, paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: D.inkLight, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },

  // Segmented
  segmented: {
    flexDirection: 'row', backgroundColor: D.chalk,
    borderRadius: 10, borderWidth: 1, borderColor: D.hairline,
    padding: 3, marginBottom: 12,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6,
  },
  segmentActive: { backgroundColor: D.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  segmentText:   { fontSize: 13, fontWeight: '500', color: D.inkLight },
  segmentTextActive: { color: D.ink, fontWeight: '700' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.ink, fontFamily: 'Inter' },

  // Chips
  chipScroll: { marginHorizontal: -20 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: D.hairline, backgroundColor: D.chalk,
  },
  chipText:  { fontSize: 12, fontWeight: '600', color: D.inkMid },
  chipCount: { fontSize: 11, fontWeight: '700', color: D.inkLight },

  listContent: { padding: 16, paddingBottom: 40 },

  // Error
  errContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  retryBtn:     { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Modal/Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: D.hairlineMd, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: D.ink },
  sheetOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  sheetOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetDot:        { width: 8, height: 8, borderRadius: 4 },
  sheetOptionText: { fontSize: 15, fontWeight: '500', color: D.inkMid },
  sheetOptionSub:  { fontSize: 12, color: D.inkLight, marginTop: 1 },
});