import { SubscriptionPlan } from '../types';

// Region categories for pricing
export const AFRICAN_COUNTRIES = [
    'Nigeria', 'Ghana', 'South Africa', 'Kenya', 'Egypt', 'Ivory Coast',
    'Tanzania', 'Uganda', 'Ethiopia', 'Morocco', 'Algeria', 'Tunisia',
    'Senegal', 'Rwanda', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia',
    'Mozambique', 'Angola', 'Cameroon', 'Mali', 'Burkina Faso'
];

// Helper function to determine region
export const getRegion = (country: string): 'Nigeria' | 'Africa' | 'Global' => {
    if (country === 'Nigeria') return 'Nigeria';
    if (AFRICAN_COUNTRIES.includes(country)) return 'Africa';
    return 'Global';
};

// WORKER SUBSCRIPTION PLANS
export const WORKER_PLANS_NIGERIA: SubscriptionPlan[] = [
    {
        name: 'Free',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            '1 client per month only',
            'Profile hidden after 1st client',
            'No messaging after limit',
            'No job listing access',
            'Manual profile setup'
        ],
        maxClients: 1,
        hasJobAccess: false,
    },
    {
        name: 'Basic',
        priceMonthly: 5000,
        priceYearly: 50000,
        features: [
            'Up to 3 clients per month',
            'Profile visible in search',
            'Unlimited messaging',
            'Access to listed jobs',
            'Basic matching algorithm',
            'Save clients'
        ],
        maxClients: 3,
        hasJobAccess: true,
    },
    {
        name: 'Pro',
        priceMonthly: 10000,
        priceYearly: 100000,
        features: [
            'Up to 6 clients per month',
            'Higher search visibility',
            'Priority client matching',
            'Instant notifications',
            'Profile boosts included',
            'Verified badge',
            'Advanced analytics',
            'Access to listed jobs'
        ],
        maxClients: 6,
        hasJobAccess: true,
        isRecommended: true,
    },
    {
        name: 'Elite',
        priceMonthly: 30000,
        priceYearly: 300000,
        features: [
            'Up to 25 clients per month',
            'Maximum search visibility',
            'Priority job routing',
            'Featured placements',
            'Verified badge',
            'Full analytics dashboard',
            'Priority support 24/7',
            'Access to listed jobs'
        ],
        maxClients: 25,
        hasJobAccess: true,
    },
];

export const WORKER_PLANS_AFRICA: SubscriptionPlan[] = [
    {
        name: 'Free',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            '1 month free trial',
            '1 client during trial',
            'Full search visibility (trial)',
            'Messaging enabled (trial)',
            'Profile hidden after trial'
        ],
        maxClients: 1,
        hasJobAccess: false,
        trialDays: 30,
    },
    {
        name: 'Basic',
        priceMonthly: 3,
        priceYearly: 30,
        currency: 'USD',
        features: [
            'Up to 3 clients per month',
            'Profile visible in search',
            'Unlimited messaging',
            'Access to listed jobs',
            'Basic matching algorithm',
            'Save clients'
        ],
        maxClients: 3,
        hasJobAccess: true,
    },
    {
        name: 'Pro',
        priceMonthly: 6,
        priceYearly: 60,
        currency: 'USD',
        features: [
            'Up to 6 clients per month',
            'Higher search visibility',
            'Priority client matching',
            'Instant notifications',
            'Profile boosts included',
            'Verified badge',
            'Advanced analytics',
            'Access to listed jobs'
        ],
        maxClients: 6,
        hasJobAccess: true,
        isRecommended: true,
    },
    {
        name: 'Elite',
        priceMonthly: 15,
        priceYearly: 150,
        currency: 'USD',
        features: [
            'Up to 25 clients per month',
            'Maximum search visibility',
            'Priority job routing',
            'Featured placements',
            'Verified badge',
            'Full analytics dashboard',
            'Priority support 24/7',
            'Access to listed jobs'
        ],
        maxClients: 25,
        hasJobAccess: true,
    },
];

export const WORKER_PLANS_GLOBAL: SubscriptionPlan[] = [
    {
        name: 'Free',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            '4 days free trial',
            '1 client during trial',
            'Full search visibility (trial)',
            'Messaging enabled (trial)',
            'Profile hidden after trial'
        ],
        maxClients: 1,
        hasJobAccess: false,
        trialDays: 4,
    },
    {
        name: 'Basic',
        priceMonthly: 5,
        priceYearly: 50,
        currency: 'USD',
        features: [
            'Up to 3 clients per month',
            'Profile visible in search',
            'Unlimited messaging',
            'Access to listed jobs',
            'Basic matching algorithm',
            'Save clients'
        ],
        maxClients: 3,
        hasJobAccess: true,
    },
    {
        name: 'Pro',
        priceMonthly: 10,
        priceYearly: 100,
        currency: 'USD',
        features: [
            'Up to 6 clients per month',
            'Higher search visibility',
            'Priority client matching',
            'Instant notifications',
            'Profile boosts included',
            'Verified badge',
            'Advanced analytics',
            'Access to listed jobs'
        ],
        maxClients: 6,
        hasJobAccess: true,
        isRecommended: true,
    },
    {
        name: 'Elite',
        priceMonthly: 30,
        priceYearly: 300,
        currency: 'USD',
        features: [
            'Up to 25 clients per month',
            'Maximum search visibility',
            'Priority job routing',
            'Featured placements',
            'Verified badge',
            'Full analytics dashboard',
            'Priority support 24/7',
            'Access to listed jobs'
        ],
        maxClients: 25,
        hasJobAccess: true,
    },
];

