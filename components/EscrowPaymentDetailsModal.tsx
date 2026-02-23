import React from 'react';
import { Cleaner } from '../types';
import { XCircleIcon } from './icons';

interface EscrowPaymentDetailsModalProps {
    cleaner: Cleaner;
    totalAmount: number;
    onClose: () => void;
    onConfirmBooking: (paymentMethod: 'Escrow', cleaner: Cleaner) => void;
}

export const EscrowPaymentDetailsModal: React.FC<EscrowPaymentDetailsModalProps> = ({ cleaner, totalAmount, onClose, onConfirmBooking }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Escrow Payment</h3>
                        <div className="my-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-dashed border-purple-300">
                            <p className="text-3xl font-bold text-purple-600 mb-2">Coming Soon!</p>
                            <p className="text-sm text-gray-600">Secure escrow payment system is under development</p>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            Escrow payment feature will be available soon. For now, please use manual payment method to book services.
                        </p>
                    </div>

                    <div className="mt-6 space-y-3">
                        <button
                            onClick={onClose}
                            className="w-full flex justify-center items-center rounded-md border-2 border-primary bg-white px-4 py-3 text-base font-medium text-primary shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            Back to Payment Options
                        </button>
                        <p className="text-xs text-center text-gray-400 italic">
                            Escrow payment is temporarily disabled
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};