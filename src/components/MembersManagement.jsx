import React, { useState } from 'react';
import { useUsers } from '../context/UserContext';
import { useBatches } from '../context/BatchContext';
import { Search, Filter, MoreVertical, Plus, Mail, UserPlus, Users, ChevronLeft, ChevronRight, Key, Lock, Unlock, Edit, Trash2, TrendingUp, Download, Upload, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

const MembersManagement = () => {
    const { users, deleteUser, addUser } = useUsers();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Students');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Modal state and handlers
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [userToChangePassword, setUserToChangePassword] = useState(null);
    const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);

    const handleDeleteClick = (member) => {
        setUserToDelete(member);
        setDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleChangePasswordClick = (member) => {
        setUserToChangePassword(member);
        setChangePasswordModalOpen(true);
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        console.log('Confirm delete for:', userToDelete.displayName);
        const result = await deleteUser(userToDelete.id);

        if (result.success) {
            alert('User deleted successfully');
        } else {
            alert('Error deleting user: ' + result.error);
        }

        setDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const tabs = ['Students', 'Staffs', 'Mentors', 'Super Admin', 'Invited', 'Inactive Users'];

    // Filter users based on active tab and search query
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());

        // Map tab names to role values
        const tabRoleMap = {
            'Students': 'student',
            'Staffs': 'staff',
            'Mentors': 'mentor',
            'Super Admin': 'admin',
            'Invited': 'invited',
            'Inactive Users': 'inactive'
        };

        const expectedRole = tabRoleMap[activeTab];
        const matchesRole = (user.role || '').toLowerCase() === expectedRole.toLowerCase();

        return matchesSearch && matchesRole;
    });

    // Sorting Logic
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = React.useMemo(() => {
        let sortableItems = [...filteredUsers];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle special cases
                if (sortConfig.key === 'displayName') {
                    aValue = (a.displayName || a.email || '').toLowerCase();
                    bValue = (b.displayName || b.email || '').toLowerCase();
                } else if (sortConfig.key === 'joinedDate') {
                    aValue = new Date(a.joining_date || 0);
                    bValue = new Date(b.joining_date || 0);
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredUsers, sortConfig]);

    // Export Logic
    const handleExport = () => {
        const dataToExport = sortedUsers.map(user => ({
            'User Name': user.email,
            'Display Name': user.displayName,
            'Role': user.role,
            'Joined Date': user.joinedDate,
            'Batches': user.batches,
            'Phone': user.phone_number || '',
            'Location': user.location || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
        XLSX.writeFile(workbook, "Members_Export.xlsx");
        setIsActionMenuOpen(false);
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    return (
        <div className="container" style={{ padding: '40px 20px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>Members</h1>
                    <p style={{ color: '#666', fontSize: '16px' }}>Manage your organization's members and their account permissions.</p>
                </div>
                <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setIsAddMemberOpen(true)}
                    onMouseLeave={() => setIsAddMemberOpen(false)}
                >
                    <button className="btn btn-primary">
                        <Plus size={18} /> Add Member
                    </button>

                    {isAddMemberOpen && (
                        <div className="dropdown-menu" style={{ top: '100%', right: 0, marginTop: '8px', width: '240px' }}>
                            <div className="dropdown-item">
                                <Mail size={16} /> Invite by e-mail
                            </div>
                            <Link to="/create-user" className="dropdown-item">
                                <UserPlus size={16} /> Create User
                            </Link>
                            <div className="dropdown-item" onClick={() => setBulkUploadModalOpen(true)}>
                                <Users size={16} /> Bulk Create Users
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                {/* Tabs */}
                <div style={{ padding: '0 24px', borderBottom: '1px solid #e0e0e0' }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        {tabs.map(tab => (
                            <div
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '16px 0',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                                    color: activeTab === tab ? 'var(--primary-color)' : '#666',
                                    fontWeight: activeTab === tab ? '600' : '500',
                                    fontSize: '14px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                    <div className="input-group" style={{ width: '320px' }}>
                        <Search size={18} style={{ marginLeft: '12px', color: '#999' }} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                            >
                                <span style={{ fontSize: '16px' }}>☰</span> Action
                            </button>
                            {isActionMenuOpen && (
                                <div className="dropdown-menu" style={{ top: '100%', right: 0, marginTop: '8px', width: '220px', zIndex: 100 }}>
                                    <div className="dropdown-item" onClick={() => { setBulkUploadModalOpen(true); setIsActionMenuOpen(false); }}>
                                        <Upload size={16} /> Bulk Upload Members
                                    </div>
                                    <div className="dropdown-item" onClick={handleExport}>
                                        <Download size={16} /> Export Members (Excel)
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="btn btn-outline">
                            <Filter size={16} /> Filter
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="table-container" style={{ border: 'none', borderRadius: 0, overflow: 'visible' }}>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '35%', cursor: 'pointer' }} onClick={() => handleSort('email')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        User Name
                                        {sortConfig.key === 'email' && (
                                            sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '25%', cursor: 'pointer' }} onClick={() => handleSort('displayName')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Display Name
                                        {sortConfig.key === 'displayName' && (
                                            sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '20%', cursor: 'pointer' }} onClick={() => handleSort('joinedDate')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Joined Date
                                        {sortConfig.key === 'joinedDate' && (
                                            sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '15%' }}>Batches</th>
                                <th style={{ width: '15%' }}>Expiry Date</th>
                                <th style={{ width: '5%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? (
                                currentItems.map((member, index) => (
                                    <tr key={member.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                                    <img
                                                        src={member.avatar}
                                                        alt={member.displayName}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            borderRadius: '50%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span
                                                        style={{ fontWeight: '500', color: '#1a1a1a', cursor: 'pointer' }}
                                                        onClick={() => navigate(`/members/${member.id}`)}
                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                    >
                                                        {member.email}
                                                    </span>
                                                    <span className="badge badge-gray" style={{ width: 'fit-content', fontSize: '10px' }}>
                                                        {member.role === 'admin' ? 'Admin' :
                                                            member.role === 'staff' ? 'Staff' :
                                                                member.role === 'mentor' ? 'Mentor' :
                                                                    member.role === 'student' ? 'Student' :
                                                                        member.role || 'Student'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td
                                            style={{ fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => navigate(`/members/${member.id}`)}
                                            onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
                                            onMouseLeave={(e) => e.target.style.color = 'inherit'}
                                        >
                                            {member.displayName}
                                        </td>
                                        <td style={{ color: '#666' }}>{member.joinedDate}</td>
                                        <td>
                                            {member.batches ? (
                                                <span className="badge badge-primary">{member.batches}</span>
                                            ) : (
                                                <span style={{ color: '#999' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '12px', color: '#4b5563' }}>
                                            {member.expiry_date ? (
                                                new Date(member.expiry_date).toLocaleDateString()
                                            ) : member.custom_data?.expiry_info ? (
                                                <span title={member.custom_data.expiry_info}>
                                                    {member.custom_data.expiry_info.length > 30
                                                        ? member.custom_data.expiry_info.substring(0, 30) + '...'
                                                        : member.custom_data.expiry_info}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td style={{ position: 'relative' }}>
                                            <div
                                                onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                                className="btn-icon"
                                                style={{ cursor: 'pointer', color: '#666' }}
                                            >
                                                <MoreVertical size={18} />
                                            </div>

                                            {openMenuId === member.id && (
                                                <div
                                                    className="dropdown-menu"
                                                    style={{
                                                        right: '100%',
                                                        top: (currentItems.length >= 5 && index >= currentItems.length - 3) ? 'auto' : '0',
                                                        bottom: (currentItems.length >= 5 && index >= currentItems.length - 3) ? '0' : 'auto',
                                                        marginRight: '8px',
                                                        minWidth: '200px'
                                                    }}
                                                >
                                                    {member.role === 'student' && (
                                                        <div
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                navigate(`/members/${member.id}/progress`);
                                                                setOpenMenuId(null);
                                                            }}
                                                        >
                                                            <TrendingUp size={16} /> View Progress
                                                        </div>
                                                    )}
                                                    <div
                                                        className="dropdown-item"
                                                        onClick={() => handleChangePasswordClick(member)}
                                                    >
                                                        <Key size={16} /> Change Password
                                                    </div>
                                                    <div
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            navigate(`/edit-user/${member.id}`);
                                                            setOpenMenuId(null);
                                                        }}
                                                    >
                                                        <Edit size={16} /> Edit
                                                    </div>
                                                    <div
                                                        className="dropdown-item danger"
                                                        onClick={() => handleDeleteClick(member)}
                                                    >
                                                        <Trash2 size={16} /> Delete
                                                    </div>
                                                    <div className="dropdown-item">
                                                        <Unlock size={16} /> Unlock Account
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        No members found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div >

                {/* Pagination */}
                {
                    sortedUsers.length > 0 && (
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                                Showing <span style={{ fontWeight: '600', color: '#333' }}>{indexOfFirstItem + 1}</span> to <span style={{ fontWeight: '600', color: '#333' }}>{Math.min(indexOfLastItem, sortedUsers.length)}</span> of <span style={{ fontWeight: '600', color: '#333' }}>{sortedUsers.length}</span> entries
                            </div>
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginate(i + 1)}
                                        className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button
                                    className="pagination-btn"
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Delete Confirmation Modal */}
            {
                deleteModalOpen && (
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
                            width: '400px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#d32f2f' }}>Confirm Deletion</h3>
                            <p style={{ margin: '0 0 24px 0', color: '#555', lineHeight: '1.5' }}>
                                Are you sure you want to delete <strong>{userToDelete?.displayName}</strong>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setDeleteModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    style={{ backgroundColor: '#d32f2f', color: 'white' }}
                                    onClick={confirmDelete}
                                >
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Change Password Modal */}
            {
                changePasswordModalOpen && (
                    <ChangePasswordModal
                        user={userToChangePassword}
                        onClose={() => {
                            setChangePasswordModalOpen(false);
                            setUserToChangePassword(null);
                        }}
                    />
                )
            }

            {/* Bulk Upload Modal */}
            {
                bulkUploadModalOpen && (
                    <BulkUploadModal
                        onClose={() => setBulkUploadModalOpen(false)}
                        onSuccess={() => {
                            setBulkUploadModalOpen(false);
                            // Optionally refresh users here if needed, but context should handle it
                        }}
                    />
                )
            }
        </div >
    );
};

const ChangePasswordModal = ({ user, onClose }) => {
    const { updateUserPassword } = useUsers();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        // Use the user_id (auth id) if available, otherwise fallback to member id
        const targetId = user.user_id || user.id;

        const result = await updateUserPassword(targetId, password);

        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } else {
            setError(result.error);
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
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                width: '400px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Change Password</h3>

                {success ? (
                    <div style={{ textAlign: 'center', color: 'green', padding: '20px' }}>
                        <p>Password updated successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: '14px' }}>
                            Update password for <strong>{user?.displayName}</strong>
                        </p>

                        {error && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                padding: '8px',
                                borderRadius: '4px',
                                marginBottom: '12px',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                New Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    style={{
                                        width: '100%',
                                        padding: '8px 8px 8px 32px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const BulkUploadModal = ({ onClose, onSuccess }) => {
    const { addUser } = useUsers();
    const { batches } = useBatches();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState([]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setLogs([]);
    };

    const handleDownloadTemplate = () => {
        // Create sample template data with all columns in specified order
        const templateData = [
            {
                'UserName': 'johndoe',
                'First Name': 'John',
                'Last Name': 'Doe',
                'Email': 'john.doe@example.com',
                'Phone': '1234567890',
                'Address1': '123 Main St',
                'Address2': 'Apt 4B',
                'City': 'Hyderabad',
                'State': 'IN-TG',
                'Pincode': '10001',
                'Date of Joining': '2024-01-15',
                'Is_Active': 'TRUE',
                'Is_Blocked': 'FALSE',
                'Birth Date': '1990-01-01',
                'Photo': 'https://example.com/photo.jpg',
                'Batches': '1,2',
                'Expiry Date': '2025-12-31',
                'Orders': '',
                'ID': '',
                'Report Card URL': 'https://example.com/report.pdf'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Bulk_Upload_Template.xlsx");
    };

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'number') {
            // Excel Serial Date
            const date = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            return null;
        }

        const str = dateStr.toString().trim();
        // Try DD/MM/YYYY format
        const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
        if (match) {
            const [_, day, month, year, hour, minute] = match;
            const dateObj = new Date(year, parseInt(month) - 1, day, hour || 0, minute || 0);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }

        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) {
            const year = fallbackDate.getFullYear();
            const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
            const day = String(fallbackDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return null;
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setLogs([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                let successCount = 0;
                let failCount = 0;

                for (const row of jsonData) {
                    // Map Excel columns to userData object
                    // Support column names exactly as specified
                    const userData = {
                        username: row['UserName'] || row['username'] || row['Username'] || '',
                        first_name: row['First Name'] || row['first_name'] || row['FirstName'] || '',
                        last_name: row['Last Name'] || row['last_name'] || row['LastName'] || '',
                        email: row['Email'] || row['email'],
                        phone: row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'],
                        address1: row['Address1'] || row['address1'] || row['Address'] || row['address'] || '',
                        address2: row['Address2'] || row['address2'] || '',
                        city: row['City'] || row['city'] || '',
                        state: row['State'] || row['state'] || '',
                        zip: row['Pincode'] || row['pincode'] || row['Zip'] || row['zip'] || '',

                        // Date fields - convert to proper format
                        joining_date: parseDate(row['Date of Joining'] || row['date_of_joining'] || row['DateOfJoining']),
                        birth_date: parseDate(row['Birth Date'] || row['birth_date'] || row['BirthDate']),
                        expiry_date: (() => {
                            const val = row['Expiry Date'] || row['expiry_date'] || row['ExpiryDate'] || null;
                            if (!val) return null;

                            // Check if it's a JSON string like "{'Batch Name': '2026-01-20'}"
                            if (typeof val === 'string' && val.trim().startsWith('{')) {
                                try {
                                    // Replace single quotes with double quotes for valid JSON if needed
                                    const jsonStr = val.replace(/'/g, '"');
                                    const datesObj = JSON.parse(jsonStr);
                                    const dates = Object.values(datesObj);
                                    if (dates.length > 0) {
                                        // Return the latest date
                                        const latestDate = dates.sort().pop();
                                        return parseDate(latestDate);
                                    }
                                } catch (e) {
                                    console.warn('Failed to parse expiry date JSON:', val);
                                }
                            }
                            return parseDate(val);
                        })(),

                        // Store raw expiry info in custom_data to preserve it
                        custom_data: (() => {
                            const val = row['Expiry Date'] || row['expiry_date'] || row['ExpiryDate'] || null;
                            if (typeof val === 'string' && val.trim().startsWith('{')) {
                                return { expiry_info: val };
                            }
                            return {};
                        })(),

                        // Boolean fields - handle TRUE/FALSE and Yes/No strings
                        is_active: row['Is_Active'] !== undefined ?
                            (row['Is_Active'].toString().toUpperCase() === 'TRUE' ||
                                row['Is_Active'].toString().toUpperCase() === 'YES' ||
                                row['Is_Active'] === true) :
                            true,
                        is_blocked: row['Is_Blocked'] !== undefined ?
                            (row['Is_Blocked'].toString().toUpperCase() === 'TRUE' ||
                                row['Is_Blocked'].toString().toUpperCase() === 'YES' ||
                                row['Is_Blocked'] === true) :
                            false,

                        // Image/Photo URL
                        photo_url: row['Photo'] || row['photo'] || row['photo_url'] || null,
                        id: row['ID'] || row['id'] || undefined,

                        // Orders - store as JSON if provided
                        orders: row['Orders'] || row['orders'] || null,

                        // Display name fallback
                        display_name: row['Display Name'] || row['display_name'] ||
                            (row['First Name'] && row['Last Name'] ?
                                `${row['First Name']} ${row['Last Name']}`.trim() :
                                row['UserName'] || '')
                    };

                    if (!userData.email) {
                        setLogs(prev => [...prev, `❌ Skipping row: Missing email.`]);
                        failCount++;
                        continue;
                    }

                    setLogs(prev => [...prev, `⏳ Processing: ${userData.email}...`]);

                    // Note: addUser in UserContext currently handles single user creation.
                    // For bulk, we're calling it in a loop. Ideally, we'd have a bulk insert API.
                    const result = await addUser(userData, [], []);

                    if (result.success) {
                        setLogs(prev => [...prev, `✅ Success: ${userData.email}`]);
                        successCount++;
                    } else {
                        setLogs(prev => [...prev, `❌ Failed: ${userData.email} - ${result.error}`]);
                        failCount++;
                    }
                }

                setLogs(prev => [...prev, `Completed. Success: ${successCount}, Failed: ${failCount}`]);

                if (successCount > 0) {
                    setTimeout(() => {
                        onSuccess();
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
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Bulk Upload Members</h3>

                <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        Upload an Excel file (.xlsx) with the following columns (only <strong>Email</strong> is required):
                    </p>
                    <div style={{
                        fontSize: '11px',
                        color: '#666',
                        marginBottom: '12px',
                        lineHeight: '1.8',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px 12px'
                    }}>
                        <div>1. UserName</div>
                        <div>11. Is_Active</div>
                        <div>2. First Name</div>
                        <div>12. Is_Blocked</div>
                        <div>3. Last Name</div>
                        <div>13. Birth Date</div>
                        <div>4. <strong>Email</strong> (required)</div>
                        <div>14. Photo</div>
                        <div>5. Phone</div>
                        <div>15. Batches</div>
                        <div>6. Address1</div>
                        <div>16. Expiry Date</div>
                        <div>7. Address2</div>
                        <div>17. Orders</div>
                        <div>8. City</div>
                        <div>18. ID</div>
                        <div>9. State</div>
                        <div>19. Report Card URL</div>
                        <div>10. Pincode</div>
                        <div></div>
                    </div>
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
                            id="bulk-upload-input"
                        />
                        <label htmlFor="bulk-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
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

export default MembersManagement;
