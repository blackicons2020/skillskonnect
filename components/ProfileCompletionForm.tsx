import { useState, useEffect } from 'react';
import { User, UserType, ChargeRateType } from '../types';
import { countries, phoneCodes, getPricingModel, getCountryCurrency } from '../constants/countries';
import { skillCategories, chargeRateTypes } from '../constants/skillTypes';
import { SearchableSkillSelector } from './SearchableSkillSelector';

interface ProfileCompletionFormProps {
  user: User;
  onSave: (updates: Partial<User>) => Promise<void>;
  onCancel?: () => void;
  roleContext?: 'client' | 'worker';
}

export default function ProfileCompletionForm({ user, onSave, onCancel, roleContext }: ProfileCompletionFormProps) {
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
    professionalExperience: user.professionalExperience || '',
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Update selected country when country changes
  useEffect(() => {
    const country = countries.find(c => c.name === formData.country);
    if (country && country.name !== selectedCountry.name) {
      setSelectedCountry(country);
      if (country.phoneCode !== formData.phoneCountryCode) {
        handleChange('phoneCountryCode', country.phoneCode);
      }
      handleChange('state', '');
      handleChange('city', '');
    }
  }, [formData.country]);

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleFileUpload = (field: keyof User, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, [field]: 'File must be under 2MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };
    reader.readAsDataURL(file);
  };

  // Returns a map of field → error message. Empty map = valid.
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const isIndividualC = formData.userType === 'Client (Individual)';
    const isCompanyC = formData.userType === 'Client (Registered Company)';
    const isIndividualW = formData.userType === 'Worker (Individual)';
    const isCompanyW = formData.userType === 'Worker (Registered Company)';
    const isW = isIndividualW || isCompanyW;
    const isIndiv = isIndividualC || isIndividualW;
    const isComp = isCompanyC || isCompanyW;

    if (!formData.userType) {
      errs.userType = 'Please select your role.';
    }

    // Personal info
    if (isIndiv) {
      const name = (formData.fullName || '').trim();
      if (!name) errs.fullName = 'Full name is required.';
      else if (name.length < 3) errs.fullName = 'Full name must be at least 3 characters.';
      else if (name.length > 100) errs.fullName = 'Full name must be 100 characters or fewer.';
      else if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/.test(name)) errs.fullName = 'Full name must contain only letters, spaces, hyphens, or apostrophes.';

      if (!formData.gender) errs.gender = 'Please select your gender.';
    }

    // Company info
    if (isComp) {
      const cName = (formData.companyName || '').trim();
      if (!cName) errs.companyName = 'Company name is required.';
      else if (cName.length < 2) errs.companyName = 'Company name must be at least 2 characters.';
      else if (cName.length > 100) errs.companyName = 'Company name must be 100 characters or fewer.';
    }

    // Phone
    if (!formData.phoneCountryCode) errs.phoneCountryCode = 'Please select a country code.';
    const phone = (formData.phoneNumber || '').trim().replace(/[\s\-\(\)]/g, '');
    if (!phone) errs.phoneNumber = 'Phone number is required.';
    else if (!/^\d+$/.test(phone)) errs.phoneNumber = 'Phone number must contain digits only (no spaces, dashes, or letters).';
    else if (phone.length < 5) errs.phoneNumber = 'Phone number is too short (minimum 5 digits).';
    else if (phone.length > 15) errs.phoneNumber = 'Phone number is too long (maximum 15 digits).';

    // Location
    if (!formData.country) errs.country = 'Please select your country.';
    if (!formData.state || !(formData.state as string).trim()) errs.state = 'Please select or enter your state/province.';
    if (!formData.city || !(formData.city as string).trim()) errs.city = 'Please enter your city/town.';
    else if ((formData.city as string).trim().length < 2) errs.city = 'City/town name must be at least 2 characters.';

    if (isIndiv) {
      const addr = (formData.streetAddress || '').trim();
      if (!addr) errs.streetAddress = 'Street address is required.';
      else if (addr.length < 5) errs.streetAddress = 'Please enter a complete street address (at least 5 characters).';
    }

    if (isComp) {
      const oAddr = (formData.officeAddress || '').trim();
      if (!oAddr) errs.officeAddress = 'Office address is required.';
      else if (oAddr.length < 5) errs.officeAddress = 'Please enter a complete office address (at least 5 characters).';
    }

    // Worker-specific
    if (isW) {
      const skills = Array.isArray(formData.skillType) ? formData.skillType : [];
      if (skills.length === 0) errs.skillType = 'Please select at least one skill or service.';

      const exp = Number(formData.yearsOfExperience);
      if (formData.yearsOfExperience === undefined || formData.yearsOfExperience === null || (formData.yearsOfExperience as any) === '') {
        errs.yearsOfExperience = 'Years of experience is required.';
      } else if (isNaN(exp) || exp < 0) {
        errs.yearsOfExperience = 'Years of experience must be 0 or more.';
      } else if (exp > 60) {
        errs.yearsOfExperience = 'Please enter a realistic value (maximum 60 years).';
      }
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please fix the errors highlighted below before submitting.');
      // Scroll to first error
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(`pcf-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      // Normalise phone: strip formatting, store digits only
      const cleanPhone = (formData.phoneNumber || '').replace(/[\s\-\(\)]/g, '');
      await onSave({ ...formData, phoneNumber: cleanPhone });
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // Helper: red border + message under a field
  const fe = (field: string) => fieldErrors[field]
    ? <p className="mt-1 text-xs text-red-600">{fieldErrors[field]}</p>
    : null;
  const fc = (field: string) => fieldErrors[field]
    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

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

  // Countries in Africa, Asia, and South America — charge per day field is hidden for workers
  const REMOVE_DAILY_CHARGE_COUNTRIES = new Set([
    // Africa
    'Nigeria', 'South Africa', 'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia',
    'Ghana', 'Zimbabwe', 'Zambia', 'Mozambique', 'Namibia', 'Botswana',
    'Malawi', 'Madagascar', 'Mauritius', 'Seychelles',
    'Cameroon', 'Ivory Coast', 'Senegal', 'Mali', 'Burkina Faso', 'Niger',
    'Togo', 'Benin', 'Guinea-Bissau', 'Guinea', 'Chad', 'Gabon',
    'Congo (Republic)', 'Congo (DRC)', 'Equatorial Guinea', 'Central African Republic',
    'Angola', 'Liberia', 'Sierra Leone', 'Gambia', 'Eswatini', 'Lesotho',
    'Djibouti', 'Eritrea', 'Somalia', 'Comoros', 'Cape Verde', 'Burundi',
    'Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'South Sudan',
    // Asia (South, East, Southeast, Central, Middle East)
    'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan',
    'Philippines', 'Indonesia', 'Vietnam', 'Thailand', 'Malaysia', 'Myanmar',
    'Cambodia', 'Laos', 'Timor-Leste', 'Mongolia', 'China',
    'Jordan', 'Palestine', 'Lebanon', 'Iraq', 'Iran', 'Syria', 'Yemen', 'Turkey',
    'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Uzbekistan', 'Turkmenistan',
    // South America / Latin America / Caribbean
    'Mexico', 'Brazil', 'Colombia', 'Argentina', 'Chile', 'Peru', 'Venezuela',
    'Bolivia', 'Ecuador', 'Paraguay', 'Uruguay', 'Guyana', 'Suriname',
    'Costa Rica', 'Panama', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua',
    'Dominican Republic', 'Jamaica', 'Trinidad and Tobago', 'Haiti', 'Cuba',
  ]);
  const effectivePricingModel = (pricingModel === 'daily' && REMOVE_DAILY_CHARGE_COUNTRIES.has((formData.country as string) || ''))
    ? 'negotiable'
    : pricingModel;

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
            id="pcf-userType"
            value={formData.userType || ''}
            onChange={(e) => handleChange('userType', e.target.value as UserType)}
            className={`w-full p-3 bg-white border rounded-lg focus:ring-2 transition-shadow ${fc('userType')}`}
            required
          >
            <option value="">Select your account type...</option>
            {(!roleContext || roleContext === 'client') && (
              <>
                <option value="Client (Individual)">Client (Individual) - I want to hire professionals</option>
                <option value="Client (Registered Company)">Client (Registered Company) - We want to hire professionals</option>
              </>
            )}
            {(!roleContext || roleContext === 'worker') && (
              <>
                <option value="Worker (Individual)">Professional (Individual) - I want to offer services</option>
                <option value="Worker (Registered Company)">Professional (Registered Company) - We want to offer services</option>
              </>
            )}
          </select>
          {fe('userType')}
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
                      id="pcf-fullName"
                      type="text"
                      value={formData.fullName || ''}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('fullName')}`}
                      placeholder="e.g. John Doe"
                      maxLength={100}
                      required
                    />
                    {fe('fullName')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="pcf-gender"
                      value={formData.gender || ''}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 bg-white ${fc('gender')}`}
                      required
                    >
                      <option value="">Select gender...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {fe('gender')}
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
                      id="pcf-companyName"
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('companyName')}`}
                      placeholder="e.g. Acme Constructions Ltd."
                      maxLength={100}
                      required
                    />
                    {fe('companyName')}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number {isCompanyClient && '(Optional)'}
                    </label>
                    <input
                      id="pcf-companyRegistrationNumber"
                      type="text"
                      value={formData.companyRegistrationNumber || ''}
                      onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Enter RC or BN number"
                      maxLength={50}
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
                    id="pcf-phoneCountryCode"
                    value={formData.phoneCountryCode || ''}
                    onChange={(e) => handleChange('phoneCountryCode', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 bg-gray-50 ${fc('phoneCountryCode')}`}
                    required
                  >
                    <option value="">Select...</option>
                    {phoneCodes.map(phone => (
                      <option key={phone.code} value={phone.code}>
                        {phone.label}
                      </option>
                    ))}
                  </select>
                  {fe('phoneCountryCode')}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pcf-phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    value={formData.phoneNumber || ''}
                    onChange={(e) => {
                      // Only allow digits, spaces, dashes, parentheses
                      const val = e.target.value.replace(/[^0-9\s\-\(\)]/g, '');
                      handleChange('phoneNumber', val);
                    }}
                    className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('phoneNumber')}`}
                    placeholder="e.g. 8012345678"
                    minLength={5}
                    maxLength={20}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">Digits only, 5–15 numbers.</p>
                  {fe('phoneNumber')}
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
                    id="pcf-country"
                    value={formData.country || ''}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 bg-white ${fc('country')}`}
                    required
                  >
                    <option value="">Select country...</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {fe('country')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province <span className="text-red-500">*</span>
                  </label>
                  {selectedCountry.states.length > 0 ? (
                    <select
                      id="pcf-state"
                      value={formData.state || ''}
                      onChange={(e) => {
                        handleChange('state', e.target.value);
                        handleChange('city', '');
                      }}
                      className={`w-full p-3 border rounded-lg focus:ring-2 bg-white ${fc('state')}`}
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
                      id="pcf-state"
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('state')}`}
                      placeholder="Enter state/province"
                      maxLength={100}
                      required
                    />
                  )}
                  {fe('state')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City/Town <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pcf-city"
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('city')}`}
                    placeholder="Enter city"
                    maxLength={100}
                    required
                  />
                  {fe('city')}
                </div>

                {isIndividual && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="pcf-streetAddress"
                        type="text"
                        value={formData.streetAddress || ''}
                        onChange={(e) => handleChange('streetAddress', e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('streetAddress')}`}
                        placeholder="House number and street name"
                        maxLength={200}
                        required
                      />
                      {fe('streetAddress')}
                    </div>

                    {isIndividualClient && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Place Address <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          id="pcf-workplaceAddress"
                          type="text"
                          value={formData.workplaceAddress || ''}
                          onChange={(e) => handleChange('workplaceAddress', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                          placeholder="Where do you work?"
                          maxLength={200}
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
                      id="pcf-officeAddress"
                      type="text"
                      value={formData.officeAddress || ''}
                      onChange={(e) => handleChange('officeAddress', e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('officeAddress')}`}
                      placeholder="Full office address"
                      maxLength={200}
                      required
                    />
                    {fe('officeAddress')}
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
                
                <div id="pcf-skillType">
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
                  {fe('skillType')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pcf-yearsOfExperience"
                    type="number"
                    inputMode="numeric"
                    value={formData.yearsOfExperience !== undefined && formData.yearsOfExperience !== 0 ? formData.yearsOfExperience : ''}
                    onChange={(e) => handleChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 transition-shadow ${fc('yearsOfExperience')}`}
                    placeholder="e.g. 5"
                    min="0"
                    max="60"
                    required
                  />
                  {fe('yearsOfExperience')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Experience
                    <span className="text-xs text-gray-500 ml-2">(Describe your background & achievements)</span>
                  </label>
                  <textarea
                    id="pcf-professionalExperience"
                    value={formData.professionalExperience || ''}
                    onChange={(e) => handleChange('professionalExperience', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    rows={4}
                    maxLength={500}
                    placeholder="Describe your professional experience, past roles, and achievements..."
                  />
                  <p className="text-xs text-gray-500 mt-1">{(formData.professionalExperience || '').length}/500 characters</p>
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Pricing Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Rate input — shown per country pricing convention */}
                    {effectivePricingModel === 'hourly' && (
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
                    {effectivePricingModel === 'daily' && (
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
                    {effectivePricingModel === 'negotiable' && (
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
                    {effectivePricingModel !== 'negotiable' && (
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

              </div>
            )}

            {/* Upload Profile Picture (Workers only — client profiles are not displayed) */}
            {isWorker && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800">Upload Profile Picture</h4>
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
                    <div className="relative border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:bg-blue-50 transition-all cursor-pointer bg-blue-50/30">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('profilePicture', file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
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
