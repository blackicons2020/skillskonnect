
import React, { useState } from 'react';
import { User } from '../types';
import { XCircleIcon, EyeIcon, CheckBadgeIcon } from './icons';
import { DocumentViewerModal } from './DocumentViewerModal';

interface UserDetailsModalProps {
    user: User;
    onClose: () => void;
    isAdmin?: boolean;
    onApproveVerification?: (userId: string) => void;
    onRejectVerification?: (userId: string) => void;
}

const DetailRow: React.FC<{ label: string; value?: string | number | null | string[] }> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
        <dt className="text-sm font-medium text-gray-500 col-span-1">{label}</dt>
        <dd className="text-sm text-gray-900 col-span-2">
            {Array.isArray(value) ? (
                <div className="flex flex-wrap gap-1">
                    {value.length > 0 ? value.map(item => (
                        <span key={item} className="bg-green-100 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">{item}</span>
                    )) : 'N/A'}
                </div>
            ) : (value || 'N/A')}
        </dd>
    </div>
);

const DocumentRow: React.FC<{ label: string; doc?: File | string; showPreview?: boolean; onViewDocument?: (url: string, name: string) => void }> = ({ label, doc, showPreview = false, onViewDocument }) => {
    if (!doc) return <DetailRow label={label} value="Not Uploaded" />;
    
    // For demo purposes, if it's a File object (not uploaded to cloud), create a local URL.
    // In production with backend, this would be a URL string.
    const url = doc instanceof File ? URL.createObjectURL(doc) : doc;
    
    const handleView = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onViewDocument) {
            onViewDocument(url, label);
        }
    };
    
    if (showPreview) {
        return (
            <div className="py-3">
                <dt className="text-sm font-medium text-gray-700 mb-2">{label}</dt>
                <dd className="mt-1">
                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 max-h-[300px] flex items-center justify-center">
                        <img 
                            src={url} 
                            alt={label}
                            className="w-full h-auto max-h-[280px] object-contain cursor-pointer"
                            onClick={handleView}
                            onError={(e) => {
                                // Fallback for non-image files
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                    parent.innerHTML = `<div class="p-6 text-center">
                                        <p class="text-gray-600 text-sm">Preview not available</p>
                                        <button class="text-primary hover:underline mt-2 text-sm font-medium">Click to view document</button>
                                    </div>`;
                                    parent.addEventListener('click', () => {
                                        if (onViewDocument) {
                                            onViewDocument(url, label);
                                        }
                                    });
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handleView}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2 font-medium"
                    >
                        <EyeIcon className="w-4 h-4" />
                        View Full Document
                    </button>
                </dd>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-3 gap-4 py-2 items-center">
            <dt className="text-sm font-medium text-gray-500 col-span-1">{label}</dt>
            <dd className="text-sm text-primary col-span-2">
                <button 
                    onClick={handleView}
                    className="flex items-center gap-1 hover:underline font-medium"
                >
                    <EyeIcon className="w-4 h-4" />
                    View Document
                </button>
            </dd>
        </div>
    );
};

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose, isAdmin = false, onApproveVerification, onRejectVerification }) => {
    const [documentToView, setDocumentToView] = useState<{ url: string; name: string } | null>(null);
    const isCleaner = user.role === 'cleaner';
    const locationString = user.city === 'Other' && user.otherCity ? user.otherCity : user.city;

    const handleApprove = () => {
        if (onApproveVerification) {
            onApproveVerification(user.id);
            onClose();
        }
    };

    const handleReject = () => {
        if (onRejectVerification && confirm('Are you sure you want to reject this user\'s verification? They will need to re-upload documents.')) {
            onRejectVerification(user.id);
            onClose();
        }
    };

    const handleViewDocument = (url: string, name: string) => {
        setDocumentToView({ url, name });
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto transform transition-all">
                <div className="p-6 sticky top-0 bg-white border-b z-10">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center space-x-4">
                        <img className="h-16 w-16 rounded-full object-cover" src={user.profilePhoto instanceof File ? URL.createObjectURL(user.profilePhoto) : (typeof user.profilePhoto === 'string' ? user.profilePhoto : 'https://avatar.iran.liara.run/public')} alt="Profile"/>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-xl font-bold text-gray-900">{user.fullName}</h3>
                                {user.isVerified && <CheckBadgeIcon className="w-6 h-6 text-secondary" />}
                            </div>
                            <p className="text-sm text-gray-500 capitalize">{user.role} - {user.clientType || user.cleanerType}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div>
                        <h4 className="font-semibold text-dark mb-2">Contact & Personal Information</h4>
                        <dl className="divide-y divide-gray-200">
                            <DetailRow label="Email" value={user.email} />
                            <DetailRow label="Phone" value={user.phoneNumber} />
                            <DetailRow label="Address" value={`${user.address}, ${locationString}, ${user.state}`} />
                            <DetailRow label="Gender" value={user.gender} />
                            <DetailRow label="Status" value={user.isSuspended ? 'Suspended' : 'Active'} />
                        </dl>
                    </div>

                    {(user.clientType === 'Company' || user.cleanerType === 'Company') && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-dark mb-2">Company Information</h4>
                            <dl className="divide-y divide-gray-200">
                                <DetailRow label="Company Name" value={user.companyName} />
                                <DetailRow label="Company Address" value={user.companyAddress} />
                            </dl>
                        </div>
                    )}

                    {isCleaner && (
                        <>
                            <div className="mt-6">
                                <h4 className="font-semibold text-dark mb-2">Professional Profile</h4>
                                <dl className="divide-y divide-gray-200">
                                    <DetailRow label="Skills" value={user.skillType} />
                                    <DetailRow label="Years of Experience" value={user.yearsOfExperience} />
                                    <DetailRow label="Experience" value={`${user.experience} years`} />
                                    <DetailRow label="Bio" value={user.bio} />
                                    <DetailRow label="Services" value={user.services} />
                                </dl>
                            </div>
                            <div className="mt-6">
                                <h4 className="font-semibold text-dark mb-2">Pricing & Payment</h4>
                                <dl className="divide-y divide-gray-200">
                                    <DetailRow label="Hourly Rate" value={user.chargeHourly ? `₦${user.chargeHourly.toLocaleString()}` : 'N/A'} />
                                    <DetailRow label="Daily Rate" value={user.chargeDaily ? `₦${user.chargeDaily.toLocaleString()}` : 'N/A'} />
                                    <DetailRow label="Contract Rate" value={user.chargePerContractNegotiable ? 'Negotiable' : user.chargePerContract ? `₦${user.chargePerContract.toLocaleString()}`: 'N/A' } />
                                    <DetailRow label="Bank Name" value={user.bankName} />
                                    <DetailRow label="Account Number" value={user.accountNumber} />
                                    <DetailRow label="Subscription Tier" value={user.subscriptionTier} />
                                </dl>
                            </div>
                        </>
                    )}
                    
                    <div className="mt-6">
                        <h4 className="font-semibold text-dark mb-2">Verification Documents</h4>
                        {user.verificationDocuments ? (
                            <div className="space-y-4">
                                <DocumentRow 
                                    label="Government ID" 
                                    doc={user.verificationDocuments.governmentId} 
                                    showPreview={isAdmin} 
                                    onViewDocument={handleViewDocument}
                                />
                                {(user.clientType === 'Company' || user.cleanerType === 'Company') && (
                                    <DocumentRow 
                                        label="Company Registration Certificate" 
                                        doc={user.verificationDocuments.companyRegistrationCert} 
                                        showPreview={isAdmin} 
                                        onViewDocument={handleViewDocument}
                                    />
                                )}
                                {isCleaner && (
                                    <DocumentRow 
                                        label="Skill Training Certificate" 
                                        doc={user.verificationDocuments.skillTrainingCert} 
                                        showPreview={isAdmin} 
                                        onViewDocument={handleViewDocument}
                                    />
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 py-2">No verification documents uploaded.</p>
                        )}
                        
                        {isAdmin && user.verificationDocuments && !user.isVerified && (
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={handleApprove}
                                    className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-green-700 font-semibold"
                                >
                                    Approve Verification
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-semibold"
                                >
                                    Reject Verification
                                </button>
                            </div>
                        )}
                        {user.isVerified && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm text-green-800 font-semibold">✓ User is verified</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <h4 className="font-semibold text-dark mb-2">Booking History</h4>
                        {user.bookingHistory && user.bookingHistory.length > 0 ? (
                             <ul className="space-y-2 max-h-48 overflow-y-auto">
                                {user.bookingHistory.map((b) => (
                                    <li key={b.id} className="p-2 bg-gray-50 rounded-md text-sm">
                                        <div className="flex justify-between font-medium"><span>{b.service}</span><span>₦{b.amount.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-xs text-gray-500"><span>{isCleaner ? `for ${b.clientName}` : `with ${b.cleanerName}`}</span><span>{b.date} - {b.status}</span></div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500">No bookings yet.</p>}
                    </div>

                </div>
                 <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        type="button"
                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>

            {documentToView && (
                <DocumentViewerModal
                    documentUrl={documentToView.url}
                    documentName={documentToView.name}
                    onClose={() => setDocumentToView(null)}
                />
            )}
        </>
    );
};
