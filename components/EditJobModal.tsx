import React, { useState } from 'react';
import { Job } from '../types';
import { CLEANING_SERVICES } from '../constants/services';
import { NIGERIA_LOCATIONS } from '../constants/locations';

interface EditJobModalProps {
    job: Job;
    onClose: () => void;
    onSave: (jobId: string, updates: Partial<Job>) => Promise<void>;
}

export const EditJobModal: React.FC<EditJobModalProps> = ({ job, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: job.title,
        description: job.description,
        service: job.service,
        location: job.location || '',
        state: job.state || '',
        city: job.city || '',
        budget: job.budget,
        budgetType: job.budgetType,
        startDate: job.startDate || '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedLocation = NIGERIA_LOCATIONS.find(loc => loc.name === formData.state);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'budget' ? Number(value) : value
        }));

        // Reset city when state changes
        if (name === 'state') {
            setFormData(prev => ({ ...prev, city: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await onSave(job.id, formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update job');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Edit Job</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Job Title */}
                        <div className="md:col-span-2">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Job Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="e.g., Deep Cleaning for Office Space"
                            />
                        </div>

                        {/* Service Type */}
                        <div>
                            <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">
                                Service Type *
                            </label>
                            <select
                                id="service"
                                name="service"
                                value={formData.service}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="">Select Service</option>
                                {CLEANING_SERVICES.map(service => (
                                    <option key={service} value={service}>{service}</option>
                                ))}
                            </select>
                        </div>

                        {/* Budget */}
                        <div>
                            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                                Budget (₦) *
                            </label>
                            <input
                                type="number"
                                id="budget"
                                name="budget"
                                value={formData.budget}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="e.g., 50000"
                            />
                        </div>

                        {/* Budget Type */}
                        <div>
                            <label htmlFor="budgetType" className="block text-sm font-medium text-gray-700 mb-1">
                                Budget Type *
                            </label>
                            <select
                                id="budgetType"
                                name="budgetType"
                                value={formData.budgetType}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="Hourly">Hourly</option>
                                <option value="Daily">Daily</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Fixed">Fixed Price</option>
                            </select>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>

                        {/* State */}
                        <div>
                            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                State *
                            </label>
                            <select
                                id="state"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="">Select State</option>
                                {NIGERIA_LOCATIONS.map(loc => (
                                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* City */}
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                City *
                            </label>
                            <select
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                required
                                disabled={!formData.state}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
                            >
                                <option value="">Select City</option>
                                {selectedLocation?.towns.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location/Address */}
                        <div className="md:col-span-2">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                                Specific Location/Address
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="e.g., 123 Main Street, Victoria Island"
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Job Description *
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={5}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="Describe the job requirements, expectations, and any special instructions..."
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-gray-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="flex-1 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
