import React, { useState } from 'react';
import { apiService } from '../services/apiService';

export const DeleteAccountPage: React.FC = () => {
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', reason: '', message: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await apiService.submitContactForm({
                topic: 'Account Deletion Request',
                name: formData.name,
                email: formData.email,
                message: `Reason: ${formData.reason}\n\n${formData.message}`.trim()
            });
            setFormSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold text-center text-dark mb-4">Request Account Deletion</h1>
                    <p className="text-center text-gray-500 text-sm mb-8">Skills Konnect &mdash; Account &amp; Data Removal</p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                        <p className="text-sm text-yellow-800 font-medium mb-1">Before submitting this form</p>
                        <p className="text-sm text-yellow-700">You can delete your account instantly from inside the app: go to your <strong>Dashboard &rarr; Settings &rarr; Delete Account</strong>. Use this form only if you cannot access the app.</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-gray-900">What gets deleted</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Your account profile and personal information</li>
                            <li>Your posted jobs and booking history</li>
                            <li>Your messages and chat history</li>
                            <li>Your uploaded documents and profile photo</li>
                        </ul>
                        <p className="font-semibold text-gray-900 pt-2">What may be retained</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Transaction records required for legal or financial compliance (up to 7 years)</li>
                            <li>Anonymised activity logs for platform security purposes</li>
                        </ul>
                        <p className="pt-2">Requests are processed within <strong>30 days</strong>.</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
                        {formSubmitted ? (
                            <div className="text-center py-8">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="text-2xl font-bold text-primary mb-2">Request Received</h3>
                                <p className="text-gray-600">We have received your account deletion request. We will process it within 30 days and confirm via the email address you provided.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text" name="name" id="name"
                                        value={formData.name} onChange={handleChange}
                                        required maxLength={100}
                                        placeholder="As registered on your account"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Account Email Address *</label>
                                    <input
                                        type="email" name="email" id="email"
                                        value={formData.email} onChange={handleChange}
                                        required
                                        placeholder="The email used to register your account"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion *</label>
                                    <select
                                        name="reason" id="reason"
                                        value={formData.reason} onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="" disabled>Select a reason...</option>
                                        <option value="No longer using the service">No longer using the service</option>
                                        <option value="Privacy concerns">Privacy concerns</option>
                                        <option value="Switching to another platform">Switching to another platform</option>
                                        <option value="Created account by mistake">Created account by mistake</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Additional details (optional)</label>
                                    <textarea
                                        name="message" id="message"
                                        value={formData.message} onChange={handleChange}
                                        rows={3} maxLength={500}
                                        placeholder="Any additional information..."
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                    />
                                </div>
                                {error && <p className="text-sm text-red-600">{error}</p>}
                                <button
                                    type="submit" disabled={isSubmitting}
                                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg text-sm transition-colors"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Deletion Request'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
