'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { recordCashPayment } from '../app/actions/order';

const RecordCashPaymentModal = ({ isOpen, onClose, product, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && product) {
            setAmount(product.price || '');
            setSearchTerm('');
            setSelectedUser(null);
            setNotes('');
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const filteredUsers = searchTerm.length > 1
        ? users.filter(user =>
            (user.displayName || user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10)
        : [];

    const handleSubmit = async () => {
        if (!selectedUser) {
            alert('Please select a user');
            return;
        }
        if (!amount || isNaN(amount)) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await recordCashPayment({
                productId: product.id,
                memberId: selectedUser.id,
                amount: amount,
                notes: notes,
                productName: product.title,
                userEmail: selectedUser.email,
                userId: selectedUser.user_id,
                instituteId: product.institute_id
            });

            if (result.success) {
                alert('Payment recorded successfully!');
                onClose();
            } else {
                alert('Error recording payment: ' + result.error);
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-lg p-6 max-w-[500px] w-[90%] max-h-[90vh] flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="m-0 text-lg font-semibold">Record Cash Payment</h3>
                    <button onClick={onClose} className="border-none bg-transparent cursor-pointer">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Product Summary */}
                <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-xs text-gray-500 mb-1">Product</div>
                    <div className="font-medium">{product.title}</div>
                </div>

                {/* User Search */}
                <div>
                    <label className="block text-sm mb-1.5 text-gray-700">Select User</label>
                    <div className="relative">
                        <div className="flex items-center border border-gray-200 rounded-md py-2 px-3 bg-white">
                            <Search size={16} className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={selectedUser ? (selectedUser.displayName || selectedUser.email) : searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSelectedUser(null);
                                }}
                                className="border-none outline-none w-full text-sm"
                            />
                            {selectedUser && (
                                <button
                                    onClick={() => { setSelectedUser(null); setSearchTerm(''); }}
                                    className="border-none bg-transparent cursor-pointer p-0"
                                >
                                    <X size={14} className="text-gray-400" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {searchTerm.length > 1 && !selectedUser && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded mt-1 max-h-[200px] overflow-y-auto shadow-lg z-10">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setSearchTerm('');
                                            }}
                                            className="p-2.5 px-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <div className="font-medium text-sm">{user.displayName || 'No Name'}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-gray-400 text-sm">
                                        No users found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm mb-1.5 text-gray-700">Amount (₹)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full p-2.5 border border-gray-200 rounded-md text-sm"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm mb-1.5 text-gray-700">Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add payment details..."
                        className="w-full p-2.5 border border-gray-200 rounded-md text-sm min-h-[80px] resize-y"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end mt-2">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-5 rounded-md border border-gray-200 bg-white cursor-pointer text-sm font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedUser || !amount}
                        className={`py-2.5 px-5 rounded-md border-none text-white text-sm font-medium flex items-center gap-2 ${isSubmitting ? 'bg-green-300 cursor-not-allowed' : 'bg-green-500 cursor-pointer hover:bg-green-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? 'Recording...' : (
                            <>
                                <Check size={16} />
                                Record Payment
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordCashPaymentModal;
