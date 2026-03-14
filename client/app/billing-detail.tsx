import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/services/api';
import { Billing } from '@/hooks/useBillings';
import { Ionicons } from '@expo/vector-icons';
import {
  ArrowLeft, CreditCard, CheckCircle, XCircle,
  Clock, AlertCircle, Receipt, ArrowRight,
} from 'lucide-react-native';
import { useDialog } from '@/contexts/DialogContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatCurrency';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:      '#0F0F0E',
  inkMid:   '#4A4845',
  inkLight: '#9A9691',
  chalk:    '#FAFAF8',
  surface:  '#FFFFFF',
  hairline: '#E8E5DF',
  hairlineMd:'#D4D0C8',
  blue:     '#1D4ED8',
  blueBg:   '#EEF2FF',
  green:    '#2D7D52',
  greenBg:  '#EDF7F2',
  red:      '#C0392B',
  redBg:    '#FDF1F0',
  amber:    '#B45309',
  amberBg:  '#FFFBEB',
  grey:     '#6B7280',
  greyBg:   '#F3F4F6',
};

const BILLING_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  unpaid:  { color: D.red,   bg: D.redBg,   label: 'Unpaid'  },
  partial: { color: D.amber, bg: D.amberBg, label: 'Partial' },
  paid:    { color: D.green, bg: D.greenBg, label: 'Paid'    },
};

