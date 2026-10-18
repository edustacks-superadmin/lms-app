'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, X, FileSpreadsheet, Download, UserPlus, Users, UserMinus, Copy, LogOut, Edit as EditIcon, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBatches } from '../context/BatchContext';
import { useUsers } from '../context/UserContext';
import { checkUsersByEmail } from '../app/actions/user';
import AdvancedPagination from './AdvancedPagination';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import * as XLSX from 'xlsx';


const BatchManagement = () => {
    const router = useRouter();
    const {
        batches,
        pagination,
        searchTerm,
        error,
        deleteBatch,
        cloneBatch,
        addMembersToBatch,
        removeMembersFromBatch,
        forceLogoutBatchMembers,
        searchBatches,
        changePage,
        changeLimit
    } = useBatches();
    const { users, addUser } = useUsers();

    // UI states
    const [openDropdown, setOpenDropdown] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, batch: null });

    // Modal states
    const [addUsersModal, setAddUsersModal] = useState({ isOpen: false, batch: null });
    const [unassignUsersModal, setUnassignUsersModal] = useState({ isOpen: false, batch: null });
    const [bulkCreateModal, setBulkCreateModal] = useState({ isOpen: false, batch: null });
    const [bulkUploadBatchesModal, setBulkUploadBatchesModal] = useState(false);
    const [testpressImportModal, setTestpressImportModal] = useState(false);
    const [forceLogoutModal, setForceLogoutModal] = useState({ isOpen: false, batch: null });

    // Local search state for debouncing
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

    // Debounce search - wait 600ms after user stops typing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchTerm !== searchTerm) {
                searchBatches(localSearchTerm);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [localSearchTerm, searchTerm, searchBatches]);

    const handleSearchChange = (e) => {
        setLocalSearchTerm(e.target.value);
    };

    const handleDeleteClick = (batch) => {
        setDeleteModal({ isOpen: true, batch });
        setOpenDropdown(null);
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.batch) {
            await deleteBatch(deleteModal.batch.id);
        }
    };

    const handleCloneBatch = async (batchId) => {
        try {
            await cloneBatch(batchId);
            alert('Batch cloned successfully!');
        } catch (error) {
            alert('Error cloning batch: ' + error.message);
        }
        setOpenDropdown(null);
    };

    const handleForceLogout = async () => {
        if (forceLogoutModal.batch) {
            try {
                const result = await forceLogoutBatchMembers(forceLogoutModal.batch.id);
                alert(`Force logout applied to ${result.count} user(s)`);
                setForceLogoutModal({ isOpen: false, batch: null });
            } catch (error) {
                alert('Error forcing logout: ' + error.message);
            }
        }
    };

    if (error) {
        return (
            <div className="p-10 text-red-500 text-center">
                <h3>Error loading batches</h3>
                <p>{error}</p>
                <div className="text-xs mt-2.5 text-gray-500">
                    If you are seeing this, please check if Row Level Security (RLS) policies are blocking access.
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1">
            {/* Main Content */}
            <div className="p-6 max-w-[1600px] mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    {/* Header with Search and Create Button */}
                    <div className="flex justify-between items-center p-5 border-b border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-800 m-0">Batches</h2>
                        <div className="flex gap-3 items-center">
                            <div className="relative w-80">
                                <input
                                    type="text"
                                    placeholder="Search batches..."
                                    value={localSearchTerm}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                />
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                            <button
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium text-sm border border-slate-200"
                                onClick={() => setBulkUploadBatchesModal(true)}
                                title="Bulk Upload Batches"
                            >
                                <FileSpreadsheet size={16} />
                                <span className="hidden xl:inline">Bulk Upload</span>
                            </button>
                            <button
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium text-sm border border-slate-200"
                                onClick={() => setTestpressImportModal(true)}
                                title="Import from Testpress"
                            >
                                <RefreshCw size={16} />
                                <span className="hidden xl:inline">Import</span>
                            </button>
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                                onClick={() => router.push('/batches/create')}
                            >
                                <Plus size={16} /> Create Batch
                            </button>
                        </div>
                    </div>

                    {/* Batches List */}
                    <div className="flex flex-col">
                        {batches.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                No batches found matching your search.
                            </div>
                        ) : (
                            batches.map((batch) => (
                                <div
                                    key={batch.id}
                                    className="flex items-center justify-between p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <button
                                            onClick={() => router.push(`/batches/${batch.id}`)}
                                            className="text-base font-semibold text-slate-900 hover:text-blue-600 hover:underline bg-transparent border-none cursor-pointer p-0 text-left"
                                        >
                                            {batch.name}
                                        </button>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Last modified: {new Date(batch.modified || batch.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-center min-w-[80px]">
                                            <div className="text-lg font-bold text-slate-700">{batch.users}</div>
                                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">users</div>
                                        </div>
                                        <div className="text-center min-w-[80px]">
                                            <div className="text-lg font-bold text-slate-700">{batch.courses}</div>
                                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">courses</div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium shadow-sm"
                                                onClick={() => setOpenDropdown(openDropdown === batch.id ? null : batch.id)}
                                            >
                                                <span>Actions</span>
                                                <ChevronDown size={14} />
                                            </button>

                                            {openDropdown === batch.id && (
                                                <div className="absolute top-full right-0 min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-2 mt-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                    <button
                                                        onClick={() => {
                                                            router.push('/members/create?selectedBatchId=' + batch.id);
                                                            setOpenDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <UserPlus size={16} className="text-violet-600" /> Create User
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAddUsersModal({ isOpen: true, batch });
                                                            setOpenDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <Users size={16} className="text-violet-600" /> Add Existing Users
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setUnassignUsersModal({ isOpen: true, batch });
                                                            setOpenDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <UserMinus size={16} className="text-violet-600" /> Bulk Unassign Users
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setBulkCreateModal({ isOpen: true, batch });
                                                            setOpenDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <Users size={16} className="text-violet-600" /> Bulk Create Users
                                                    </button>
                                                    <div className="h-px bg-slate-100 my-1"></div>
                                                    <button
                                                        onClick={() => handleCloneBatch(batch.id)}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <Copy size={16} className="text-amber-500" /> Clone Batch
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setForceLogoutModal({ isOpen: true, batch });
                                                            setOpenDropdown(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <LogOut size={16} className="text-orange-500" /> Force Logout
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/batches/edit/${batch.id}`)}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-slate-700 text-sm hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        <EditIcon size={16} className="text-amber-500" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(batch)}
                                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-red-600 text-sm hover:bg-red-50 transition-colors text-left"
                                                    >
                                                        <Trash2 size={16} className="text-red-500" /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Advanced Pagination Controls */}
                    <AdvancedPagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.limit}
                        onPageChange={changePage}
                        onItemsPerPageChange={changeLimit}
                    />
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, batch: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Batch"
                message="Deleting this batch will affect all enrolled students and their progress. This action cannot be undone."
                itemName={deleteModal.batch?.name}
                confirmText="Delete Batch"
            />

            {/* Add Existing Users Modal */}
            <AddExistingUsersModal
                isOpen={addUsersModal.isOpen}
                batch={addUsersModal.batch}
                users={users}
                batches={batches}
                onClose={() => setAddUsersModal({ isOpen: false, batch: null })}
                onConfirm={async (selectedUserIds) => {
                    try {
                        await addMembersToBatch(addUsersModal.batch.id, selectedUserIds);
                        alert(`${selectedUserIds.length} user(s) added to batch`);
                        setAddUsersModal({ isOpen: false, batch: null });
                    } catch (error) {
                        alert('Error adding users: ' + error.message);
                    }
                }}
            />

            {/* Unassign Users Modal */}
            <UnassignUsersModal
                isOpen={unassignUsersModal.isOpen}
                batch={unassignUsersModal.batch}
                users={users}
                onClose={() => setUnassignUsersModal({ isOpen: false, batch: null })}
                onConfirm={async (selectedUserIds) => {
                    try {
                        await removeMembersFromBatch(unassignUsersModal.batch.id, selectedUserIds);
                        alert(`${selectedUserIds.length} user(s) removed from batch`);
                        setUnassignUsersModal({ isOpen: false, batch: null });
                    } catch (error) {
                        alert('Error removing users: ' + error.message);
                    }
                }}
            />

            {/* Bulk Create Users Modal */}
            <BulkCreateUsersModal
                isOpen={bulkCreateModal.isOpen}
                batch={bulkCreateModal.batch}
                onClose={() => setBulkCreateModal({ isOpen: false, batch: null })}
                onConfirm={async (usersData) => {
                    try {
                        let successCount = 0;
                        for (const userData of usersData) {
                            const result = await addUser({
                                ...userData,
                                batches: [bulkCreateModal.batch.id]
                            });
                            if (result && result.success) successCount++;
                        }
                        alert(`${successCount} user(s) created successfully`);
                        setBulkCreateModal({ isOpen: false, batch: null });
                    } catch (error) {
                        alert('Error creating users: ' + error.message);
                    }
                }}
            />

            {/* Force Logout Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={forceLogoutModal.isOpen}
                onClose={() => setForceLogoutModal({ isOpen: false, batch: null })}
                onConfirm={handleForceLogout}
                title="Force Logout Batch Users"
                message="This will force all users in this batch to log in again. Are you sure?"
                itemName={forceLogoutModal.batch?.name}
                confirmText="Force Logout"
            />

            {/* Bulk Upload Batches Modal */}
            <BulkUploadBatchesModal
                isOpen={bulkUploadBatchesModal}
                onClose={() => setBulkUploadBatchesModal(false)}
            />

            {/* Testpress Import Modal */}
            <TestpressImportModal
                isOpen={testpressImportModal}
                onClose={() => setTestpressImportModal(false)}
            />
        </div >
    );
};

// Testpress Import Modal Component
const TestpressImportModal = ({ isOpen, onClose }) => {
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleImport = async () => {
        setImporting(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch('/api/testpress/sync-batches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to import batches');
            }

            setResults(data);

            // Refresh the page after successful import
            if (data.results.imported > 0 || data.results.updated > 0) {
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        } catch (err) {
            console.error('Import error:', err);
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        if (!importing) {
            setResults(null);
            setError(null);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-lg font-semibold text-slate-900">Import from Testpress</h3>
                    <button
                        onClick={handleClose}
                        disabled={importing}
                        className="border-none bg-none cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 p-1 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="mb-5">
                    <p className="m-0 mb-3 text-slate-500 text-sm">
                        This will fetch all batches from your Testpress account and import them into your local database.
                    </p>
                    <p className="m-0 text-slate-500 text-xs italic">
                        Source: <strong>thapovaninstitute.testpress.in</strong>
                    </p>
                </div>

                {/* Results Display */}
                {results && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
                        <h4 className="m-0 mb-3 text-green-800 text-sm font-semibold">✅ Import Complete!</h4>
                        <div className="text-sm text-green-700 space-y-1.5">
                            <div>📊 Total batches found: <strong>{results.total}</strong></div>
                            <div>✅ Imported: <strong>{results.results.imported}</strong></div>
                            <div>🔄 Updated: <strong>{results.results.updated}</strong></div>
                            <div>⏭️ Skipped: <strong>{results.results.skipped}</strong></div>
                            {results.results.failed > 0 && (
                                <div className="text-red-600">❌ Failed: <strong>{results.results.failed}</strong></div>
                            )}
                        </div>
                        {results.results.errors && results.results.errors.length > 0 && (
                            <div className="mt-3 text-xs text-red-600">
                                <strong>Errors:</strong>
                                {results.results.errors.map((err, i) => (
                                    <div key={i} className="mt-1">• {err}</div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 text-xs text-emerald-600 italic">
                            Page will refresh in 3 seconds...
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 text-red-700 text-sm">
                        <strong>❌ Error:</strong> {error}
                    </div>
                )}

                {/* Progress */}
                {importing && (
                    <div className="bg-slate-50 rounded-lg p-4 mb-5 text-center">
                        <RefreshCw size={32} className="text-violet-600 animate-spin mb-3 mx-auto" />
                        <div className="text-sm text-slate-500">Importing batches from Testpress...</div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm border-none cursor-pointer disabled:opacity-50"
                        disabled={importing}
                    >
                        {results ? 'Close' : 'Cancel'}
                    </button>
                    {!results && (
                        <button
                            onClick={handleImport}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm border-none cursor-pointer flex items-center gap-2 disabled:opacity-50"
                            disabled={importing}
                        >
                            {importing ? 'Importing...' : 'Start Import'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Add Existing Users Modal Component (Bulk Add by Email)
const AddExistingUsersModal = ({ isOpen, batch, batches, onClose }) => {
    const { addMembersToBatch } = useBatches();
    const [emailInput, setEmailInput] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);
    const [notFoundEmails, setNotFoundEmails] = useState([]);
    const [checking, setChecking] = useState(false);
    const [adding, setAdding] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEmailInput('');
            setFoundUsers([]);
            setNotFoundEmails([]);
            setChecking(false);
            setExpiryDate('');
        }
    }, [isOpen]);

    if (!isOpen || !batch) return null;

    const handleCheckUsers = async () => {
        setChecking(true);
        setFoundUsers([]);
        setNotFoundEmails([]);

        const emails = emailInput
            .split(/[\n,]+/) // Split by newline or comma
            .map(e => e.trim())
            .filter(e => e.length > 0);

        if (emails.length === 0) {
            setChecking(false);
            return;
        }

        try {
            const result = await checkUsersByEmail(emails);
            if (result.success) {
                setFoundUsers(result.foundUsers);
                setNotFoundEmails(result.notFoundEmails);
            } else {
                alert('Error checking users: ' + result.error);
            }
        } catch (err) {
            console.error('Failed to check users:', err);
            alert('Failed to verify users');
        } finally {
            setChecking(false);
        }
    };

    const handleConfirm = async () => {
        if (foundUsers.length === 0) return;

        setAdding(true);
        try {
            const userIds = foundUsers.map(u => u.id);
            await addMembersToBatch(batch.id, userIds, expiryDate);
            alert(`Successfully added ${userIds.length} users to ${batch.name}`);
            onClose();
        } catch (err) {
            console.error('Error adding users to batch:', err);
            alert('Failed to add users: ' + err.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[600px] max-h-[85vh] flex flex-col w-[90%] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-lg font-semibold text-slate-900">Add Users to {batch.name}</h3>
                    <button onClick={onClose} className="border-none bg-none cursor-pointer hover:bg-slate-100 p-1 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-3">
                    Enter user emails below (separated by commas or new lines).
                </p>

                <textarea
                    value={emailInput}
                    onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (foundUsers.length > 0 || notFoundEmails.length > 0) {
                            setFoundUsers([]);
                            setNotFoundEmails([]);
                        }
                    }}
                    placeholder="student1@example.com, student2@example.com..."
                    rows={6}
                    className="w-full p-3 border border-slate-300 rounded-lg mb-4 font-mono resize-y text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />

                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleCheckUsers}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm border-none cursor-pointer disabled:opacity-50"
                        disabled={!emailInput.trim() || checking}
                    >
                        {checking ? 'Checking...' : 'Check & Verify'}
                    </button>
                </div>

                {/* Results Area */}
                {(foundUsers.length > 0 || notFoundEmails.length > 0) && (
                    <div className="flex-1 overflow-y-auto border-t border-slate-100 pt-4 mb-4">
                        {foundUsers.length > 0 && (
                            <div className="mb-3">
                                <div className="text-sm font-bold text-green-700 mb-1">
                                    ✅ Found {foundUsers.length} user(s):
                                </div>
                                <div className="text-xs text-slate-600 max-h-[100px] overflow-y-auto pl-2 space-y-1">
                                    {foundUsers.map(u => (
                                        <div key={u.id}>{u.email} ({u.name})</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {notFoundEmails.length > 0 && (
                            <div>
                                <div className="text-sm font-bold text-red-700 mb-1">
                                    ❌ Not Found {notFoundEmails.length} email(s):
                                </div>
                                <div className="text-xs text-slate-600 max-h-[100px] overflow-y-auto pl-2 space-y-1">
                                    {notFoundEmails.map((e, i) => (
                                        <div key={i}>{e}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Expiry Date (Optional)
                    </label>
                    <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm border-none cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm border-none cursor-pointer disabled:opacity-50"
                        disabled={adding || foundUsers.length === 0}
                    >
                        {adding ? 'Adding...' : `Add ${foundUsers.length} User(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Unassign Users Modal Component
const UnassignUsersModal = ({ isOpen, batch, users, onClose, onConfirm }) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen || !batch) return null;

    // Filter batch members (you would fetch from batch_members table)
    const batchMembers = users.filter(user =>
        (user.displayName || user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-h-[80vh] flex flex-col w-[90%] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-lg font-semibold text-slate-900">Remove Users from {batch.name}</h3>
                    <button onClick={onClose} className="border-none bg-none cursor-pointer hover:bg-slate-100 p-1 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />

                <div className="flex-1 overflow-y-auto mb-5 border border-slate-100 rounded-lg divide-y divide-slate-100">
                    {batchMembers.map(user => (
                        <label key={user.id} className="flex items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleUser(user.id)}
                                className="mr-3 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <div>
                                <div className="font-medium text-slate-800 text-sm">{user.displayName || user.name || 'User'}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
                            </div>
                        </label>
                    ))}
                    {batchMembers.length === 0 && (
                        <div className="text-center text-slate-400 py-8 text-sm">
                            No users in this batch
                        </div>
                    )}
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm border-none cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(selectedUsers);
                            setSelectedUsers([]);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm border-none cursor-pointer disabled:opacity-50"
                        disabled={selectedUsers.length === 0}
                    >
                        Remove {selectedUsers.length} User(s)
                    </button>
                </div>
            </div>
        </div>
    );
};

// Bulk Create Users Modal Component
const BulkCreateUsersModal = ({ isOpen, batch, onClose, onConfirm }) => {
    const [csvFile, setCsvFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);

    if (!isOpen || !batch) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const rows = text.split('\n').map(row => row.trim()).filter(row => row);
                const data = rows.slice(1).map(row => {
                    const [email, name, password] = row.split(',').map(col => col.trim());
                    return { email, name, password: password || 'changeme123', status: 'Student' };
                });
                setParsedData(data);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-h-[80vh] flex flex-col w-[90%] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-lg font-semibold text-slate-900">Bulk Create Users for {batch.name}</h3>
                    <button onClick={onClose} className="border-none bg-none cursor-pointer hover:bg-slate-100 p-1 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-4">
                    Upload a CSV file with columns: <code>email, name, password</code> (optional)
                </p>

                <div className="mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                </div>

                {parsedData.length > 0 && (
                    <div className="mb-5 p-3 bg-green-50 border border-green-100 rounded-lg text-green-800 text-sm">
                        ✅ <strong>{parsedData.length} user(s)</strong> will be created
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm border-none cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(parsedData);
                            setCsvFile(null);
                            setParsedData([]);
                        }}
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm border-none cursor-pointer disabled:opacity-50"
                        disabled={parsedData.length === 0}
                    >
                        Create Users
                    </button>
                </div>
            </div>
        </div>
    );
};

// Bulk Upload Batches Modal Component
const BulkUploadBatchesModal = ({ isOpen, onClose }) => {
    const { addBatch } = useBatches();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState([]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setLogs([]);
    };

    const handleDownloadTemplate = () => {
        // Create sample template data with all columns
        const templateData = [
            {
                'id': 1008,
                'name': 'NEET',
                'url': 'https://thapovaninstitute.testpress.in/api/v2.5/admin/batches/1008/',
                'created': '2025-11-29T15:55:29.630602+05:30',
                'modified': '2025-11-29T15:55:29.630602+05:30',
                'is_local': 'FALSE'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Batch_Upload_Template.xlsx");
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setLogs(prev => [...prev, 'Reading file...']);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                setLogs(prev => [...prev, `Found ${jsonData.length} batches.`]);

                let successCount = 0;
                let failCount = 0;

                for (const row of jsonData) {
                    const batchData = {
                        // Include ID if provided (for preserving Testpress IDs)
                        id: row['id'] || row['ID'] || undefined,
                        name: row['name'] || row['Name'],
                        url: row['url'] || row['URL'] || null,
                        modified: row['modified'] || row['Modified'] || null,
                        is_local: row['is_local'] !== undefined ?
                            (row['is_local'].toString().toUpperCase() === 'FALSE' ? false : true) :
                            false, // Default to false for imported batches
                    };

                    if (!batchData.name) {
                        setLogs(prev => [...prev, `❌ Skipping row: Missing name.`]);
                        failCount++;
                        continue;
                    }

                    setLogs(prev => [...prev, `⏳ Processing: ${batchData.name}...`]);

                    const result = await addBatch(batchData);

                    if (result && result.success) {
                        setLogs(prev => [...prev, `✅ Success: ${batchData.name}`]);
                        successCount++;
                    } else {
                        setLogs(prev => [...prev, `❌ Failed: ${batchData.name} - ${result?.error || 'Unknown error'}`]);
                        failCount++;
                    }
                }

                setLogs(prev => [...prev, `\nCompleted. Success: ${successCount}, Failed: ${failCount}`]);

                if (successCount > 0) {
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                }

            } catch (error) {
                console.error('Error parsing file:', error);
                setLogs(prev => [...prev, `Error: ${error.message}`]);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <h3 className="m-0 text-lg font-semibold text-slate-900 mb-4">Bulk Upload Batches</h3>

                <div className="mb-5">
                    <p className="text-sm text-slate-500 mb-2">
                        Upload an Excel file (.xlsx) with batch data. Only  <strong>name</strong> is required.
                    </p>
                    <p className="text-xs text-slate-400 mb-4 font-mono">
                        Columns: name, url, created, modified, is_local
                    </p>
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 text-xs border border-green-600 text-green-600 rounded bg-green-50 hover:bg-green-100 transition-colors mb-4 cursor-pointer"
                        onClick={handleDownloadTemplate}
                    >
                        <Download size={14} /> Download Template
                    </button>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50/50">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="batch-bulk-upload-input"
                        />
                        <label htmlFor="batch-bulk-upload-input" className="cursor-pointer block">
                            <FileSpreadsheet size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="m-0 text-slate-600 font-medium text-sm">
                                {file ? file.name : 'Click to select file'}
                            </p>
                        </label>
                    </div>
                </div>

                <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-y-auto mb-5 min-h-[100px] flex-1">
                    {logs.length === 0 ? <span className="text-slate-500">Waiting for upload...</span> : logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm border-none cursor-pointer"
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Close
                    </button>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm border-none cursor-pointer disabled:opacity-50"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? 'Processing...' : 'Start Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchManagement;
