/**
 * PayMongo Client Service
 * Handles direct interactions with PayMongo API from the client
 * Uses public key (never secret key) for client-side operations
 */

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

/**
 * Base64 encode for React Native compatibility
 */
function base64Encode(str: string): string {
  // Try btoa first (available in web/browser environments)
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  
  // For React Native, use a manual implementation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;
  
  // Convert string to bytes
  const bytes = [];
  for (let j = 0; j < str.length; j++) {
    const charCode = str.charCodeAt(j);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6));
      bytes.push(0x80 | (charCode & 0x3f));
    } else {
      bytes.push(0xe0 | (charCode >> 12));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    }
  }
  
  // Encode to base64
  while (i < bytes.length) {
    const a = bytes[i++];
    const b = i < bytes.length ? bytes[i++] : 0;
    const c = i < bytes.length ? bytes[i++] : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += i - 2 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    output += i - 1 < bytes.length ? chars.charAt(bitmap & 63) : '=';
  }
  
  return output;
}

interface CardDetails {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

interface BillingDetails {
  name: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

interface CreatePaymentMethodResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    attributes: {
      type: string;
      details: {
        last4: string;
        exp_month: number;
        exp_year: number;
        brand: string;
      };
    };
  };
  error?: string;
}

interface AttachPaymentMethodResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    attributes: {
      status: string;
      amount: number;
      currency: string;
      next_action?: {
        type: string;
        redirect?: {
          url: string;
          return_url: string;
        };
      };
    };
  };
  error?: string;
}

interface PaymentIntentStatusResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    attributes: {
      status: string;
      amount: number;
      currency: string;
      next_action?: {
        type: string;
        redirect?: {
          url: string;
          return_url: string;
        };
      };
    };
  };
  error?: string;
}

class PayMongoClient {
  private publicKey: string | null = null;

  setPublicKey(publicKey: string) {
    this.publicKey = publicKey;
  }

  /**
   * Create a Payment Method using card details
   * This sends card details directly to PayMongo (PCI-DSS compliant)
   */
  async createPaymentMethod(
    cardDetails: CardDetails,
    billingDetails: BillingDetails
  ): Promise<CreatePaymentMethodResponse> {
    if (!this.publicKey) {
      return {
        success: false,
        error: 'Public key not set. Please set public key before creating payment method.',
      };
    }

    try {
      // Clean card number (remove spaces and dashes)
      const cardNumber = cardDetails.cardNumber.replace(/\s+/g, '').replace(/-/g, '');

      const response = await fetch(`${PAYMONGO_API_URL}/payment_methods`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Encode(this.publicKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: 'card',
              details: {
                card_number: cardNumber,
                exp_month: cardDetails.expMonth,
                exp_year: cardDetails.expYear,
                cvc: cardDetails.cvc,
              },
              billing: {
                name: billingDetails.name,
                ...(billingDetails.email && { email: billingDetails.email }),
                ...(billingDetails.phone && { phone: billingDetails.phone }),
                ...(billingDetails.address && { address: billingDetails.address }),
              },
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create payment method';
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Attach a Payment Method to a Payment Intent
   */
  async attachPaymentMethod(
    paymentIntentId: string,
    paymentMethodId: string,
    clientKey: string,
    returnUrl?: string
  ): Promise<AttachPaymentMethodResponse> {
    if (!this.publicKey) {
      return {
        success: false,
        error: 'Public key not set. Please set public key before attaching payment method.',
      };
    }

    try {
      const attributes: any = {
        client_key: clientKey,
        payment_method: paymentMethodId,
      };

      // Include return_url if provided (required for 3D Secure flows)
      if (returnUrl) {
        attributes.return_url = returnUrl;
      }

      const response = await fetch(`${PAYMONGO_API_URL}/payment_intents/${paymentIntentId}/attach`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Encode(this.publicKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to attach payment method';
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Confirm Payment Intent (DEPRECATED - Not needed for PayMongo)
   * 
   * @deprecated This method is deprecated. PayMongo does not require a separate confirmation step.
   * When attaching a payment method, the payment is automatically confirmed if successful.
   * The attachment response already contains the final status and next_action.
   * This method is kept for backward compatibility but should not be used in new code.
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    clientKey: string,
    returnUrl?: string
  ): Promise<PaymentIntentStatusResponse> {
    if (!this.publicKey) {
      return {
        success: false,
        error: 'Public key not set. Please set public key before confirming payment intent.',
      };
    }

    try {
      const attributes: any = {
        client_key: clientKey,
      };

      // Include return_url if provided (required for 3D Secure flows)
      if (returnUrl) {
        attributes.return_url = returnUrl;
      }

      const response = await fetch(`${PAYMONGO_API_URL}/payment_intents/${paymentIntentId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Encode(this.publicKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            attributes,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to confirm payment intent';
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Check Payment Intent status
   */
  async checkPaymentIntentStatus(
    paymentIntentId: string,
    clientKey: string
  ): Promise<PaymentIntentStatusResponse> {
    if (!this.publicKey) {
      return {
        success: false,
        error: 'Public key not set. Please set public key before checking payment intent status.',
      };
    }

    try {
      const response = await fetch(`${PAYMONGO_API_URL}/payment_intents/${paymentIntentId}?client_key=${clientKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${base64Encode(this.publicKey + ':')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to check payment intent status';
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }
}

export const paymongoClient = new PayMongoClient();
export type { CardDetails, BillingDetails };
