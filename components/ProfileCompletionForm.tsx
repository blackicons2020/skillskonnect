import { useState, useEffect } from 'react';
import { User, UserType, ChargeRateType } from '../types';
import { countries, phoneCodes, getPricingModel, getCountryCurrency } from '../constants/countries';
import { skillCategories, chargeRateTypes } from '../constants/skillTypes';
import { SearchableSkillSelector } from './SearchableSkillSelector';

interface ProfileCompletionFormProps {
  user: User;
  onSave: (updates: Partial<User>) => Promise<void>;
  onCancel?: () => void;
}

export default function ProfileCompletionForm({ user, onSave, onCancel }: ProfileCompletionFormProps) {
  const [formData, setFormData] = useState<Partial<User>>({
    userType: user.userType,
    fullName: user.fullName || '',
    gender: user.gender,
    phoneCountryCode: user.phoneCountryCode || '+234',
    phoneNumber: user.phoneNumber || '',
    country: user.country || 'Nigeria',
    state: user.state || '',
    city: user.city || '',
    streetAddress: user.streetAddress || '',
    workplaceAddress: user.workplaceAddress || '',
    companyName: user.companyName || '',
    companyRegistrationNumber: user.companyRegistrationNumber || '',
    officeAddress: user.officeAddress || '',
    skillType: user.skillType || [],
    yearsOfExperience: user.yearsOfExperience || 0,
    chargeHourly: user.chargeHourly || 0,
    chargeDaily: user.chargeDaily || 0,
    chargeRate: user.chargeRate || 0,
    chargeRateType: user.chargeRateType || 'Not Fixed',
    profilePicture: user.profilePicture || '',
  });

  const [selectedCountry, setSelectedCountry] = useState(
    countries.find(c => c.name === formData.country) || countries[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update selected country when country changes
  useEffect(() => {
    const country = countries.find(c => c.name === formData.country);
    if (country && country.name !== selectedCountry.name) {
      setSelectedCountry(country);
      // Auto-populate phone code only if it's different
      if (country.phoneCode !== formData.phoneCountryCode) {
        handleChange('phoneCountryCode', country.phoneCode);
      }
      // Reset state and city when country changes
      handleChange('state', '');
      handleChange('city', '');
    }
  }, [formData.country]);

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field: keyof User, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields based on user type
      if (!formData.userType) {
        throw new Error('Please select a user type');
      }

      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const isIndividualClient = formData.userType === 'Client (Individual)';
  const isCompanyClient = formData.userType === 'Client (Registered Company)';
  const isIndividualWorker = formData.userType === 'Worker (Individual)';
  const isCompanyWorker = formData.userType === 'Worker (Registered Company)';
  const isWorker = isIndividualWorker || isCompanyWorker;
  const isClient = isIndividualClient || isCompanyClient;
  const isIndividual = isIndividualClient || isIndividualWorker;
  const isCompany = isCompanyClient || isCompanyWorker;
  const pricingModel = getPricingModel((formData.country as string) || 'Nigeria');
  const countryCurrencySymbol = getCountryCurrency((formData.country as string) || 'Nigeria').symbol;
  const isNegotiable = formData.chargeRateType === 'Not Fixed';

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>
        <p className="text-blue-100 mt-2">Please provide your details to get verified and start connecting.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* User Type Selection */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            I am a... <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.userType || ''}
            onChange={(e) => handleChange('userType', e.target.value as UserType)}
            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            required
          >
            <option value="">Select your role...</option>
            <option value="Client (Individual)">Client (Individual) - I want to hire professionals</option>
            <option value="Client (Registered Company)">Client (Company) - We want to hire professionals</option>
            <option value="Worker (Individual)">Professional (Individual) - I want to offer services</option>
            <option value="Worker (Registered Company)">Professional (Company) - We want to offer services</option>
          </select>
        </div>

        {formData.userType && (
          <>
            {/* Personal/Company Details */}
            {isIndividual && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <h3 className="text-lg font-bold text-gray-800">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName || ''}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      required
                    >
                      <option value="">Select gender...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                  <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {isCompany && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <h3 className="text-lg font-bold text-gray-800">Company Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="e.g. Acme Constructions Ltd."
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number {isCompanyClient && '(Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.companyRegistrationNumber || ''}
                      onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Enter RC or BN number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <h3 className="text-lg font-bold text-gray-800">Contact Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.phoneCountryCode || ''}
                    onChange={(e) => handleChange('phoneCountryCode', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    required
                  >
                    <option value="">Select...</option>
                    {phoneCodes.map(phone => (
                      <option key={phone.code} value={phone.code}>
                        {phone.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber || ''}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    placeholder="e.g. 8012345678"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <h3 className="text-lg font-bold text-gray-800">Location</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.country || ''}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  >
                    <option value="">Select country...</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province <span className="text-red-500">*</span>
                  </label>
                  {selectedCountry.states.length > 0 ? (
                    <select
                      value={formData.state || ''}
                      onChange={(e) => {
                        handleChange('state', e.target.value);
                        handleChange('city', ''); // Reset city when state changes
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      required
                    >
                      <option value="">Select state/province...</option>
                      {selectedCountry.states.map(state => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Enter state/province"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City/Town <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    placeholder="Enter city"
                    required
                  />
                </div>

                {isIndividual && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.streetAddress || ''}
                        onChange={(e) => handleChange('streetAddress', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        placeholder="House number and street name"
                        required
                      />
                    </div>

                    {isIndividualClient && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Place Address <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.workplaceAddress || ''}
                          onChange={(e) => handleChange('workplaceAddress', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                          placeholder="Where do you work?"
                        />
                      </div>
                    )}
                  </>
                )}

                {isCompany && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.officeAddress || ''}
                      onChange={(e) => handleChange('officeAddress', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Full office address"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Professional Details (Workers only) */}
            {isWorker && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <h3 className="text-lg font-bold text-gray-800">Professional Expertise</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills & Services <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Select based on your expertise)</span>
                  </label>
                  <SearchableSkillSelector
                    selectedSkills={Array.isArray(formData.skillType) ? formData.skillType : []}
                    onChange={(newSkills) => handleChange('skillType', newSkills)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Select all skills that apply. You can search by name.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.yearsOfExperience || ''}
                    onChange={(e) => handleChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    placeholder="e.g. 5"
                    min="0"
                    required
                  />
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Pricing Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Rate input — shown per country pricing convention */}
                    {pricingModel === 'hourly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hourly Rate ({countryCurrencySymbol}) {!isNegotiable && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          value={formData.chargeHourly || ''}
                          onChange={(e) => handleChange('chargeHourly', parseFloat(e.target.value) || 0)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isNegotiable}
                          required={!isNegotiable}
                        />
                      </div>
                    )}
                    {pricingModel === 'daily' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Daily Rate ({countryCurrencySymbol}) {!isNegotiable && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          value={formData.chargeDaily || ''}
                          onChange={(e) => handleChange('chargeDaily', parseFloat(e.target.value) || 0)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={isNegotiable}
                          required={!isNegotiable}
                        />
                      </div>
                    )}
                    {pricingModel === 'negotiable' && (
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-gray-700">
                            In your region, prices are typically varying by job type. You can set specific rates later or negotiate directly with clients.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Negotiable toggle (available for hourly and daily countries too) */}
                    {pricingModel !== 'negotiable' && (
                      <div className="flex items-center h-full pt-4 md:pt-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={isNegotiable}
                              onChange={(e) => {
                                handleChange('chargeRateType', e.target.checked ? 'Not Fixed' : (pricingModel === 'hourly' ? 'Per Hour' : 'Per Day'));
                                if (e.target.checked) {
                                  handleChange('chargeHourly', 0);
                                  handleChange('chargeDaily', 0);
                                }
                              }}
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                            Price is Negotiable (Recommended for new profiles)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Picture Upload */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                    <h4 className="font-semibold text-gray-800">Profile Photo</h4>
                    <p className="text-sm text-gray-500 mt-1">First impressions matter. Upload a clear photo.</p>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-shrink-0">
                        {formData.profilePicture ? (
                          <div className="relative group">
                            <img
                              src={formData.profilePicture}
                              alt="Profile Preview"
                              className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-md ring-1 ring-gray-200"
                            />
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-xs font-medium">Change</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 w-full">
                        <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:bg-blue-50 transition-all cursor-pointer bg-blue-50/30">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload('profilePicture', file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            // If no picture, make it required visually or functionally
                            // But maybe we don't want to force it if editing
                          />
                          <div className="relative z-0 pointer-events-none">
                            <svg className="mx-auto h-10 w-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-semibold text-blue-600">Click to upload photo</p>
                            <p className="text-xs text-gray-500 mt-1">MAX 2MB • JPG, PNG</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 font-medium text-gray-700 transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-8 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Profile...
                  </span>
                ) : 'Complete Profile & Continue'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
