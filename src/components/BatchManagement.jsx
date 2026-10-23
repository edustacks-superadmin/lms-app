import React, { useState } from 'react';
import { Search, Plus, Upload, X, FileSpreadsheet, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBatches } from '../context/BatchContext';
import { useUsers } from '../context/UserContext';
import { supabase } from '../supabaseClient';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import * as XLSX from 'xlsx';


const BatchManagement = () => {
    const navigate = useNavigate();
    const { batches, deleteBatch, cloneBatch, addMembersToBatch, removeMembersFromBatch, forceLogoutBatchMembers } = useBatches();
    const { users, addUser, fetchUsers } = useUsers();
    const [searchQuery, setSearchQuery] = useState('');
    const [openDropdown, setOpenDropdown] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, batch: null });

    // Modal states
    const [addUsersModal, setAddUsersModal] = useState({ isOpen: false, batch: null });
    const [unassignUsersModal, setUnassignUsersModal] = useState({ isOpen: false, batch: null });
    const [bulkCreateModal, setBulkCreateModal] = useState({ isOpen: false, batch: null });
    const [bulkUploadBatchesModal, setBulkUploadBatchesModal] = useState(false);
    const [forceLogoutModal, setForceLogoutModal] = useState({ isOpen: false, batch: null });

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

    return (
        <div style={{ flex: 1 }}>
            {/* Main Content */}
            <div style={{ padding: '30px 40px' }}>
                {/* Header with Search and Create Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '400', margin: 0 }}>Batches ({batches.length})</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="input-group" style={{ width: '300px', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingRight: '40px' }}
                            />
                            <button style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                border: 'none',
                                background: 'transparent',
                                padding: '0 12px',
                                cursor: 'pointer'
                            }}>
                                <Search size={18} color="#999" />
                            </button>
                        </div>
                        <button
                            className="btn"
                            onClick={() => setBulkUploadBatchesModal(true)}
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <FileSpreadsheet size={16} /> Bulk Upload Batches
                        </button>
                        <button
                            className="btn"
                            onClick={() => navigate('/batches/create')}
                            style={{
                                backgroundColor: '#00bfa5',
                                color: 'white',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Plus size={16} /> Create Batch
                        </button>
                    </div>
                </div>

                {/* Batches List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {batches.map((batch) => (
                        <div
                            key={batch.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '20px 0',
                                borderBottom: '1px solid #e0e0e0'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <button
                                    onClick={() => navigate(`/batches/${batch.id}`)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary-color)',
                                        textDecoration: 'none',
                                        fontSize: '15px',
                                        fontWeight: '400',
                                        cursor: 'pointer',
                                        padding: 0,
                                        textAlign: 'left'
                                    }}
                                >
                                    {batch.name}
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#333' }}>{batch.users}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>users</div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#333' }}>{batch.courses}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>courses</div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className="btn"
                                        onClick={() => setOpenDropdown(openDropdown === batch.id ? null : batch.id)}
                                        style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #ccc',
                                            minWidth: '100px'
                                        }}
                                    >
                                        Actions <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
                                    </button>

                                    {openDropdown === batch.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            minWidth: '200px',
                                            backgroundColor: 'white',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '4px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            zIndex: 1000,
                                            padding: '4px 0',
                                            marginTop: '4px'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    navigate('/members/create', { state: { selectedBatchId: batch.id } });
                                                    setOpenDropdown(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>👤</span> Create User
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAddUsersModal({ isOpen: true, batch });
                                                    setOpenDropdown(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>👥</span> Add Existing Users
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setUnassignUsersModal({ isOpen: true, batch });
                                                    setOpenDropdown(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>➖</span> Bulk Unassign Users
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBulkCreateModal({ isOpen: true, batch });
                                                    setOpenDropdown(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>👥</span> Bulk Create Users
                                            </button>
                                            <button
                                                onClick={() => handleCloneBatch(batch.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>📋</span> Clone Batch
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setForceLogoutModal({ isOpen: true, batch });
                                                    setOpenDropdown(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>🚪</span> Force Logout
                                            </button>
                                            <button
                                                onClick={() => navigate(`/batches/edit/${batch.id}`)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#333',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>✏️</span> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(batch)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 16px',
                                                    color: '#d32f2f',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                                className="dropdown-item"
                                            >
                                                <span>✖️</span> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
                        if (fetchUsers) fetchUsers();
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
                        if (fetchUsers) fetchUsers();
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
        </div>
    );
};

// Add Existing Users Modal Component
const AddExistingUsersModal = ({ isOpen, batch, users, onClose, onConfirm }) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [existingMemberIds, setExistingMemberIds] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        if (!isOpen || !batch?.id) {
            setSelectedUsers([]);
            setSearchTerm('');
            setExistingMemberIds([]);
            return;
        }

        const fetchExistingMembers = async () => {
            setLoadingMembers(true);
            try {
                const { data, error } = await supabase
                    .from('batch_members')
                    .select('member_id')
                    .eq('batch_id', batch.id);

                if (!error && data) {
                    setExistingMemberIds(data.map(r => r.member_id));
                }
            } catch (err) {
                console.error('Error fetching batch members:', err);
            } finally {
                setLoadingMembers(false);
            }
        };

        fetchExistingMembers();
    }, [isOpen, batch?.id]);

    if (!isOpen || !batch) return null;

    const getUserName = (user) => {
        return user?.displayName ||
            user?.name ||
            user?.display_name ||
            (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '') ||
            user?.username ||
            (user?.email ? user.email.split('@')[0] : 'User');
    };

    // Filter available users (not already in this batch)
    const availableUsers = (users || []).filter(user => {
        const isAlreadyIn = existingMemberIds.includes(user.id) ||
            (Array.isArray(user.batchIds) && user.batchIds.some(bId => String(bId) === String(batch.id)));
        if (isAlreadyIn) return false;

        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const name = getUserName(user).toLowerCase();
        const email = (user.email || '').toLowerCase();
        const phone = (user.phone_number || '').toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
    });

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === availableUsers.length && availableUsers.length > 0) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(availableUsers.map(u => u.id));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '560px',
                width: '92%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                            Add Users to {batch.name}
                        </h3>
                        <span style={{ fontSize: '13px', color: '#666' }}>
                            Select existing students/members to enroll in this batch
                        </span>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '9px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                    {availableUsers.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            style={{
                                padding: '0 12px',
                                fontSize: '13px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                background: '#f8f9fa',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {selectedUsers.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>

                <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>{availableUsers.length} user(s) available</span>
                    <span>{selectedUsers.length} selected</span>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '20px',
                    border: '1px solid #eee',
                    borderRadius: '4px',
                    maxHeight: '380px'
                }}>
                    {loadingMembers ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '30px', fontSize: '14px' }}>
                            Loading users...
                        </div>
                    ) : availableUsers.length > 0 ? (
                        availableUsers.map(user => {
                            const name = getUserName(user);
                            const isSelected = selectedUsers.includes(user.id);
                            return (
                                <label
                                    key={user.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                        transition: 'background-color 0.15s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleUser(user.id)}
                                        style={{ marginRight: '14px', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            {user.email || user.phone_number || 'No contact info'}
                                        </div>
                                    </div>
                                </label>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', padding: '30px', fontSize: '14px' }}>
                            {searchTerm ? 'No users matching your search' : 'All users are already enrolled in this batch'}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(selectedUsers);
                            setSelectedUsers([]);
                        }}
                        className="btn"
                        style={{
                            backgroundColor: selectedUsers.length === 0 ? '#a7f3d0' : '#00bfa5',
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '4px',
                            cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '500'
                        }}
                        disabled={selectedUsers.length === 0}
                    >
                        Add {selectedUsers.length} User(s)
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
    const [existingMemberIds, setExistingMemberIds] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        if (!isOpen || !batch?.id) {
            setSelectedUsers([]);
            setSearchTerm('');
            setExistingMemberIds([]);
            return;
        }

        const fetchExistingMembers = async () => {
            setLoadingMembers(true);
            try {
                const { data, error } = await supabase
                    .from('batch_members')
                    .select('member_id')
                    .eq('batch_id', batch.id);

                if (!error && data) {
                    setExistingMemberIds(data.map(r => r.member_id));
                }
            } catch (err) {
                console.error('Error fetching batch members:', err);
            } finally {
                setLoadingMembers(false);
            }
        };

        fetchExistingMembers();
    }, [isOpen, batch?.id]);

    if (!isOpen || !batch) return null;

    const getUserName = (user) => {
        return user?.displayName ||
            user?.name ||
            user?.display_name ||
            (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '') ||
            user?.username ||
            (user?.email ? user.email.split('@')[0] : 'User');
    };

    // Filter batch members currently assigned to this batch
    const batchMembers = (users || []).filter(user => {
        const isIn = existingMemberIds.includes(user.id) ||
            (Array.isArray(user.batchIds) && user.batchIds.some(bId => String(bId) === String(batch.id)));
        if (!isIn) return false;

        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const name = getUserName(user).toLowerCase();
        const email = (user.email || '').toLowerCase();
        const phone = (user.phone_number || '').toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
    });

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === batchMembers.length && batchMembers.length > 0) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(batchMembers.map(u => u.id));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '560px',
                width: '92%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                            Remove Users from {batch.name}
                        </h3>
                        <span style={{ fontSize: '13px', color: '#666' }}>
                            Select students to unassign from this batch
                        </span>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        placeholder="Search enrolled users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '9px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                    {batchMembers.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            style={{
                                padding: '0 12px',
                                fontSize: '13px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                background: '#f8f9fa',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {selectedUsers.length === batchMembers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>

                <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>{batchMembers.length} user(s) in this batch</span>
                    <span>{selectedUsers.length} selected for removal</span>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '20px',
                    border: '1px solid #eee',
                    borderRadius: '4px',
                    maxHeight: '380px'
                }}>
                    {loadingMembers ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '30px', fontSize: '14px' }}>
                            Loading batch members...
                        </div>
                    ) : batchMembers.length > 0 ? (
                        batchMembers.map(user => {
                            const name = getUserName(user);
                            const isSelected = selectedUsers.includes(user.id);
                            return (
                                <label
                                    key={user.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: isSelected ? '#fef2f2' : 'transparent',
                                        transition: 'background-color 0.15s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleUser(user.id)}
                                        style={{ marginRight: '14px', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            {user.email || user.phone_number || 'No contact info'}
                                        </div>
                                    </div>
                                </label>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', padding: '30px', fontSize: '14px' }}>
                            {searchTerm ? 'No users matching your search' : 'No users are currently assigned to this batch'}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(selectedUsers);
                            setSelectedUsers([]);
                        }}
                        className="btn"
                        style={{
                            backgroundColor: selectedUsers.length === 0 ? '#fca5a5' : '#d32f2f',
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '4px',
                            cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '500'
                        }}
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Bulk Create Users for {batch.name}</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    Upload a CSV file with columns: email, name, password (optional)
                </p>

                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ marginBottom: '16px' }}
                />

                {parsedData.length > 0 && (
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <strong>{parsedData.length} user(s)</strong> will be created
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: 'none' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(parsedData);
                            setCsvFile(null);
                            setParsedData([]);
                        }}
                        className="btn"
                        style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none' }}
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                width: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Bulk Upload Batches</h3>

                <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        Upload an Excel file (.xlsx) with batch data. Only  <strong>name</strong> is required.
                    </p>
                    <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
                        Columns: name, url, created, modified, is_local
                    </p>
                    <button
                        className="btn btn-outline"
                        onClick={handleDownloadTemplate}
                        style={{ marginBottom: '12px', fontSize: '12px', padding: '6px 12px' }}
                    >
                        <Download size={14} style={{ marginRight: '4px' }} /> Download Template
                    </button>
                    <div style={{
                        border: '2px dashed #e5e7eb',
                        borderRadius: '8px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#f9fafb'
                    }}>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="batch-bulk-upload-input"
                        />
                        <label htmlFor="batch-bulk-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                            <FileSpreadsheet size={32} style={{ color: '#9ca3af', marginBottom: '8px' }} />
                            <p style={{ margin: 0, color: '#4b5563', fontWeight: '500' }}>
                                {file ? file.name : 'Click to select file'}
                            </p>
                        </label>
                    </div>
                </div>

                <div style={{
                    flex: 1,
                    backgroundColor: '#1f2937',
                    color: '#10b981',
                    padding: '12px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    overflowY: 'auto',
                    marginBottom: '20px',
                    minHeight: '100px'
                }}>
                    {logs.length === 0 ? 'Waiting for upload...' : logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        className="btn btn-outline"
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Close
                    </button>
                    <button
                        className="btn btn-primary"
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
