import React, { useState } from 'react';
import { Cleaner, User } from '../types';
import { XCircleIcon } from './icons';

interface BookingModalProps {
    cleaner: Cleaner;
    user: User;
    onClose: () => void;
    onConfirmBooking: (cleaner: Cleaner, date: string, time: string, serviceDescription: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ cleaner, user, onClose, onConfirmBooking }) => {
    const baseAmount = cleaner.chargeHourly || cleaner.chargeDaily || cleaner.chargePerContract || 5000;

    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [selectedTime, setSelectedTime] = useState<string>('09:00');
    const [serviceDescription, setServiceDescription] = useState<string>('');

    const handleConfirm = () => {
        if (!selectedDate || !selectedTime) {
            alert('Please select a date and time for the booking.');
            return;
        }
        if (!serviceDescription.trim()) {
            alert('Please provide a brief description of the job.');
            return;
        }
        onConfirmBooking(cleaner, selectedDate, selectedTime, serviceDescription.trim());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900">Confirm Your Booking</h3>
                        <p className="mt-2 text-sm text-gray-500">You are booking <span className="font-bold">{cleaner.name}</span>.</p>
                    </div>

                    <div className="my-4 p-4 bg-light rounded-lg text-center">
                        <p className="text-sm text-gray-600">Professional's Charge</p>
                        <p className="text-3xl font-extrabold text-dark">₦{baseAmount.toLocaleString()}</p>
                    </div>

                    <div className="my-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Service Description <span className="text-red-500">*</span></label>
                        <textarea
                            rows={3}
                            placeholder="Describe the type and nature of work to be done (e.g. deep clean of 3-bedroom apartment, including kitchen and bathrooms)..."
                            value={serviceDescription}
                            onChange={e => setServiceDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>

                    <div className="my-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Appointment Date</label>
                            <input
                                type="date"
                                min={today}
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Appointment Time</label>
                            <input
                                type="time"
                                value={selectedTime}
                                onChange={e => setSelectedTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Payment Method</h4>
                        <div className="p-4 border-2 border-primary bg-green-50 rounded-lg">
                            <div className="text-sm">
                                <p className="font-bold text-gray-900 mb-2">Direct Payment</p>
                                <p className="text-gray-600 mb-3">
                                    After booking, you'll receive the professional's contact information. Arrange payment directly with the service provider upon job completion.
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                    <p className="text-xs text-blue-800">
                                        <strong>Note:</strong> Skills Konnect facilitates connections but is not responsible for direct payment transactions. Please ensure clear communication with your service provider.
                                    </p>
                                </div>
                                <p className="font-semibold text-primary mt-3">Professional's Charge: ₦{baseAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleConfirm}
                            className="inline-flex justify-center items-center rounded-md border border-transparent bg-primary px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};