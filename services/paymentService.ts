// Payment Gateway Service for Paystack and Flutterwave

// Countries where Paystack operates (Nigeria + other African countries)
const PAYSTACK_COUNTRIES = [
    'Nigeria', 'Ghana', 'South Africa', 'Kenya', 'Egypt', 'Ivory Coast'
];

export interface PaymentInitiationResponse {
    authorization_url: string;
    access_code?: string;
    reference: string;
}

export interface PaystackConfig {
    publicKey: string;
    secretKey: string;
}

export interface FlutterwaveConfig {
    publicKey: string;
    secretKey: string;
}

class PaymentService {
    private paystackPublicKey: string;
    private paystackSecretKey: string;
    private flutterwavePublicKey: string;
    private flutterwaveSecretKey: string;

    constructor() {
        // These will be loaded from environment or passed from backend
        // For now, using empty strings since we'll call backend API instead of direct gateway calls
        this.paystackPublicKey = '';
        this.paystackSecretKey = '';
        this.flutterwavePublicKey = '';
        this.flutterwaveSecretKey = '';
    }

    /**
     * Configure payment service with API keys
     */
    configure(config: {
        paystackPublicKey?: string;
        paystackSecretKey?: string;
        flutterwavePublicKey?: string;
        flutterwaveSecretKey?: string;
    }) {
        if (config.paystackPublicKey) this.paystackPublicKey = config.paystackPublicKey;
        if (config.paystackSecretKey) this.paystackSecretKey = config.paystackSecretKey;
        if (config.flutterwavePublicKey) this.flutterwavePublicKey = config.flutterwavePublicKey;
        if (config.flutterwaveSecretKey) this.flutterwaveSecretKey = config.flutterwaveSecretKey;
    }

    /**
     * Determines which payment gateway to use based on user's country
     */
    getPaymentGateway(country: string): 'paystack' | 'flutterwave' {
        return PAYSTACK_COUNTRIES.includes(country) ? 'paystack' : 'flutterwave';
    }

    /**
     * Initialize Paystack payment via backend API
     */
    async initiatePaystackPayment(data: {
        email: string;
        amount: number;
        reference: string;
        callback_url?: string;
        metadata?: any;
    }): Promise<PaymentInitiationResponse> {
        try {
            // Get token from localStorage
            const token = localStorage.getItem('skillskonnect_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Call backend API instead of Paystack directly
            const API_URL = this.getApiUrl();
            const response = await fetch(`${API_URL}/payment/initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: data.email,
                    amount: data.amount,
                    plan: data.metadata?.plan,
                    billingCycle: data.metadata?.billingCycle
                })
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server error. Please ensure the backend is running.');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Payment initialization failed' }));
                throw new Error(error.message || 'Payment initialization failed');
            }

            const result = await response.json();

            return {
                authorization_url: result.authorization_url,
                access_code: result.access_code,
                reference: result.reference
            };
        } catch (error: any) {
            console.error('Payment initialization error:', error);
            throw new Error(error.message || 'Failed to initialize payment');
        }
    }

    /**
     * Get API URL
     */
    private getApiUrl(): string {
        try {
            const env = (import.meta as any).env;
            if (env) {
                return env.PROD 
                    ? '/api' 
                    : (env.VITE_API_URL || 'http://localhost:5000/api');
            }
        } catch (e) {
            // Ignore errors
        }
        return 'http://localhost:5000/api';
    }

    /**
     * Initialize Flutterwave payment
     */
    async initiateFlutterwavePayment(data: {
        email: string;
        amount: number;
        currency: string;
        reference: string;
        redirect_url?: string;
        customer: {
            email: string;
            name: string;
        };
        customizations?: {
            title: string;
            description: string;
            logo?: string;
        };
    }): Promise<string> {
        try {
            const response = await fetch('https://api.flutterwave.com/v3/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.flutterwavePublicKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tx_ref: data.reference,
                    amount: data.amount,
                    currency: data.currency,
                    redirect_url: data.redirect_url,
                    customer: data.customer,
                    customizations: data.customizations || {
                        title: 'Skills Konnect Subscription',
                        description: 'Subscription Payment'
                    }
                })
            });

            const result = await response.json();
            
            if (result.status !== 'success') {
                throw new Error(result.message || 'Payment initialization failed');
            }

            return result.data.link;
        } catch (error: any) {
            console.error('Flutterwave initialization error:', error);
            throw new Error(error.message || 'Failed to initialize Flutterwave payment');
        }
    }

    /**
     * Verify Paystack payment via backend API
     */
    async verifyPaystackPayment(reference: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('skillskonnect_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const API_URL = this.getApiUrl();
            const response = await fetch(`${API_URL}/payment/verify/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('Payment verification error:', error);
            return false;
        }
    }

    /**
     * Verify Flutterwave payment
     */
    async verifyFlutterwavePayment(transactionId: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.flutterwavePublicKey}`
                }
            });

            const result = await response.json();
            return result.status === 'success' && result.data.status === 'successful';
        } catch (error) {
            console.error('Flutterwave verification error:', error);
            return false;
        }
    }

    /**
     * Generate a unique payment reference
     */
    generateReference(prefix: string = 'CC'): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Process subscription payment
     */
    async processSubscriptionPayment(
        user: { email: string; fullName?: string; country?: string },
        plan: { name: string; priceMonthly: number; priceYearly: number },
        billingCycle: 'monthly' | 'yearly'
    ): Promise<{ paymentUrl: string; reference: string; gateway: 'paystack' | 'flutterwave' }> {
        const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
        const reference = this.generateReference('SUB');
        const gateway = this.getPaymentGateway(user.country || 'Nigeria');

        try {
            if (gateway === 'paystack') {
                const result = await this.initiatePaystackPayment({
                    email: user.email,
                    amount: amount,
                    reference: reference,
                    callback_url: `${window.location.origin}/payment/verify`,
                    metadata: {
                        plan: plan.name,
                        billingCycle: billingCycle,
                        userEmail: user.email
                    }
                });

                return {
                    paymentUrl: result.authorization_url,
                    reference: reference,
                    gateway: 'paystack'
                };
            } else {
                const paymentUrl = await this.initiateFlutterwavePayment({
                    email: user.email,
                    amount: amount,
                    currency: 'NGN', // Default currency, can be changed based on country
                    reference: reference,
                    redirect_url: `${window.location.origin}/payment/verify`,
                    customer: {
                        email: user.email,
                        name: user.fullName || 'Customer'
                    },
                    customizations: {
                        title: 'Skills Konnect Subscription',
                        description: `${plan.name} Plan - ${billingCycle} billing`
                    }
                });

                return {
                    paymentUrl: paymentUrl,
                    reference: reference,
                    gateway: 'flutterwave'
                };
            }
        } catch (error: any) {
            throw new Error(`Payment processing failed: ${error.message}`);
        }
    }
}

export const paymentService = new PaymentService();
