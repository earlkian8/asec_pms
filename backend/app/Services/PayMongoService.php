<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayMongoService
{
    protected $secretKey;
    protected $publicKey;
    protected $apiUrl;

    public function __construct()
    {
        $this->secretKey = config('services.paymongo.secret_key');
        $this->publicKey = config('services.paymongo.public_key');
        $this->apiUrl = config('services.paymongo.api_url', 'https://api.paymongo.com/v1');
        
        if (!$this->secretKey) {
            throw new \Exception('PayMongo secret key is not configured');
        }
    }

    /**
     * Make authenticated request to PayMongo API
     */
    protected function request(string $method, string $endpoint, array $data = [])
    {
        $url = rtrim($this->apiUrl, '/') . '/' . ltrim($endpoint, '/');
        
        $response = Http::withBasicAuth($this->secretKey, '')
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])
            ->{strtolower($method)}($url, $data);

        return $response->json();
    }

    /**
     * Flatten metadata to string key-value pairs (PayMongo requirement)
     */
    protected function flattenMetadata(array $metadata): array
    {
        $flattened = [];
        foreach ($metadata as $key => $value) {
            // Convert all values to strings (PayMongo requirement)
            if (is_array($value) || is_object($value)) {
                $flattened[$key] = json_encode($value);
            } else {
                $flattened[$key] = (string)$value;
            }
        }
        return $flattened;
    }

    /**
     * Create a payment intent for a billing
     */
    public function createPaymentIntent(float $amount, string $currency = 'PHP', array $metadata = [])
    {
        try {
            $amountInCents = (int)($amount * 100); // Convert to cents
            
            $response = $this->request('POST', 'payment_intents', [
                'data' => [
                    'attributes' => [
                        'amount' => $amountInCents,
                        'currency' => $currency,
                        'payment_method_allowed' => [
                            'card',
                        ],
                        'payment_method_options' => [
                            'card' => [
                                'request_three_d_secure' => 'automatic',
                            ],
                        ],
                        'metadata' => $this->flattenMetadata($metadata),
                    ],
                ],
            ]);

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'payment_intent_id' => $response['data']['id'],
                    'client_key' => $response['data']['attributes']['client_key'] ?? null,
                    'data' => $response['data'],
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? 'Unknown error';
            Log::error('PayMongo Payment Intent Creation Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'amount' => $amount,
                'metadata' => $metadata,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while creating payment intent',
            ];
        }
    }

    /**
     * Retrieve payment intent status
     */
    public function getPaymentIntent(string $paymentIntentId)
    {
        try {
            $response = $this->request('GET', "payment_intents/{$paymentIntentId}");

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'payment_intent' => $response['data'],
                    'status' => $response['data']['attributes']['status'] ?? 'unknown',
                    'amount' => ($response['data']['attributes']['amount'] ?? 0) / 100, // Convert from cents
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? 'Unknown error';
            Log::error('PayMongo Payment Intent Retrieval Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'payment_intent_id' => $paymentIntentId,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId,
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while retrieving payment intent',
            ];
        }
    }

    /**
     * Create a payment method with card details
     * Matches the structure from the working PHP example
     */
    public function createPaymentMethod(array $cardDetails, array $billingDetails)
    {
        try {
            // Clean card number (remove spaces and dashes)
            $cardNumber = preg_replace('/[\s\-]/', '', $cardDetails['card_number'] ?? '');

            $response = $this->request('POST', 'payment_methods', [
                'data' => [
                    'attributes' => [
                        'type' => 'card',
                        'details' => [
                            'card_number' => $cardNumber,
                            'exp_month' => (int)($cardDetails['exp_month'] ?? 0),
                            'exp_year' => (int)($cardDetails['exp_year'] ?? 0),
                            'cvc' => $cardDetails['cvc'] ?? '',
                        ],
                        'billing' => [
                            'name' => $billingDetails['name'] ?? '',
                            'email' => $billingDetails['email'] ?? '',
                            'phone' => $billingDetails['phone'] ?? null,
                        ],
                    ],
                ],
            ]);

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'payment_method_id' => $response['data']['id'],
                    'data' => $response['data'],
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? ($response['errors'][0]['title'] ?? 'Unknown error');
            Log::error('PayMongo Payment Method Creation Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'card_details' => [
                    'card_number_length' => strlen($cardNumber),
                    'exp_month' => $cardDetails['exp_month'] ?? null,
                    'exp_year' => $cardDetails['exp_year'] ?? null,
                    'has_cvc' => !empty($cardDetails['cvc']),
                ],
                'billing_details' => [
                    'has_name' => !empty($billingDetails['name']),
                    'has_email' => !empty($billingDetails['email']),
                    'has_phone' => !empty($billingDetails['phone']),
                ],
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while creating payment method',
            ];
        }
    }

    /**
     * Attach payment method to payment intent
     * Server-side attach uses secret key - no client_key needed.
     * return_url is REQUIRED for 3D Secure card flow in live mode.
     */
    public function attachPaymentMethod(string $paymentIntentId, string $paymentMethodId, ?string $returnUrl = null)
    {
        try {
            $attributes = [
                'payment_method' => $paymentMethodId,
            ];

            // return_url is required for 3D Secure - PayMongo will not include redirect.url without it
            if ($returnUrl) {
                $attributes['return_url'] = $returnUrl;
            }

            $response = $this->request('POST', "payment_intents/{$paymentIntentId}/attach", [
                'data' => [
                    'attributes' => $attributes,
                ],
            ]);

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'data' => $response['data'],
                    'status' => $response['data']['attributes']['status'] ?? 'unknown',
                    'next_action' => $response['data']['attributes']['next_action'] ?? null,
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? 'Unknown error';
            Log::error('PayMongo Payment Method Attachment Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'payment_intent_id' => $paymentIntentId,
                'payment_method_id' => $paymentMethodId,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId,
                'payment_method_id' => $paymentMethodId,
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while attaching payment method',
            ];
        }
    }

    /**
     * Confirm payment intent (DEPRECATED - Not needed for PayMongo)
     * 
     * @deprecated This method is deprecated. PayMongo does not require a separate confirmation step.
     * When attaching a payment method, the payment is automatically confirmed if successful.
     * The attachment response already contains the final status and next_action.
     * This method is kept for backward compatibility but should not be used in new code.
     * 
     * @param string $paymentIntentId
     * @param string|null $returnUrl
     * @return array
     */
    public function confirmPaymentIntent(string $paymentIntentId, ?string $returnUrl = null)
    {
        try {
            $attributes = [];
            
            // Include return_url if provided (required for 3D Secure flows)
            if ($returnUrl) {
                $attributes['return_url'] = $returnUrl;
            }

            $requestData = [
                'data' => [
                    'attributes' => $attributes,
                ],
            ];

            $response = $this->request('POST', "payment_intents/{$paymentIntentId}/confirm", $requestData);

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'data' => $response['data'],
                    'status' => $response['data']['attributes']['status'] ?? 'unknown',
                    'next_action' => $response['data']['attributes']['next_action'] ?? null,
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? 'Unknown error';
            Log::error('PayMongo Payment Intent Confirmation Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'payment_intent_id' => $paymentIntentId,
                'return_url' => $returnUrl,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId,
                'return_url' => $returnUrl,
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while confirming payment intent',
            ];
        }
    }

    /**
     * Create a payment source (for GCash, PayMaya, etc.)
     */
    public function createSource(float $amount, string $currency = 'PHP', string $type = 'gcash', array $metadata = [], ?string $successUrl = null, ?string $failedUrl = null)
    {
        try {
            // GCash maximum is 100,000 PHP per transaction
            // PayMaya and other sources may have different limits
            $maxAmount = 100000.00; // 100,000 PHP for GCash
            $maxAmountInCents = (int)($maxAmount * 100); // 10,000,000 cents
            $amountInCents = (int)($amount * 100);
            
            if ($amount > $maxAmount) {
                return [
                    'success' => false,
                    'error' => 'Amount exceeds GCash maximum limit of ₱' . number_format($maxAmount, 2) . '. Please split your payment into multiple transactions or contact support for assistance.',
                ];
            }

            // Get base URL for redirects
            $baseUrl = config('app.url', 'http://localhost');
            $clientPortalUrl = config('app.client_portal_url', $baseUrl);
            
            // Default redirect URLs if not provided
            $successRedirect = $successUrl ?? rtrim($clientPortalUrl, '/') . '/payment/success';
            $failedRedirect = $failedUrl ?? rtrim($clientPortalUrl, '/') . '/payment/failed';
            
            $response = $this->request('POST', 'sources', [
                'data' => [
                    'attributes' => [
                        'amount' => $amountInCents,
                        'currency' => $currency,
                        'type' => $type,
                        'metadata' => $this->flattenMetadata($metadata),
                        'redirect' => [
                            'success' => $successRedirect,
                            'failed' => $failedRedirect,
                        ],
                    ],
                ],
            ]);

            if (isset($response['data'])) {
                $attributes = $response['data']['attributes'] ?? [];
                $redirect = $attributes['redirect'] ?? [];
                
                // Log for debugging
                Log::info('PayMongo Source Created', [
                    'source_id' => $response['data']['id'],
                    'checkout_url' => $redirect['checkout_url'] ?? $redirect['url'] ?? null,
                    'redirect' => $redirect,
                ]);
                
                return [
                    'success' => true,
                    'source_id' => $response['data']['id'],
                    'checkout_url' => $redirect['checkout_url'] ?? $redirect['url'] ?? null,
                    'data' => $response['data'],
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? ($response['errors'][0]['title'] ?? 'Unknown error');
            Log::error('PayMongo Source Creation Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'amount' => $amount,
                'amount_in_cents' => $amountInCents,
                'type' => $type,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while creating payment source: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get source status from PayMongo
     */
    public function getSource(string $sourceId)
    {
        try {
            $response = $this->request('GET', "sources/{$sourceId}");

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'source' => $response['data'],
                    'status' => $response['data']['attributes']['status'] ?? 'unknown',
                    'amount' => ($response['data']['attributes']['amount'] ?? 0) / 100, // Convert from cents
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? 'Unknown error';
            Log::error('PayMongo Source Retrieval Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'source_id' => $sourceId,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'source_id' => $sourceId,
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while retrieving source',
            ];
        }
    }

    /**
     * Create a payment from a chargeable source
     */
    public function createPaymentFromSource(string $sourceId, float $amount, string $currency = 'PHP', array $metadata = [])
    {
        try {
            $amountInCents = (int)($amount * 100);
            
            $response = $this->request('POST', 'payments', [
                'data' => [
                    'attributes' => [
                        'amount' => $amountInCents,
                        'currency' => $currency,
                        'source' => [
                            'id' => $sourceId,
                            'type' => 'source',
                        ],
                        'metadata' => $this->flattenMetadata($metadata),
                    ],
                ],
            ]);

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'payment_id' => $response['data']['id'],
                    'status' => $response['data']['attributes']['status'] ?? 'unknown',
                    'amount' => ($response['data']['attributes']['amount'] ?? 0) / 100, // Convert from cents
                    'data' => $response['data'],
                ];
            }

            $errorMessage = $response['errors'][0]['detail'] ?? ($response['errors'][0]['title'] ?? 'Unknown error');
            Log::error('PayMongo Payment Creation from Source Failed', [
                'error' => $errorMessage,
                'response' => $response,
                'source_id' => $sourceId,
                'amount' => $amount,
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('PayMongo Service Error', [
                'error' => $e->getMessage(),
                'source_id' => $sourceId,
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while creating payment from source',
            ];
        }
    }

    /**
     * Get public key for client-side use
     */
    public function getPublicKey(): string
    {
        return $this->publicKey;
    }
}
