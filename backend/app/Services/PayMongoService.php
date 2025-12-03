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
                            'paymaya',
                            'gcash',
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
     * Attach payment method to payment intent
     */
    public function attachPaymentMethod(string $paymentIntentId, string $paymentMethodId)
    {
        try {
            $response = $this->request('POST', "payment_intents/{$paymentIntentId}/attach", [
                'data' => [
                    'attributes' => [
                        'payment_method' => $paymentMethodId,
                    ],
                ],
            ]);

            if (isset($response['data'])) {
                return [
                    'success' => true,
                    'data' => $response['data'],
                    'status' => $response['data']['attributes']['status'] ?? 'unknown',
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
     * Create a payment source (for GCash, PayMaya, etc.)
     */
    public function createSource(float $amount, string $currency = 'PHP', string $type = 'gcash', array $metadata = [], ?string $successUrl = null, ?string $failedUrl = null)
    {
        try {
            // PayMongo maximum is 999,999,999 cents (9,999,999.99 PHP)
            $maxAmountInCents = 999999999;
            $amountInCents = (int)($amount * 100);
            
            if ($amountInCents > $maxAmountInCents) {
                return [
                    'success' => false,
                    'error' => 'Amount exceeds PayMongo maximum limit of ₱9,999,999.99',
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
     * Get public key for client-side use
     */
    public function getPublicKey(): string
    {
        return $this->publicKey;
    }
}