const PAYMENT_STATUS: Record<string, { color: string; bg: string; icon: any }> = {
  paid:      { color: D.green, bg: D.greenBg, icon: CheckCircle },
  pending:   { color: D.amber, bg: D.amberBg, icon: Clock       },
  failed:    { color: D.red,   bg: D.redBg,   icon: XCircle     },
  cancelled: { color: D.grey,  bg: D.greyBg,  icon: XCircle     },
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function CardLabel({ children }: { children: string }) {
  return <Text style={styles.cardLabel}>{children}</Text>;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={14} color={D.inkLight} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BillingDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const dialog    = useDialog();
  const { displayBillingModule } = useAuth();

  const [billing,               setBilling]               = useState<Billing | null>(null);
  const [loading,               setLoading]               = useState(true);
  const [error,                 setError]                 = useState<string | null>(null);
  const [showPaymentModal,      setShowPaymentModal]      = useState(false);
  const [showReceiptModal,      setShowReceiptModal]      = useState(false);
  const [selectedPayment,       setSelectedPayment]       = useState<Billing['payments'][0] | null>(null);
  const [customAmount,          setCustomAmount]          = useState('');
  const [processing,            setProcessing]            = useState(false);
  const [amountError,           setAmountError]           = useState<string | null>(null);
  const [amountTouched,         setAmountTouched]         = useState(false);

  useEffect(() => {
    if (!displayBillingModule) router.replace('/(tabs)');
  }, [displayBillingModule, router]);

  useEffect(() => {
    fetchBilling();
  }, [id]);

  useFocusEffect(useCallback(() => { fetchBilling(); }, [id]));

  useEffect(() => {
    if (!showPaymentModal) {
      setCustomAmount('');
      setAmountError(null);
      setAmountTouched(false);
      setProcessing(false);
    }
  }, [showPaymentModal]);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBilling(Number(id));
      if (response.success && response.data) {
        setBilling(response.data);
      } else {
        setError(response.message || 'Failed to fetch billing details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (val: string): string | null => {
    if (!val || val.trim() === '') return null;
    const n = parseFloat(val);
    if (isNaN(n)) return 'Please enter a valid number';
    if (n <= 0) return 'Amount must be greater than 0';
    if (n > 9999999.99) return 'Maximum payment amount is ₱9,999,999.99';
    if (billing && n > billing.remaining_amount)
      return `Cannot exceed remaining amount of ${formatCurrency(billing.remaining_amount)}`;
    return null;
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^\d.]/g, '');
    const parts   = cleaned.split('.');
    const formatted = parts.length > 1
      ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2)
      : parts[0];
    setCustomAmount(formatted);
    setAmountTouched(true);
    setAmountError(validateAmount(formatted));
  };

  const handleInitiatePayment = async () => {
    if (!billing) { dialog.showError('Billing information not available.'); return; }
    if (customAmount && customAmount.trim() !== '') {
      const err = validateAmount(customAmount);
      if (err) { setAmountError(err); setAmountTouched(true); dialog.showError(err); return; }
    }
    const amount = customAmount ? parseFloat(customAmount) : billing.remaining_amount;
    if (isNaN(amount) || amount <= 0) {
      const msg = 'Please enter a valid amount';
      setAmountError(msg); setAmountTouched(true); dialog.showError(msg); return;
    }
    setProcessing(true);
    try {
      const response = await apiService.initiatePayment(Number(id), { amount });
      if (!response.success) {
        const msg = response.message || 'Failed to initiate payment';
        setAmountError(msg); dialog.showError(msg); setProcessing(false); return;
      }
      if (response.data?.checkout_url) {
        setShowPaymentModal(false);
        const canOpen = await Linking.canOpenURL(response.data.checkout_url);
        if (canOpen) {
          await Linking.openURL(response.data.checkout_url);
          dialog.showSuccess('Redirecting to payment. Return here when done.', 'Payment');
        } else {
          dialog.showError('Unable to open payment page. Please try again.');
        }
      } else {
        dialog.showError(response.message || 'Failed to get payment link.');
      }
    } catch (err) {
      dialog.showError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={D.ink} />
      </View>
    );
  }

  if (error || !billing) {
    return (
      <View style={[styles.root, styles.centered, { padding: 20 }]}>
        <AlertCircle size={40} color={D.red} strokeWidth={1.5} />
        <Text style={styles.errorTitle}>{error || 'Billing not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bStatus = BILLING_STATUS[billing.status] ?? BILLING_STATUS.unpaid;
  const pct     = Math.min(Math.round(billing.payment_percentage || 0), 100);
  const isOverdue = billing.due_date &&
    new Date(billing.due_date) < new Date() &&
    (billing.status === 'unpaid' || billing.status === 'partial');

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={D.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Invoice card ─────────────────────────────────────────────────── */}
        <View style={styles.invoiceCard}>

          {/* Top: code + status */}
          <View style={styles.invoiceTopRow}>
            <View style={styles.invoiceTopLeft}>
              <View style={styles.invoiceIconWrap}>
                <Receipt size={16} color={D.blue} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.invoiceCode}>{billing.billing_code}</Text>
                <Text style={styles.invoiceProject}>{billing.project.project_name}</Text>
              </View>
            </View>
            <View style={[styles.invoiceStatusPill, { backgroundColor: bStatus.bg }]}>
              <Text style={[styles.invoiceStatusText, { color: bStatus.color }]}>
                {bStatus.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Amount hero */}
          <View style={styles.amountHero}>
            <Text style={styles.amountHeroLabel}>Invoice Amount</Text>
            <Text style={styles.amountHeroValue}>{formatCurrency(billing.billing_amount)}</Text>
          </View>

          {/* Progress */}
          {billing.status !== 'paid' && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Payment Progress</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {
                  width: `${pct}%`,
                  backgroundColor: pct === 100 ? D.green : D.blue,
                }]} />
              </View>
            </View>
          )}

          {/* Paid / remaining */}
          <View style={styles.splitRow}>
            <View style={styles.splitCell}>
              <Text style={styles.splitLabel}>Paid</Text>
              <Text style={[styles.splitValue, { color: D.green }]}>
                {formatCurrency(billing.total_paid)}
              </Text>
            </View>
            <View style={[styles.splitCell, { alignItems: 'flex-end' }]}>
              <Text style={styles.splitLabel}>Remaining</Text>
              <Text style={[styles.splitValue, { color: billing.remaining_amount > 0 ? D.red : D.green }]}>
                {formatCurrency(billing.remaining_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Info card ────────────────────────────────────────────────────── */}
        <View style={[styles.sectionCard, { borderLeftColor: D.inkMid }]}>
          <CardLabel>Invoice Details</CardLabel>
          <InfoRow icon="layers-outline" label="Type"
            value={billing.billing_type === 'fixed_price' ? 'Fixed Price' : 'Milestone'} />
          {billing.billing_date && (
            <InfoRow icon="calendar-outline" label="Issued"
              value={new Date(billing.billing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          )}
          {billing.due_date && (
            <View style={[styles.infoRow, isOverdue && styles.infoRowOverdue]}>
              <Ionicons name={isOverdue ? 'alert-circle' : 'time-outline'} size={14}
                color={isOverdue ? D.red : D.inkLight} />
              <Text style={[styles.infoLabel, isOverdue && { color: D.red }]}>Due Date</Text>
              <Text style={[styles.infoValue, isOverdue && { color: D.red, fontWeight: '700' }]}>
                {new Date(billing.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                {isOverdue ? ' · Overdue' : ''}
              </Text>
            </View>
          )}
          {billing.milestone && (
            <InfoRow icon="flag-outline" label="Milestone" value={billing.milestone.name} />
          )}
          {billing.description && (
            <View style={styles.descRow}>
              <Ionicons name="document-text-outline" size={14} color={D.inkLight} />
              <Text style={styles.descText}>{billing.description}</Text>
            </View>
          )}
        </View>

        {/* ── Payment history ──────────────────────────────────────────────── */}
        {billing.payments && billing.payments.length > 0 && (
          <View style={[styles.sectionCard, { borderLeftColor: D.blue }]}>
            <CardLabel>Payment History</CardLabel>
            {billing.payments.slice(0, 10).map((payment, i) => {
              const ps = PAYMENT_STATUS[payment.payment_status ?? 'pending'] ?? PAYMENT_STATUS.pending;
              const Icon = ps.icon;
              return (
                <TouchableOpacity
                  key={payment.id}
                  style={[styles.paymentRow, i < billing.payments.length - 1 && styles.paymentRowBorder]}
                  onPress={() => { setSelectedPayment(payment); setShowReceiptModal(true); }}
                  activeOpacity={0.7}>
                  <View style={[styles.paymentStatusIcon, { backgroundColor: ps.bg }]}>
                    <Icon size={13} color={ps.color} strokeWidth={2} />
                  </View>
                  <View style={styles.paymentRowBody}>
                    <Text style={styles.paymentCode}>{payment.payment_code}</Text>
                    <Text style={styles.paymentMeta}>
                      {new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {payment.payment_method === 'paymongo' ? 'PayMongo' : payment.payment_method?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.paymentRowRight}>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.payment_amount)}</Text>
                    <ArrowRight size={13} color={D.inkLight} strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Pay button ───────────────────────────────────────────────────── */}
        {billing.remaining_amount > 0 && (
          <TouchableOpacity
            style={[styles.payBtn, processing && { opacity: 0.6 }]}
            onPress={() => setShowPaymentModal(true)}
            disabled={processing}>
            {processing
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <CreditCard size={18} color="#FFF" strokeWidth={2} />
                  <Text style={styles.payBtnText}>Pay Now</Text>
                </>}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ══════════════════════════ PAY MODAL ════════════════════════════════ */}
      <Modal visible={showPaymentModal} animationType="slide" transparent onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pay Invoice</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <XCircle size={22} color={D.ink} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {/* Balance display */}
              <View style={styles.payBalanceCard}>
                <Text style={styles.payBalanceLabel}>Remaining Balance</Text>
                <Text style={styles.payBalanceValue}>{formatCurrency(billing.remaining_amount)}</Text>
              </View>

              {/* Amount input */}
              <View style={styles.payInputSection}>
                <Text style={styles.payInputLabel}>Amount to Pay</Text>
                <Text style={styles.payInputHint}>Leave empty to pay the full remaining balance</Text>
                <View style={[styles.payInputRow, amountError && amountTouched && styles.payInputRowError]}>
                  <Text style={styles.payInputCurrency}>₱</Text>
                  <TextInput
                    style={styles.payInput}
                    placeholder="0.00"
                    placeholderTextColor={D.inkLight}
                    value={customAmount}
                    onChangeText={handleAmountChange}
                    onBlur={() => setAmountTouched(true)}
                    keyboardType="decimal-pad"
                    editable={!processing}
                  />
                </View>
                {amountError && amountTouched && (
                  <View style={styles.payInputError}>
                    <AlertCircle size={13} color={D.red} strokeWidth={2} />
                    <Text style={styles.payInputErrorText}>{amountError}</Text>
                  </View>
                )}
                <View style={styles.payMaxNote}>
                  <Ionicons name="information-circle-outline" size={13} color={D.inkLight} />
                  <Text style={styles.payMaxNoteText}>
                    Max per transaction: <Text style={{ color: D.ink, fontWeight: '700' }}>₱9,999,999.99</Text>
                  </Text>
                </View>
              </View>

              {/* Confirm button */}
              <TouchableOpacity
                style={[styles.confirmBtn, (processing || (!!amountError && amountTouched)) && { opacity: 0.55 }]}
                onPress={handleInitiatePayment}
                disabled={processing || (!!amountError && amountTouched)}>
                {processing
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <>
                      <CreditCard size={17} color="#FFF" strokeWidth={2} />
                      <Text style={styles.confirmBtnText}>Pay with Card</Text>
                    </>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════ RECEIPT MODAL ════════════════════════════════ */}
      <Modal visible={showReceiptModal} animationType="slide" transparent onRequestClose={() => setShowReceiptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptSheet}>
            <View style={styles.sheetHandle} />

            {selectedPayment && (() => {
              const ps   = PAYMENT_STATUS[selectedPayment.payment_status ?? 'pending'] ?? PAYMENT_STATUS.pending;
              const Icon = ps.icon;
              return (
                <>
                  {/* Receipt header */}
                  <View style={styles.receiptHeader}>
                    <View style={styles.receiptHeaderLeft}>
                      <View style={[styles.receiptIconCircle, { backgroundColor: ps.bg }]}>
                        <Receipt size={20} color={ps.color} strokeWidth={2} />
                      </View>
                      <View>
                        <Text style={styles.receiptTitle}>Payment Receipt</Text>
                        <Text style={styles.receiptSubtitle}>{selectedPayment.payment_code}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                      <XCircle size={22} color={D.ink} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                    {/* Amount */}
                    <View style={[styles.receiptAmountBlock, { borderColor: ps.color + '40' }]}>
                      <Text style={styles.receiptAmountLabel}>Amount Paid</Text>
                      <Text style={[styles.receiptAmountValue, { color: ps.color }]}>
                        {formatCurrency(selectedPayment.payment_amount)}
                      </Text>
                      {/* Status badge */}
                      <View style={[styles.receiptStatusBadge, { backgroundColor: ps.bg }]}>
                        <Icon size={13} color={ps.color} strokeWidth={2} />
                        <Text style={[styles.receiptStatusText, { color: ps.color }]}>
                          {(selectedPayment.payment_status ?? 'pending').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Details table */}
                    <View style={styles.receiptTable}>
                      {[
                        { label: 'Billing Code',  value: billing.billing_code },
                        { label: 'Project',        value: billing.project.project_name },
                        { label: 'Payment Date',   value: new Date(selectedPayment.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                        { label: 'Method',         value: selectedPayment.payment_method === 'paymongo' ? 'PayMongo (Card)' : (selectedPayment.payment_method ?? '').replace('_', ' ').toUpperCase() },
                        ...(selectedPayment.reference_number ? [{ label: 'Reference', value: selectedPayment.reference_number }] : []),
                        ...(selectedPayment.paymongo_payment_intent_id ? [{ label: 'PayMongo ID', value: selectedPayment.paymongo_payment_intent_id }] : []),
                      ].map((row, i, arr) => (
                        <View key={row.label} style={[styles.receiptTableRow, i < arr.length - 1 && styles.receiptTableRowBorder]}>
                          <Text style={styles.receiptTableLabel}>{row.label}</Text>
                          <Text style={styles.receiptTableValue} numberOfLines={2}>{row.value}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Footer message */}
                    <View style={styles.receiptFooter}>
                      <Text style={[styles.receiptFooterTitle, { color: ps.color }]}>
                        {selectedPayment.payment_status === 'paid'    ? 'Payment Confirmed'  :
                         selectedPayment.payment_status === 'pending' ? 'Payment Pending'    :
                         'Payment Status'}
                      </Text>
                      <Text style={styles.receiptFooterText}>
                        {selectedPayment.payment_status === 'paid'
                          ? 'Your payment has been successfully processed. This receipt serves as your official payment confirmation.'
                          : selectedPayment.payment_status === 'pending'
                          ? 'Your payment is being processed. You will be notified once it completes.'
                          : 'Please contact support if you have questions about this transaction.'}
                      </Text>
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: D.chalk },
  centered:{ justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.hairline,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: D.ink },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Invoice card
  invoiceCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  invoiceTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  invoiceTopLeft:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, marginRight: 10 },
  invoiceIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: D.blueBg, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  invoiceCode:       { fontSize: 18, fontWeight: '700', color: D.ink, letterSpacing: -0.3 },
  invoiceProject:    { fontSize: 12, color: D.inkLight, marginTop: 2 },
  invoiceStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  invoiceStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  // Amount hero
  amountHero: {
    borderTopWidth: 1, borderTopColor: D.hairline,
    paddingTop: 14, marginBottom: 14, alignItems: 'center',
  },
  amountHeroLabel: { fontSize: 11, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  amountHeroValue: { fontSize: 32, fontWeight: '700', color: D.ink, letterSpacing: -1 },

  // Progress
  progressSection: { marginBottom: 14 },
  progressLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:   { fontSize: 11, color: D.inkLight, fontWeight: '500' },
  progressPct:     { fontSize: 11, fontWeight: '700', color: D.ink },
  progressTrack:   { height: 4, backgroundColor: D.hairline, borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 2 },

  // Split row
  splitRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: D.hairline, paddingTop: 12,
  },
  splitCell:  { gap: 3 },
  splitLabel: { fontSize: 10, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  splitValue: { fontSize: 15, fontWeight: '700' },

  // Section card
  sectionCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 12,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '700', color: D.inkLight,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  // Info rows
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: D.hairline },
  infoRowOverdue:{ backgroundColor: D.redBg, marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 0 },
  infoLabel:     { fontSize: 12, color: D.inkLight, fontWeight: '500', width: 80 },
  infoValue:     { flex: 1, fontSize: 12, color: D.ink, fontWeight: '600', textAlign: 'right' },
  descRow:       { flexDirection: 'row', gap: 8, paddingTop: 10 },
  descText:      { flex: 1, fontSize: 12, color: D.inkMid, lineHeight: 18 },

  // Payment history rows
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  paymentRowBorder: { borderBottomWidth: 1, borderBottomColor: D.hairline },
  paymentStatusIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  paymentRowBody:  { flex: 1 },
  paymentCode:     { fontSize: 13, fontWeight: '600', color: D.ink, marginBottom: 2 },
  paymentMeta:     { fontSize: 11, color: D.inkLight },
  paymentRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentAmount:   { fontSize: 13, fontWeight: '700', color: D.ink },

  // Pay button
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: D.ink, height: 52, borderRadius: 12, marginTop: 4,
  },
  payBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Error
  errorTitle: { fontSize: 15, fontWeight: '600', color: D.ink, marginTop: 12, marginBottom: 20 },
  retryBtn:   { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 40 },
  receiptSheet: { backgroundColor: D.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: D.hairlineMd, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  sheetTitle:  { fontSize: 16, fontWeight: '700', color: D.ink },
  sheetScroll: { padding: 20 },

  // Pay modal
  payBalanceCard: {
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 20,
  },
  payBalanceLabel: { fontSize: 11, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  payBalanceValue: { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  payInputSection: { marginBottom: 20 },
  payInputLabel:   { fontSize: 13, fontWeight: '600', color: D.ink, marginBottom: 3 },
  payInputHint:    { fontSize: 11, color: D.inkLight, marginBottom: 10 },
  payInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: D.hairline, borderRadius: 10,
    paddingHorizontal: 14, height: 52, backgroundColor: D.chalk,
  },
  payInputRowError: { borderColor: D.red, backgroundColor: D.redBg },
  payInputCurrency: { fontSize: 18, fontWeight: '600', color: D.inkMid },
  payInput:         { flex: 1, fontSize: 18, fontWeight: '600', color: D.ink },
  payInputError:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  payInputErrorText:{ fontSize: 12, color: D.red, flex: 1 },
  payMaxNote:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  payMaxNoteText:   { fontSize: 11, color: D.inkLight, flex: 1 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: D.ink, height: 52, borderRadius: 12,
  },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Receipt modal
  receiptHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  receiptHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 },
  receiptIconCircle:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  receiptTitle:       { fontSize: 16, fontWeight: '700', color: D.ink },
  receiptSubtitle:    { fontSize: 11, color: D.inkLight, marginTop: 1 },
  receiptAmountBlock: {
    borderWidth: 1.5, borderRadius: 10, padding: 16,
    alignItems: 'center', marginBottom: 16, borderStyle: 'dashed',
  },
  receiptAmountLabel:  { fontSize: 10, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  receiptAmountValue:  { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, marginBottom: 10 },
  receiptStatusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  receiptStatusText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  receiptTable:        { borderWidth: 1, borderColor: D.hairline, borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  receiptTableRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12 },
  receiptTableRowBorder:{ borderBottomWidth: 1, borderBottomColor: D.hairline },
  receiptTableLabel:   { fontSize: 12, color: D.inkLight, fontWeight: '500', flex: 1 },
  receiptTableValue:   { fontSize: 12, color: D.ink, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  receiptFooter:       { alignItems: 'center', paddingTop: 8 },
  receiptFooterTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  receiptFooterText:   { fontSize: 12, color: D.inkLight, textAlign: 'center', lineHeight: 18 },
});