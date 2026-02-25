import React from 'react';
import { Job, User } from '../types';

// Enriched applicant: application fields + worker profile fields merged
export interface EnrichedApplicant extends Partial<User> {
    workerId: string;
    workerName: string;
    workerEmail: string;
    positionApplied?: string;
    proposal?: string;
    proposedPrice?: number;
    appliedAt?: string | Date;
    status?: string;
}

interface JobApplicantsModalProps {
    job: Job;
    allUsers: (User | EnrichedApplicant)[];
    onClose: () => void;
    onSelectWorker?: (workerId: string) => void;
    onStartChat?: (workerId: string, workerName: string) => void;
    isLoading?: boolean;
}

export const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({ job, allUsers, onClose, onSelectWorker, onStartChat, isLoading = false }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {allUsers.length} {allUsers.length === 1 ? 'Applicant' : 'Applicants'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-gray-500 mt-4">Loading applicants...</p>
                        </div>
                    ) : allUsers.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No applicants yet</p>
                            <p className="text-sm text-gray-400 mt-2">Check back later for applications</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {allUsers.map(applicant => (
                                <div
                                    key={applicant.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Profile Photo */}
                                        <div className="flex-shrink-0">
                                            <img
                                                src={applicant.profilePicture || 'https://avatar.iran.liara.run/public'}
                                                alt={applicant.fullName}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                        </div>

                                        {/* Applicant Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {applicant.fullName}
                                                    </h3>
                                                    <p className="text-sm font-medium text-primary">
                                                        📋 Applied for: {(applicant as EnrichedApplicant).positionApplied || (applicant as any).workerName || job.service || 'General'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {applicant.userType || 'Worker'}
                                                    </p>
                                                </div>
                                                {applicant.isVerified && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        ✓ Verified
                                                    </span>
                                                )}
                                            </div>

                                            {/* Skills/Services */}
                                            {applicant.services && applicant.services.length > 0 && (
                                                <div className="mt-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {applicant.services.slice(0, 3).map((service, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                                            >
                                                                {service}
                                                            </span>
                                                        ))}
                                                        {applicant.services.length > 3 && (
                                                            <span className="text-xs text-gray-500">
                                                                +{applicant.services.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bio */}
                                            {applicant.bio && (
                                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                                    {applicant.bio}
                                                </p>
                                            )}

                                            {/* Proposal / Cover Letter */}
                                            {(applicant as EnrichedApplicant).proposal && (
                                                <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                                    <p className="text-xs font-semibold text-blue-700 mb-1">Cover Letter / Proposal:</p>
                                                    <p className="text-sm text-gray-700 line-clamp-3">
                                                        {(applicant as EnrichedApplicant).proposal}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Location & Experience */}
                                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                                {applicant.city && applicant.state && (
                                                    <span>📍 {applicant.city}, {applicant.state}</span>
                                                )}
                                                {applicant.yearsOfExperience && (
                                                    <span>💼 {applicant.yearsOfExperience} years exp.</span>
                                                )}
                                                {applicant.subscriptionTier && applicant.subscriptionTier !== 'Free' && (
                                                    <span className="text-purple-600 font-medium">
                                                        ⭐ {applicant.subscriptionTier}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {applicant.phoneNumber && (
                                                    <a
                                                        href={`tel:${applicant.phoneNumber}`}
                                                        className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                                                    >
                                                        📞 {applicant.phoneNumber}
                                                    </a>
                                                )}
                                                {(applicant.email || (applicant as EnrichedApplicant).workerEmail) && (
                                                    <a
                                                        href={`mailto:${applicant.email || (applicant as EnrichedApplicant).workerEmail}`}
                                                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                                                    >
                                                        ✉️ {applicant.email || (applicant as EnrichedApplicant).workerEmail}
                                                    </a>
                                                )}
                                                {onStartChat && applicant.id && (
                                                    <button
                                                        onClick={() => {
                                                            onStartChat(applicant.id!, applicant.fullName || (applicant as EnrichedApplicant).workerName || 'Worker');
                                                            onClose();
                                                        }}
                                                        className="inline-flex items-center px-3 py-1.5 border border-purple-300 shadow-sm text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100"
                                                    >
                                                        💬 Message
                                                    </button>
                                                )}
                                                {onSelectWorker && job.status === 'Open' && (
                                                    <button
                                                        onClick={() => onSelectWorker(applicant.id!)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary"
                                                    >
                                                        ✅ Select for Job
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
