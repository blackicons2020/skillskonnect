
import React, { useState, useEffect, useMemo } from 'react';
import { Cleaner, User, View, Booking, Review, VerificationDocuments, Job } from '../types';
import { SparklesIcon, MapPinIcon, BriefcaseIcon, ChevronDownIcon, StarIcon, CreditCardIcon, UserGroupIcon, ChatBubbleLeftRightIcon, LifebuoyIcon, PencilIcon, UserIcon } from './icons';
import { CleanerCard } from './CleanerCard';
import { getAiRecommendedServices } from '../services/geminiService';
import { CLEANING_SERVICES } from '../constants/services';

// Subscription tier scores for sorting priority
const TIER_SCORES: Record<string, number> = { Elite: 5, Premium: 4, Pro: 3, Standard: 2, Basic: 1, Free: 0 };

const getProximityScore = (
    viewerCountry?: string, viewerState?: string, viewerCity?: string,
    workerCountry?: string, workerState?: string, workerCity?: string
): number => {
    if (!viewerCountry) return 0;
    const vc = (viewerCountry || '').toLowerCase();
    const vs = (viewerState || '').toLowerCase();
    const vci = (viewerCity || '').toLowerCase();
    const wc = (workerCountry || '').toLowerCase();
    const ws = (workerState || '').toLowerCase();
    const wci = (workerCity || '').toLowerCase();
    if (vci && wci && vci === wci && vs === ws && vc === wc) return 40;
    if (vs && ws && vs === ws && vc === wc) return 30;
    if (vc && wc && vc === wc) return 20;
    return 0;
};
import { CancellationConfirmationModal } from './CancellationConfirmationModal';
import { ReviewModal } from './ReviewModal';
import { JobApplicantsModal } from './JobApplicantsModal';
import { EditJobModal } from './EditJobModal';
import { apiService } from '../services/apiService';
import { ChatInterface } from './ChatInterface';
import { SupportTicketSection } from './SupportTicketSection';
import { NIGERIA_LOCATIONS } from '../constants/locations';
import { countries, phoneCodes } from '../constants/countries';
import ProfileCompletionForm from './ProfileCompletionForm';
import VerificationSection from './VerificationSection';

interface ServiceRecommendationsProps {
    isLoading: boolean;
    recommendations: string[];
    onSelect: (service: string) => void;
}

const ServiceRecommendations: React.FC<ServiceRecommendationsProps> = ({ isLoading, recommendations, onSelect }) => {
    if (isLoading) {
        return (
            <div className="mt-8">
                 <div className="bg-gray-200 h-8 w-1/3 rounded-md animate-pulse mb-4"></div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="bg-gray-200 h-24 rounded-lg animate-pulse"></div>
                     ))}
                 </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null; // Don't show anything if there are no recommendations
    }

    return (
        <div className="mt-8">
            <h3 className="text-2xl font-bold flex items-center gap-2 text-dark">
                <SparklesIcon className="w-6 h-6 text-primary"/>
                <span>Recommended For You</span>
            </h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendations.map(service => (
                    <button 
                        key={service}
                        onClick={() => onSelect(service)}
                        className="p-4 bg-white rounded-lg shadow-md text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary"
                    >
                        <p className="font-semibold text-dark">{service}</p>
                        <span className="text-sm text-primary font-medium mt-2 inline-block">Find Professionals &rarr;</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ProfileField: React.FC<{ label: string; value?: string | number | null | string[]; isEditing?: boolean; children?: React.ReactNode }> = ({ label, value, isEditing, children }) => (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 border-b border-gray-100 last:border-0">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 flex text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {isEditing ? children : (
                <div className="flex-grow">
                    {Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-2">
                            {value.length > 0 ? value.map(item => (
                                <span key={item} className="bg-green-100 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">{item}</span>
                            )) : 'N/A'}
                        </div>
                    ) : (value || 'N/A')}
                </div>
            )}
        </dd>
    </div>
);

