import { useState, useEffect } from 'react';
import { User, UserType, ChargeRateType } from '../types';
import { countries, phoneCodes } from '../constants/countries';
import { skillCategories, chargeRateTypes } from '../constants/skillTypes';

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
    chargeRateType: user.chargeRateType || 'Negotiable',
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
    if (country) {
      setSelectedCountry(country);
      // Auto-populate phone code
      setFormData(prev => ({
        ...prev,
        phoneCountryCode: country.phoneCode,
        state: '', // Reset state when country changes
        city: '' // Reset city when country changes
      }));
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          User Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.userType || ''}
          onChange={(e) => handleChange('userType', e.target.value as UserType)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select user type...</option>
          <option value="Client (Individual)">Client (Individual)</option>
          <option value="Client (Registered Company)">Client (Registered Company)</option>
          <option value="Worker (Individual)">Worker (Individual)</option>
          <option value="Worker (Registered Company)">Worker (Registered Company)</option>
        </select>
      </div>

      {formData.userType && (
        <>
          {/* Personal/Company Details */}
          {isIndividual && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Personal Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName || ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {isCompany && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Company Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Registration Number {isCompanyClient && '(If Any)'}
                </label>
                <input
                  type="text"
                  value={formData.companyRegistrationNumber || ''}
                  onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
            
            <div className="grid grid-cols-3 gap-3">
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
                <p className="text-xs text-gray-500 mt-1">Auto-filled based on country</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Location</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                State/Province/Region <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={selectedCountry.states.length > 0 
                  ? `e.g., ${selectedCountry.states.slice(0, 3).join(', ')}` 
                  : 'Enter your state/province/region'}
                required
              />
              {selectedCountry.states.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Common states: {selectedCountry.states.slice(0, 5).join(', ')}
                  {selectedCountry.states.length > 5 && ', etc.'}
                </p>
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your city or town"
                required
              />
            </div>

            {isIndividual && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.streetAddress || ''}
                    onChange={(e) => handleChange('streetAddress', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {isIndividualClient && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Place Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.workplaceAddress || ''}
                      onChange={(e) => handleChange('workplaceAddress', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </>
            )}

            {isCompany && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.officeAddress || ''}
                  onChange={(e) => handleChange('officeAddress', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
          </div>

          {/* Professional Details (Workers only) */}
          {isWorker && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Professional Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Select all that apply)</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {Object.entries(skillCategories).map(([category, skills]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">{category}</h4>
                      <div className="space-y-2">
                        {skills.map(skill => (
                          <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Array.isArray(formData.skillType) && formData.skillType.includes(skill)}
                              onChange={(e) => {
                                const currentSkills = Array.isArray(formData.skillType) ? formData.skillType : [];
                                if (e.target.checked) {
                                  handleChange('skillType', [...currentSkills, skill]);
                                } else {
                                  handleChange('skillType', currentSkills.filter(s => s !== skill));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{skill}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {Array.isArray(formData.skillType) && formData.skillType.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.skillType.map(skill => (
                      <span key={skill} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.yearsOfExperience || ''}
                  onChange={(e) => handleChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter years of experience"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.chargeHourly || ''}
                    onChange={(e) => handleChange('chargeHourly', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter hourly rate"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Rate (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.chargeDaily || ''}
                    onChange={(e) => handleChange('chargeDaily', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter daily rate"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Profile Picture <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('profilePicture', file);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {formData.profilePicture && (
                  <img
                    src={formData.profilePicture}
                    alt="Profile Preview"
                    className="mt-2 w-32 h-32 object-cover rounded-lg"
                  />
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </form>
  );
}
