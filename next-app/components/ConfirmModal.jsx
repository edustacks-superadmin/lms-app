import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
    if (!isOpen) return null;

    const getButtonClasses = () => {
        switch (type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'warning': return 'bg-amber-500 hover:bg-amber-600';
            case 'primary': return 'bg-[var(--primary-color)] hover:opacity-90';
            default: return 'bg-gray-500 hover:bg-gray-600';
        }
    };

    const getIconBgClass = () => {
        return type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-500';
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl p-6 w-[90%] max-w-[450px] shadow-xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBgClass()}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="m-0 text-lg font-semibold text-gray-900">
                        {title}
                    </h3>
                </div>

                <p className="m-0 mb-6 text-gray-500 leading-relaxed text-sm">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 rounded-md border-none text-white text-sm font-semibold cursor-pointer transition-all ${getButtonClasses()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ConfirmModal;
