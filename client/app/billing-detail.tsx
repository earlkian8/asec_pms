import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
import { useDialog } from '@/contexts/DialogContext';
import { useAuth } from '@/contexts/AuthContext';

import { AppColors } from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';

export default function BillingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const { displayBillingModule } = useAuth();

  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [amountTouched, setAmountTouched] = useState(false);
  const [showPaymentDetailModal, setShowPaymentDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Billing['payments'][0] | null>(null);

  useEffect(() => {
    if (!displayBillingModule) {
      router.replace('/(tabs)');
    }
  }, [displayBillingModule, router]);

  useEffect(() => {
    fetchBilling();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchBilling();
    }, [id])
  );

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

  const validateAmount = (amountStr: string): string | null => {
    if (!amountStr || amountStr.trim() === '') {
      return null; // Empty is allowed (will use full remaining amount)
    }

    const amount = parseFloat(amountStr);
    
    if (isNaN(amount)) {
      return 'Please enter a valid number';
    }

    if (amount <= 0) {
      return 'Amount must be greater than 0';
    }

    // PayMongo maximum amount in cents: 999999999 (approximately 9,999,999.99 PHP)
    const MAX_AMOUNT_PHP = 9999999.99;
    if (amount > MAX_AMOUNT_PHP) {
      return `Maximum payment amount is ${formatCurrency(MAX_AMOUNT_PHP)}. Please contact support for larger payments.`;
    }

    if (!billing) {
      return null; // Can't validate without billing info
    }

    if (amount > billing.remaining_amount) {
      return `Amount cannot exceed remaining amount of ${formatCurrency(billing.remaining_amount)}`;
    }

    return null; // Valid
  };

  const handleAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = text.replace(/[^\d.]/g, '');
    
    // Only allow one decimal point
    const parts = cleaned.split('.');
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += '.' + parts.slice(1).join('').slice(0, 2); // Limit to 2 decimal places
    }
    
    setCustomAmount(formatted);
    setAmountTouched(true);
    
    // Validate in real-time
    const error = validateAmount(formatted);
    setAmountError(error);
  };

  const handleInitiatePayment = async () => {
    if (!billing) {
      dialog.showError('Billing information not available. Please refresh the page.');
      return;
    }

    if (customAmount && customAmount.trim() !== '') {
      const validationError = validateAmount(customAmount);
      if (validationError) {
        setAmountError(validationError);
        setAmountTouched(true);
        dialog.showError(validationError);
        return;
      }
    }

    const amount = customAmount ? parseFloat(customAmount) : billing.remaining_amount;

    if (isNaN(amount) || amount <= 0) {
      const errorMsg = 'Please enter a valid amount';
      setAmountError(errorMsg);
      setAmountTouched(true);
      dialog.showError(errorMsg);
      return;
    }

    if (amount > billing.remaining_amount) {
      const errorMsg = `Amount cannot exceed remaining amount of ${formatCurrency(billing.remaining_amount)}`;
      setAmountError(errorMsg);
      setAmountTouched(true);
      dialog.showError(errorMsg);
      return;
    }

    setProcessing(true);

    try {
      const response = await apiService.initiatePayment(Number(id), { amount });

      if (!response.success) {
        let errorMessage = response.message || 'Failed to initiate payment';
        if (errorMessage.includes('amount') || errorMessage.includes('999999999')) {
          errorMessage = 'Payment amount exceeds the maximum limit. Maximum payment amount is ₱9,999,999.99. Please contact support for larger payments.';
          setAmountError(errorMessage);
          setAmountTouched(true);
        }
        dialog.showError(errorMessage);
        setProcessing(false);
        return;
      }

      if (response.success && response.data?.checkout_url) {
        setShowPaymentModal(false);
        const canOpen = await Linking.canOpenURL(response.data.checkout_url);
        if (canOpen) {
          await Linking.openURL(response.data.checkout_url);
          dialog.showSuccess('You will be redirected to complete payment. Return here when done.', 'Payment');
        } else {
          dialog.showError('Unable to open payment page. Please try again.');
        }
      } else {
        dialog.showError(response.message || 'Failed to get payment link.');
      }
      setProcessing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      dialog.showError(`Payment failed: ${errorMessage}. Please try again.`);
      setProcessing(false);
    }
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
            {billing.payments.slice(0, 10).map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentItem}
                onPress={() => {
                  setSelectedPayment(payment);
                  setShowPaymentDetailModal(true);
                }}
                activeOpacity={0.7}>
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
                  <Ionicons name="chevron-forward" size={16} color={AppColors.textSecondary} style={{ marginLeft: 'auto' }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pay Button */}
        {billing.remaining_amount > 0 && (
          <TouchableOpacity
            style={[
              styles.payButton,
              {
                backgroundColor: processing ? AppColors.textSecondary : AppColors.primary,
                opacity: processing ? 0.6 : 1,
              }
            ]}
            onPress={() => setShowPaymentModal(true)}
            disabled={processing}>
            {processing ? (
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
        onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: AppColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: AppColors.text }]}>Pay Billing</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <XCircle size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.amountCard, { backgroundColor: AppColors.background, borderColor: AppColors.border }]}>
                <View style={styles.amountCardHeader}>
                  <View style={styles.amountCardHeaderLeft}>
                    <Text style={[styles.amountCardLabel, { color: AppColors.textSecondary }]}>
                      Remaining Balance
                    </Text>
                    <Text style={[styles.amountCardValue, { color: AppColors.text }]}>
                      {formatCurrency(billing.remaining_amount)}
                    </Text>
                  </View>
                  <View style={[styles.amountBadge, { backgroundColor: `${AppColors.primary}15` }]}>
                    <Text style={[styles.amountBadgeText, { color: AppColors.primary }]}>Due</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: AppColors.border, marginVertical: 20 }]} />

                <View>
                  <Text style={[styles.customAmountLabel, { color: AppColors.text, marginBottom: 4 }]}>
                    Enter Amount to Pay
                  </Text>
                  <Text style={[styles.customAmountHint, { color: AppColors.textSecondary, marginBottom: 8 }]}>
                    Leave empty to pay the full remaining balance
                  </Text>
                  <View style={[styles.maxAmountInfo, { backgroundColor: `${AppColors.warning}10`, borderColor: `${AppColors.warning}30` }]}>
                    <Ionicons name="information-circle-outline" size={16} color={AppColors.warning} />
                    <Text style={[styles.maxAmountText, { color: AppColors.textSecondary }]}>
                      Maximum amount per transaction: <Text style={{ fontWeight: '700', color: AppColors.text }}>{formatCurrency(9999999.99)}</Text>
                    </Text>
                  </View>
                  <View style={styles.amountInputWrapper}>
                    <Text style={[styles.amountInputPrefix, { color: AppColors.textSecondary }]}>₱</Text>
                    <TextInput
                      style={[
                        styles.customAmountInput,
                        {
                          backgroundColor: AppColors.card,
                          borderColor: amountError ? AppColors.error : AppColors.border,
                          borderWidth: amountError ? 2 : 1,
                          color: AppColors.text,
                        },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={AppColors.textSecondary}
                      value={customAmount}
                      onChangeText={handleAmountChange}
                      onBlur={() => setAmountTouched(true)}
                      keyboardType="decimal-pad"
                      editable={!processing}
                    />
                  </View>
                  {amountError && amountTouched && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color={AppColors.error} />
                      <Text style={[styles.errorText, { color: AppColors.error, marginLeft: 6 }]}>
                        {amountError}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: processing || amountError ? AppColors.textSecondary : AppColors.primary,
                    opacity: processing || amountError ? 0.6 : 1,
                  }
                ]}
                onPress={handleInitiatePayment}
                disabled={processing || !!amountError}>
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CreditCard size={20} color="#FFFFFF" />
                    <Text style={[styles.confirmButtonText, { marginLeft: 8 }]}>Pay with Card</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Detail Receipt Modal */}
      <Modal
        visible={showPaymentDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptModalContent, { backgroundColor: AppColors.card }]}>
            {selectedPayment && (
              <>
                {/* Receipt Header */}
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptHeaderTop}>
                    <View style={styles.receiptIconContainer}>
                      <Receipt size={32} color={AppColors.primary} />
                    </View>
                    <View style={styles.receiptTitleContainer}>
                      <Text style={[styles.receiptTitle, { color: AppColors.text }]}>Payment Receipt</Text>
                      <Text style={[styles.receiptSubtitle, { color: AppColors.textSecondary }]}>Transaction Details</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowPaymentDetailModal(false)} style={styles.receiptCloseButton}>
                    <XCircle size={24} color={AppColors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.receiptScroll} showsVerticalScrollIndicator={false}>
                  {/* Payment Code - Prominent */}
                  <View style={styles.receiptPaymentCodeSection}>
                    <Text style={[styles.receiptPaymentCodeLabel, { color: AppColors.textSecondary }]}>Payment Code</Text>
                    <Text style={[styles.receiptPaymentCode, { color: AppColors.primary }]}>
                      {selectedPayment.payment_code}
                    </Text>
                  </View>

                  {/* Amount Section */}
                  <View style={[styles.receiptAmountSection, { backgroundColor: AppColors.background }]}>
                    <Text style={[styles.receiptAmountLabel, { color: AppColors.textSecondary }]}>Amount Paid</Text>
                    <Text style={[styles.receiptAmountValue, { color: AppColors.success }]}>
                      {formatCurrency(selectedPayment.payment_amount)}
                    </Text>
                    <Text style={[styles.receiptCurrency, { color: AppColors.textSecondary }]}>PHP</Text>
                  </View>

                  {/* Status Badge */}
                  <View style={styles.receiptStatusSection}>
                    {selectedPayment.payment_status && (
                      <View style={[styles.receiptStatusBadge, {
                        backgroundColor: selectedPayment.payment_status === 'paid' ? '#D1FAE5' : 
                                        selectedPayment.payment_status === 'pending' ? '#FEF3C7' : 
                                        selectedPayment.payment_status === 'failed' ? '#FEE2E2' : '#E5E7EB',
                      }]}>
                        {selectedPayment.payment_status === 'paid' && (
                          <CheckCircle size={16} color="#065F46" />
                        )}
                        {selectedPayment.payment_status === 'pending' && (
                          <Clock size={16} color="#92400E" />
                        )}
                        {(selectedPayment.payment_status === 'failed' || selectedPayment.payment_status === 'cancelled') && (
                          <XCircle size={16} color={selectedPayment.payment_status === 'failed' ? '#991B1B' : '#6B7280'} />
                        )}
                        <Text style={[styles.receiptStatusText, {
                          color: selectedPayment.payment_status === 'paid' ? '#065F46' : 
                                 selectedPayment.payment_status === 'pending' ? '#92400E' : 
                                 selectedPayment.payment_status === 'failed' ? '#991B1B' : '#6B7280',
                        }]}>
                          {selectedPayment.payment_status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Receipt Divider */}
                  <View style={[styles.receiptDivider, { backgroundColor: AppColors.border }]} />

                  {/* Payment Details */}
                  <View style={styles.receiptDetailsSection}>
                    <Text style={[styles.receiptSectionTitle, { color: AppColors.text }]}>Payment Details</Text>
                    
                    <View style={styles.receiptDetailRow}>
                      <Text style={[styles.receiptDetailLabel, { color: AppColors.textSecondary }]}>Billing Code</Text>
                      <Text style={[styles.receiptDetailValue, { color: AppColors.text }]}>
                        {billing.billing_code}
                      </Text>
                    </View>

                    <View style={styles.receiptDetailRow}>
                      <Text style={[styles.receiptDetailLabel, { color: AppColors.textSecondary }]}>Project</Text>
                      <Text style={[styles.receiptDetailValue, { color: AppColors.text }]}>
                        {billing.project.project_name}
                      </Text>
                    </View>

                    <View style={styles.receiptDetailRow}>
                      <Text style={[styles.receiptDetailLabel, { color: AppColors.textSecondary }]}>Payment Date</Text>
                      <Text style={[styles.receiptDetailValue, { color: AppColors.text }]}>
                        {new Date(selectedPayment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <View style={styles.receiptDetailRow}>
                      <Text style={[styles.receiptDetailLabel, { color: AppColors.textSecondary }]}>Payment Method</Text>
                      <Text style={[styles.receiptDetailValue, { color: AppColors.text }]}>
                        {selectedPayment.payment_method === 'paymongo' ? 'PayMongo (Card)' : 
                         selectedPayment.payment_method.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>

                    {selectedPayment.reference_number && (
                      <View style={styles.receiptDetailRow}>
                        <Text style={[styles.receiptDetailLabel, { color: AppColors.textSecondary }]}>Reference Number</Text>
                        <Text style={[styles.receiptDetailValue, { color: AppColors.text, fontFamily: 'monospace' }]}>
                          {selectedPayment.reference_number}
                        </Text>
                      </View>
                    )}

                    {selectedPayment.paymongo_payment_intent_id && (
                      <View style={styles.receiptDetailRow}>
                        <Text style={[styles.receiptDetailLabel, { color: AppColors.textSecondary }]}>PayMongo Payment ID</Text>
                        <Text style={[styles.receiptDetailValue, { color: AppColors.text, fontFamily: 'monospace', fontSize: 11 }]}>
                          {selectedPayment.paymongo_payment_intent_id}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* PayMongo Section */}
                  {selectedPayment.payment_method === 'paymongo' && (
                    <>
                      <View style={[styles.receiptDivider, { backgroundColor: AppColors.border, marginTop: 20 }]} />
                      <View style={styles.receiptDetailsSection}>
                        <Text style={[styles.receiptSectionTitle, { color: AppColors.text }]}>Payment Gateway</Text>
                        <View style={[styles.receiptGatewayBadge, { backgroundColor: `${AppColors.primary}15` }]}>
                          <CreditCard size={18} color={AppColors.primary} />
                          <Text style={[styles.receiptGatewayText, { color: AppColors.primary }]}>PayMongo</Text>
                        </View>
                        <Text style={[styles.receiptGatewayInfo, { color: AppColors.textSecondary }]}>
                          Your payment was processed securely through PayMongo payment gateway
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Receipt Footer */}
                  <View style={styles.receiptFooter}>
                    <View style={[styles.receiptDivider, { backgroundColor: AppColors.border }]} />
                    {selectedPayment.payment_status === 'paid' ? (
                      <>
                        <Text style={[styles.receiptThankYou, { color: AppColors.success }]}>Payment Confirmed!</Text>
                        <Text style={[styles.receiptFooterText, { color: AppColors.textSecondary }]}>
                          Thank you for your payment. Your transaction has been successfully processed.
                        </Text>
                        <Text style={[styles.receiptFooterText, { color: AppColors.textSecondary, marginTop: 4 }]}>
                          This receipt serves as your official payment confirmation.
                        </Text>
                      </>
                    ) : selectedPayment.payment_status === 'pending' ? (
                      <>
                        <Text style={[styles.receiptThankYou, { color: AppColors.warning }]}>Payment Pending</Text>
                        <Text style={[styles.receiptFooterText, { color: AppColors.textSecondary }]}>
                          Your payment is currently being processed. Please allow a few moments for the transaction to complete.
                        </Text>
                        <Text style={[styles.receiptFooterText, { color: AppColors.textSecondary, marginTop: 4 }]}>
                          You will receive a confirmation once the payment is successfully processed.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.receiptThankYou, { color: AppColors.text }]}>Payment Status</Text>
                        <Text style={[styles.receiptFooterText, { color: AppColors.textSecondary }]}>
                          This receipt shows the current status of your payment transaction.
                        </Text>
                      </>
                    )}
                  </View>
                </ScrollView>
              </>
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
  paymentMethodOption: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  paymentMethodOptionActive: {
    borderColor: '#0070F3',
    backgroundColor: '#EFF6FF',
    shadowColor: '#0070F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gcashIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gcashGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gcashIcon: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentMethodSubtext: {
    fontSize: 13,
    fontWeight: '400',
  },
  customAmountSection: {
    marginBottom: 24,
  },
  customAmountLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  customAmountHint: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  customAmountInput: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  stepIndicator: {
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepLine: {
    height: 2,
    width: 40,
    marginHorizontal: 8,
  },
  amountCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  amountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountCardHeaderLeft: {
    flex: 1,
  },
  amountCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  amountCardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInputPrefix: {
    fontSize: 20,
    fontWeight: '600',
    paddingTop: 2,
  },
  maxAmountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  maxAmountText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  paymentDetailsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  paymentDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDetailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  paymentDetailsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    lineHeight: 20,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: AppColors.background,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: AppColors.card,
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.card,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  receiptModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingBottom: 40,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: AppColors.border,
  },
  receiptHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  receiptIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptTitleContainer: {
    flex: 1,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  receiptSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  receiptCloseButton: {
    padding: 4,
  },
  receiptScroll: {
    padding: 20,
  },
  receiptPaymentCodeSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: AppColors.border,
  },
  receiptPaymentCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  receiptPaymentCode: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  receiptAmountSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: AppColors.success,
    borderStyle: 'dashed',
  },
  receiptAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  receiptAmountValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  receiptCurrency: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptStatusSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
  },
  receiptStatusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  receiptDivider: {
    height: 1,
    marginVertical: 20,
  },
  receiptDetailsSection: {
    marginBottom: 20,
  },
  receiptSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${AppColors.border}80`,
  },
  receiptDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  receiptDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  receiptGatewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  receiptGatewayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  receiptGatewayInfo: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 20,
    marginTop: 10,
  },
  receiptThankYou: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  receiptFooterText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

