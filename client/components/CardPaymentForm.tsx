import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CreditCard, HelpCircle, Lock } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

interface CardPaymentFormProps {
  onSubmit: (cardData: {
    cardNumber: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    cardholderName: string;
    name: string;
    phone: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
  initialPhone?: string;
  initialName?: string;
}

const AppColors = {
  primary: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  card: '#FFFFFF',
  background: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
};

export default function CardPaymentForm({
  onSubmit,
  onCancel,
  loading = false,
  error,
  initialPhone = '',
  initialName = '',
}: CardPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);
  const [showCvcHelper, setShowCvcHelper] = useState(false);

  // Detect card type from first digits
  const detectCardType = (number: string): string | null => {
    const cleaned = number.replace(/\D/g, '');
    if (!cleaned) return null;
    
    const firstDigit = cleaned[0];
    const firstTwo = cleaned.substring(0, 2);
    const firstFour = cleaned.substring(0, 4);
    
    // Visa: starts with 4
    if (firstDigit === '4') return 'visa';
    // Mastercard: 51-55 or 2221-2720
    if ((firstTwo >= '51' && firstTwo <= '55') || (firstFour >= '2221' && firstFour <= '2720')) return 'mastercard';
    // Amex: 34 or 37
    if (firstTwo === '34' || firstTwo === '37') return 'amex';
    // Discover: 6011, 65, or 644-649
    if (firstFour === '6011' || firstTwo === '65' || (firstFour >= '6440' && firstFour <= '6499')) return 'discover';
    // JCB: 3528-3589
    if (firstFour >= '3528' && firstFour <= '3589') return 'jcb';
    
    return null;
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 19 digits (for Amex which can be 15 digits)
    const limited = cleaned.slice(0, 19);
    
    // Detect card type
    const detectedType = detectCardType(limited);
    setCardType(detectedType);
    
    // Format based on card type
    if (detectedType === 'amex') {
      // Amex: 4-6-5 format (1234 567890 12345)
      return limited.replace(/(\d{4})(\d{6})(\d{0,5})/, '$1 $2 $3').trim();
    } else {
      // Most cards: 4-4-4-4 format
      return limited.replace(/(.{4})/g, '$1 ').trim();
    }
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
    setValidationError(null); // Clear validation error when user types
  };

  const handleExpiryChange = (text: string) => {
    // Remove all non-digits
    let cleaned = text.replace(/\D/g, '');
    
    // Limit to 4 digits (MMYY)
    cleaned = cleaned.slice(0, 4);
    
    // Auto-format with slash: MM/YY
    let formatted = cleaned;
    if (cleaned.length >= 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    
    setExpiry(formatted);
    setValidationError(null);
  };

  const handleCvcChange = (text: string) => {
    // Only allow digits, max 4 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    setCvc(cleaned);
    setValidationError(null); // Clear validation error when user types
  };

  const validateForm = () => {
    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      return 'Please enter a valid card number';
    }

    // Validate expiry (MM/YY format)
    const expiryCleaned = expiry.replace(/\D/g, '');
    if (expiryCleaned.length !== 4) {
      return 'Please enter a valid expiry date (MM/YY)';
    }

    const month = parseInt(expiryCleaned.substring(0, 2));
    const year = parseInt('20' + expiryCleaned.substring(2, 4)); // Convert YY to YYYY

    if (month < 1 || month > 12) {
      return 'Please enter a valid expiry month (01-12)';
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (year < currentYear || year > currentYear + 20) {
      return 'Please enter a valid expiry year';
    }

    // Check if card is expired
    if (year === currentYear && month < currentMonth) {
      return 'This card has expired';
    }

    if (!cvc || cvc.length < 3) {
      return 'Please enter a valid CVC';
    }

    if (!cardholderName.trim()) {
      return 'Please enter the cardholder name';
    }

    if (!name.trim()) {
      return 'Please enter your full name';
    }

    if (!phone.trim()) {
      return 'Please enter your phone number';
    }

    // Basic phone validation (at least 10 digits)
    const phoneCleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (phoneCleaned.length < 10) {
      return 'Please enter a valid phone number';
    }

    return null;
  };

  const handleSubmit = () => {
    console.log('CardPaymentForm: Submit button clicked');
    console.log('CardPaymentForm: Form values:', {
      cardNumberLength: cardNumber.replace(/\s/g, '').length,
      expiry,
      cvcLength: cvc.length,
      hasCardholderName: !!cardholderName.trim(),
      cardType,
    });

    const validationErrorMsg = validateForm();
    if (validationErrorMsg) {
      console.log('CardPaymentForm: Validation failed:', validationErrorMsg);
      setValidationError(validationErrorMsg);
      return;
    }

    console.log('CardPaymentForm: Validation passed, calling onSubmit');
    setValidationError(null); // Clear any previous validation errors

    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    const expiryCleaned = expiry.replace(/\D/g, '');
    const cardData = {
      cardNumber: cleanedCardNumber,
      expMonth: parseInt(expiryCleaned.substring(0, 2)),
      expYear: parseInt('20' + expiryCleaned.substring(2, 4)),
      cvc,
      cardholderName: cardholderName.trim(),
      name: name.trim(),
      phone: phone.trim(),
    };
    
    console.log('CardPaymentForm: Submitting card data (masked):', {
      ...cardData,
      cardNumber: `${cardData.cardNumber.slice(0, 4)}****${cardData.cardNumber.slice(-4)}`,
      cvc: '***',
    });
    
    onSubmit(cardData);
  };

  return (
    <View style={styles.container}>
      {(error || validationError) && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color={AppColors.error} />
          <Text style={styles.errorText}>{error || validationError}</Text>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: AppColors.textSecondary }]}>
          Card Number
        </Text>
        <View style={[styles.inputContainer, { borderColor: AppColors.border }]}>
          <CreditCard size={20} color={AppColors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: AppColors.text }]}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={AppColors.textSecondary}
            value={cardNumber}
            onChangeText={handleCardNumberChange}
            keyboardType="numeric"
            maxLength={23} // 19 digits + spaces (for Amex format)
            autoComplete="cc-number"
            textContentType="creditCardNumber"
          />
          {cardType && (
            <View style={styles.cardTypeBadge}>
              <Text style={styles.cardTypeText}>{cardType.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.expiryWidth]}>
          <Text style={[styles.label, { color: AppColors.textSecondary }]}>
            Expiry Date
          </Text>
          <TextInput
            style={[styles.input, styles.inputFull, { borderColor: AppColors.border, color: AppColors.text }]}
            placeholder="MM/YY"
            placeholderTextColor={AppColors.textSecondary}
            value={expiry}
            onChangeText={handleExpiryChange}
            keyboardType="numeric"
            maxLength={5} // MM/YY format
            autoComplete="cc-exp"
            textContentType="none"
          />
        </View>

        <View style={[styles.formGroup, styles.cvcWidth]}>
          <View style={styles.cvcLabelRow}>
            <Text style={[styles.label, { color: AppColors.textSecondary }]}>
              CVC
            </Text>
            <TouchableOpacity
              onPress={() => setShowCvcHelper(!showCvcHelper)}
              style={styles.helpButton}>
              <HelpCircle size={16} color={AppColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.inputContainer, { borderColor: AppColors.border }]}>
            <Lock size={16} color={AppColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: AppColors.text }]}
              placeholder="123"
              placeholderTextColor={AppColors.textSecondary}
              value={cvc}
              onChangeText={handleCvcChange}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoComplete="cc-csc"
              textContentType="none"
            />
          </View>
          {showCvcHelper && (
            <Text style={[styles.helperText, { color: AppColors.textSecondary }]}>
              3 digits on the back of your card
            </Text>
          )}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: AppColors.textSecondary }]}>
          Cardholder Name
        </Text>
        <TextInput
          style={[styles.input, styles.inputFull, { borderColor: AppColors.border, color: AppColors.text }]}
          placeholder="John Doe"
          placeholderTextColor={AppColors.textSecondary}
          value={cardholderName}
          onChangeText={(text) => {
            setCardholderName(text);
            setValidationError(null); // Clear validation error when user types
          }}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: AppColors.textSecondary }]}>
          Full Name <Text style={{ color: AppColors.error }}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.inputFull, { borderColor: AppColors.border, color: AppColors.text }]}
          placeholder="John Doe"
          placeholderTextColor={AppColors.textSecondary}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setValidationError(null); // Clear validation error when user types
          }}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <Text style={[styles.helperText, { color: AppColors.textSecondary, marginTop: 4 }]}>
          Your full name as it appears on your billing statement
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: AppColors.textSecondary }]}>
          Phone Number <Text style={{ color: AppColors.error }}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.inputFull, { borderColor: AppColors.border, color: AppColors.text }]}
          placeholder="09123456789 or +639123456789"
          placeholderTextColor={AppColors.textSecondary}
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setValidationError(null); // Clear validation error when user types
          }}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <Text style={[styles.helperText, { color: AppColors.textSecondary, marginTop: 4 }]}>
          Required for payment processing
        </Text>
      </View>

      <View style={styles.buttonRow}>
        {onCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: AppColors.border }]}
            onPress={onCancel}
            disabled={loading}>
            <Text style={[styles.cancelButtonText, { color: AppColors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.submitButton, { backgroundColor: AppColors.primary }]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Lock size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Pay Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.securityFooter}>
        <View style={styles.securityRow}>
          <Lock size={14} color={AppColors.success} />
          <Text style={styles.securityText}>Your payment information is encrypted and secure</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.error,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: AppColors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  inputFull: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: AppColors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  expiryWidth: {
    flex: 1.2,
  },
  cvcWidth: {
    flex: 1,
  },
  cardTypeBadge: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  cvcLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  helpButton: {
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: AppColors.card,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
});
