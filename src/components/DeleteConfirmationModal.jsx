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
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                animation: 'fadeIn 0.2s ease-in-out'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    width: '90%',
                    maxWidth: '480px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    animation: 'slideIn 0.2s ease-out',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#ffebee',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle size={20} color="#d32f2f" />
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#1a1a1a'
                        }}>
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                        <X size={20} color="#666" />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    <p style={{
                        margin: 0,
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: '#555'
                    }}>
                        {message}
                    </p>
                    {itemName && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px 16px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            borderLeft: '3px solid #d32f2f'
                        }}>
                            <p style={{
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                {itemName}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    background: '#fafafa'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            border: '1px solid #ddd',
                            background: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#333',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                            e.currentTarget.style.borderColor = '#bbb';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#ddd';
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: '#d32f2f',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'white',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#b71c1c'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#d32f2f'}
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
