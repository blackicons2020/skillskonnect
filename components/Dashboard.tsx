
import React, { useState, useEffect, useRef } from 'react';
import { User, View, Receipt, VerificationDocuments, Job } from 'types';
import { PencilIcon, StarIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, LifebuoyIcon } from './icons';
import { CLEANING_SERVICES } from '../constants/services';
import { CLIENT_LIMITS } from '../constants/subscriptions';
import { ChatInterface } from './ChatInterface';
import { apiService } from '../services/apiService'; 
import { SupportTicketSection } from './SupportTicketSection';
import { NIGERIA_LOCATIONS } from '../constants/locations';
import { countries, phoneCodes } from '../constants/countries';
import ProfileCompletionForm from './ProfileCompletionForm';
import VerificationSection from './VerificationSection';

interface DashboardProps {
    user: User;
    onUpdateUser: (user: User) => void;
    onNavigate: (view: View) => void;
    onUploadSubscriptionReceipt: (receipt: Receipt) => void;
    initialTab?: 'profile' | 'jobs' | 'reviews' | 'messages' | 'support' | 'verification' | 'listings';
    allJobs?: Job[];
}

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


export const Dashboard: React.FC<DashboardProps> = ({ user, onUpdateUser, onNavigate, onUploadSubscriptionReceipt, initialTab, allJobs = [] }) => {
    // Check if profile is incomplete
    const isProfileIncomplete = !user.userType || !user.phoneNumber || !user.country;
    
    // Default to 'jobs' (My Jobs & Payments) if profile is complete, otherwise 'profile'
    const [activeTab, setActiveTab] = useState<'profile' | 'jobs' | 'reviews' | 'messages' | 'support' | 'verification' | 'listings'>(
        initialTab || (isProfileIncomplete ? 'profile' : 'jobs')
    );
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    
    // Handler for profile updates
    const handleProfileUpdate = async (updates: Partial<User>) => {
        await onUpdateUser({ ...user, ...updates });
        setShowProfileCompletion(false);
    };
    
    // Handler for verification document upload
    const handleVerificationUpload = async (documents: VerificationDocuments) => {
        await onUpdateUser({ ...user, verificationDocuments: documents });
    };
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>(user);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
    const subReceiptInputRef = useRef<HTMLInputElement>(null);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [cities, setCities] = useState<string[]>([]);
    const [selectedCountry, setSelectedCountry] = useState(
        countries.find(c => c.name === (user.country || 'Nigeria')) || countries[0]
    );

    const limit = user.subscriptionTier ? CLIENT_LIMITS[user.subscriptionTier] : 0;
    const currentClientsCount = user.monthlyNewClientsIds?.length || 0;
    const isLimitReached = user.subscriptionTier ? currentClientsCount >= limit : false;


    useEffect(() => {
        // When user data loads, set form data but convert 0s to empty strings for better editing UX
        const safeData = { ...user };
        if (safeData.experience === 0) safeData.experience = '' as any;
        if (safeData.chargeHourly === 0) safeData.chargeHourly = '' as any;
        if (safeData.chargeDaily === 0) safeData.chargeDaily = '' as any;
        if (safeData.chargePerContract === 0) safeData.chargePerContract = '' as any;

        setFormData(safeData); 
        
        if (user.profilePhoto && user.profilePhoto instanceof File) {
            setProfilePhotoPreview(URL.createObjectURL(user.profilePhoto));
        } else if (typeof user.profilePhoto === 'string') {
             setProfilePhotoPreview(user.profilePhoto);
        }

        if (user.subscriptionEndDate) {
            const today = new Date();
            const endDate = new Date(user.subscriptionEndDate);
            today.setHours(0, 0, 0, 0); // Normalize to the start of the day
            const timeDiff = endDate.getTime() - today.getTime();
            const remaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
            setDaysRemaining(remaining);
        } else {
            setDaysRemaining(null);
        }
    }, [user]);

    // Update selected country and phone code when country changes
    useEffect(() => {
        const country = countries.find(c => c.name === formData.country);
        if (country) {
            setSelectedCountry(country);
            setFormData((prev: any) => ({
                ...prev,
                phoneCountryCode: country.phoneCode
            }));
        }
    }, [formData.country]);

    // Update cities when state changes (for Nigeria compatibility)
    useEffect(() => {
        if (formData.country === 'Nigeria' && formData.state) {
            const selectedState = NIGERIA_LOCATIONS.find(s => s.name === formData.state);
            setCities(selectedState ? [...selectedState.towns, 'Other'] : ['Other']);
        } else {
            setCities([]);
        }
    }, [formData.state, formData.country]);

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => {
            const updates: any = { ...prev, [name]: value };
            // If state changes, reset city
            if (name === 'state') {
                updates.city = '';
                updates.otherCity = '';
            }
            return updates;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData((prev: any) => ({...prev, profilePhoto: file }));
            setProfilePhotoPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSave = () => {
        // Comprehensive validation for all required fields
        if (!formData.fullName || formData.fullName.trim().length < 3) {
            alert('Please enter your full name (at least 3 characters).');
            return;
        }

        // Validate phone number (basic validation for international numbers)
        if (formData.phoneNumber && formData.phoneNumber.trim().length < 5) {
            alert('Please enter a valid phone number.');
            return;
        }

        if (!formData.state || formData.state.trim() === '') {
            alert('Please select your state.');
            return;
        }

        if (!formData.city || formData.city.trim() === '') {
            alert('Please select your city/town.');
            return;
        }

        if (formData.city === 'Other' && (!formData.otherCity || formData.otherCity.trim() === '')) {
            alert('Please specify your city/town name.');
            return;
        }

        if (!formData.address || formData.address.trim().length < 10) {
            alert('Please enter your complete address (at least 10 characters).');
            return;
        }

        // Validate required fields for workers
        if (user.role === 'cleaner') {
            if (!formData.experience || Number(formData.experience) < 1) {
                alert('Please enter your years of experience (at least 1 year).');
                return;
            }
            if (Number(formData.experience) > 50) {
                alert('Please enter a realistic number of years of experience (maximum 50 years).');
                return;
            }
            if (!formData.services || formData.services.length === 0) {
                alert('Please select at least one service/skill.');
                return;
            }

            // Validate bank details if provided
            if (formData.bankName || formData.accountNumber) {
                if (!formData.bankName || formData.bankName.trim() === '') {
                    alert('Please enter your bank name.');
                    return;
                }
                // Nigerian bank account numbers are exactly 10 digits
                const accountRegex = /^\d{10}$/;
                if (!formData.accountNumber || !accountRegex.test(formData.accountNumber)) {
                    alert('Please enter a valid Nigerian bank account number (exactly 10 digits).');
                    return;
                }
            }

            // Validate pricing - at least one must be provided
            const hasHourly = formData.chargeHourly && Number(formData.chargeHourly) > 0;
            const hasDaily = formData.chargeDaily && Number(formData.chargeDaily) > 0;
            const hasContract = (formData.chargePerContract && Number(formData.chargePerContract) > 0) || formData.chargePerContractNegotiable;
            
            if (!hasHourly && !hasDaily && !hasContract) {
                alert('Please provide at least one pricing option (hourly, daily, or per contract).');
                return;
            }
        }

        // Validate company-specific fields
        if (formData.cleanerType === 'Company' || formData.clientType === 'Company') {
            if (!formData.companyName || formData.companyName.trim().length < 3) {
                alert('Please enter your company name (at least 3 characters).');
                return;
            }
            if (!formData.companyAddress || formData.companyAddress.trim().length < 10) {
                alert('Please enter your company address (at least 10 characters).');
                return;
            }
        }

        onUpdateUser(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData(user);
        setIsEditing(false);
    };
    
    const handleReceiptUploadClick = () => {
        subReceiptInputRef.current?.click();
    };

    const handleSubReceiptFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    onUploadSubscriptionReceipt({ name: file.name, dataUrl: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
        if(event.target) {
            event.target.value = '';
        }
    };

    const handleMessageClient = async (clientId: string, clientName: string) => {
        try {
            await apiService.createChat(user.id, clientId, user.fullName, clientName);
            setActiveTab('messages');
        } catch (error) {
            alert('Could not start chat. Please try again.');
        }
    };
    
    const renderValueOrInput = (name: keyof User, type: 'text' | 'email' | 'tel' | 'number' = 'text', options: Record<string, any> = {}) => {
        return (
            <input
                type={type}
                name={name}
                id={name}
                value={formData[name] as string || ''}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                {...options}
            />
        );
    };
    
    const locationString = formData.city === 'Other' && formData.otherCity ? `${formData.otherCity}, ${formData.state}` : `${formData.city}, ${formData.state}`;
    
    const reviews = user.reviewsData || [];
    const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
    const avgTimeliness = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.timeliness || 0), 0) / reviews.length : 0;
    const avgThoroughness = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.thoroughness || 0), 0) / reviews.length : 0;
    const avgConduct = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.conduct || 0), 0) / reviews.length : 0;

    const bookings = user.bookingHistory || [];
    const sortedBookings = [...bookings].reverse();

    // Determine the display name (Company Name if applicable, else Full Name for welcome)
    const displayName = user.cleanerType === 'Company' && user.companyName 
        ? user.companyName 
        : user.fullName || 'User';

    // Determine the name to display in profile header
    const profileDisplayName = formData.cleanerType === 'Company' && formData.companyName 
        ? formData.companyName 
        : formData.fullName;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
             <input
                type="file"
                ref={subReceiptInputRef}
                onChange={handleSubReceiptFileSelected}
                className="hidden"
                accept="image/*,.pdf"
            />
            
            {/* Profile Header with Picture */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Profile Picture */}
                    <div className="flex-shrink-0">
                        {user.profilePicture || profilePhotoPreview ? (
                            <img 
                                src={user.profilePicture || profilePhotoPreview || ''} 
                                alt="Profile" 
                                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-500">
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
                            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
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

            {/* Alert for incomplete profile */}
            {isProfileIncomplete && (
                <div className="p-4 rounded-md mb-6 bg-blue-100 border-blue-200 text-blue-800">
                    <h4 className="font-bold">Complete Your Profile</h4>
                    <p className="text-sm">
                        Please complete your profile to get the most out of Skills Konnect. Add your personal information, professional details, and pricing.
                    </p>
                    <div className="mt-2">
                        <button 
                            onClick={() => {
                                setActiveTab('profile');
                                setIsEditing(true);
                            }} 
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700"
                        >
                            Complete Profile Now
                        </button>
                    </div>
                </div>
            )}

             {isLimitReached && (
                <div className="p-4 rounded-md mb-6 bg-red-100 border-red-200 text-red-800">
                    <h4 className="font-bold">Monthly Client Limit Reached!</h4>
                    <p className="text-sm">
                        You have reached your limit of <strong>{limit}</strong> new client{limit !== 1 ? 's' : ''} for this month on the <strong>{user.subscriptionTier}</strong> plan.
                    </p>
                    {user.subscriptionTier === 'Free' && (
                        <div className="mt-2 p-3 bg-red-50 rounded border border-red-300">
                            <p className="text-sm font-semibold mb-2">⚠️ Free Tier Restrictions:</p>
                            <ul className="text-sm space-y-1 list-disc list-inside">
                                <li>Your profile is now hidden from client searches</li>
                                <li>Messaging is disabled</li>
                                <li>You cannot access job listings</li>
                                <li>You cannot accept new bookings</li>
                            </ul>
                        </div>
                    )}
                    <div className="mt-2">
                        <p className="text-sm mb-2">To accept jobs from new clients, please upgrade your plan.</p>
                        <button onClick={() => onNavigate('subscription')} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-700">
                            Upgrade Subscription
                        </button>
                    </div>
                </div>
            )}
            {daysRemaining !== null && daysRemaining <= 7 && user.subscriptionTier !== 'Free' && (
                 <div className={`p-4 rounded-md mb-6 border ${daysRemaining <= 0 ? 'bg-red-100 border-red-200 text-red-800' : 'bg-yellow-100 border-yellow-200 text-yellow-800'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-bold">
                                {daysRemaining <= 0 ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                            </h4>
                            <p className="text-sm">
                                {daysRemaining <= 0
                                    ? 'Your account has been reverted to the Free plan. Renew now to restore your premium features.'
                                    : `Your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Renew now to avoid service interruption.`}
                            </p>
                        </div>
                        <button 
                            onClick={() => onNavigate('subscription')}
                            className={`px-4 py-2 text-sm font-semibold rounded-md shadow-sm ${daysRemaining <= 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                        >
                            Renew Subscription
                        </button>
                    </div>
                </div>
            )}
            {user.pendingSubscription && (
                <div className={`p-4 rounded-md mb-6 ${user.subscriptionReceipt ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <h4 className="font-bold">Subscription Upgrade Pending</h4>
                    <p className="text-sm">
                        Your request to upgrade to the <strong>{user.pendingSubscription}</strong> plan is being processed.
                    </p>
                    {!user.subscriptionReceipt ? (
                        <div className="mt-2">
                             <p className="text-sm mb-2">Please upload your payment receipt to continue.</p>
                             <button onClick={handleReceiptUploadClick} className="bg-yellow-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-yellow-600">
                                Upload Receipt
                             </button>
                        </div>
                    ) : (
                         <p className="text-sm mt-2">Your receipt has been submitted. Your plan will be upgraded upon admin confirmation.</p>
                    )}
                </div>
            )}

            <div className="border-b border-gray-200 mb-6 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        My Profile
                    </button>
                    <button onClick={() => setActiveTab('listings')} className={`${activeTab === 'listings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <BriefcaseIcon className="w-4 h-4" />
                        Job Listings
                    </button>
                    <button onClick={() => setActiveTab('jobs')} className={`${activeTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        My Jobs & Payments
                    </button>
                    <button onClick={() => setActiveTab('reviews')} className={`${activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        My Reviews & Ratings
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`${activeTab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        Messages
                    </button>
                    <button onClick={() => setActiveTab('support')} className={`${activeTab === 'support' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        <LifebuoyIcon className="w-4 h-4" />
                        Support
                    </button>
                    <button onClick={() => setActiveTab('verification')} className={`${activeTab === 'verification' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                        {user.isVerified ? '✓' : '○'} Verification
                    </button>
                </nav>
            </div>
            
            {/* Profile Completion Banner */}
            {isProfileIncomplete && activeTab === 'profile' && !showProfileCompletion && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex items-start">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-yellow-800">Complete Your Profile</h3>
                            <p className="mt-1 text-sm text-yellow-700">
                                Your profile is incomplete. Please fill in all required fields to get started.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowProfileCompletion(true)}
                            className="ml-4 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700"
                        >
                            Complete Now
                        </button>
                    </div>
                </div>
            )}
            
            {showProfileCompletion && (
                <div className="mb-6">
                    <ProfileCompletionForm 
                        user={user} 
                        onSave={handleProfileUpdate}
                        onCancel={() => setShowProfileCompletion(false)}
                    />
                </div>
            )}
            
            {activeTab === 'profile' && !showProfileCompletion && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 sm:flex sm:items-center sm:justify-between bg-gray-50 border-b">
                        <div className="sm:flex sm:items-center sm:space-x-5">
                             <div className="relative">
                                <img className="h-20 w-20 rounded-full object-cover" src={profilePhotoPreview || 'https://avatar.iran.liara.run/public'} alt="Profile" />
                                {isEditing && (
                                    <div className="absolute bottom-0 right-0">
                                        <label htmlFor="profilePhoto-upload" className="cursor-pointer bg-white rounded-full p-1 shadow-md hover:bg-gray-100">
                                            <PencilIcon className="w-4 h-4 text-primary"/>
                                        </label>
                                        <input id="profilePhoto-upload" name="profilePhoto-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 text-center sm:mt-0 sm:text-left">
                                <p className="text-xl font-bold text-gray-900 sm:text-2xl">{profileDisplayName}</p>
                                <p className="text-sm font-medium text-gray-600">{formData.email}</p>
                            </div>
                        </div>
                         <div className="mt-5 flex justify-center sm:mt-0">
                            {isEditing ? (
                                <div className="flex gap-3">
                                    <button onClick={handleCancel} type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleSave} type="button" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Save Changes</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditing(true)} type="button" className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                    <PencilIcon className="w-4 h-4 text-gray-600"/>
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <dl className="sm:divide-y sm:divide-gray-200">
                             <div className="px-4 sm:px-6">
                                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 border-b border-gray-100">
                                    <dt className="text-sm font-medium text-gray-500">Subscription</dt>
                                    <dd className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                                        <div>
                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                                formData.subscriptionTier === 'Premium' ? 'bg-purple-100 text-purple-800' :
                                                formData.subscriptionTier === 'Pro' ? 'bg-indigo-100 text-indigo-800' :
                                                formData.subscriptionTier === 'Standard' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {formData.subscriptionTier} Plan
                                            </span>
                                            {formData.subscriptionEndDate && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Expires on: {new Date(formData.subscriptionEndDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => onNavigate('subscription')} className="font-medium text-primary hover:text-secondary mt-2 sm:mt-0">
                                            Manage Subscription
                                        </button>
                                    </dd>
                                </div>
                            </div>
                            <div className="px-4 sm:px-6">
                                <h3 className="text-lg font-medium text-gray-900 mt-4">Account Information</h3>
                            </div>
                            <div className="px-4 sm:px-6">
                                {formData.role === 'cleaner' ? (
                                    <ProfileField 
                                        label="Account Type" 
                                        value={formData.cleanerType === 'Company' ? 'Worker (Registered Company)' : 'Worker (Individual)'} 
                                        isEditing={isEditing}
                                    >
                                        <select name="cleanerType" value={formData.cleanerType || 'Individual'} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                            <option value="Individual">Worker (Individual)</option>
                                            <option value="Company">Worker (Registered Company)</option>
                                        </select>
                                    </ProfileField>
                                ) : (
                                    <ProfileField label="Account Type" value={formData.clientType === 'Company' ? 'Client (Company)' : 'Client (Individual)'} isEditing={isEditing}>
                                        <select name="clientType" value={formData.clientType || 'Individual'} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                            <option value="Individual">Client (Individual)</option>
                                            <option value="Company">Client (Company)</option>
                                        </select>
                                    </ProfileField>
                                )}
                            </div>
                            <div className="px-4 sm:px-6">
                                <h3 className="text-lg font-medium text-gray-900 mt-4">Personal Information</h3>
                            </div>
                             <div className="px-4 sm:px-6">
                                <ProfileField label="Full Name" value={formData.fullName} isEditing={isEditing}>{renderValueOrInput('fullName', 'text', { maxLength: 100 })}</ProfileField>
                                
                                <ProfileField label="Phone Country Code" value={formData.phoneCountryCode || '+234'} isEditing={isEditing}>
                                    <select name="phoneCountryCode" value={formData.phoneCountryCode || '+234'} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-gray-50">
                                        {phoneCodes.map(phone => <option key={phone.code} value={phone.code}>{phone.label}</option>)}
                                    </select>
                                </ProfileField>
                                
                                <ProfileField label="Phone Number" value={formData.phoneNumber} isEditing={isEditing}>{renderValueOrInput('phoneNumber', 'tel', { pattern: "[0-9]{10,11}", title: "Please enter a valid 10 or 11-digit phone number.", minLength: 10, maxLength: 11 })}</ProfileField>
                                <ProfileField label="Address" value={formData.address} isEditing={isEditing}>{isEditing ? <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" rows={3} maxLength={250} /> : formData.address}</ProfileField>
                                
                                <ProfileField label="Country" value={formData.country || 'Nigeria'} isEditing={isEditing}>
                                    <select name="country" value={formData.country || 'Nigeria'} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                        {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                                    </select>
                                </ProfileField>

                                <ProfileField label="State/Province/Region" value={formData.state} isEditing={isEditing}>
                                    {selectedCountry.states.length > 0 ? (
                                        <select name="state" value={formData.state} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                            <option value="">Select State/Province/Region</option>
                                            {selectedCountry.states.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter your state/province/region"
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                        />
                                    )}
                                </ProfileField>

                                <ProfileField label="City/Town" value={formData.city} isEditing={isEditing}>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter your city/town"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                    />
                                </ProfileField>

                                <ProfileField label="Gender" value={formData.gender} isEditing={isEditing}>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </ProfileField>
                            </div>
                           
                            {formData.cleanerType === 'Company' && (
                                 <div className="px-4 sm:px-6">
                                    <h3 className="text-lg font-medium text-gray-900 mt-6">Company Information</h3>
                                    <ProfileField label="Company Name" value={formData.companyName} isEditing={isEditing}>{renderValueOrInput('companyName', 'text', { maxLength: 100 })}</ProfileField>
                                    <ProfileField label="Company Address" value={formData.companyAddress} isEditing={isEditing}>{isEditing ? <textarea name="companyAddress" value={formData.companyAddress} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" rows={3} maxLength={250} /> : formData.companyAddress}</ProfileField>
                                </div>
                            )}

                            {/* Professional Details - Only for Cleaners */}
                            {formData.role === 'cleaner' && (
                                <>
                                    <div className="px-4 sm:px-6">
                                        <h3 className="text-lg font-medium text-gray-900 mt-6">Professional Details</h3>
                                        
                                        <ProfileField label="Skills Type" value={formData.services} isEditing={isEditing}>
                                            <div className="w-full">
                                                {isEditing && (
                                                    <select
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm mb-2"
                                                        onChange={(e) => {
                                                            const service = e.target.value;
                                                            if (service && !formData.services?.includes(service)) {
                                                                setFormData((prev: any) => ({...prev, services: [...(prev.services || []), service]}));
                                                            }
                                                            e.target.value = "";
                                                        }}
                                                    >
                                                        <option value="">-- Add a skill --</option>
                                                        {CLEANING_SERVICES.filter(s => !formData.services?.includes(s)).map(service => (
                                                            <option key={service} value={service}>{service}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.services && formData.services.length > 0 ? formData.services.map((s: string) => (
                                                        <span key={s} className="flex items-center bg-green-100 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                                                            {s}
                                                            {isEditing && (
                                                                <button 
                                                                    onClick={() => setFormData((prev: any) => ({...prev, services: prev.services?.filter((service: string) => service !== s)}))}
                                                                    className="ml-2 text-primary hover:text-red-500"
                                                                >
                                                                    &times;
                                                                </button>
                                                            )}
                                                        </span>
                                                    )) : <span className="text-sm text-gray-500">No skills selected</span>}
                                                </div>
                                            </div>
                                        </ProfileField>
                                        
                                        <ProfileField label="Years of Experience" value={formData.experience ? `${formData.experience} years` : ''} isEditing={isEditing}>
                                            {renderValueOrInput('experience', 'number', { min: 0, placeholder: 'e.g. 5' })}
                                        </ProfileField>
                                        
                                        <ProfileField label="Professional Experience" value={formData.professionalExperience} isEditing={isEditing}>
                                            {isEditing ? (
                                                <textarea 
                                                    name="professionalExperience" 
                                                    value={formData.professionalExperience || ''} 
                                                    onChange={handleInputChange} 
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                                                    rows={4} 
                                                    maxLength={500}
                                                    placeholder="Describe your professional experience, past roles, and achievements..."
                                                />
                                            ) : (
                                                <div className="text-sm text-gray-900">
                                                    {formData.professionalExperience || 'Not provided'}
                                                </div>
                                            )}
                                        </ProfileField>
                                    </div>

                                    <div className="px-4 sm:px-6">
                                        <h3 className="text-lg font-medium text-gray-900 mt-6">Pricing</h3>
                                        <p className="mt-1 text-sm text-gray-500 mb-4">Set your rates. You can leave fields blank if they don't apply.</p>
                                        
                                        <ProfileField label="Charge per Hour (₦)" value={formData.chargeHourly ? `₦${formData.chargeHourly.toLocaleString()}` : ''} isEditing={isEditing}>
                                            {renderValueOrInput('chargeHourly', 'number', { min: 0, placeholder: 'e.g. 3000' })}
                                        </ProfileField>
                                        
                                        <ProfileField label="Charge per Day (₦)" value={formData.chargeDaily ? `₦${formData.chargeDaily.toLocaleString()}` : ''} isEditing={isEditing}>
                                            {renderValueOrInput('chargeDaily', 'number', { min: 0, placeholder: 'e.g. 15000' })}
                                        </ProfileField>

                                        <ProfileField label="Charge per Contract (₦)" value={formData.chargePerContractNegotiable ? 'Negotiable' : (formData.chargePerContract ? `₦${formData.chargePerContract.toLocaleString()}` : '')} isEditing={isEditing}>
                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="negotiable"
                                                        name="chargePerContractNegotiable"
                                                        checked={formData.chargePerContractNegotiable || false}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData((prev: any) => ({ 
                                                                ...prev, 
                                                                chargePerContractNegotiable: checked,
                                                                chargePerContract: checked ? '' : prev.chargePerContract 
                                                            }));
                                                        }}
                                                        className="h-4 w-4 text-primary focus:ring-secondary border-gray-300 rounded"
                                                    />
                                                    <label htmlFor="negotiable" className="ml-2 block text-sm text-gray-700">Negotiable</label>
                                                </div>
                                                {!formData.chargePerContractNegotiable && (
                                                    <input
                                                        type="number"
                                                        name="chargePerContract"
                                                        value={formData.chargePerContract || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g. 150000"
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                                    />
                                                )}
                                            </div>
                                        </ProfileField>
                                    </div>


                                </>
                            )}
                        </dl>
                    </div>
                </div>
            )}
            
            {activeTab === 'listings' && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6">
                    <h2 className="text-2xl font-bold text-dark mb-6 flex items-center gap-2">
                        <BriefcaseIcon className="w-6 h-6 text-primary"/>
                        Available Job Listings
                    </h2>
                    
                    {/* Subscription Check Banner */}
                    {(!user.subscriptionTier || user.subscriptionTier === 'Free') && (
                        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-semibold text-yellow-800">Subscribe to Apply for Jobs</h3>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Job listings are available to subscribed workers only. Upgrade your subscription to apply for these opportunities.
                                    </p>
                                    <button
                                        onClick={() => onNavigate('subscription')}
                                        className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-yellow-700"
                                    >
                                        View Subscription Plans
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {user.subscriptionTier && user.subscriptionTier !== 'Free' && (
                        <>
                            <div className="mb-6">
                                <p className="text-gray-600">
                                    Browse and apply for jobs posted by clients. Once you apply, clients can review your profile and contact you directly.
                                </p>
                            </div>
                            
                            {/* Search/Filter Section */}
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="Search by service..."
                                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <select className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary">
                                    <option value="">All Locations</option>
                                    {NIGERIA_LOCATIONS.map(loc => (
                                        <option key={loc.name} value={loc.name}>{loc.name}</option>
                                    ))}
                                </select>
                                <select className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary">
                                    <option value="">All Budget Types</option>
                                    <option value="Hourly">Hourly</option>
                                    <option value="Daily">Daily</option>
                                    <option value="Fixed">Fixed Price</option>
                                </select>
                            </div>
                            
                            {/* Job Listings */}
                            <div className="space-y-4">
                                {allJobs && allJobs.length > 0 ? (
                                    allJobs.map(job => {
                                        const hasApplied = user.appliedJobs?.includes(job.id) || false;
                                        const isOwnJob = job.clientId === user.id;
                                        
                                        if (isOwnJob) return null; // Don't show user's own jobs
                                        
                                        return (
                                            <div key={job.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                            {job.title}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mb-3">{job.description}</p>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {job.service}
                                                            </span>
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                {job.status}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-gray-500 block">Posted by:</span>
                                                                <p className="font-medium text-dark">{job.clientName}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Location:</span>
                                                                <p className="font-medium text-dark">{job.city}, {job.state}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Start Date:</span>
                                                                <p className="font-medium text-dark">{new Date(job.startDate).toLocaleDateString()}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Budget:</span>
                                                                <p className="font-medium text-primary">₦{job.budget.toLocaleString()}</p>
                                                                <p className="text-xs text-gray-500">({job.budgetType})</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 text-xs text-gray-500">
                                                            <span>{job.applicants?.length || 0} applicants</span>
                                                            <span className="mx-2">•</span>
                                                            <span>Posted {new Date(job.postedDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 flex flex-col gap-2">
                                                        {hasApplied ? (
                                                            <button
                                                                disabled
                                                                className="bg-gray-300 text-gray-600 px-6 py-2 rounded-lg font-medium cursor-not-allowed"
                                                            >
                                                                Applied ✓
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await apiService.applyToJob(job.id);
                                                                        // Update local user state to reflect the application
                                                                        const updatedUser = {
                                                                            ...user,
                                                                            appliedJobs: [...(user.appliedJobs || []), job.id]
                                                                        };
                                                                        onUpdateUser(updatedUser);
                                                                        alert('Application submitted! The client will review your profile and contact you if interested.');
                                                                    } catch (error: any) {
                                                                        alert(error.message || 'Failed to submit application. Please try again.');
                                                                    }
                                                                }}
                                                                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary font-medium"
                                                            >
                                                                Apply Now
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }).filter(Boolean)
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <BriefcaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-3"/>
                                        <p className="text-gray-600 font-medium">No job listings available at the moment</p>
                                        <p className="text-sm text-gray-500 mt-2">Check back later for new opportunities</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {activeTab === 'jobs' && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6">
                    <h2 className="text-2xl font-bold text-dark mb-6 flex items-center gap-2">
                        <BriefcaseIcon className="w-6 h-6 text-primary"/>
                        My Jobs & Payment History
                    </h2>
                    
                    {sortedBookings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedBookings.map((booking) => (
                                        <tr key={booking.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{booking.clientName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{booking.service}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{booking.date}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-dark">₦{booking.amount.toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                 <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                    booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 flex flex-col">
                                                    <span>Method: {booking.paymentMethod}</span>
                                                    <span className={`text-xs font-bold ${
                                                        booking.paymentStatus === 'Paid' ? 'text-green-600' :
                                                        booking.paymentStatus === 'Confirmed' ? 'text-teal-600' :
                                                        booking.paymentStatus === 'Pending Payout' ? 'text-purple-600' :
                                                        'text-yellow-600'
                                                    }`}>
                                                        {booking.paymentStatus}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button 
                                                    onClick={() => handleMessageClient(booking.clientId, booking.clientName)}
                                                    className="bg-primary text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-secondary flex items-center gap-1"
                                                >
                                                    <ChatBubbleLeftRightIcon className="w-3 h-3" />
                                                    Message
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                         <div className="text-center py-10">
                            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
                            <p className="mt-1 text-sm text-gray-500">When you get booked, your jobs will appear here.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reviews' && (
                 <div className="bg-white rounded-lg shadow-lg p-6">
                     <h2 className="text-2xl font-bold text-dark mb-4">My Reviews & Ratings</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
                        <div className="p-4 bg-light rounded-lg">
                            <p className="text-sm text-gray-500">Overall Rating</p>
                            <div className="flex items-center justify-center mt-1">
                                <StarIcon className="w-6 h-6 text-yellow-400"/>
                                <p className="text-3xl font-bold ml-1">{avgRating.toFixed(1)}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-light rounded-lg">
                            <p className="text-sm text-gray-500">Timeliness</p>
                            <p className="text-3xl font-bold mt-1">{avgTimeliness.toFixed(1)}</p>
                        </div>
                        <div className="p-4 bg-light rounded-lg">
                            <p className="text-sm text-gray-500">Thoroughness</p>
                            <p className="text-3xl font-bold mt-1">{avgThoroughness.toFixed(1)}</p>
                        </div>
                        <div className="p-4 bg-light rounded-lg">
                            <p className="text-sm text-gray-500">Conduct</p>
                            <p className="text-3xl font-bold mt-1">{avgConduct.toFixed(1)}</p>
                        </div>
                     </div>
                     <h3 className="text-xl font-semibold text-dark mb-4">Client Feedback ({reviews.length})</h3>
                      {reviews.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {reviews.map((review, index) => (
                                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{review.reviewerName}</p>
                                        <div className="flex items-center">
                                            <StarIcon className="w-5 h-5 text-yellow-400" />
                                            <span className="ml-1 font-bold">{review.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    {review.comment && <p className="text-sm text-gray-600 mt-2 italic">"{review.comment}"</p>}
                                </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">You have not received any reviews yet.</p>
                      )}
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
            
            {activeTab === 'verification' && (
                <VerificationSection 
                    user={user} 
                    onUpload={handleVerificationUpload}
                />
            )}
        </div>
    );
};
