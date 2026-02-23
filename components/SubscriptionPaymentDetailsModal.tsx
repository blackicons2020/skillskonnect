/**
 * Subscription Payment Modal
 * 
 * PAYMENT CONFIGURATION:
 * - Currently in TEST MODE (line 29: isTestMode = true)
 * - To enable real payments:
 *   1. Add your Paystack secret key to api/.env (PAYSTACK_SECRET_KEY)
 *   2. Change line 29 to: const isTestMode = false;
 *   3. Restart the backend server
 */
import React, { useState } from 'react';
import { SubscriptionPlan, User } from '../types';
import { XCircleIcon } from './icons';
import { paymentService } from '../services/paymentService';

interface SubscriptionPaymentDetailsModalProps {
    plan: SubscriptionPlan;
    user: User;
    onClose: () => void;
    onConfirm: (plan: SubscriptionPlan) => void;
    onUpdateUser?: (user: User) => void;
}

export const SubscriptionPaymentDetailsModal: React.FC<SubscriptionPaymentDetailsModalProps> = ({ plan, user, onClose, onConfirm, onUpdateUser }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    const gateway = paymentService.getPaymentGateway(user.country || 'Nigeria');
    const gatewayName = gateway === 'paystack' ? 'Paystack' : 'Flutterwave';

    const handlePayment = async () => {
        if (plan.name === 'Free') {
            onConfirm(plan);
            onClose();
            return;
        }

        setIsProcessing(true);
        setError(null);

        // TEST MODE: Always use test mode for now (no payment gateway configured)
        // Change this to false when you have real payment keys configured
        const isTestMode = true; // Force test mode
        
        if (isTestMode) {
            try {
                // Simulate processing delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // In test mode, directly update the subscription without receipt requirement
                if (onUpdateUser) {
                    const updatedUser = {
                        ...user,
                        subscriptionTier: plan.name as 'Free' | 'Standard' | 'Pro' | 'Premium',
                        pendingSubscription: undefined
                    };
                    
                    // Update user directly through API
                    await onUpdateUser(updatedUser);
                    
                    // Close modal immediately (alert will be shown by onUpdateUser)
                    onClose();
                } else {
                    // Fallback to old flow if onUpdateUser not provided
                    onConfirm(plan);
                    alert(`✓ TEST MODE: Subscription to ${plan.name} plan (${billingCycle}) successful!\n\nAmount: ${user.country === 'Nigeria' ? '₦' : '$'}${amount.toLocaleString()}\n\nYour subscription has been activated. In production, this will redirect to ${gatewayName} for actual payment.`);
                    onClose();
                }
            } catch (err: any) {
                setError('Test payment failed. Please try again.');
                setIsProcessing(false);
            }
            return;
        }

        // PRODUCTION MODE: Real payment gateway integration
        try {
            const { paymentUrl, reference } = await paymentService.processSubscriptionPayment(
                {
                    email: user.email,
                    fullName: user.fullName,
                    country: user.country
                },
                plan,
                billingCycle
            );

            // Store payment reference for verification later
            localStorage.setItem('pending_subscription_payment', JSON.stringify({
                reference,
                plan: plan.name,
                billingCycle,
                timestamp: Date.now()
            }));

            // Redirect to payment gateway
            window.location.href = paymentUrl;
        } catch (err: any) {
            setError(err.message || 'Payment initialization failed. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" disabled={isProcessing}>
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Subscription Payment</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Upgrade to <span className="font-bold text-primary">{plan.name}</span> plan
                        </p>
                    </div>

                    {/* Billing Cycle Selection */}
                    {plan.name !== 'Free' && plan.priceYearly > 0 && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Select Billing Cycle:</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        billingCycle === 'monthly'
                                            ? 'border-primary bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-center">
                                        <p className="font-semibold text-gray-900">Monthly</p>
                                        <p className="text-2xl font-bold text-primary mt-1">
                                            ₦{plan.priceMonthly.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">per month</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        billingCycle === 'yearly'
                                            ? 'border-primary bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-center">
                                        <p className="font-semibold text-gray-900">Yearly</p>
                                        <p className="text-2xl font-bold text-primary mt-1">
                                            ₦{plan.priceYearly.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-green-600 font-semibold mt-1">SAVE {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Test Mode Banner */}
                    {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && plan.name !== 'Free' && (
                        <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <div className="flex items-start">
                                <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-yellow-800">TEST MODE</p>
                                    <p className="text-xs text-yellow-700 mt-1">Payment will be simulated for local testing. Real gateway integration works in production.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Gateway Info */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Payment Gateway:</span>
                            <span className="text-sm font-bold text-blue-700">{gatewayName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                            <span className="text-2xl font-bold text-primary">₦{amount.toLocaleString()}</span>
                        </div>
                        {plan.name !== 'Free' && (
                            <p className="text-xs text-gray-600 mt-2">
                                Secure payment powered by {gatewayName}. You'll be redirected to complete your payment.
                            </p>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handlePayment}
                            disabled={isProcessing || (plan.name === 'Free' && user.subscriptionTier === 'Free')}
                            className={`w-full flex justify-center items-center rounded-md px-4 py-3 text-base font-semibold shadow-sm transition-colors ${
                                isProcessing
                                    ? 'bg-gray-400 text-white cursor-wait'
                                    : 'bg-primary text-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : plan.name === 'Free' ? (
                                'Confirm Free Plan'
                            ) : (
                                `Proceed to ${gatewayName}`
                            )}
                        </button>

                        {!isProcessing && (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    {plan.name !== 'Free' && (
                        <p className="text-xs text-center text-gray-500 mt-4">
                            Your subscription will be activated automatically after successful payment verification.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};