interface ClientDashboardProps {
    user: User;
    allCleaners: Cleaner[];
    allUsers?: User[];
    allJobs?: Job[];
    allBookings?: Booking[];
    onSelectCleaner: (cleaner: Cleaner) => void;
    initialFilters?: { service: string, location: string, minPrice: string, maxPrice: string, minRating: string } | null;
    clearInitialFilters: () => void;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    onCancelBooking: (bookingId: string) => void;
    onReviewSubmit: (bookingId: string, cleanerId: string, reviewData: Omit<Review, 'reviewerName'>) => void;
    onApproveJobCompletion: (bookingId: string) => void;
    onUpdateUser: (user: User) => void;
    onRefreshJobs?: () => Promise<void>;
    appError: string | null;
    initialTab?: 'find' | 'bookings' | 'messages' | 'support' | 'profile' | 'verification' | 'jobs' | 'notifications' | 'settings';
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ user, allCleaners, allUsers = [], allJobs = [], allBookings = [], onSelectCleaner, initialFilters, clearInitialFilters, onNavigate, onLogout, onCancelBooking, onReviewSubmit, onApproveJobCompletion, onUpdateUser, onRefreshJobs, appError, initialTab }) => {
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [isRecsLoading, setIsRecsLoading] = useState(true);
    
    // Job management state
    const [jobToViewApplicants, setJobToViewApplicants] = useState<Job | null>(null);
    const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
    const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
    const [jobApplicants, setJobApplicants] = useState<User[]>([]);
    const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
    
    // Chat state - for auto-selecting chat when messaging a cleaner
    const [chatToOpen, setChatToOpen] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Unread messages badge
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    // Unread notifications badge
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    // Upgrade banner state for free/unsubscribed users
    const isFreeUser = !user.subscriptionTier || user.subscriptionTier === 'Free';
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

    // Check if profile is incomplete
    const isProfileIncomplete = !user.userType || !user.phoneNumber || !user.country;
    
    // Set initial tab - if profile is incomplete, always start with profile, otherwise use initialTab or 'find'
    const [activeTab, setActiveTab] = useState<'find' | 'bookings' | 'messages' | 'support' | 'profile' | 'verification' | 'jobs' | 'notifications' | 'settings'>(
        isProfileIncomplete ? 'profile' : (initialTab || 'find')
    );
    const [showProfileCompletion, setShowProfileCompletion] = useState(isProfileIncomplete);
    
    // Handler for profile updates
    const handleProfileUpdate = async (updates: Partial<User>) => {
        await onUpdateUser({ ...user, ...updates });
        setShowProfileCompletion(false);
    };
    
    // Handler for verification document upload
    const handleVerificationUpload = async (documents: VerificationDocuments) => {
        await onUpdateUser({ ...user, verificationDocuments: documents });
    };
    
    // Job management handlers
    const handleViewApplicants = async (job: Job) => {
        setJobToViewApplicants(job);
        setIsLoadingApplicants(true);
        try {
            const applicants = await apiService.getJobApplicants(job.id);
            setJobApplicants(applicants);
        } catch (error: any) {
            alert(`Failed to load applicants: ${error.message}`);
            setJobApplicants([]);
        } finally {
            setIsLoadingApplicants(false);
        }
    };
    
    const handleEditJob = async (jobId: string, updates: Partial<Job>) => {
        try {
            const updatedJob = await apiService.updateJob(jobId, updates);
            // Update local user state with edited job
            const updatedPostedJobs = user.postedJobs?.map(j => 
                j.id === jobId ? updatedJob : j
            );
            await onUpdateUser({ ...user, postedJobs: updatedPostedJobs });
            alert('Job updated successfully!');
        } catch (error: any) {
            alert(`Failed to update job: ${error.message}`);
            throw error;
        }
    };
    
    const handleCancelJob = async (jobId: string) => {
        if (!confirm('Are you sure you want to cancel this job? This action cannot be undone.')) {
            return;
        }
        try {
            const cancelledJob = await apiService.cancelJob(jobId);
            // Update local user state
            const updatedPostedJobs = user.postedJobs?.map(j => 
                j.id === jobId ? cancelledJob : j
            );
            await onUpdateUser({ ...user, postedJobs: updatedPostedJobs });
            alert('Job cancelled successfully!');
        } catch (error: any) {
            alert(`Failed to cancel job: ${error.message}`);
        }
    };
    
    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            return;
        }
        try {
            await apiService.deleteJob(jobId);
            // Remove job from local user state
            const updatedPostedJobs = user.postedJobs?.filter(j => j.id !== jobId);
            await onUpdateUser({ ...user, postedJobs: updatedPostedJobs });
            setJobToDelete(null);
            alert('Job deleted successfully!');
        } catch (error: any) {
            alert(`Failed to delete job: ${error.message}`);
        }
    };
    
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [bookingToReview, setBookingToReview] = useState<Booking | null>(null);
    const [activeFilters, setActiveFilters] = useState({ service: '', location: '', minPrice: '', maxPrice: '', minRating: '' });
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    // Profile Editing State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileFormData, setProfileFormData] = useState<any>(user);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
    const [cities, setCities] = useState<string[]>([]);
    const [selectedCountry, setSelectedCountry] = useState(
        countries.find(c => c.name === (user.country || 'Nigeria')) || countries[0]
    );
    
    useEffect(() => {
        if (initialFilters) {
            setActiveFilters(initialFilters);
            if (initialFilters.minPrice || initialFilters.maxPrice || initialFilters.minRating) {
                setIsAdvancedOpen(true);
            }
            clearInitialFilters();
            // Only switch to find tab if profile is complete
            if (!isProfileIncomplete) {
                setActiveTab('find');
            }
        }
    }, [initialFilters, clearInitialFilters, isProfileIncomplete]);

    useEffect(() => {
        if (initialTab) {
            // If profile is incomplete, ignore initialTab and stay on profile
            if (isProfileIncomplete) {
                setActiveTab('profile');
            } else {
                setActiveTab(initialTab);
            }
        }
    }, [initialTab, isProfileIncomplete]);

    // Fetch unread notification count on mount
    useEffect(() => {
        let cancelled = false;
        const fetchNotifCount = async () => {
            try {
                const notifs = await apiService.getNotifications();
                if (!cancelled) setUnreadNotificationCount(notifs.filter((n: any) => !n.isRead).length);
            } catch {
                // silently ignore
            }
        };
        fetchNotifCount();
        return () => { cancelled = true; };
    }, [user.id]);

    useEffect(() => {
        setIsRecsLoading(true);
        setRecommendations(getAiRecommendedServices(user));
        setIsRecsLoading(false);
        setProfileFormData(user);
        
        // Set profile photo preview from either profilePhoto or profilePicture
        if (user.profilePhoto && user.profilePhoto instanceof File) {
            setProfilePhotoPreview(URL.createObjectURL(user.profilePhoto));
        } else if (typeof user.profilePhoto === 'string') {
             setProfilePhotoPreview(user.profilePhoto);
        } else if (typeof user.profilePicture === 'string') {
             setProfilePhotoPreview(user.profilePicture);
        }
    }, [user]);

    // Update selected country when country changes
    useEffect(() => {
        const country = countries.find(c => c.name === profileFormData.country);
        if (country && country.name !== selectedCountry.name) {
            setSelectedCountry(country);
            if (country.phoneCode !== profileFormData.phoneCountryCode) {
                setProfileFormData((prev: any) => ({
                    ...prev,
                    phoneCountryCode: country.phoneCode
                }));
            }
        }
    }, [profileFormData.country]);

    // Update cities when state changes in profile form (for Nigeria compatibility)
    useEffect(() => {
        if (profileFormData.country === 'Nigeria' && profileFormData.state) {
            const selectedState = NIGERIA_LOCATIONS.find(s => s.name === profileFormData.state);
            setCities(selectedState ? [...selectedState.towns, 'Other'] : ['Other']);
        } else {
            setCities([]);
        }
    }, [profileFormData.state, profileFormData.country]);

    const displayedCleaners = useMemo(() => {
        if (appError) return [];
        const { service, location, minPrice, maxPrice, minRating } = activeFilters;
        const filtered = allCleaners.filter(cleaner => {
            const serviceMatch = service ? cleaner.serviceTypes.includes(service) : true;
            const locationMatch = location 
                ? cleaner.city.toLowerCase().includes(location.toLowerCase()) || 
                  cleaner.state.toLowerCase().includes(location.toLowerCase()) ||
                  (cleaner.otherCity && cleaner.otherCity.toLowerCase().includes(location.toLowerCase()))
                : true;
            let priceMatch = true;
            if (minPrice || maxPrice) {
                const min = Number(minPrice) || 0;
                const max = Number(maxPrice) || Infinity;
                const rates = [cleaner.chargeHourly, cleaner.chargeDaily, cleaner.chargePerContract].filter(r => r !== undefined && r !== null) as number[];
                if (rates.length > 0) {
                     priceMatch = rates.some(r => r >= min && r <= max);
                } else {
                    priceMatch = false; 
                }
            }
            let ratingMatch = true;
            if (minRating) {
                ratingMatch = cleaner.rating >= Number(minRating);
            }
            return serviceMatch && locationMatch && priceMatch && ratingMatch;
        });

        // Sort: subscription tier → proximity → rating → verified → reviews
        return [...filtered].sort((a, b) => {
            const tierDiff = (TIER_SCORES[b.subscriptionTier] ?? 0) - (TIER_SCORES[a.subscriptionTier] ?? 0);
            if (tierDiff !== 0) return tierDiff;
            const proxA = getProximityScore(user?.country, user?.state, user?.city, a.country, a.state, a.city);
            const proxB = getProximityScore(user?.country, user?.state, user?.city, b.country, b.state, b.city);
            if (proxB !== proxA) return proxB - proxA;
            if (b.rating !== a.rating) return b.rating - a.rating;
            if (b.isVerified !== a.isVerified) return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
            return b.reviews - a.reviews;
        });
    }, [activeFilters, allCleaners, appError, user]);

    const resultsTitle = useMemo(() => {
        if (activeFilters.service || activeFilters.location || activeFilters.minPrice || activeFilters.maxPrice || activeFilters.minRating) return 'Filtered Results';
        return 'All Available Professionals';
    }, [activeFilters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setActiveFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleRecommendationSelect = (service: string) => {
        setActiveFilters(prev => ({ ...prev, service }));
        // Only switch to find tab if profile is complete
        if (!isProfileIncomplete) {
            setActiveTab('find');
        }
        window.scrollTo(0, 0);
    };

    const handleMessageCleaner = async (cleanerId: string, cleanerName: string) => {
        try {
            const chat = await apiService.createChat(user.id, cleanerId, user.fullName, cleanerName);
            setChatToOpen(chat.id);
            setActiveTab('messages');
        } catch (error) {
            alert('Could not start chat. Please try again.');
        }
    };

    // Profile Handlers
    const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileFormData((prev: any) => {
            const updates: any = { ...prev, [name]: value };
            // If state changes, reset city
            if (name === 'state') {
                updates.city = '';
                updates.otherCity = '';
            }
            return updates;
        });
    };

    const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfileFormData((prev: any) => ({...prev, profilePhoto: file }));
            setProfilePhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = () => {
        onUpdateUser(profileFormData);
        setIsEditingProfile(false);
    };

    const handleCancelProfile = () => {
        setProfileFormData(user);
        setIsEditingProfile(false);
    };

    const renderValueOrInput = (name: keyof User, type: 'text' | 'email' | 'tel' | 'number' = 'text', options: Record<string, any> = {}) => {
        return (
            <input
                type={type}
                name={name}
                id={name}
                value={profileFormData[name] as string || ''}
                onChange={handleProfileInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                {...options}
            />
        );
    };

     const getPaymentStatusBadgeClass = (status: Booking['paymentStatus']) => {
        switch (status) {
            case 'Pending Payment': return 'bg-yellow-100 text-yellow-800';
            case 'Pending Admin Confirmation': return 'bg-blue-100 text-blue-800';
            case 'Confirmed': return 'bg-teal-100 text-teal-800';
            case 'Paid': return 'bg-green-100 text-green-800';
            case 'Pending Payout': return 'bg-purple-100 text-purple-800';
            case 'Not Applicable': default: return 'bg-gray-200 text-gray-800';
        }
    };

    // Determine the display name (Company Name if applicable, else First Name)
    const displayName = user.clientType === 'Company' && user.companyName 
        ? user.companyName 
        : (user.fullName ? user.fullName.split(' ')[0] : (user.email?.split('@')[0] || 'User'));

    // Determine the name to display in profile header
    const profileDisplayName = profileFormData.clientType === 'Company' && profileFormData.companyName 
        ? profileFormData.companyName 
        : profileFormData.fullName;

    return (
        <div className="p-4 sm:p-8 container mx-auto">

             {/* Profile Header with Name, Email, and Upgrade Banner */}
             <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    {/* Profile Avatar */}
                    <div className="flex-shrink-0">
                        {(user.profilePicture || profilePhotoPreview) ? (
                            <img 
                                src={user.profilePicture || profilePhotoPreview || ''} 
                                alt="Profile" 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-blue-500"
                            />
                        ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold border-4 border-purple-500">
                                {(displayName || 'U')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-grow text-center sm:text-left min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                            {profileDisplayName || displayName || 'User'}
                        </h1>
                        <p className="text-gray-600 text-sm sm:text-base mt-0.5 truncate">{user.email}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                            {user.userType && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    {user.userType.replace(/Worker/g, 'Professional')}
                                </span>
                            )}
                            {user.isVerified && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    ✓ Verified
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Compact Upgrade Banner — inline with header on desktop */}
                    {isFreeUser && showUpgradeBanner && !isProfileIncomplete && (
                        <div className="w-full sm:w-auto flex-shrink-0 mt-2 sm:mt-0">
                            <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg px-3 py-2 flex items-center justify-between gap-2 shadow">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm">✨</span>
                                    <span className="text-xs sm:text-sm font-medium truncate">Free Plan — Upgrade for more!</span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => onNavigate('subscription')}
                                        className="bg-white text-primary font-bold text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap"
                                    >
                                        Upgrade
                                    </button>
                                    <button
                                        onClick={() => setShowUpgradeBanner(false)}
                                        className="text-white/70 hover:text-white text-sm leading-none p-0.5"
                                        aria-label="Dismiss"
                                    >✕</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-b border-gray-200 mb-6 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('find')} className={`${activeTab === 'find' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Find a Professional
                    </button>
                    <button onClick={() => setActiveTab('bookings')} className={`${activeTab === 'bookings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        My Bookings
                    </button>
                    <button onClick={() => setActiveTab('jobs')} className={`${activeTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <BriefcaseIcon className="w-4 h-4" />
                        My Posted Jobs
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`${activeTab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        Messages
                        {unreadMessageCount > 0 && (
                            <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('support')} className={`${activeTab === 'support' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <LifebuoyIcon className="w-4 h-4" />
                        Support
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <UserIcon className="w-4 h-4" />
                        My Profile
                    </button>
                    <button onClick={() => setActiveTab('verification')} className={`${activeTab === 'verification' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        {user.isVerified ? '✓' : '○'} Verification
                    </button>
                    <button onClick={() => { setActiveTab('notifications'); setUnreadNotificationCount(0); apiService.markAllNotificationsRead().catch(()=>{}); }} className={`${activeTab === 'notifications' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        🔔 Notifications
                        {unreadNotificationCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        ⚙️ Settings
                    </button>
                </nav>
            </div>
            
            {activeTab === 'find' && (
                <div>
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold mb-4">Search Professionals</h2>
                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="md:col-span-1">
                                    <label htmlFor="service" className="text-xs font-semibold text-gray-500 ml-2 block text-left">Service</label>
                                    <div className="relative mt-1">
                                        <BriefcaseIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <select 
                                            id="service" 
                                            name="service"
                                            className="w-full pl-10 pr-8 p-3 bg-dark border border-gray-600 rounded-lg appearance-none text-light focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={activeFilters.service}
                                            onChange={handleFilterChange}
                                        >
                                            <option value="">All Services</option>
                                            {CLEANING_SERVICES.map((serviceName) => (
                                                <option key={serviceName} value={serviceName}>{serviceName}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label htmlFor="location" className="text-xs font-semibold text-gray-500 ml-2 block text-left">Location</label>
                                    <div className="relative mt-1">
                                        <MapPinIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text" 
                                            id="location" 
                                            name="location"
                                            placeholder="e.g., Ikeja, Lagos" 
                                            className="w-full pl-10 p-3 bg-dark border-gray-600 rounded-lg text-light placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={activeFilters.location}
                                            onChange={handleFilterChange}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAdvancedOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 ml-2 block text-left">Min Price (₦)</label>
                                        <div className="relative mt-1">
                                            <CreditCardIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="number" 
                                                name="minPrice"
                                                placeholder="Min" 
                                                className="w-full pl-10 p-3 bg-dark border-gray-600 rounded-lg text-light placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                                value={activeFilters.minPrice}
                                                onChange={handleFilterChange}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 ml-2 block text-left">Max Price (₦)</label>
                                        <div className="relative mt-1">
                                            <CreditCardIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="number" 
                                                name="maxPrice"
                                                placeholder="Max" 
                                                className="w-full pl-10 p-3 bg-dark border-gray-600 rounded-lg text-light placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                                value={activeFilters.maxPrice}
                                                onChange={handleFilterChange}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 ml-2 block text-left">Min Rating</label>
                                        <div className="relative mt-1">
                                            <StarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <select 
                                                name="minRating"
                                                className="w-full pl-10 pr-8 p-3 bg-dark border border-gray-600 rounded-lg appearance-none text-light focus:outline-none focus:ring-2 focus:ring-primary"
                                                value={activeFilters.minRating}
                                                onChange={handleFilterChange}
                                            >
                                                <option value="">Any Rating</option>
                                                <option value="4.5">4.5 & up</option>
                                                <option value="4.0">4.0 & up</option>
                                                <option value="3.0">3.0 & up</option>
                                            </select>
                                            <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-start">
                                <button
                                    type="button"
                                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                                    className="text-sm font-medium text-gray-600 hover:text-primary flex items-center gap-1"
                                >
                                    {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Filters
                                    <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </form>
                     </div>

                      {(displayedCleaners.length === 0 && !activeFilters.service && !activeFilters.location) && (
                         <ServiceRecommendations isLoading={isRecsLoading} recommendations={recommendations} onSelect={handleRecommendationSelect} />
                    )}

                    <div className="mt-8">
                        <h3 className="text-2xl font-bold">{resultsTitle}</h3>
                        {appError && (
                            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative text-center" role="alert">
                                <strong className="font-bold">Connection Error! </strong>
                                <span className="block sm:inline">{appError}</span>
                            </div>
                        )}
                        {displayedCleaners.length > 0 && !appError ? (
                            <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                {displayedCleaners.map(cleaner => (<CleanerCard key={cleaner.id} cleaner={cleaner} onClick={() => onSelectCleaner(cleaner)} />))}
                            </div>
                        ) : !appError ? (
                            <p className="mt-4 text-gray-500 bg-white p-6 rounded-lg shadow-sm">No professionals found matching your criteria.</p>
                        ) : null }
                    </div>
                </div>
            )}
            
            {activeTab === 'bookings' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-dark mb-4">My Booking History</h2>
                     {(() => {
                        const myBookings = allBookings.filter(b => b.clientId === user.id);
                        return myBookings.length > 0 ? (
                        <ul className="space-y-4">
                            {myBookings.map((item) => {
                                const cleaner = allCleaners.find(c => c.id === item.cleanerId);
                                return (
                                <li key={item.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-4 flex-grow">
                                        {cleaner?.photoUrl && <img src={cleaner.photoUrl} alt={cleaner.name} className="w-16 h-16 rounded-lg object-cover hidden sm:block"/>}
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-dark">{item.service}</p>
                                                    <p className="text-sm text-gray-600">with {item.cleanerName}</p>
                                                    <p className="text-sm text-gray-500">{item.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg text-primary">₦{(item.totalAmount || item.amount).toLocaleString()}</p>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ item.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : item.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs">
                                                 <span className={`font-semibold px-2 py-0.5 rounded-full ${getPaymentStatusBadgeClass(item.paymentStatus)}`}>
                                                    {item.paymentMethod}: {item.paymentStatus}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-col items-stretch sm:items-end justify-start gap-2 flex-shrink-0">
                                         <button 
                                            onClick={() => handleMessageCleaner(item.cleanerId, item.cleanerName)}
                                            className="w-full sm:w-auto text-center bg-gray-100 text-primary px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-200 border border-gray-200"
                                         >
                                            Message Professional
                                         </button>

                                         {item.status === 'Upcoming' && <button onClick={() => setBookingToCancel(item)} className="w-full sm:w-auto text-center bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-red-200">Cancel Booking</button>}
                                         
                                         {item.status === 'Completed' && !item.reviewSubmitted && <button onClick={() => setBookingToReview(item)} className="w-full sm:w-auto text-center bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-yellow-200">Submit Review</button>}
                                         
                                         {item.status === 'Upcoming' && item.paymentMethod === 'Direct' && (
                                            <button onClick={() => onApproveJobCompletion(item.id)} className="w-full sm:w-auto text-center bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-green-700">Mark as Completed</button>
                                         )}
                                    </div>
                                </li>
                                )})}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 py-2">No bookings yet. Time to find a professional!</p>
                    );
                    })()}
                </div>
            )}
             
            {activeTab === 'jobs' && (
                <div className="space-y-6">
                    {/* Subscription Check Banner */}
                    {(!user.subscriptionTier || user.subscriptionTier === 'Free') && (
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 p-6 rounded-lg shadow-md">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="text-lg font-semibold text-purple-900">Subscribe to Post Jobs</h3>
                                    <p className="mt-2 text-sm text-purple-800">
                                        To post job listings and connect with skilled professionals, you need an active subscription. 
                                        <span className="font-semibold"> Note: </span>All clients can search and book professionals directly without subscription.
                                    </p>
                                    <button
                                        onClick={() => onNavigate('subscription')}
                                        className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-purple-700 transition-colors"
                                    >
                                        View Subscription Plans
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Job Posting Limit Banner - Show usage for subscribed clients */}
                    {user.subscriptionTier && user.subscriptionTier !== 'Free' && (() => {
                        const currentJobCount = (user.postedJobs || []).filter(j => j.status === 'Open').length;
                        const jobLimits: { [key: string]: number } = {
                            'Regular': 3,
                            'Silver': 6,
                            'Gold': 10,
                            'Diamond': 999
                        };
                        const maxJobs = jobLimits[user.subscriptionTier] || 3;
                        const isAtLimit = currentJobCount >= maxJobs && maxJobs < 999;
                        const percentage = maxJobs < 999 ? Math.min((currentJobCount / maxJobs) * 100, 100) : 0;
                        
                        return (
                            <div className={`p-4 rounded-lg border-l-4 ${isAtLimit ? 'bg-red-50 border-red-500' : percentage > 70 ? 'bg-yellow-50 border-yellow-500' : 'bg-green-50 border-green-500'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className={`font-semibold ${isAtLimit ? 'text-red-800' : percentage > 70 ? 'text-yellow-800' : 'text-green-800'}`}>
                                            Job Posting Limit
                                        </h4>
                                        <p className={`text-sm ${isAtLimit ? 'text-red-700' : percentage > 70 ? 'text-yellow-700' : 'text-green-700'}`}>
                                            {maxJobs < 999 
                                                ? `${currentJobCount} of ${maxJobs} active jobs posted`
                                                : `${currentJobCount} active jobs (Unlimited)`
                                            }
                                        </p>
                                    </div>
                                    {isAtLimit && (
                                        <button
                                            onClick={() => onNavigate('subscription')}
                                            className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors text-sm"
                                        >
                                            Upgrade Plan
                                        </button>
                                    )}
                                </div>
                                {maxJobs < 999 && (
                                    <div className="mt-3 bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all ${isAtLimit ? 'bg-red-600' : percentage > 70 ? 'bg-yellow-600' : 'bg-green-600'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Job Posting Form - Only if subscribed and under limit */}
                    {user.subscriptionTier && user.subscriptionTier !== 'Free' && (() => {
                        const currentJobCount = (user.postedJobs || []).filter(j => j.status === 'Open').length;
                        const jobLimits: { [key: string]: number } = {
                            'Regular': 3,
                            'Silver': 6,
                            'Gold': 10,
                            'Diamond': 999
                        };
                        const maxJobs = jobLimits[user.subscriptionTier] || 3;
                        const canPost = currentJobCount < maxJobs;
                        
                        if (!canPost) {
                            return (
                                <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold text-red-900 mb-2">Job Posting Limit Reached</h3>
                                    <p className="text-red-800 mb-4">
                                        You've reached your plan's limit of {maxJobs} active job postings. 
                                        Upgrade your plan or close existing jobs to post new ones.
                                    </p>
                                    <button
                                        onClick={() => onNavigate('subscription')}
                                        className="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors"
                                    >
                                        View Upgrade Options
                                    </button>
                                </div>
                            );
                        }
                        
                        return (
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-2xl font-bold text-dark mb-4">Post a New Job</h2>
                                <form className="space-y-4" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const formEl = e.currentTarget;
                                    const jobPayload = {
                                        title: formData.get('title') as string,
                                        description: formData.get('description') as string,
                                        service: formData.get('service') as string,
                                        location: formData.get('location') as string,
                                        state: formData.get('state') as string,
                                        city: formData.get('city') as string,
                                        budget: Number(formData.get('budget')),
                                        budgetType: formData.get('budgetType') as 'Hourly' | 'Daily' | 'Monthly' | 'Fixed',
                                        startDate: formData.get('startDate') as string,
                                        postedDate: new Date().toISOString(),
                                        visibility: 'Subscribers Only' as const
                                    };
                                    
                                    try {
                                        // Create job via API
                                        const createdJob = await apiService.postJob(jobPayload);
                                        
                                        // Update local user state
                                        const updatedUser = {
                                            ...user,
                                            postedJobs: [...(user.postedJobs || []), createdJob],
                                            monthlyJobPostsCount: (user.monthlyJobPostsCount || 0) + 1
                                        };
                                        onUpdateUser(updatedUser);
                                        
                                        // Immediately refresh jobs so Professional/Admin dashboards see the new job
                                        if (onRefreshJobs) {
                                            await onRefreshJobs();
                                        }
                                        
                                        formEl.reset();
                                        alert('Job posted successfully! Professionals will be able to apply.');
                                    } catch (error: any) {
                                        alert(error.message || 'Failed to post job. Please try again.');
                                    }
                                }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                        <input type="text" id="title" name="title" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" placeholder="e.g., Deep Cleaning for Office Space" />
                                    </div>

                                    <div>
                                        <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                                        <select id="service" name="service" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                                            <option value="">Select Service</option>
                                            {CLEANING_SERVICES.map(service => (
                                                <option key={service} value={service}>{service}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input type="date" id="startDate" name="startDate" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" />
                                    </div>

                                    <div>
                                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <select id="state" name="state" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                                            <option value="">Select State</option>
                                            {NIGERIA_LOCATIONS.map(loc => (
                                                <option key={loc.name} value={loc.name}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input type="text" id="city" name="city" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Enter city" />
                                    </div>

                                    <div>
                                        <label htmlFor="budgetType" className="block text-sm font-medium text-gray-700 mb-1">Budget Type</label>
                                        <select id="budgetType" name="budgetType" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                                            <option value="Hourly">Hourly Rate</option>
                                            <option value="Daily">Daily Rate</option>
                                            <option value="Monthly">Monthly Rate</option>
                                            <option value="Fixed">Fixed Price</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">Budget (₦)</label>
                                        <input type="number" id="budget" name="budget" required min="0" step="100" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Enter budget amount" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Full Address/Location</label>
                                        <input type="text" id="location" name="location" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Enter complete address" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                                        <textarea id="description" name="description" required rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Describe the job requirements, expectations, and any special instructions..."></textarea>
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary transition-colors">
                                    Post Job
                                </button>
                            </form>
                        </div>
                    );
                    })()}

                    {/* Posted Jobs List */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold text-dark mb-4">My Posted Jobs</h2>
                        {(() => {
                            // Prefer allJobs (live data with current applicant counts) over
                            // the stale user.postedJobs embedded in the user document.
                            const liveJobs = allJobs.filter(j => j.clientId === user.id);
                            const jobsToShow = liveJobs.length > 0 ? liveJobs : (user.postedJobs || []);
                            return jobsToShow.length > 0 ? (
                            <div className="space-y-4">
                                {jobsToShow.map(job => (
                                    <div key={job.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-dark">{job.title}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{job.service}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                job.status === 'Open' ? 'bg-green-100 text-green-800' :
                                                job.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                job.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {job.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-3">{job.description}</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-500">Location:</span>
                                                <p className="font-medium text-dark">{job.city}, {job.state}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Budget:</span>
                                                <p className="font-medium text-primary">₦{job.budget.toLocaleString()} ({job.budgetType})</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Start Date:</span>
                                                <p className="font-medium text-dark">{new Date(job.startDate).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Applicants:</span>
                                                <p className="font-medium text-dark">{job.applicants?.length || 0} Applied</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                                            <button 
                                                onClick={() => handleViewApplicants(job)}
                                                className="text-sm text-primary hover:text-secondary font-semibold"
                                            >
                                                View Applications ({job.applicants?.length || 0})
                                            </button>
                                            <button 
                                                onClick={() => setJobToEdit(job)}
                                                className="text-sm text-gray-600 hover:text-gray-800 font-semibold"
                                            >
                                                Edit Job
                                            </button>
                                            {job.status === 'Open' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleCancelJob(job.id)}
                                                        className="text-sm text-orange-600 hover:text-orange-800 font-semibold"
                                                    >
                                                        Cancel Job
                                                    </button>
                                                    <button 
                                                        onClick={() => setJobToDelete(job)}
                                                        className="text-sm text-red-600 hover:text-red-800 font-semibold"
                                                    >
                                                        Delete Job
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <BriefcaseIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">No jobs posted yet.</p>
                                {user.subscriptionTier && user.subscriptionTier !== 'Free' && (
                                    <p className="text-sm text-gray-400 mt-2">Post your first job above to connect with skilled professionals!</p>
                                )}
                            </div>
                        );
                        })()}
                    </div>
                </div>
            )}
            
            {activeTab === 'messages' && (
                <div className="bg-white p-6 rounded-lg shadow-md min-h-[600px]">
                    <ChatInterface currentUser={user} initialChatId={chatToOpen} onChatOpened={() => setChatToOpen(null)} onUnreadCountChange={setUnreadMessageCount} />
                </div>
            )}

            {activeTab === 'support' && (
                <SupportTicketSection userId={user.id} />
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white border border-red-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-red-700">Delete Your Account</h3>
                                <p className="text-xs text-gray-500">This action is permanent and cannot be reversed</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Before you proceed, please understand what deleting your account means:
                        </p>
                        <ul className="space-y-2 mb-5">
                            {[
                                'Your profile will be removed from search results immediately.',
                                'All active bookings and job postings will be cancelled.',
                                'Your message history will be permanently deleted.',
                                'Any active subscription will be cancelled with no refund.',
                                'You will lose access to your account right away.',
                                'This action cannot be undone.',
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                    <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5">
                            <p className="text-xs text-yellow-800">
                                <strong>Note:</strong> Your account data will be held securely for up to 30 days before permanent deletion. During this window, our admin team reviews deletion requests. If you change your mind, contact support immediately.
                            </p>
                        </div>
                        {deleteError && (
                            <p className="text-sm text-red-600 mb-3">{deleteError}</p>
                        )}
                        <button
                            onClick={() => { setDeleteError(null); setShowDeleteConfirm(true); }}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            Delete My Account
                        </button>
                    </div>

                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Are you absolutely sure?</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                    You are about to permanently delete your account. Once confirmed:
                                </p>
                                <ul className="text-sm text-gray-600 list-disc pl-5 mb-4 space-y-1">
                                    <li>You will be logged out immediately</li>
                                    <li>All your data will be scheduled for deletion</li>
                                    <li>You will not be able to log back in</li>
                                </ul>
                                {deleteError && (
                                    <p className="text-sm text-red-600 mb-3">{deleteError}</p>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isDeletingAccount}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setIsDeletingAccount(true);
                                            setDeleteError(null);
                                            try {
                                                await apiService.requestAccountDeletion();
                                                onLogout();
                                            } catch (err: any) {
                                                setDeleteError(err.message || 'Failed to delete account. Please try again.');
                                                setIsDeletingAccount(false);
                                            }
                                        }}
                                        disabled={isDeletingAccount}
                                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isDeletingAccount ? (
                                            <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Deleting...</>
                                        ) : 'Yes, Delete My Account'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'profile' && (
                <>
                    {showProfileCompletion ? (
                        <div className="mb-6">
                            <ProfileCompletionForm 
                                user={user} 
                                onSave={handleProfileUpdate}
                                onCancel={() => setShowProfileCompletion(false)}
                                roleContext="client"
                            />
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 sm:flex sm:items-center sm:justify-between bg-gray-50 border-b">
                        <div className="sm:flex sm:items-center sm:space-x-5">
                             <div className="relative">
                                <img className="h-20 w-20 rounded-full object-cover" src={profilePhotoPreview || 'https://avatar.iran.liara.run/public'} alt="Profile" />
                                {isEditingProfile && (
                                    <div className="absolute bottom-0 right-0">
                                        <label htmlFor="profilePhoto-upload" className="cursor-pointer bg-white rounded-full p-1 shadow-md hover:bg-gray-100">
                                            <PencilIcon className="w-4 h-4 text-primary"/>
                                        </label>
                                        <input id="profilePhoto-upload" name="profilePhoto-upload" type="file" className="sr-only" onChange={handleProfileFileChange} />
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 text-center sm:mt-0 sm:text-left">
                                <p className="text-xl font-bold text-gray-900 sm:text-2xl">{profileDisplayName}</p>
                                <p className="text-sm font-medium text-gray-600">{profileFormData.email}</p>
                            </div>
                        </div>
                         <div className="mt-5 flex justify-center sm:mt-0">
                            {isEditingProfile ? (
                                <div className="flex gap-3">
                                    <button onClick={handleCancelProfile} type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleSaveProfile} type="button" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Save Changes</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditingProfile(true)} type="button" className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                    <PencilIcon className="w-4 h-4 text-gray-600"/>
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <dl className="sm:divide-y sm:divide-gray-200">
                            <div className="px-4 sm:px-6">
                                <h3 className="text-lg font-medium text-gray-900 mt-4">Personal Information</h3>
                                <ProfileField label="Full Name" value={profileFormData.fullName} isEditing={isEditingProfile}>{renderValueOrInput('fullName', 'text', { maxLength: 100 })}</ProfileField>
                                
                                <ProfileField label="Phone Country Code" value={profileFormData.phoneCountryCode || '+234'} isEditing={isEditingProfile}>
                                    <select name="phoneCountryCode" value={profileFormData.phoneCountryCode || '+234'} onChange={handleProfileInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-gray-50">
                                        {phoneCodes.map(phone => <option key={phone.code} value={phone.code}>{phone.label}</option>)}
                                    </select>
                                </ProfileField>
                                
                                <ProfileField label="Phone Number" value={profileFormData.phoneNumber} isEditing={isEditingProfile}>{renderValueOrInput('phoneNumber', 'tel', { pattern: "[0-9]{10,11}", title: "Please enter a valid 10 or 11-digit phone number.", minLength: 10, maxLength: 11 })}</ProfileField>
                                <ProfileField label="Address" value={profileFormData.address} isEditing={isEditingProfile}>{isEditingProfile ? <textarea name="address" value={profileFormData.address} onChange={handleProfileInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" rows={3} maxLength={250} /> : profileFormData.address}</ProfileField>
                                
                                <ProfileField label="Country" value={profileFormData.country || 'Nigeria'} isEditing={isEditingProfile}>
                                    <select name="country" value={profileFormData.country || 'Nigeria'} onChange={handleProfileInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                        {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                                    </select>
                                </ProfileField>

                                <ProfileField label="State/Province/Region" value={profileFormData.state} isEditing={isEditingProfile}>
                                    {selectedCountry.states.length > 0 ? (
                                        <select name="state" value={profileFormData.state} onChange={handleProfileInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                            <option value="">Select State/Province/Region</option>
                                            {selectedCountry.states.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="state"
                                            value={profileFormData.state || ''}
                                            onChange={handleProfileInputChange}
                                            placeholder="Enter your state/province/region"
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                        />
                                    )}
                                </ProfileField>

                                <ProfileField label="City/Town" value={profileFormData.city} isEditing={isEditingProfile}>
                                    <input
                                        type="text"
                                        name="city"
                                        value={profileFormData.city || ''}
                                        onChange={handleProfileInputChange}
                                        placeholder="Enter your city/town"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                    />
                                </ProfileField>

                                <ProfileField label="Gender" value={profileFormData.gender} isEditing={isEditingProfile}>
                                    <select name="gender" value={profileFormData.gender} onChange={handleProfileInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </ProfileField>
                            </div>
                           
                            {profileFormData.clientType === 'Company' && (
                                 <div className="px-4 sm:px-6">
                                    <h3 className="text-lg font-medium text-gray-900 mt-6">Company Information</h3>
                                    <ProfileField label="Company Name" value={profileFormData.companyName} isEditing={isEditingProfile}>{renderValueOrInput('companyName', 'text', { maxLength: 100 })}</ProfileField>
                                    <ProfileField label="Company Address" value={profileFormData.companyAddress} isEditing={isEditingProfile}>{isEditingProfile ? <textarea name="companyAddress" value={profileFormData.companyAddress} onChange={handleProfileInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" rows={3} maxLength={250} /> : profileFormData.companyAddress}</ProfileField>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>
                    )}
                </>
            )}

            {activeTab === 'verification' && (
                <VerificationSection 
                    user={user} 
                    onUpload={handleVerificationUpload}
                />
            )}

            {activeTab === 'notifications' && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        🔔 Notifications
                    </h2>
                    <div className="space-y-4">
                        {isFreeUser && (
                            <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <span className="text-2xl flex-shrink-0">✨</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-blue-900">Upgrade to unlock more features</p>
                                    <p className="text-sm text-blue-700 mt-0.5">You're on the Free Plan. Upgrade to post more jobs, access premium verified professionals, and enjoy priority support.</p>
                                    <button onClick={() => onNavigate('subscription')} className="mt-2 text-xs font-bold text-blue-600 hover:underline">View Plans →</button>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">Today</span>
                            </div>
                        )}
                        {isProfileIncomplete && (
                            <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                                <span className="text-2xl flex-shrink-0">📋</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-orange-900">Complete your profile</p>
                                    <p className="text-sm text-orange-700 mt-0.5">Your profile is incomplete. Fill in your details to start searching for professionals and posting jobs.</p>
                                    <button onClick={() => setActiveTab('profile')} className="mt-2 text-xs font-bold text-orange-600 hover:underline">Complete Profile →</button>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">Today</span>
                            </div>
                        )}
                        {!user.isVerified && (
                            <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-100 rounded-lg">
                                <span className="text-2xl flex-shrink-0">🛡️</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-purple-900">Verify your account</p>
                                    <p className="text-sm text-purple-700 mt-0.5">Verified clients get a trust badge and can access more features. Submit your documents to get verified.</p>
                                    <button onClick={() => setActiveTab('verification')} className="mt-2 text-xs font-bold text-purple-600 hover:underline">Start Verification →</button>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">Today</span>
                            </div>
                        )}
                        {!isFreeUser && !isProfileIncomplete && user.isVerified && (
                            <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                                <span className="text-2xl flex-shrink-0">✅</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-green-900">You're all set!</p>
                                    <p className="text-sm text-green-700 mt-0.5">Your account is verified and active. Start searching for professionals or post a job to find the right professional for your needs.</p>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">Today</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

             {bookingToCancel && (<CancellationConfirmationModal booking={bookingToCancel} onClose={() => setBookingToCancel(null)} onConfirm={(id) => { onCancelBooking(id); setBookingToCancel(null); }} />)}
             {bookingToReview && (<ReviewModal booking={bookingToReview} onClose={() => setBookingToReview(null)} onSubmit={(data) => { onReviewSubmit(bookingToReview.id, bookingToReview.cleanerId, data); setBookingToReview(null); }} />)}
             
             {/* Job Management Modals */}
             {jobToViewApplicants && (
                 <JobApplicantsModal 
                     job={jobToViewApplicants}
                     allUsers={jobApplicants}
                     onClose={() => {
                         setJobToViewApplicants(null);
                         setJobApplicants([]);
                     }}
                     onStartChat={handleMessageCleaner}
                     isLoading={isLoadingApplicants}
                 />
             )}
             {jobToEdit && (
                 <EditJobModal 
                     job={jobToEdit}
                     onClose={() => setJobToEdit(null)}
                     onSave={handleEditJob}
                 />
             )}
             {jobToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                     <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                         <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Job</h2>
                         <p className="text-gray-700 mb-6">
                             Are you sure you want to permanently delete <strong>"{jobToDelete.title}"</strong>? 
                             This action cannot be undone.
                         </p>
                         <div className="flex gap-3">
                             <button
                                 onClick={() => setJobToDelete(null)}
                                 className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                             >
                                 Cancel
                             </button>
                             <button
                                 onClick={() => handleDeleteJob(jobToDelete.id)}
                                 className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                             >
                                 Delete Job
                             </button>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};
