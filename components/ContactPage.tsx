import React, { useState } from 'react';
import { MailIcon } from './icons';
import { apiService } from '../services/apiService';

export const ContactPage: React.FC = () => {
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        topic: '',
        name: '',
        email: '',
        message: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await apiService.submitContactForm(formData);
            setFormSubmitted(true);
        } catch (error: any) {
            setError(error.message || "Failed to send message. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold text-dark mb-2">Get in Touch</h1>
                        <p className="text-lg text-gray-600">
                            Have a question or need help? Fill out the form below or email us directly.
                        </p>
                        <a href="mailto:skillskonnectng@gmail.com" className="inline-flex items-center gap-2 mt-4 text-primary font-semibold hover:underline">
                            <MailIcon className="h-5 w-5" />
                            skillskonnectng@gmail.com
                        </a>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-light p-8 rounded-lg shadow-md">
                        {formSubmitted ? (
                            <div className="text-center py-10">
                                <h3 className="text-2xl font-bold text-primary">Thank You!</h3>
                                <p className="mt-2 text-gray-700">Your message has been sent successfully. We will get back to you shortly.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700">What can we help you with? *</label>
                                    <select
                                        id="topic"
                                        name="topic"
                                        value={formData.topic}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
                                    >
                                        <option value="" disabled>Select a category...</option>
                                        <option>Signup & Registration</option>
                                        <option>Subscription & Payment</option>
                                        <option>Technical issues</option>
                                        <option>General Support</option>
                                        <option>Feedback & Suggestions</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name *</label>
                                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required maxLength={100} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400"/>
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address *</label>
                                    <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400"/>
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message *</label>
                                    <textarea name="message" id="message" value={formData.message} onChange={handleInputChange} required rows={4} maxLength={1000} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-dark text-light placeholder-gray-400"></textarea>
                                </div>
                                {error && <p className="text-sm text-red-600">{error}</p>}
                                <div>
                                    <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};