// CLIENT SUBSCRIPTION PLANS (for job posting)
export const CLIENT_PLANS_NIGERIA: SubscriptionPlan[] = [
    {
        name: 'Regular',
        priceMonthly: 20000,
        priceYearly: 200000,
        features: [
            'Post up to 3 jobs',
            'Basic job visibility',
            'Qualified worker matches',
            'Email notifications',
            'Standard support'
        ],
        maxJobPosts: 3,
    },
    {
        name: 'Silver',
        priceMonthly: 30000,
        priceYearly: 300000,
        features: [
            'Post up to 6 jobs',
            'Enhanced job visibility',
            'Priority worker matches',
            'Instant notifications',
            'Priority support'
        ],
        maxJobPosts: 6,
        isRecommended: true,
    },
    {
        name: 'Gold',
        priceMonthly: 50000,
        priceYearly: 500000,
        features: [
            'Post up to 10 jobs',
            'Premium job visibility',
            'Priority worker matches',
            'Featured job placements',
            'Advanced analytics',
            'Dedicated support'
        ],
        maxJobPosts: 10,
    },
    {
        name: 'Diamond',
        priceMonthly: 80000,
        priceYearly: 800000,
        features: [
            'Post unlimited jobs',
            'Maximum job visibility',
            'Top priority matches',
            'Featured placements',
            'Full analytics dashboard',
            'VIP support 24/7',
            'Account manager'
        ],
        maxJobPosts: 999,
    },
];

export const CLIENT_PLANS_AFRICA: SubscriptionPlan[] = [
    {
        name: 'Regular',
        priceMonthly: 10,
        priceYearly: 100,
        currency: 'USD',
        features: [
            'Post up to 3 jobs',
            'Basic job visibility',
            'Qualified worker matches',
            'Email notifications',
            'Standard support'
        ],
        maxJobPosts: 3,
    },
    {
        name: 'Silver',
        priceMonthly: 15,
        priceYearly: 150,
        currency: 'USD',
        features: [
            'Post up to 6 jobs',
            'Enhanced job visibility',
            'Priority worker matches',
            'Instant notifications',
            'Priority support'
        ],
        maxJobPosts: 6,
        isRecommended: true,
    },
    {
        name: 'Gold',
        priceMonthly: 30,
        priceYearly: 300,
        currency: 'USD',
        features: [
            'Post up to 10 jobs',
            'Premium job visibility',
            'Priority worker matches',
            'Featured job placements',
            'Advanced analytics',
            'Dedicated support'
        ],
        maxJobPosts: 10,
    },
    {
        name: 'Diamond',
        priceMonthly: 50,
        priceYearly: 500,
        currency: 'USD',
        features: [
            'Post unlimited jobs',
            'Maximum job visibility',
            'Top priority matches',
            'Featured placements',
            'Full analytics dashboard',
            'VIP support 24/7',
            'Account manager'
        ],
        maxJobPosts: 999,
    },
];

export const CLIENT_PLANS_GLOBAL: SubscriptionPlan[] = [
    {
        name: 'Regular',
        priceMonthly: 20,
        priceYearly: 200,
        currency: 'USD',
        features: [
            'Post up to 3 jobs',
            'Basic job visibility',
            'Qualified worker matches',
            'Email notifications',
            'Standard support'
        ],
        maxJobPosts: 3,
    },
    {
        name: 'Silver',
        priceMonthly: 25,
        priceYearly: 250,
        currency: 'USD',
        features: [
            'Post up to 6 jobs',
            'Enhanced job visibility',
            'Priority worker matches',
            'Instant notifications',
            'Priority support'
        ],
        maxJobPosts: 6,
        isRecommended: true,
    },
    {
        name: 'Gold',
        priceMonthly: 40,
        priceYearly: 400,
        currency: 'USD',
        features: [
            'Post up to 10 jobs',
            'Premium job visibility',
            'Priority worker matches',
            'Featured job placements',
            'Advanced analytics',
            'Dedicated support'
        ],
        maxJobPosts: 10,
    },
    {
        name: 'Diamond',
        priceMonthly: 60,
        priceYearly: 600,
        currency: 'USD',
        features: [
            'Post unlimited jobs',
            'Maximum job visibility',
            'Top priority matches',
            'Featured placements',
            'Full analytics dashboard',
            'VIP support 24/7',
            'Account manager'
        ],
        maxJobPosts: 999,
    },
];

// Helper function to get appropriate plans based on role and country
export const getSubscriptionPlans = (role: 'client' | 'cleaner', country?: string): SubscriptionPlan[] => {
    const region = getRegion(country || 'Nigeria');
    
    if (role === 'cleaner') {
        if (region === 'Nigeria') return WORKER_PLANS_NIGERIA;
        if (region === 'Africa') return WORKER_PLANS_AFRICA;
        return WORKER_PLANS_GLOBAL;
    } else {
        if (region === 'Nigeria') return CLIENT_PLANS_NIGERIA;
        if (region === 'Africa') return CLIENT_PLANS_AFRICA;
        return CLIENT_PLANS_GLOBAL;
    }
};

// Legacy export for backward compatibility
export const SUBSCRIPTION_PLANS = WORKER_PLANS_NIGERIA;

export const CLIENT_LIMITS: { [key: string]: number } = {
    Free: 1,
    Basic: 3,
    Pro: 6,
    Elite: 25,
    Standard: 3,
    Premium: 13,
    Regular: 3,
    Silver: 6,
    Gold: 10,
    Diamond: 999,
};