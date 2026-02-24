
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Cleaner, User, View, Booking, Review, Receipt, VerificationDocuments, Job } from '../types';
import { SparklesIcon, MapPinIcon, BriefcaseIcon, ChevronDownIcon, StarIcon, CreditCardIcon, UserGroupIcon, ChatBubbleLeftRightIcon, LifebuoyIcon, PencilIcon, UserIcon } from './icons';
import { CleanerCard } from './CleanerCard';
import { getAiRecommendedServices } from '../services/geminiService';
import { CLEANING_SERVICES } from '../constants/services';
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
                        <span className="text-sm text-primary font-medium mt-2 inline-block">Find Cleaners &rarr;</span>
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
    onSelectCleaner: (cleaner: Cleaner) => void;
    initialFilters?: { service: string, location: string, minPrice: string, maxPrice: string, minRating: string } | null;
    clearInitialFilters: () => void;
    onNavigate: (view: View) => void;
    onCancelBooking: (bookingId: string) => void;
    onReviewSubmit: (bookingId: string, cleanerId: string, reviewData: Omit<Review, 'reviewerName'>) => void;
    onApproveJobCompletion: (bookingId: string) => void;
    onUploadBookingReceipt: (bookingId: string, receipt: Receipt) => void;
    onUpdateUser: (user: User) => void;
    onRefreshJobs?: () => Promise<void>;
    appError: string | null;
    initialTab?: 'find' | 'bookings' | 'messages' | 'support' | 'profile' | 'verification' | 'jobs';
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ user, allCleaners, allUsers = [], onSelectCleaner, initialFilters, clearInitialFilters, onNavigate, onCancelBooking, onReviewSubmit, onApproveJobCompletion, onUploadBookingReceipt, onUpdateUser, onRefreshJobs, appError, initialTab }) => {
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [isRecsLoading, setIsRecsLoading] = useState(true);
    
    // Job management state
    const [jobToViewApplicants, setJobToViewApplicants] = useState<Job | null>(null);
    const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
    const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
    const [jobApplicants, setJobApplicants] = useState<User[]>([]);
    const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
    
    // Check if profile is incomplete
    const isProfileIncomplete = !user.userType || !user.phoneNumber || !user.country;
    
    // Set initial tab - if profile is incomplete, always start with profile, otherwise use initialTab or 'find'
    const [activeTab, setActiveTab] = useState<'find' | 'bookings' | 'messages' | 'support' | 'profile' | 'verification' | 'jobs'>(
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bookingIdForUpload, setBookingIdForUpload] = useState<string | null>(null);
    
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

    useEffect(() => {
        setIsRecsLoading(true);
        setRecommendations(getAiRecommendedServices(user));
        setIsRecsLoading(false);
        setProfileFormData(user);
        
        if (user.profilePhoto && user.profilePhoto instanceof File) {
            setProfilePhotoPreview(URL.createObjectURL(user.profilePhoto));
        } else if (typeof user.profilePhoto === 'string') {
             setProfilePhotoPreview(user.profilePhoto);
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
        return allCleaners.filter(cleaner => {
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
    }, [activeFilters, allCleaners, appError]);

    const resultsTitle = useMemo(() => {
        if (activeFilters.service || activeFilters.location || activeFilters.minPrice || activeFilters.maxPrice || activeFilters.minRating) return 'Filtered Results';
        return 'All Available Cleaners';
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

    const handleReceiptUploadClick = (bookingId: string) => {
        setBookingIdForUpload(bookingId);
        fileInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0] && bookingIdForUpload) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    onUploadBookingReceipt(bookingIdForUpload, { name: file.name, dataUrl: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
            setBookingIdForUpload(null);
        }
        if(event.target) {
            event.target.value = '';
        }
    };

    const handleMessageCleaner = async (cleanerId: string, cleanerName: string) => {
        try {
            await apiService.createChat(user.id, cleanerId, user.fullName, cleanerName);
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
             <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" accept="image/*,.pdf" />
             
             {/* Profile Header with Name and Email */}
             <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Profile Avatar */}
                    <div className="flex-shrink-0">
                        {user.profilePicture ? (
                            <img 
                                src={user.profilePicture} 
                                alt="Profile" 
                                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-500">
                                {(displayName || 'U')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-3xl font-bold text-gray-800">
                            {profileDisplayName || displayName || 'User'}
                        </h1>
                        <p className="text-gray-600 text-lg mt-1">{user.email}</p>
                        {user.userType && (
                            <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                {user.userType}
                            </span>
                        )}
                        {user.isVerified && (
                            <span className="inline-block mt-2 ml-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                ✓ Verified
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200 mb-6 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {/* Only show Find a Worker tab if profile is complete */}
                    {!isProfileIncomplete && (
                        <button onClick={() => setActiveTab('find')} className={`${activeTab === 'find' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                            Find a Worker
                        </button>
                    )}
                    <button onClick={() => setActiveTab('bookings')} className={`${activeTab === 'bookings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        My Bookings
                    </button>
                    {!isProfileIncomplete && (
                        <button onClick={() => setActiveTab('jobs')} className={`${activeTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                            <BriefcaseIcon className="w-4 h-4" />
                            Job Listings
                        </button>
                    )}
                    <button onClick={() => setActiveTab('messages')} className={`${activeTab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        Messages
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
                </nav>
            </div>
            
            {/* Profile Completion Banner */}
            {isProfileIncomplete && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <div className="flex items-start">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-800">Welcome! Complete Your Profile</h3>
                            <p className="mt-1 text-sm text-blue-700">
                                Please complete your profile to access all features including search and booking.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setActiveTab('profile');
                                setShowProfileCompletion(true);
                            }}
                            className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                            Complete Profile
                        </button>
                    </div>
                </div>
            )}
            
            {activeTab === 'find' && !isProfileIncomplete && (
                <div>
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold mb-4">Search Workers</h2>
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
                            <p className="mt-4 text-gray-500 bg-white p-6 rounded-lg shadow-sm">No workers found matching your criteria.</p>
                        ) : null }
                    </div>
                </div>
            )}
            
            {activeTab === 'bookings' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-dark mb-4">My Booking History</h2>
                     {user.bookingHistory && user.bookingHistory.length > 0 ? (
                        <ul className="space-y-4">
                            {user.bookingHistory.map((item) => {
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
                                            Message Cleaner
                                         </button>

                                         {item.status === 'Upcoming' && <button onClick={() => setBookingToCancel(item)} className="w-full sm:w-auto text-center bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-red-200">Cancel Booking</button>}
                                         
                                         {item.status === 'Completed' && !item.reviewSubmitted && <button onClick={() => setBookingToReview(item)} className="w-full sm:w-auto text-center bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-yellow-200">Submit Review</button>}
                                         
                                         {item.status === 'Upcoming' && item.paymentMethod === 'Direct' && (
                                            <button onClick={() => onApproveJobCompletion(item.id)} className="w-full sm:w-auto text-center bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-green-700">Mark as Completed</button>
                                         )}

                                         {item.status === 'Upcoming' && item.paymentMethod === 'Escrow' && item.paymentStatus === 'Confirmed' && !item.jobApprovedByClient && <button onClick={() => onApproveJobCompletion(item.id)} className="w-full sm:w-auto text-center bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-green-700">Approve Job Completion</button>}
                                         
                                         {item.paymentMethod === 'Escrow' && item.paymentStatus === 'Pending Payment' && <button onClick={() => handleReceiptUploadClick(item.id)} className="w-full sm:w-auto text-center bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-blue-700">Upload Receipt</button>}
                                    </div>
                                </li>
                                )})}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 py-2">No bookings yet. Time to find a worker!</p>
                    )}
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
                                        To post job listings and connect with skilled workers, you need an active subscription. 
                                        <span className="font-semibold"> Note: </span>All clients can search and book workers directly without subscription.
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
                                        
                                        // Immediately refresh jobs so Worker/Admin dashboards see the new job
                                        if (onRefreshJobs) {
                                            await onRefreshJobs();
                                        }
                                        
                                        formEl.reset();
                                        alert('Job posted successfully! Workers will be able to apply.');
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
                        {user.postedJobs && user.postedJobs.length > 0 ? (
                            <div className="space-y-4">
                                {user.postedJobs.map(job => (
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
                                    <p className="text-sm text-gray-400 mt-2">Post your first job above to connect with skilled workers!</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'messages' && (
                <div className="bg-white p-6 rounded-lg shadow-md min-h-[600px]">
                    <ChatInterface currentUser={user} />
                </div>
            )}

            {activeTab === 'support' && (
                <SupportTicketSection userId={user.id} />
            )}

            {activeTab === 'profile' && (
                <>
                    {showProfileCompletion ? (
                        <div className="mb-6">
                            <ProfileCompletionForm 
                                user={user} 
                                onSave={handleProfileUpdate}
                                onCancel={() => setShowProfileCompletion(false)}
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
