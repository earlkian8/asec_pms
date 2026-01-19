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
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/services/api';
import { paymongoClient } from '@/services/paymongoClient';
import { Billing } from '@/hooks/useBillings';
import CardPaymentForm from '@/components/CardPaymentForm';
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
  const { user } = useAuth();

  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [show3DSecureModal, setShow3DSecureModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking' | 'processing_card'>('idle');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [threeDSecureUrl, setThreeDSecureUrl] = useState<string | null>(null);
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchBilling();
  }, [id]);

  useEffect(() => {
    // Poll payment status if there's a pending or checking payment
    if ((paymentStatus === 'pending' || paymentStatus === 'checking') && id) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [paymentStatus, id]);

  useEffect(() => {
    // Reset all payment state when modal closes
    if (!showPaymentModal) {
      console.log('Modal closed, resetting payment state');
      setPaymentIntentId(null);
      setClientKey(null);
      setPublicKey(null);
      setCardFormError(null);
      setCustomAmount('');
      setPaymentStatus('idle');
      setProcessing(false);
      setThreeDSecureUrl(null);
    } else {
      console.log('Modal opened, current state:', {
        paymentIntentId,
        paymentStatus,
        processing,
      });
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

  const checkPaymentStatus = async (retryCount = 0) => {
    if (!id) return;

    try {
      const response = await apiService.checkPaymentStatus(Number(id));
      
      if (response.success && response.data) {
        const status = response.data.status;
        
        if (status === 'paid') {
          // Backend confirmed payment is paid - safe to show success
          setPaymentStatus('idle');
          setShowPaymentModal(false);
          dialog.showSuccess('Payment completed successfully!', 'Payment Success');
          fetchBilling(); // Refresh billing data
          router.replace(`/billing-detail?id=${id}`); // Refresh the page
        } else if (status === 'failed' || status === 'cancelled') {
          // Payment failed or was cancelled
          setPaymentStatus('idle');
          setShowPaymentModal(false);
          const errorMsg = status === 'failed' 
            ? 'Payment failed. Please try again or use a different payment method.'
            : 'Payment was cancelled. Please try again if you wish to proceed.';
          dialog.showError(errorMsg, 'Payment Failed');
        } else if (status === 'pending') {
          // Still pending - continue checking with exponential backoff (max 5 retries)
          if (retryCount < 5) {
            setPaymentStatus('checking');
            const delay = Math.min(2000 * Math.pow(2, retryCount), 10000); // 2s, 4s, 8s, 10s, 10s
            setTimeout(async () => {
              await checkPaymentStatus(retryCount + 1);
            }, delay);
          } else {
            // Max retries reached - show message but keep checking
            console.warn('Max retries reached for payment status check, payment still pending');
            setPaymentStatus('checking');
            // Continue checking but with longer intervals
            setTimeout(async () => {
              await checkPaymentStatus(0); // Reset retry count for extended checking
            }, 10000);
          }
        } else if (status === 'no_pending_payment') {
          // No pending payment found - might already be paid or doesn't exist
          setPaymentStatus('idle');
          fetchBilling(); // Refresh to see current state
        }
      } else {
        // API call succeeded but no data - log and retry
        console.warn('Payment status check returned no data, retrying...');
        if (retryCount < 3) {
          setTimeout(async () => {
            await checkPaymentStatus(retryCount + 1);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      // Retry on error (network issues, etc.) - but limit retries
      if (retryCount < 3) {
        setTimeout(async () => {
          await checkPaymentStatus(retryCount + 1);
        }, 2000);
      } else {
        // Max retries reached - show error
        setPaymentStatus('idle');
        dialog.showError('Unable to verify payment status. Please check your connection and try again.', 'Status Check Failed');
      }
    }
  };

  const handleInitiatePayment = async () => {
    console.log('handleInitiatePayment called');
    
    if (!billing) {
      console.error('Billing is null, cannot initiate payment');
      dialog.showError('Billing information not available. Please refresh the page.');
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : billing.remaining_amount;
    console.log('Payment amount:', amount);

    if (isNaN(amount) || amount <= 0) {
      console.error('Invalid amount:', amount);
      dialog.showError('Please enter a valid amount');
      return;
    }

    if (amount > billing.remaining_amount) {
      console.error('Amount exceeds remaining:', amount, '>', billing.remaining_amount);
      dialog.showError(`Amount cannot exceed remaining amount of ${formatCurrency(billing.remaining_amount)}`);
      return;
    }

    setProcessing(true);
    setCardFormError(null);

    try {
      console.log('Creating payment intent for billing:', id, 'amount:', amount);
      
      // Step 1: Create Payment Intent on backend
      const response = await apiService.initiatePayment(Number(id), {
        amount,
        payment_method_type: 'card',
      });

      console.log('Payment intent response:', response);

      if (response.success && response.data) {
        const { payment_intent_id, client_key, public_key } = response.data;

        console.log('Payment intent created:', {
          payment_intent_id,
          has_client_key: !!client_key,
          has_public_key: !!public_key,
        });

        if (!payment_intent_id || !client_key || !public_key) {
          console.error('Missing payment intent data:', {
            payment_intent_id,
            client_key,
            public_key,
          });
          dialog.showError('Failed to initialize payment. Missing required payment information. Please try again.');
          setProcessing(false);
          return;
        }

        // Store payment intent details
        setPaymentIntentId(payment_intent_id);
        setClientKey(client_key);
        setPublicKey(public_key);
        paymongoClient.setPublicKey(public_key);

        console.log('Payment intent initialized successfully, showing card form');
        
        // Payment form will be shown in modal, user will enter card details
        setPaymentStatus('idle');
        setProcessing(false);
      } else {
        const errorMessage = response.message || 'Failed to initiate payment';
        console.error('Payment intent creation failed:', errorMessage, response);
        dialog.showError(errorMessage);
        setProcessing(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error in handleInitiatePayment:', err);
      dialog.showError(`Payment initialization failed: ${errorMessage}. Please try again.`);
      setProcessing(false);
    }
  };

  const handleCardSubmit = async (cardData: {
    cardNumber: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    cardholderName: string;
    name: string;
    phone: string;
  }) => {
    console.log('handleCardSubmit called');
    console.log('Card data received (masked):', {
      cardNumber: `${cardData.cardNumber.slice(0, 4)}****${cardData.cardNumber.slice(-4)}`,
      expMonth: cardData.expMonth,
      expYear: cardData.expYear,
      cvc: '***',
      cardholderName: cardData.cardholderName,
    });

    if (!billing || !paymentIntentId || !clientKey || !publicKey) {
      console.error('handleCardSubmit: Missing required data:', {
        hasBilling: !!billing,
        paymentIntentId,
        clientKey,
        publicKey,
      });
      dialog.showError('Payment not initialized. Please try again.');
      return;
    }

    console.log('handleCardSubmit: All required data present, proceeding with payment');
    setProcessing(true);
    setCardFormError(null);

    try {
      // Step 2: Create Payment Method via Backend API
      console.log('Step 2: Creating payment method via backend...');
      
      if (!billing?.id) {
        console.error('Billing ID not available');
        setCardFormError('Billing information is missing. Please refresh and try again.');
        setProcessing(false);
        return;
      }

      const paymentMethodResult = await apiService.createPaymentMethod(
        billing.id,
        {
          cardNumber: cardData.cardNumber,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvc: cardData.cvc,
          cardholderName: cardData.cardholderName,
          name: cardData.name,
          phone: cardData.phone,
        }
      );

      console.log('Payment method creation result:', {
        success: paymentMethodResult.success,
        hasData: !!paymentMethodResult.data,
        error: paymentMethodResult.message,
        paymentMethodId: paymentMethodResult.data?.payment_method_id,
      });

      if (!paymentMethodResult.success || !paymentMethodResult.data?.payment_method_id) {
        const errorMsg = paymentMethodResult.message || 'Failed to process card details';
        console.error('Payment method creation failed:', errorMsg);
        setCardFormError(errorMsg);
        setProcessing(false);
        return;
      }

      const paymentMethodId = paymentMethodResult.data.payment_method_id;
      console.log('Payment method created successfully:', paymentMethodId);

      // Step 3: Attach Payment Method to Payment Intent
      console.log('Step 3: Attaching payment method to payment intent...');
      
      // Generate return URL for 3D Secure redirect
      // PayMongo requires HTTPS public URL for live keys (not localhost or local IP)
      // Use environment variable for public HTTPS URL, or fallback to API base URL
      const PAYMONGO_RETURN_URL = process.env.EXPO_PUBLIC_PAYMONGO_RETURN_URL;
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.107:8000/api';
      
      // Use configured return URL if available, otherwise construct from API base URL
      const baseReturnUrl = PAYMONGO_RETURN_URL || `${API_BASE_URL}/client/payment/return`;
      const returnUrl = `${baseReturnUrl}?payment_intent_id=${paymentIntentId}&payment_code=${billing?.payments?.[0]?.payment_code || ''}`;
      console.log('Return URL generated:', returnUrl);
      
      console.log('Attachment details:', {
        paymentIntentId,
        paymentMethodId,
        hasClientKey: !!clientKey,
        returnUrl,
      });

      const attachResult = await paymongoClient.attachPaymentMethod(
        paymentIntentId,
        paymentMethodId,
        clientKey,
        returnUrl
      );

      console.log('Payment method attachment result:', {
        success: attachResult.success,
        hasData: !!attachResult.data,
        error: attachResult.error,
        status: attachResult.data?.attributes?.status,
        hasNextAction: !!attachResult.data?.attributes?.next_action,
      });

      if (!attachResult.success || !attachResult.data) {
        const errorMsg = attachResult.error || 'Failed to process payment';
        console.error('Payment method attachment failed:', errorMsg);
        setCardFormError(errorMsg);
        setProcessing(false);
        return;
      }

      // Handle payment status directly from attachment result
      // PayMongo completes payment when attachment succeeds - no separate confirmation needed
      const status = attachResult.data.attributes?.status;
      const nextAction = attachResult.data.attributes?.next_action;

      // Log full nextAction object for debugging
      console.log('Full nextAction object after attachment:', JSON.stringify(nextAction, null, 2));

      // Extract redirect URL - only use if next_action.type === 'redirect' AND redirect.url exists
      const redirectUrl = (nextAction?.type === 'redirect' && nextAction?.redirect?.url) 
        ? nextAction.redirect.url 
        : null;

      console.log('Handling payment status after attachment:', {
        status,
        hasNextAction: !!nextAction,
        nextActionType: nextAction?.type,
        redirectUrl,
        nextActionKeys: nextAction ? Object.keys(nextAction) : [],
      });

      // Handle payment status based on attachment result
      // CRITICAL: Always verify with backend before showing success to ensure data integrity
      if (status === 'succeeded') {
        console.log('Payment attachment returned succeeded - verifying with backend before confirming...');
        // Don't show success yet - verify with backend first
        // Backend will only mark as 'paid' if PayMongo confirms 'succeeded'
        setPaymentStatus('checking');
        setShowPaymentModal(false);
        // Check immediately to verify payment status with backend
        setTimeout(async () => {
          await checkPaymentStatus();
        }, 1000);
      } else if (status === 'awaiting_next_action') {
        // Only redirect if next_action.type === 'redirect' AND redirect.url !== null
        if (nextAction?.type === 'redirect' && redirectUrl) {
          console.log('3D Secure required, opening WebView:', redirectUrl);
          // 3D Secure required - redirect URL is available
          setThreeDSecureUrl(redirectUrl);
          setShow3DSecureModal(true);
          setPaymentStatus('pending');
        } else {
          // redirect.url is null or next_action.type is not 'redirect'
          // This typically means incomplete billing information or payment method issue
          console.error('awaiting_next_action but redirect.url is null or invalid. PayMongo rejected payment setup.');
          console.error('nextAction:', JSON.stringify(nextAction, null, 2));
          
          const errorMsg = 'Payment setup incomplete. Please ensure all billing information (name, email, phone) is provided and try again.';
          setCardFormError(errorMsg);
          dialog.showError(errorMsg, 'Payment Setup Failed');
          setProcessing(false);
          
          // Reset payment intent state to allow retry
          setPaymentIntentId(null);
          setClientKey(null);
          setPublicKey(null);
        }
      } else if (status === 'processing' || status === 'awaiting_capture') {
        console.log(`Payment is ${status} after attachment, will check status with backend`);
        // Payment is processing or awaiting capture - check status with backend
        setPaymentStatus('checking');
        setShowPaymentModal(false);
        // Use exponential backoff for processing status (2s, then 4s, then 8s max)
        setTimeout(async () => {
          await checkPaymentStatus();
        }, 2000);
      } else if (status === 'awaiting_payment_method') {
        // Payment method issue - show specific error
        const errorMsg = 'Payment method validation failed. Please check your card details and try again.';
        console.error('Payment method validation failed:', status);
        setCardFormError(errorMsg);
        dialog.showError(errorMsg, 'Payment Method Error');
        setProcessing(false);
      } else if (status === 'failed' || status === 'cancelled' || status === 'void') {
        // Payment failed or was cancelled/voided
        const errorMsg = status === 'failed' 
          ? 'Payment failed. Please try again or use a different payment method.'
          : 'Payment was cancelled. Please try again if you wish to proceed.';
        console.error(`Payment ${status} after attachment`);
        setCardFormError(errorMsg);
        dialog.showError(errorMsg, 'Payment Failed');
        setProcessing(false);
        setPaymentStatus('idle');
      } else {
        // Unknown or unhandled status
        const errorMsg = `Payment status is unclear (${status}). Please check your payment status or contact support.`;
        console.error('Unexpected payment status after attachment:', status);
        setCardFormError(errorMsg);
        dialog.showError(errorMsg, 'Payment Status Unknown');
        setProcessing(false);
        // Set to checking to allow backend to determine actual status
        setPaymentStatus('checking');
        setTimeout(async () => {
          await checkPaymentStatus();
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error in handleCardSubmit:', err);
      console.error('Error details:', {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      setCardFormError(`Payment processing failed: ${errorMessage}. Please try again.`);
      dialog.showError(`Payment processing failed: ${errorMessage}`);
      setProcessing(false);
    }
  };

  const handle3DSecureNavigation = (navState: any) => {
    // Check if we've been redirected back (3D Secure complete)
    // PayMongo typically redirects to a return URL after authentication
    const url = navState.url;
    
    // Close WebView and check payment status
    if (url && (url.includes('return_url') || url.includes('success') || url.includes('failed'))) {
      setShow3DSecureModal(false);
      setThreeDSecureUrl(null);
      setPaymentStatus('checking');
      
      // Wait a moment for backend to process, then check status
      setTimeout(async () => {
        await checkPaymentStatus();
      }, 2000);
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
            style={[
              styles.payButton,
              {
                backgroundColor: processing || paymentStatus !== 'idle' 
                  ? AppColors.textSecondary 
                  : AppColors.primary,
                opacity: processing || paymentStatus !== 'idle' ? 0.6 : 1,
              }
            ]}
            onPress={() => {
              console.log('Pay Now button clicked');
              console.log('Current state:', {
                processing,
                paymentStatus,
                showPaymentModal,
                billingId: id,
                remainingAmount: billing.remaining_amount,
              });
              
              if (processing || paymentStatus !== 'idle') {
                console.warn('Button click ignored - button is disabled');
                return;
              }
              
              setShowPaymentModal(true);
              console.log('Modal should now be open');
            }}
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
                  Please wait while we process your payment.
                </Text>
                <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 20 }} />
              </View>
            ) : paymentStatus === 'checking' ? (
              <View style={styles.paymentPendingContainer}>
                <Clock size={48} color={AppColors.primary} />
                <Text style={[styles.paymentPendingText, { color: AppColors.text }]}>
                  Verifying Payment...
                </Text>
                <Text style={[styles.paymentPendingSubtext, { color: AppColors.textSecondary }]}>
                  Please wait while we verify your payment status.
                </Text>
                <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 20 }} />
              </View>
            ) : paymentStatus === 'processing_card' ? (
              <View style={styles.paymentPendingContainer}>
                <Clock size={48} color={AppColors.primary} />
                <Text style={[styles.paymentPendingText, { color: AppColors.text }]}>
                  Processing Card Payment...
                </Text>
                <Text style={[styles.paymentPendingSubtext, { color: AppColors.textSecondary }]}>
                  Please wait while we process your card details.
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
                    editable={!paymentIntentId}
                  />
                </View>

                {!paymentIntentId ? (
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      {
                        backgroundColor: processing ? AppColors.textSecondary : AppColors.primary,
                        opacity: processing ? 0.6 : 1,
                      }
                    ]}
                    onPress={() => {
                      console.log('Continue to Payment button clicked');
                      console.log('Button state:', { 
                        processing, 
                        paymentIntentId,
                        billing: !!billing,
                        amount: customAmount || billing?.remaining_amount,
                      });
                      
                      if (processing) {
                        console.warn('Button click ignored - already processing');
                        return;
                      }
                      
                      handleInitiatePayment();
                    }}
                    disabled={processing}>
                    {processing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Continue to Payment</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Text style={[styles.paymentMethodLabel, { color: AppColors.textSecondary, marginBottom: 16 }]}>
                      Enter Card Details
                    </Text>
                    <CardPaymentForm
                      initialPhone={user?.phone_number || ''}
                      initialName={user?.name || ''}
                      onSubmit={handleCardSubmit}
                      onCancel={() => {
                        setPaymentIntentId(null);
                        setClientKey(null);
                        setPublicKey(null);
                        setCardFormError(null);
                      }}
                      loading={processing}
                      error={cardFormError || undefined}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 3D Secure Modal */}
      <Modal
        visible={show3DSecureModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          // Don't allow closing during 3D Secure
        }}>
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={[styles.webViewTitle, { color: AppColors.text }]}>Complete Authentication</Text>
            <TouchableOpacity
              onPress={() => {
                setShow3DSecureModal(false);
                setThreeDSecureUrl(null);
                setPaymentStatus('idle');
                dialog.showError('3D Secure authentication was cancelled');
              }}>
              <XCircle size={24} color={AppColors.text} />
            </TouchableOpacity>
          </View>
          {threeDSecureUrl && (
            <WebView
              source={{ uri: threeDSecureUrl }}
              onNavigationStateChange={handle3DSecureNavigation}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={AppColors.primary} />
                </View>
              )}
            />
          )}
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
});

