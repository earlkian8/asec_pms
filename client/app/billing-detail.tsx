import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/services/api';
import { Billing } from '@/hooks/useBillings';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
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

export default function BillingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'gcash' | 'paymaya'>('card');
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking'>('idle');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBilling();
  }, [id]);

  useEffect(() => {
    // Poll payment status if there's a pending payment
    if (paymentStatus === 'pending' && id) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [paymentStatus, id]);

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

  const checkPaymentStatus = async () => {
    if (!id) return;

    try {
      const response = await apiService.checkPaymentStatus(Number(id));
      
      if (response.success && response.data) {
        const status = response.data.status;
        
        if (status === 'paid') {
          setPaymentStatus('idle');
          setShowPaymentModal(false);
          dialog.showSuccess('Payment completed successfully!');
          fetchBilling(); // Refresh billing data
        } else if (status === 'failed' || status === 'cancelled') {
          setPaymentStatus('idle');
          dialog.showError(`Payment ${status}. Please try again.`);
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  const handlePay = async () => {
    if (!billing) return;

    const amount = customAmount ? parseFloat(customAmount) : billing.remaining_amount;

    if (isNaN(amount) || amount <= 0) {
      dialog.showError('Please enter a valid amount');
      return;
    }

    if (amount > billing.remaining_amount) {
      dialog.showError(`Amount cannot exceed remaining amount of ${formatCurrency(billing.remaining_amount)}`);
      return;
    }

    setProcessing(true);

    try {
      const response = await apiService.initiatePayment(Number(id), {
        amount,
        payment_method_type: paymentMethod,
      });

      if (response.success && response.data) {
        const { checkout_url, source_id, client_key, public_key, payment_method_type } = response.data;

        // For GCash/PayMaya, we should have a checkout_url
        if (payment_method_type === 'gcash' || payment_method_type === 'paymaya') {
          if (checkout_url) {
            // Open checkout URL in browser
            setCheckoutUrl(checkout_url);
            setPaymentStatus('pending');
            
            try {
              const result = await WebBrowser.openBrowserAsync(checkout_url, {
                showTitle: true,
                enableBarCollapsing: false,
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
              });

              // After browser closes, check payment status
              if (result.type === 'dismiss' || result.type === 'cancel') {
                setPaymentStatus('checking');
                // Wait a bit for PayMongo to process
                setTimeout(async () => {
                  await checkPaymentStatus();
                }, 2000);
              }
            } catch (browserError) {
              console.error('Error opening browser:', browserError);
              dialog.showError('Failed to open payment page. Please try again.');
              setPaymentStatus('idle');
            }
          } else {
            dialog.showError('Failed to get checkout URL from PayMongo. Please try again.');
            setPaymentStatus('idle');
          }
        } else if (paymentMethod === 'card' && client_key) {
          // For card payments, we need to use PayMongo's payment form
          // This would typically be done with PayMongo's JavaScript SDK
          // For now, we'll show a message to use the web checkout
          dialog.showError('Card payments require web checkout. Please use GCash or PayMaya for mobile payments.');
          setPaymentStatus('idle');
        } else {
          dialog.showError('Invalid payment method or missing checkout URL');
          setPaymentStatus('idle');
        }
      } else {
        dialog.showError(response.message || 'Failed to initiate payment');
        setPaymentStatus('idle');
      }
    } catch (err) {
      dialog.showError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' };
      case 'partial':
        return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' };
      case 'unpaid':
        return { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' };
      default:
        return { bg: '#E5E7EB', text: '#4B5563', dot: '#6B7280' };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (error || !billing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <AlertCircle size={48} color={AppColors.error} />
        <Text style={[styles.errorText, { color: AppColors.error }]}>{error || 'Billing not found'}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: AppColors.primary }]}
          onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getStatusColor(billing.status);
  const paymentPercent = billing.payment_percentage || 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: AppColors.card, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: AppColors.text }]}>Billing Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Billing Card */}
        <View style={[styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <View style={styles.titleRow}>
                <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.cardName, { color: AppColors.text }]}>
                  {billing.billing_code}
                </Text>
              </View>
              <Text style={[styles.cardProject, { color: AppColors.textSecondary }]}>
                {billing.project.project_name}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>
                {billing.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {billing.description && (
            <Text style={[styles.description, { color: AppColors.textSecondary }]}>
              {billing.description}
            </Text>
          )}

          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: AppColors.textSecondary }]}>Total Amount</Text>
              <Text style={[styles.amountValue, { color: AppColors.text }]}>
                {formatCurrency(billing.billing_amount)}
              </Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: AppColors.textSecondary }]}>Paid Amount</Text>
              <Text style={[styles.amountValue, { color: AppColors.success }]}>
                {formatCurrency(billing.total_paid)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: AppColors.border }]} />
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: AppColors.textSecondary }]}>Remaining Amount</Text>
              <Text style={[styles.amountValue, { color: billing.remaining_amount > 0 ? AppColors.error : AppColors.success }]}>
                {formatCurrency(billing.remaining_amount)}
              </Text>
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

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={AppColors.textSecondary} />
              <Text style={[styles.infoLabel, { color: AppColors.textSecondary }]}>Billing Date</Text>
              <Text style={[styles.infoValue, { color: AppColors.text }]}>
                {new Date(billing.billing_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            {billing.due_date && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={AppColors.textSecondary} />
                <Text style={[styles.infoLabel, { color: AppColors.textSecondary }]}>Due Date</Text>
                <Text style={[styles.infoValue, { color: AppColors.text }]}>
                  {new Date(billing.due_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="layers-outline" size={16} color={AppColors.textSecondary} />
              <Text style={[styles.infoLabel, { color: AppColors.textSecondary }]}>Type</Text>
              <Text style={[styles.infoValue, { color: AppColors.text }]}>
                {billing.billing_type === 'fixed_price' ? 'Fixed Price' : 'Milestone'}
              </Text>
            </View>
            {billing.milestone && (
              <View style={styles.infoRow}>
                <Ionicons name="flag-outline" size={16} color={AppColors.textSecondary} />
                <Text style={[styles.infoLabel, { color: AppColors.textSecondary }]}>Milestone</Text>
                <Text style={[styles.infoValue, { color: AppColors.text }]}>
                  {billing.milestone.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment History */}
        {billing.payments && billing.payments.length > 0 && (
          <View style={[styles.card, { backgroundColor: AppColors.card, borderColor: AppColors.border }]}>
            <Text style={[styles.sectionTitle, { color: AppColors.text }]}>Payment History</Text>
            {billing.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentItemHeader}>
                  <Text style={[styles.paymentCode, { color: AppColors.text }]}>{payment.payment_code}</Text>
                  <Text style={[styles.paymentAmount, { color: AppColors.text }]}>
                    {formatCurrency(payment.payment_amount)}
                  </Text>
                </View>
                <View style={styles.paymentItemDetails}>
                  <Text style={[styles.paymentDetail, { color: AppColors.textSecondary }]}>
                    {new Date(payment.payment_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={[styles.paymentDetail, { color: AppColors.textSecondary }]}>
                    {payment.payment_method === 'paymongo' ? 'PayMongo' : payment.payment_method.replace('_', ' ').toUpperCase()}
                  </Text>
                  {payment.payment_status && (
                    <View style={[styles.paymentStatusBadge, {
                      backgroundColor: payment.payment_status === 'paid' ? '#D1FAE5' : 
                                      payment.payment_status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                    }]}>
                      <Text style={[styles.paymentStatusText, {
                        color: payment.payment_status === 'paid' ? '#065F46' : 
                               payment.payment_status === 'pending' ? '#92400E' : '#991B1B',
                      }]}>
                        {payment.payment_status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pay Button */}
        {billing.remaining_amount > 0 && (
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: AppColors.primary }]}
            onPress={() => setShowPaymentModal(true)}
            disabled={processing || paymentStatus !== 'idle'}>
            {processing || paymentStatus !== 'idle' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <CreditCard size={20} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Pay Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (paymentStatus === 'idle') {
            setShowPaymentModal(false);
          }
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: AppColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: AppColors.text }]}>Pay Billing</Text>
              {paymentStatus === 'idle' && (
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <XCircle size={24} color={AppColors.text} />
                </TouchableOpacity>
              )}
            </View>

            {paymentStatus === 'pending' ? (
              <View style={styles.paymentPendingContainer}>
                <Clock size={48} color={AppColors.warning} />
                <Text style={[styles.paymentPendingText, { color: AppColors.text }]}>
                  Processing Payment...
                </Text>
                <Text style={[styles.paymentPendingSubtext, { color: AppColors.textSecondary }]}>
                  Please complete the payment in the browser window.
                </Text>
                <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 20 }} />
              </View>
            ) : paymentStatus === 'checking' ? (
              <View style={styles.paymentPendingContainer}>
                <Clock size={48} color={AppColors.primary} />
                <Text style={[styles.paymentPendingText, { color: AppColors.text }]}>
                  Verifying Payment...
                </Text>
                <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 20 }} />
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.paymentAmountSection}>
                  <Text style={[styles.paymentAmountLabel, { color: AppColors.textSecondary }]}>
                    Remaining Amount
                  </Text>
                  <Text style={[styles.paymentAmountValue, { color: AppColors.text }]}>
                    {formatCurrency(billing.remaining_amount)}
                  </Text>
                </View>

                <View style={styles.paymentMethodSection}>
                  <Text style={[styles.paymentMethodLabel, { color: AppColors.textSecondary }]}>
                    Payment Method
                  </Text>
                  <View style={styles.paymentMethodOptions}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodOption,
                        paymentMethod === 'gcash' && styles.paymentMethodOptionActive,
                        { borderColor: AppColors.border },
                      ]}
                      onPress={() => setPaymentMethod('gcash')}>
                      <Text style={[styles.paymentMethodText, { color: AppColors.text }]}>GCash</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodOption,
                        paymentMethod === 'paymaya' && styles.paymentMethodOptionActive,
                        { borderColor: AppColors.border },
                      ]}
                      onPress={() => setPaymentMethod('paymaya')}>
                      <Text style={[styles.paymentMethodText, { color: AppColors.text }]}>PayMaya</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.customAmountSection}>
                  <Text style={[styles.customAmountLabel, { color: AppColors.textSecondary }]}>
                    Amount to Pay (Optional)
                  </Text>
                  <Text style={[styles.customAmountHint, { color: AppColors.textSecondary }]}>
                    Leave empty to pay full remaining amount
                  </Text>
                  <TextInput
                    style={[styles.customAmountInput, { backgroundColor: AppColors.background, borderColor: AppColors.border, color: AppColors.text }]}
                    placeholder="Enter amount"
                    placeholderTextColor={AppColors.textSecondary}
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: AppColors.primary }]}
                  onPress={handlePay}
                  disabled={processing}>
                  {processing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Proceed to Payment</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
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
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  cardProject: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  amountSection: {
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentPercent: {
    fontSize: 14,
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
  infoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  paymentItem: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentItemDetails: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  paymentDetail: {
    fontSize: 12,
    fontWeight: '400',
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
    padding: 20,
  },
  paymentAmountSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  paymentAmountLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  paymentAmountValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  paymentMethodSection: {
    marginBottom: 24,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentMethodOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  paymentMethodOptionActive: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primary + '10',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customAmountSection: {
    marginBottom: 24,
  },
  customAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  customAmountHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  customAmountInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentPendingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  paymentPendingText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  paymentPendingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

