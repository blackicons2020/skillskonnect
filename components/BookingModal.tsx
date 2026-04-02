import React, { useState } from 'react';
import { Cleaner, User } from '../types';
import { XCircleIcon } from './icons';
import { getPricingModel, getCountryCurrency } from '../constants/countries';

interface BookingModalProps {
    cleaner: Cleaner;
    user: User;
    onClose: () => void;
    onConfirmBooking: (cleaner: Cleaner, date: string, time: string, serviceDescription: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ cleaner, user, onClose, onConfirmBooking }) => {
    const pricingModel = getPricingModel(cleaner.country || 'Nigeria');
    const currencySymbol = getCountryCurrency(cleaner.country || 'Nigeria').symbol;
    const isFixedPrice = pricingModel === 'hourly' && cleaner.chargeHourly;
    const baseAmount = cleaner.chargeHourly || cleaner.chargeDaily || cleaner.chargePerContract || 0;

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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto transform transition-all">
                <div className="p-4 relative">
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-900">Confirm Your Booking</h3>
                        <p className="mt-1 text-xs text-gray-500">Booking <span className="font-bold">{cleaner.name}</span></p>
                    </div>

                    <div className="my-2 p-2 bg-light rounded-lg text-center">
                        <p className="text-xs text-gray-600">Professional's Charge</p>
                        {isFixedPrice ? (
                            <p className="text-2xl font-extrabold text-dark">{currencySymbol}{baseAmount.toLocaleString()}<span className="text-sm font-normal text-gray-500">/hour</span></p>
                        ) : (
                            <p className="text-xl font-bold text-primary">Amount: Not fixed</p>
                        )}
                    </div>

                    <div className="mb-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Service Description <span className="text-red-500">*</span></label>
                        <textarea
                            rows={2}
                            placeholder="Describe the work to be done..."
                            value={serviceDescription}
                            onChange={e => setServiceDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>

                    <div className="mb-2 grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                min={today}
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                            <input
                                type="time"
                                value={selectedTime}
                                onChange={e => setSelectedTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <h4 className="text-xs font-semibold text-gray-800 mb-1">Payment Method</h4>
                        <div className="p-2 border border-primary bg-green-50 rounded-lg text-xs">
                            <p className="font-bold text-gray-900">Direct Payment</p>
                            <p className="text-gray-600 mt-1">Arrange payment directly with the professional upon job completion.</p>
                            <p className="font-semibold text-primary mt-1">Charge: {isFixedPrice ? `${currencySymbol}${baseAmount.toLocaleString()}` : 'Not fixed'}</p>
                        </div>
                    </div>
                    
                    <div className="mt-3 flex justify-center">
                        <button
                            onClick={handleConfirm}
                            className="inline-flex justify-center items-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};