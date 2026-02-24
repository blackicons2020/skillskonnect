import React from 'react';
import { XCircleIcon } from './icons';

interface DocumentViewerModalProps {
    documentUrl: string;
    documentName: string;
    onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ documentUrl, documentName, onClose }) => {
    const isImage = documentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)/i);
    const isPDF = documentUrl.match(/\.pdf/i) || documentUrl.startsWith('data:application/pdf');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">{documentName}</h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close"
                    >
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                    {isImage ? (
                        <div className="flex items-center justify-center min-h-full">
                            <img 
                                src={documentUrl} 
                                alt={documentName}
                                className="max-w-full max-h-full object-contain rounded shadow-lg"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = `<div class="text-center p-8 bg-white rounded-lg shadow">
                                            <p class="text-red-600 font-semibold mb-2">Failed to load image</p>
                                            <p class="text-gray-600 text-sm">The image file may be corrupted or in an unsupported format.</p>
                                        </div>`;
                                    }
                                }}
                            />
                        </div>
                    ) : isPDF ? (
                        <iframe
                            src={documentUrl}
                            className="w-full h-full min-h-[70vh] rounded shadow-lg"
                            title={documentName}
                        />
                    ) : (
                        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg shadow">
                            <div className="text-center p-8">
                                <div className="text-6xl mb-4">📄</div>
                                <p className="text-gray-700 font-semibold mb-2">Preview not available</p>
                                <p className="text-gray-500 text-sm mb-4">
                                    This file type cannot be previewed in the browser.
                                </p>
                                <a 
                                    href={documentUrl} 
                                    download={documentName}
                                    className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary font-medium transition-colors"
                                >
                                    Download Document
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Document:</span> {documentName}
                    </div>
                    <div className="flex gap-3">
                        <a 
                            href={documentUrl} 
                            download={documentName}
                            className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                        >
                            Download
                        </a>
                        <button
                            onClick={onClose}
                            className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
