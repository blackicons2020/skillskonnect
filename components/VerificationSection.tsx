import { useState } from 'react';
import { User, VerificationDocuments } from '../types';

interface VerificationSectionProps {
  user: User;
  onUpload: (documents: VerificationDocuments) => Promise<void>;
}

export default function VerificationSection({ user, onUpload }: VerificationSectionProps) {
  const [documents, setDocuments] = useState<VerificationDocuments>(
    user.verificationDocuments || {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isIndividualClient = user.userType === 'Client (Individual)';
  const isCompanyClient = user.userType === 'Client (Registered Company)';
  const isIndividualWorker = user.userType === 'Worker (Individual)';
  const isCompanyWorker = user.userType === 'Worker (Registered Company)';
  const isWorker = isIndividualWorker || isCompanyWorker;
  const isCompany = isCompanyClient || isCompanyWorker;

  const handleFileUpload = (field: keyof VerificationDocuments, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(prev => ({
        ...prev,
        [field]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await onUpload(documents);
      setSuccess('Verification documents uploaded successfully! Your submission will be reviewed shortly.');
    } catch (err: any) {
      setError(err.message || 'Failed to upload documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        {user.isVerified ? (
          <span className="text-2xl">✓</span>
        ) : (
          <span className="text-2xl">⬆</span>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Account Verification</h2>
          <p className="text-gray-600 text-sm mt-1">
            {user.isVerified 
              ? 'Your account is verified ✓' 
              : 'Upload documents to verify your account (Optional)'}
          </p>
        </div>
      </div>

      {user.isVerified ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-green-600 text-xl">✓</span>
          <div>
            <p className="font-medium text-green-800">Your account is verified!</p>
            <p className="text-sm text-green-700 mt-1">
              Your documents have been reviewed and approved. You now have full access to all features.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ Verification is optional but recommended. Verified accounts get higher visibility and more trust from clients.
            </p>
          </div>

          {/* Government ID - Required for ALL user types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Government ID
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload Your Government ID (National ID, Driver's License or International Passport)
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload('governmentId', file);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {documents.governmentId && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <span>✓</span>
                <span>Document uploaded</span>
              </div>
            )}
          </div>

          {/* Company Registration Certificate for Company Clients */}
          {isCompanyClient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Registration Certificate
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('companyRegistrationCert', file);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {documents.companyRegistrationCert && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <span>✓</span>
                  <span>Document uploaded</span>
                </div>
              )}
            </div>
          )}

          {/* Skill Training Certificate for Workers (Optional) */}
          {isWorker && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Training Certificate
                <span className="text-gray-500 text-xs ml-2">(Optional)</span>
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('skillTrainingCert', file);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {documents.skillTrainingCert && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <span>✓</span>
                  <span>Document uploaded</span>
                </div>
              )}
            </div>
          )}

          {/* Company Registration Certificate for Company Workers */}
          {isCompanyWorker && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Registration Certificate
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('companyRegistrationCert', file);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {documents.companyRegistrationCert && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <span>✓</span>
                  <span>Document uploaded</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
              <span>✗</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-2">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Object.keys(documents).length === 0}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Uploading...' : 'Submit for Verification'}
          </button>

          {Object.keys(documents).length === 0 && (
            <p className="text-sm text-gray-500 text-center">
              Please upload at least one document to continue
            </p>
          )}
        </form>
      )}
    </div>
  );
}
