
import React, { useState, useEffect, useMemo } from 'react';
import { Hero } from './Hero';
import { CleanerCard } from './CleanerCard';
import { Cleaner, View, User } from '../types';

interface LandingPageProps {
    cleaners: Cleaner[]; // Receives all cleaners from App.tsx
    user?: User | null; // Logged-in user for location-based sorting
    onNavigate: (view: View) => void;
    onSelectCleaner: (cleaner: Cleaner) => void;
    onSearch: (filters: { service: string, location: string, minPrice: string, maxPrice: string, minRating: string }) => void;
    appError: string | null;
}

interface FeaturedCleanersSectionProps {
    loading: boolean;
    cleaners: Cleaner[];
    onSelectCleaner: (cleaner: Cleaner) => void;
    appError: string | null;
}

// Subscription tier scores for sorting priority (higher = better)
const TIER_SCORES: Record<string, number> = { Elite: 5, Premium: 4, Pro: 3, Standard: 2, Basic: 1, Free: 0 };

// Calculate location proximity score between a viewer and a worker
const getProximityScore = (
    viewerCountry?: string, viewerState?: string, viewerCity?: string,
    workerCountry?: string, workerState?: string, workerCity?: string
): number => {
    if (!viewerCountry) return 0; // No user location — no proximity boost
    const vc = (viewerCountry || '').toLowerCase();
    const vs = (viewerState || '').toLowerCase();
    const vci = (viewerCity || '').toLowerCase();
    const wc = (workerCountry || '').toLowerCase();
    const ws = (workerState || '').toLowerCase();
    const wci = (workerCity || '').toLowerCase();
    if (vci && wci && vci === wci && vs === ws && vc === wc) return 40; // Same city
    if (vs && ws && vs === ws && vc === wc) return 30; // Same state
    if (vc && wc && vc === wc) return 20; // Same country
    return 0; // Different country
};

// Sort cleaners by: subscription tier → proximity → rating → verified → reviews
const getSortedCleaners = (allCleaners: Cleaner[], user?: User | null): Cleaner[] => {
  return [...allCleaners].sort((a, b) => {
    // 1. Subscription tier (highest paid first)
    const tierDiff = (TIER_SCORES[b.subscriptionTier] ?? 0) - (TIER_SCORES[a.subscriptionTier] ?? 0);
    if (tierDiff !== 0) return tierDiff;

    // 2. Proximity to user (same city > same state > same country)
    const proxA = getProximityScore(user?.country, user?.state, user?.city, a.country, a.state, a.city);
    const proxB = getProximityScore(user?.country, user?.state, user?.city, b.country, b.state, b.city);
    if (proxB !== proxA) return proxB - proxA;

    // 3. Rating
    if (b.rating !== a.rating) return b.rating - a.rating;

    // 4. Verified first
    if (b.isVerified !== a.isVerified) return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);

    // 5. Review count
    return b.reviews - a.reviews;
  });
};


const FeaturedCleanersSection: React.FC<FeaturedCleanersSectionProps> = ({ loading, cleaners, onSelectCleaner, appError }) => (
    <div className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-dark">Meet Our Top-Rated Professionals</h2>
            <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
                Handpicked skilled professionals who are consistently rated the best by our customers for their reliability and expertise.
            </p>
             {appError && (
                <div className="mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative text-center" role="alert">
                    <strong className="font-bold">Connection Error! </strong>
                    <span className="block sm:inline">{appError}</span>
                </div>
            )}
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
               {loading && !appError ? (
                   Array.from({ length: 8 }).map((_, index) => (
                       <div key={index} className="bg-gray-200 rounded-xl w-full h-96 animate-pulse"></div>
                   ))
               ) : !appError && cleaners.length > 0 ? (
                   cleaners.map(cleaner => (
                       <CleanerCard 
                           key={cleaner.id} 
                           cleaner={cleaner} 
                           onClick={() => onSelectCleaner(cleaner)} 
                        />
                   ))
               ) : !appError ? (
                 <div className="col-span-full text-center text-gray-500 py-8">
                    No top-rated professionals available at the moment.
                </div>
               ) : null}
            </div>
        </div>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ cleaners, user, onNavigate, onSelectCleaner, onSearch, appError }) => {
    // The loading state is now determined by whether the cleaners prop has been populated and there's no error
    const loading = cleaners.length === 0 && !appError;

    // Sort all cleaners by subscription, proximity to user, rating — show ALL (no limit)
    const sortedCleaners = useMemo(() => getSortedCleaners(cleaners, user), [cleaners, user]);

    return (
        <>
            <Hero onSearch={onSearch} />
            <FeaturedCleanersSection
                loading={loading}
                cleaners={sortedCleaners}
                onSelectCleaner={onSelectCleaner}
                appError={appError}
            />
        </>
    );
};
