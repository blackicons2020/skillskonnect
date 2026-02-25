import React from 'react';
import { getSubscriptionPlans, getRegion } from '../constants/subscriptions';
import { CheckIcon } from './icons';
import { SubscriptionPlan, User } from '../types';

interface SubscriptionPageProps {
    user: User;
    onSelectPlan: (plan: SubscriptionPlan) => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onSelectPlan }) => {
    const currentPlan = user.subscriptionTier || 'Free';
    const plans = getSubscriptionPlans(user.role, user.country);
    const region = getRegion(user.country || 'Nigeria');
    const currency = region === 'Nigeria' ? '₦' : '$';

    // Check if the user's current subscription has expired
    const isSubscriptionExpired = !!(
        user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()
    );
    // A plan is "currently active" only if it's the user's plan AND it hasn't expired
    const isCurrentActivePlan = (planName: string) =>
        currentPlan === planName && !isSubscriptionExpired;
    
    const getPlanDescription = (planName: string, role: string): string => {
        if (role === 'cleaner') {
            switch (planName) {
                case 'Free': return region === 'Nigeria' ? 'Limited to 1 client per month.' : 'Try all features with our trial period.';
                case 'Basic': return 'For workers building their client base.';
                case 'Pro': return 'For established workers ready to scale.';
                case 'Elite': return 'For top professionals requiring maximum visibility.';
                default: return 'Get started today.';
            }
        } else {
            switch (planName) {
                case 'Regular': return 'For individuals posting occasional jobs.';
                case 'Silver': return 'For regular job posting needs.';
                case 'Gold': return 'For businesses with frequent hiring needs.';
                case 'Diamond': return 'For enterprises requiring unlimited job postings.';
                default: return 'Post jobs and find workers.';
            }
        }
    };

    return (
        <div className="bg-white py-12 sm:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        {user.role === 'cleaner' ? 'Plans for Workers' : 'Plans for Clients'}
                    </p>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
                    {user.role === 'cleaner' 
                        ? 'Choose the plan that fits your goals and unlock features to grow your client base.'
                        : 'Select a plan to start posting jobs and connect with qualified workers.'
                    }
                </p>
                
                {/* Region indicator */}
                <div className="mx-auto mt-4 max-w-2xl text-center">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                        📍 {region === 'Nigeria' ? 'Nigeria' : region === 'Africa' ? 'Other African Countries' : 'Rest of World'} Pricing
                    </span>
                </div>

                <div className={`isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 md:max-w-none ${user.role === 'cleaner' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`rounded-3xl p-8 ring-1 flex flex-col ${plan.isRecommended ? 'ring-2 ring-primary shadow-lg' : 'ring-gray-200'}`}
                        >
                            {plan.isRecommended && (
                                <div className="absolute top-0 right-6 transform -translate-y-1/2">
                                    <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold text-white shadow-lg">
                                        RECOMMENDED
                                    </span>
                                </div>
                            )}
                            
                            <h3 className="text-lg font-semibold leading-8 text-gray-900">
                                {plan.name}
                                {currentPlan === plan.name && isSubscriptionExpired && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                        Expired
                                    </span>
                                )}
                            </h3>
                            <p className="mt-4 text-sm leading-6 text-gray-600">
                                {getPlanDescription(plan.name, user.role)}
                            </p>
                            
                            {/* Trial badge for Free plans in non-Nigeria regions */}
                            {plan.name === 'Free' && plan.trialDays && (
                                <div className="mt-3">
                                    <span className="inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
                                        🎁 {plan.trialDays} Day{plan.trialDays > 1 ? 's' : ''} Free Trial
                                    </span>
                                </div>
                            )}
                            
                            <p className="mt-6 flex items-baseline gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-gray-900">
                                    {currency}{plan.priceMonthly.toLocaleString()}
                                </span>
                                <span className="text-sm font-semibold leading-6 text-gray-600">
                                    /month
                                </span>
                            </p>
                            
                            {/* Client/Job limits */}
                            {user.role === 'cleaner' && plan.maxClients && (
                                <div className="mt-3 text-center">
                                    <span className="text-sm font-semibold text-primary">
                                        Up to {plan.maxClients} client{plan.maxClients > 1 ? 's' : ''}/month
                                    </span>
                                </div>
                            )}
                            {user.role === 'client' && plan.maxJobPosts !== undefined && (
                                <div className="mt-3 text-center">
                                    <span className="text-sm font-semibold text-primary">
                                        {plan.maxJobPosts >= 999 ? 'Unlimited' : `Up to ${plan.maxJobPosts}`} job post{plan.maxJobPosts !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}
                            
                            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 flex-grow">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <CheckIcon className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* Yearly Price at the bottom */}
                            <div className="mt-8 pt-4 border-t border-gray-200/80">
                                {plan.priceYearly > 0 ? (
                                    <p className="text-center text-gray-600">
                                        <span className="text-2xl font-bold text-dark">{currency}{plan.priceYearly.toLocaleString()}</span>
                                        <span className="text-sm"> / year</span>
                                        <span className="block text-xs font-semibold text-secondary">
                                            SAVE {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%
                                        </span>
                                    </p>
                                ) : (
                                    <div className="h-[60px] flex items-center justify-center">
                                        <p className="text-center text-lg font-semibold text-gray-600">
                                            {plan.trialDays ? 'Free Trial' : 'Always Free'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => onSelectPlan(plan)}
                                disabled={isCurrentActivePlan(plan.name)}
                                className={`mt-6 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 
                                ${isCurrentActivePlan(plan.name)
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : plan.isRecommended 
                                    ? 'bg-primary text-white shadow-sm hover:bg-secondary focus-visible:outline-primary'
                                    : 'bg-white text-primary ring-1 ring-inset ring-primary hover:bg-green-50'
                                }`}
                            >
                                {isCurrentActivePlan(plan.name)
                                    ? 'Current Plan'
                                    : currentPlan === plan.name && isSubscriptionExpired
                                    ? `Renew ${plan.name}`
                                    : `Choose ${plan.name}`}
                            </button>
                        </div>
                    ))}
                </div>
                
                {/* Additional info */}
                <div className="mx-auto mt-16 max-w-2xl text-center">
                    <p className="text-sm text-gray-600">
                        💡 All plans include secure payment processing and customer support.
                    </p>
                    {region !== 'Nigeria' && user.role === 'cleaner' && (
                        <p className="mt-2 text-sm text-gray-600">
                            🎁 Try our {region === 'Africa' ? '1-month' : '4-day'} free trial with full access to all features!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};