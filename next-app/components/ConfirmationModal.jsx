import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl animate-fade-in">
                <h3 className={`m-0 mb-3 text-lg font-semibold ${isDanger ? 'text-red-600' : 'text-gray-900'}`}>
                    {title}
                </h3>

                <p className="m-0 mb-6 text-gray-600 text-sm leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    {cancelText && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 border-none rounded-md text-white text-sm font-medium cursor-pointer transition-colors ${isDanger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ConfirmationModal;
