import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Delete",
    message = "Are you sure you want to delete this item? This action cannot be undone.",
    itemName = "",
    confirmText = "Delete",
    cancelText = "Cancel"
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={onClose}>
            <div
                className="bg-white rounded-lg w-full max-w-[480px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden animate-[slideIn_0.2s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
                            <AlertTriangle size={20} className="text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 m-0">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="m-0 text-[15px] leading-relaxed text-slate-600">
                        {message}
                    </p>
                    {itemName && (
                        <div className="mt-4 px-4 py-3 bg-slate-50 rounded border-l-[3px] border-red-600">
                            <p className="m-0 text-sm font-semibold text-slate-700">
                                {itemName}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
                    >
                        <AlertTriangle size={16} />
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default DeleteConfirmationModal;
