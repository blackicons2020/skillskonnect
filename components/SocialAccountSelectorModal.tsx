import React, { useState, useEffect } from 'react';
import { GoogleIcon, AppleIcon, XCircleIcon } from './icons';
import { apiService } from '../services/apiService';

interface SocialAccountSelectorModalProps {
  provider: 'google' | 'apple';
  onClose: () => void;
  onSelect: (email: string, name: string) => void;
}

export const SocialAccountSelectorModal: React.FC<SocialAccountSelectorModalProps> = ({
  provider,
  onClose,
  onSelect,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSocialUser = async () => {
      try {
        setLoading(true);
        // Call socialLogin API to get pre-filled info
        const user = await apiService.getSocialUser(provider);
        setEmail(user.email || '');
        setName(user.fullName || '');
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve social account info.');
      } finally {
        setLoading(false);
      }
    };

    fetchSocialUser();
  }, [provider]);

  const handleConfirm = () => {
    if (!email || !name) {
      setError('Please provide both name and email.');
      return;
    }
    onSelect(email, name);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              {provider === 'google' ? <GoogleIcon /> : <AppleIcon />}
              <span className="font-semibold text-gray-700">
                Sign in with {provider === 'google' ? 'Google' : 'Apple'}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading your social account info...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Confirm your social account details before continuing.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
                />
              </div>
              <button
                onClick={handleConfirm}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
