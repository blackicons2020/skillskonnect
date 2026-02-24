import React, { useState } from 'react';
import { Cleaner, User } from '../types';
import { XCircleIcon } from './icons';

interface BookingModalProps {
    cleaner: Cleaner;
    user: User;
    onClose: () => void;
    onConfirmBooking: (paymentMethod: 'Direct' | 'Escrow', cleaner: Cleaner) => void;
    onProceedToEscrow: (bookingData: { cleaner: Cleaner, totalAmount: number }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ cleaner, user, onClose, onConfirmBooking, onProceedToEscrow }) => {
    const [paymentMethod] = useState<'Escrow' | 'Direct'>('Direct');
    const baseAmount = cleaner.chargeHourly || cleaner.chargeDaily || cleaner.chargePerContract || 5000;

    const handleConfirm = () => {
        onConfirmBooking('Direct', cleaner);
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

                    <div className="my-6 p-4 bg-light rounded-lg text-center">
                        <p className="text-sm text-gray-600">Cleaner's Charge</p>
                        <p className="text-3xl font-extrabold text-dark">₦{baseAmount.toLocaleString()}</p>
                    </div>

                    <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Payment Method</h4>
                        <div className="p-4 border-2 border-primary bg-green-50 rounded-lg">
                            <div className="text-sm">
                                <p className="font-bold text-gray-900 mb-2">Direct Payment</p>
                                <p className="text-gray-600 mb-3">
                                    After booking, you'll receive the worker's contact information. Arrange payment directly with the service provider upon job completion.
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                    <p className="text-xs text-blue-800">
                                        <strong>Note:</strong> Skills Konnect facilitates connections but is not responsible for direct payment transactions. Please ensure clear communication with your service provider.
                                    </p>
                                </div>
                                <p className="font-semibold text-primary mt-3">Worker's Charge: ₦{baseAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8">
                        <button
                            onClick={handleConfirm}
                            className="w-full flex justify-center items-center rounded-md border border-transparent bg-primary px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};