
import React, { useState, useEffect } from 'react';
import { User, UserRole, View } from '../types';
import { NIGERIA_LOCATIONS } from '../constants/locations';
import { CLEANING_SERVICES } from '../constants/services';
import { apiService } from '../services/apiService';

interface SetupProfileProps {
    user: User;
    onSave: (updatedUser: User) => void;
    onNavigate: (view: View) => void;
}

type UserKind = 'Client (Individual)' | 'Client (Company)' | 'Cleaner (Individual)' | 'Cleaner (Company)' | '';

const FormSection: React.FC<{ title: string; children: React.ReactNode; description?: string }> = ({ title, description, children }) => (
    <div className="pt-8">
        <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">{children}</div>
    </div>
);

export const SetupProfile: React.FC<SetupProfileProps> = ({ user, onSave, onNavigate }) => {
    const [userKind, setUserKind] = useState<UserKind>('');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        gender: user.gender || 'Male',
        state: user.state || '',
        city: user.city || '',
        otherCity: user.otherCity || '',
        address: user.address || '',
        companyName: user.companyName || '',
        companyAddress: user.companyAddress || '',
        experience: '',
        bio: user.bio || '',
        chargeHourly: '',
        chargeDaily: '',
        chargePerContract: '',
        bankName: user.bankName || '',
        accountNumber: user.accountNumber || '',
    });
    const [selectedServices, setSelectedServices] = useState<string[]>(user.services || []);
    const [chargePerContractNegotiable, setChargePerContractNegotiable] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
    const [businessRegFile, setBusinessRegFile] = useState<File | null>(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [cities, setCities] = useState<string[]>([]);

    useEffect(() => {
        if (formData.state) {
            const selectedState = NIGERIA_LOCATIONS.find(s => s.name === formData.state);
            setCities(selectedState ? [...selectedState.towns, 'Other'] : ['Other']);
            setFormData(prev => ({ ...prev, city: '' }));
        } else {
            setCities([]);
        }
    }, [formData.state]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceToggle = (service: string) => {
        setSelectedServices(prev =>
            prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'photo' | 'governmentId' | 'businessReg') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (fileType === 'photo') {
                setProfilePhoto(file);
                setProfilePhotoPreview(URL.createObjectURL(file));
            } else if (fileType === 'governmentId') {
                setGovernmentIdFile(file);
            } else {
                setBusinessRegFile(file);
            }
        }
    };

    const handleSkip = () => {
        // For workers, require minimum profile data before skipping
        if (userKind.includes('Cleaner')) {
            alert('Workers must complete their profile (name, experience, and at least one service) to be visible to clients. Please fill out the required fields.');
            return;
        }
        // Navigate to dashboard based on role or default to client
        const dest = user.role === 'cleaner' ? 'cleanerDashboard' : 'clientDashboard';
        onNavigate(dest);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms) {
            alert('You must agree to the terms and conditions.');
            return;
        }
        if (!userKind) {
            alert('Please select your user type.');
            return;
        }

        // Comprehensive validation for all required fields
        if (!formData.fullName || formData.fullName.trim().length < 3) {
            alert('Please enter your full name (at least 3 characters).');
            return;
        }

        // Validate phone number (basic validation for international numbers)
        if (!formData.phoneNumber || formData.phoneNumber.trim().length < 5) {
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

        // Validate worker-specific requirements
        if (userKind.includes('Cleaner')) {
            if (!formData.experience || Number(formData.experience) < 1) {
                alert('Please enter your years of experience (at least 1 year).');
                return;
            }
            if (Number(formData.experience) > 50) {
                alert('Please enter a realistic number of years of experience (maximum 50 years).');
                return;
            }
            if (selectedServices.length === 0) {
                alert('Please select at least one service/skill from the dropdown menu.');
                return;
            }
            if (!profilePhoto) {
                alert('Please upload a profile photo to be visible to clients.');
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
            const hasContract = (formData.chargePerContract && Number(formData.chargePerContract) > 0) || chargePerContractNegotiable;
            
            if (!hasHourly && !hasDaily && !hasContract) {
                alert('Please provide at least one pricing option (hourly, daily, or per contract).');
                return;
            }
        }

        // Validate company-specific fields
        const isCompany = userKind.includes('Company');
        if (isCompany) {
            if (!formData.companyName || formData.companyName.trim().length < 3) {
                alert('Please enter your company name (at least 3 characters).');
                return;
            }
            if (!formData.companyAddress || formData.companyAddress.trim().length < 10) {
                alert('Please enter your company address (at least 10 characters).');
                return;
            }
            if (userKind.includes('Cleaner') && !businessRegFile) {
                alert('Please upload your business registration document.');
                return;
            }
        }

        setIsSaving(true);
        try {
            const isCleaner = userKind.includes('Cleaner');
            const isCompany = userKind.includes('Company');
            const role: UserRole = isCleaner ? 'cleaner' : 'client';
            const cleanerType = isCleaner ? (isCompany ? 'Company' : 'Individual') : undefined;
            const clientType = !isCleaner ? (isCompany ? 'Company' : 'Individual') : undefined;

            const updatedData: Partial<User> = {
                role,
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                gender: formData.gender as 'Male' | 'Female' | 'Other',
                state: formData.state,
                city: formData.city,
                otherCity: formData.city === 'Other' ? formData.otherCity : undefined,
                address: formData.address,
                clientType,
                companyName: isCompany ? formData.companyName : undefined,
                companyAddress: isCompany ? formData.companyAddress : undefined,
                cleanerType,
                experience: isCleaner && formData.experience ? Number(formData.experience) : undefined,
                services: isCleaner ? selectedServices : undefined,
                bio: isCleaner ? formData.bio : undefined,
                profilePhoto: isCleaner ? (profilePhoto || undefined) : undefined,
                businessRegDoc: isCleaner && isCompany ? (businessRegFile || undefined) : undefined,
                governmentId: governmentIdFile || undefined,
                chargeHourly: isCleaner && formData.chargeHourly ? Number(formData.chargeHourly) : undefined,
                chargeDaily: isCleaner && formData.chargeDaily ? Number(formData.chargeDaily) : undefined,
                chargePerContract: isCleaner && !chargePerContractNegotiable && formData.chargePerContract ? Number(formData.chargePerContract) : undefined,
                chargePerContractNegotiable: isCleaner ? chargePerContractNegotiable : undefined,
                bankName: isCleaner ? formData.bankName : undefined,
                accountNumber: isCleaner ? formData.accountNumber : undefined,
            };

            const savedUser = await apiService.updateUser(updatedData);
            alert('Profile saved successfully!');
            onSave(savedUser);
            onNavigate(isCleaner ? 'cleanerDashboard' : 'clientDashboard');
        } catch (error: any) {
            alert(`Failed to save profile: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = () => {
        if (!userKind || !formData.fullName || !formData.phoneNumber || !formData.state || !formData.city || !formData.address) return false;
        if (!agreedToTerms) return false;
        if (formData.city === 'Other' && !formData.otherCity) return false;

        const isCompany = userKind.includes('Company');
        if (isCompany && (!formData.companyName || !formData.companyAddress)) return false;

        const isCleaner = userKind.includes('Cleaner');
        if (isCleaner) {
            const cleanerFields = formData.experience && Number(formData.experience) > 0 && selectedServices.length > 0 && formData.bio && profilePhoto &&
                (Number(formData.chargeHourly) > 0 || Number(formData.chargeDaily) > 0 || Number(formData.chargePerContract) > 0 || chargePerContractNegotiable);
            if (!cleanerFields) return false;
            if (isCompany && !businessRegFile) return false;
        }
        return true;
    };

    return (
        <div className="bg-light min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-dark">Welcome to Skills Konnect! 🎉</h1>
                    <p className="mt-2 text-gray-600">Let's set up your profile. You can also skip this and do it later from your dashboard.</p>
                </div>

                <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-dark">
                            Setup Your {userKind ? `${userKind} ` : ''}Profile
                        </h2>
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="text-sm text-gray-500 hover:text-primary underline"
                        >
                            Skip for now →
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
                        <FormSection title="Account Type & Personal Information" description="Start by telling us who you are.">
                            <div className="sm:col-span-6">
                                <label htmlFor="userKind" className="block text-sm font-medium text-gray-700">Kind of User *</label>
                                <select
                                    id="userKind"
                                    value={userKind}
                                    onChange={(e) => setUserKind(e.target.value as UserKind)}
                                    required
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
                                >
                                    <option value="" disabled>Select your user type...</option>
                                    <option value="Client (Individual)">Client (Individual)</option>
                                    <option value="Client (Company)">Client (Company)</option>
                                    <option value="Cleaner (Individual)">Cleaner (Individual)</option>
                                    <option value="Cleaner (Company)">Cleaner (Company)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name *</label>
                                <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleInputChange} required maxLength={100} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                            </div>
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input type="email" value={user.email} disabled className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-800 text-gray-400" />
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number *</label>
                                <input type="tel" name="phoneNumber" id="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required pattern="[0-9]{10,11}" title="Please enter a valid 10 or 11-digit phone number." minLength={10} maxLength={11} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                                <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light">
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="state" className="block text-sm font-medium text-gray-700">State *</label>
                                <select id="state" name="state" value={formData.state} onChange={handleInputChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light">
                                    <option value="">Select State</option>
                                    {NIGERIA_LOCATIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700">City/Town *</label>
                                <select id="city" name="city" value={formData.city} onChange={handleInputChange} required disabled={cities.length === 0} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light disabled:bg-gray-800 disabled:text-gray-400">
                                    <option value="">Select City</option>
                                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {formData.city === 'Other' && (
                                <div className="sm:col-span-3">
                                    <label htmlFor="otherCity" className="block text-sm font-medium text-gray-700">Please specify your City/Town *</label>
                                    <input type="text" name="otherCity" id="otherCity" value={formData.otherCity} onChange={handleInputChange} required maxLength={50} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                                </div>
                            )}
                            <div className="sm:col-span-6">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Personal/Residential Address *</label>
                                <textarea name="address" id="address" value={formData.address} onChange={handleInputChange} required rows={3} maxLength={250} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400"></textarea>
                            </div>
                        </FormSection>

                        {userKind.includes('Company') && (
                            <FormSection title="Company Information" description="Please provide the details of your company.">
                                <div className="sm:col-span-6">
                                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name *</label>
                                    <input type="text" name="companyName" id="companyName" value={formData.companyName} onChange={handleInputChange} required maxLength={100} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                                </div>
                                <div className="sm:col-span-6">
                                    <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Company Address *</label>
                                    <textarea name="companyAddress" id="companyAddress" value={formData.companyAddress} onChange={handleInputChange} required rows={3} maxLength={250} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400"></textarea>
                                </div>
                            </FormSection>
                        )}

                        {userKind.includes('Cleaner') && (
                            <>
                                <FormSection title="Professional Profile" description="This information will be displayed publicly on your profile.">
                                    <div className="sm:col-span-6">
                                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio *</label>
                                        <textarea name="bio" id="bio" value={formData.bio} onChange={handleInputChange} required rows={3} maxLength={300} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" placeholder="Tell clients a bit about yourself and your experience."></textarea>
                                        <p className="mt-2 text-sm text-gray-500">Max 300 characters.</p>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Years of Experience *</label>
                                        <input type="number" name="experience" id="experience" value={formData.experience} onChange={handleInputChange} required min="0" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" placeholder="e.g., 5" />
                                    </div>
                                </FormSection>

                                <FormSection title="Pricing">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="chargeHourly" className="block text-sm font-medium text-gray-700">Charge per Hour (₦)</label>
                                        <input type="number" name="chargeHourly" id="chargeHourly" value={formData.chargeHourly} onChange={handleInputChange} min="0" placeholder="e.g., 3000" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="chargeDaily" className="block text-sm font-medium text-gray-700">Charge per Day (₦)</label>
                                        <input type="number" name="chargeDaily" id="chargeDaily" value={formData.chargeDaily} onChange={handleInputChange} min="0" placeholder="e.g., 20000" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="chargePerContract" className="block text-sm font-medium text-gray-700">Charge per Contract</label>
                                        <input type="number" name="chargePerContract" id="chargePerContract" placeholder="e.g., 150000" value={formData.chargePerContract} onChange={handleInputChange} disabled={chargePerContractNegotiable} min="0" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400 disabled:bg-gray-800" />
                                        <div className="mt-2 flex items-center">
                                            <input id="negotiable" name="negotiable" type="checkbox" checked={chargePerContractNegotiable} onChange={(e) => { setChargePerContractNegotiable(e.target.checked); if (e.target.checked) setFormData(prev => ({ ...prev, chargePerContract: '' })); }} className="h-4 w-4 text-primary focus:ring-secondary border-gray-300 rounded" />
                                            <label htmlFor="negotiable" className="ml-2 block text-sm text-gray-700">Negotiable</label>
                                        </div>
                                    </div>
                                </FormSection>

                                <div className="pt-8">
                                    <h3 className="text-lg font-medium text-gray-900">Services Offered</h3>
                                    <p className="mt-1 text-sm text-gray-500">Select all services you provide.</p>
                                    <div className="mt-4">
                                        <select
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
                                            onChange={(e) => {
                                                const service = e.target.value;
                                                if (service && !selectedServices.includes(service)) setSelectedServices([...selectedServices, service]);
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">-- Choose a service to add --</option>
                                            {CLEANING_SERVICES.filter(s => !selectedServices.includes(s)).map(service => (
                                                <option key={service} value={service}>{service}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {selectedServices.map(service => (
                                            <div key={service} className="flex items-center bg-green-100 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                                                <span>{service}</span>
                                                <button type="button" onClick={() => handleServiceToggle(service)} className="ml-2 h-4 w-4 rounded-full text-primary hover:bg-green-200">
                                                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <FormSection title="Bank Details" description="For receiving payments from clients.">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name *</label>
                                        <input type="text" name="bankName" id="bankName" value={formData.bankName} onChange={handleInputChange} required maxLength={50} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">Account Number *</label>
                                        <input type="text" name="accountNumber" id="accountNumber" value={formData.accountNumber} onChange={handleInputChange} required pattern="[0-9]{10}" title="Please enter your 10-digit NUBAN account number." minLength={10} maxLength={10} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400" />
                                    </div>
                                </FormSection>
                            </>
                        )}

                        <FormSection title="Verification & Document Uploads" description="These documents are required for account verification and will not be shared publicly.">
                            <div className="sm:col-span-6">
                                <label htmlFor="governmentId" className="block text-sm font-medium text-gray-700">
                                    Government ID (Driver's Licence, International Passport, or Voter's Card) *
                                </label>
                                <input type="file" name="governmentId" id="governmentId" onChange={(e) => handleFileChange(e, 'governmentId')} required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100" />
                                <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG up to 5MB.</p>
                            </div>
                            {userKind.includes('Cleaner') && (
                                <>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Profile Photo *</label>
                                        <div className="mt-1 flex items-center">
                                            <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                                                {profilePhotoPreview
                                                    ? <img src={profilePhotoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                                                    : <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                }
                                            </span>
                                            <input type="file" onChange={(e) => handleFileChange(e, 'photo')} required accept="image/*" className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50" />
                                        </div>
                                    </div>
                                    {userKind === 'Cleaner (Company)' && (
                                        <div className="sm:col-span-6">
                                            <label htmlFor="businessRegDoc" className="block text-sm font-medium text-gray-700">CAC Business Registration *</label>
                                            <input type="file" name="businessRegDoc" id="businessRegDoc" onChange={(e) => handleFileChange(e, 'businessReg')} required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100" />
                                        </div>
                                    )}
                                </>
                            )}
                        </FormSection>

                        <div className="pt-5">
                            <div className="flex items-start">
                                <input id="terms" name="terms" type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="h-4 w-4 text-primary focus:ring-secondary border-gray-300 rounded" />
                                <div className="ml-3 text-sm">
                                    <label htmlFor="terms" className="font-medium text-gray-700">I agree to the <a href="#" className="text-primary hover:underline">Terms and Conditions</a></label>
                                </div>
                            </div>
                            <div className="flex justify-between mt-4">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Skip for now
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isFormValid() || isSaving}
                                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
