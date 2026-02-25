import React, { useState } from 'react';
import { View } from '../types';
import { apiService } from '../services/apiService';
import { EyeIcon, EyeSlashIcon } from './icons';

interface ResetPasswordPageProps {
    token: string;
    onNavigate: (v: View) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token, onNavigate }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await apiService.resetPassword(token, password);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please request a new reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-col">
            <div className="max-w-md w-full space-y-4">
                <div className="bg-white p-8 sm:p-10 rounded-xl shadow-lg">
                    {success ? (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-extrabold text-dark">Password Reset!</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Your password has been reset successfully. You can now sign in with your new password.
                            </p>
                            <button
                                onClick={() => onNavigate('auth')}
                                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none"
                            >
                                Go to Sign In
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 text-center">
                                <h2 className="text-3xl font-extrabold text-dark">Set New Password</h2>
                                <p className="mt-2 text-sm text-gray-600">Choose a strong password for your account.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                                        New password
                                    </label>
                                    <div className="relative mt-1">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="new-password"
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            className="block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-gray-400 hover:text-gray-200 focus:outline-none"
                                            >
                                                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                        Confirm new password
                                    </label>
                                    <div className="relative mt-1">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            id="confirm-password"
                                            autoComplete="new-password"
                                            required
                                            className="block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
                                            placeholder="••••••••"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="text-gray-400 hover:text-gray-200 focus:outline-none"
                                            >
                                                {showConfirm ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-sm text-red-600 text-center">{error}</p>
                                )}

                                <div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Resetting…' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => onNavigate('auth')}
                                    className="text-sm font-medium text-primary hover:text-secondary"
                                >
                                    ← Back to Sign In
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
