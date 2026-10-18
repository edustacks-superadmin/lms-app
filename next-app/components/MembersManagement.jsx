'use client';

import React, { useState, useEffect } from 'react';
import { useUsers } from '../context/UserContext';
import { useBatches } from '../context/BatchContext';
import { useInstitute } from '../context/InstituteContext';
import { Search, Filter, MoreVertical, Plus, Mail, UserPlus, Users, Key, Lock, Unlock, Edit, Trash2, TrendingUp, Download, Upload, ArrowUp, ArrowDown, FileSpreadsheet, RefreshCw, Check, Trophy, Star, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import AdvancedPagination from './AdvancedPagination';
import ConfirmationModal from './ConfirmationModal';
import Can from './Can';

const MembersManagement = () => {
    const { deleteUser, addUser } = useUsers(); // Only need these actions from context
    const { institute } = useInstitute();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [roles, setRoles] = useState([]); // Dynamic roles state
    const [activeTab, setActiveTab] = useState('Students');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const pageParam = searchParams.get('page');
        return pageParam ? parseInt(pageParam) : 1;
    });
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // API data state
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNext: false,
        hasPrev: false
    });
    const [error, setError] = useState(null);

    // Modal state and handlers
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        isDanger: false,
        onConfirm: () => { }
    });
    // Removed specific deleteModalOpen and userToDelete as generic modal handles it if we pass closure
    // But wait, confirmDelete logic was separate. Let's rewrite handleDeleteClick to pass logic directly.
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [userToChangePassword, setUserToChangePassword] = useState(null);
    const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
    const [testpressImportModalOpen, setTestpressImportModalOpen] = useState(false);
    const [promoteModal, setPromoteModal] = useState({ isOpen: false, member: null });

    // Search triggered only on Enter key
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setDebouncedSearchQuery(searchQuery);
            setCurrentPage(1);
        }
    };

    // Fetch members from API (uses debounced search)
    useEffect(() => {
        fetchMembers();
    }, [activeTab, currentPage, debouncedSearchQuery]);

    // Fetch Roles on mount
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch('/api/admin/roles');
                const data = await res.json();
                if (data.roles) {
                    setRoles(data.roles);
                }
            } catch (error) {
                console.error("Error fetching roles for tabs:", error);
            }
        };
        fetchRoles();
    }, []);

    // Track initial mount to prevent resetting page on load
    const isFirstRun = React.useRef(true);

    // Reset to page 1 when tab or debounced search changes
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        if (currentPage !== 1) {
            setCurrentPage(1);
            // Also update URL to reflect page 1
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [activeTab, debouncedSearchQuery]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            // Map tab names to role values
            const tabRoleMap = {
                'Students': 'student',
                'Super Admin': 'admin',
                'Invited': 'invited',
                'Inactive Users': 'inactive'
            };

            let roleFilter = tabRoleMap[activeTab];
            // If not in map, assume it's a dynamic role name (exact match)
            if (!roleFilter) {
                roleFilter = activeTab;
            }

            const params = new URLSearchParams({
                role: roleFilter,
                page: currentPage.toString(),
                ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
                ...(institute?.id && { instituteId: institute.id })
            });

            const response = await fetch(`/api/members?${params}`);
            const data = await response.json();

            if (data.members) {
                setMembers(data.members);
                setPagination(data.pagination);
                setError(null);
            }
        } catch (err) {
            console.error('Error fetching members:', err);
            setError('Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (member) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete ${member.displayName || 'this user'}? This action cannot be undone.`,
            confirmText: 'Delete User',
            isDanger: true,
            onConfirm: async () => {
                console.log('Confirm delete for:', member.displayName);
                const result = await deleteUser(member.id);

                if (result.success) {
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'User deleted successfully',
                        confirmText: 'OK',
                        cancelText: null,
                        onConfirm: () => fetchMembers() // Refresh list on OK
                    });
                } else {
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error deleting user: ' + result.error,
                        confirmText: 'OK',
                        cancelText: null,
                        isDanger: true,
                        onConfirm: () => { }
                    });
                }
            }
        });
        setOpenMenuId(null);
    };

    const handleChangePasswordClick = (member) => {
        setUserToChangePassword(member);
        setChangePasswordModalOpen(true);
        setOpenMenuId(null);
    };

    const handlePromoteClick = (member) => {
        setPromoteModal({ isOpen: true, member });
        setOpenMenuId(null);
    };
    // confirmDelete removed as it's inline in handleDeleteClick now

    // Dynamic Tabs: Standard + Custom Roles + Statuses
    // Filter out 'student'/'admin' from dynamic roles if they appear there to avoid duplicates with 'Students'/'Super Admin'
    const dynamicRoleNames = roles
        .map(r => r.name)
        .filter(name => !['student', 'admin', 'Student', 'Admin'].includes(name));

    const tabs = ['Students', ...dynamicRoleNames, 'Super Admin', 'Invited', 'Inactive Users'];

    // Sorting Logic - Now works on fetched members
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = React.useMemo(() => {
        let sortableItems = [...members];
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
    }, [members, sortConfig]);

    // Export Logic - Updated to fetch subscriptions from database
    const handleExport = async () => {
        try {
            // Fetch all subscriptions with batch names
            const { data: allSubscriptions, error: subError } = await supabase
                .from('subscriptions')
                .select(`
                    member_id,
                    batch_id,
                    expires_on,
                    status,
                    batch:batches(name)
                `);

            if (subError) {
                console.error('Error fetching subscriptions for export:', subError);
            }

            // Create a map of subscriptions by member_id
            const subscriptionsByMember = {};
            (allSubscriptions || []).forEach(sub => {
                if (!subscriptionsByMember[sub.member_id]) {
                    subscriptionsByMember[sub.member_id] = [];
                }
                subscriptionsByMember[sub.member_id].push({
                    batch: sub.batch?.name || 'Unknown Batch',
                    expires: sub.expires_on || 'Lifetime',
                    status: sub.status
                });
            });

            const dataToExport = sortedUsers.map(user => {
                // Get user's subscriptions
                const userSubs = subscriptionsByMember[user.id] || [];


                // Format subscription info as JSON: {'batch_name': 'YYYY-MM-DD'}
                // ONLY include subscriptions with actual expiry dates (exclude NULL/Lifetime)
                const subscriptionInfo = {};
                userSubs.forEach(sub => {
                    // Skip lifetime/batch-only subscriptions (NULL expiry)
                    if (sub.expires !== 'Lifetime') {
                        // Use YYYY-MM-DD format
                        subscriptionInfo[sub.batch] = new Date(sub.expires).toISOString().split('T')[0];
                    }
                });

                return {
                    'UserName': user.username || '',
                    'First Name': user.first_name || '',
                    'Last Name': user.last_name || '',
                    'Email': user.email || '',
                    'Phone': user.phone_number || user.phone || user.mobile || '',
                    'Address1': user.address1 || '',
                    'Address2': user.address2 || '',
                    'City': user.city || '',
                    'State': user.state || '',
                    'Pincode': user.zip || '',
                    'Date of Joining': user.created_at ? (() => {
                        const date = new Date(user.created_at);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${day}-${month}-${year} ${hours}:${minutes}`;
                    })() : '',
                    'Is_Active': user.is_active !== undefined ? (user.is_active ? 'Yes' : 'No') : 'Yes',
                    'Is_Blocked': user.is_blocked !== undefined ? (user.is_blocked ? 'Yes' : 'No') : 'No',
                    'Birth Date': user.birth_date || '',
                    'Photo': user.photo_url || user.avatar || '',
                    'Batches': user.batches || '',
                    'Expiry Date': Object.keys(subscriptionInfo).length > 0
                        ? JSON.stringify(subscriptionInfo)
                        : '',
                    'Orders': user.orders || '',
                    'ID': user.id || '',
                    'Report Card URL': user.report_card_url || '',
                    'Photo ID Proof (Aadhaar card)': user.aadhaar_url || user.id_proof_url || ''
                };
            });


            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
            XLSX.writeFile(workbook, "Members_Export.xlsx");
            setIsActionMenuOpen(false);
        } catch (error) {
            console.error('Error exporting members:', error);
            setConfirmationModal({
                isOpen: true,
                title: 'Export Error',
                message: 'Error exporting members. Please try again.',
                confirmText: 'OK',
                cancelText: null,
                isDanger: true,
                onConfirm: () => { }
            });
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    // Pagination logic - simplified since API handles it
    const currentItems = sortedUsers; // API already returns paginated data
    const totalPages = pagination.totalPages;

    // Show Role column only for mixed-role tabs (Invited, Inactive)
    const showRoleColumn = ['Invited', 'Inactive Users'].includes(activeTab);

    if (loading) {
        return (
            <div className="container p-10 text-center">
                <p>Loading members...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Members</h1>
                    <p className="text-slate-500 text-sm sm:text-base">Manage your organization's members and their account permissions.</p>
                </div>
                <div
                    className="relative"
                    onMouseEnter={() => setIsAddMemberOpen(true)}
                    onMouseLeave={() => setIsAddMemberOpen(false)}
                >
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus size={18} /> Add Member
                    </button>

                    {isAddMemberOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors">
                                <Mail size={16} /> Invite by e-mail
                            </div>
                            <Link href="/members/create" className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors">
                                <UserPlus size={16} /> Create User
                            </Link>
                            <div
                                className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors"
                                onClick={() => setBulkUploadModalOpen(true)}
                            >
                                <Users size={16} /> Bulk Create Users
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex flex-col gap-1">
                    <div className="font-semibold flex items-center gap-2">
                        <AlertCircle size={18} /> Error
                    </div>
                    <div className="text-sm">{error}</div>
                    <div className="text-xs text-red-500 mt-1">
                        If the list below is empty, it might be due to this error or RLS policies.
                    </div>
                </div>
            )}

            {/* Debugging Info */}
            <div className="text-xs text-slate-400 mb-2 hidden sm:block">
                Total Members: {pagination.totalCount || 0} | Current Page: {members?.length || 0}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="border-b border-slate-200 px-6 scrollbar-hide overflow-x-auto">
                    <div className="flex gap-8 min-w-max">
                        {tabs.map(tab => (
                            <div
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    py-4 cursor-pointer text-sm font-medium border-b-2 transition-all
                                    ${activeTab === tab
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                                `}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100">
                    <div className="w-full sm:w-80 relative">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => {
                                setDebouncedSearchQuery(searchQuery);
                                setCurrentPage(1);
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search user... (Press Enter)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <button
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                            >
                                <span>Action</span>
                            </button>
                            {isActionMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <div
                                        className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors"
                                        onClick={() => { setTestpressImportModalOpen(true); setIsActionMenuOpen(false); }}
                                    >
                                        <RefreshCw size={16} /> Import from Testpress
                                    </div>
                                    <Can I="add" a="users">
                                        <div
                                            className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors"
                                            onClick={() => { setBulkUploadModalOpen(true); setIsActionMenuOpen(false); }}
                                        >
                                            <Upload size={16} /> Bulk Upload Members
                                        </div>
                                    </Can>
                                    <div
                                        className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors"
                                        onClick={handleExport}
                                    >
                                        <Download size={16} /> Export Members (Excel)
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                            <Filter size={16} /> Filter
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th
                                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort('displayName')}
                                >
                                    <div className="flex items-center gap-2">
                                        Member
                                        {sortConfig.key === 'displayName' && (
                                            sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                {showRoleColumn && (
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                )}
                                <th
                                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort('joinedDate')}
                                >
                                    <div className="flex items-center gap-2">
                                        Joined Date
                                        {sortConfig.key === 'joinedDate' && (
                                            sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Batches</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Connect</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? (
                                currentItems.map((member, index) => {
                                    // Helpers for this row
                                    const initials = (member.displayName || member.email || '?').substring(0, 2).toUpperCase();
                                    const colors = ['bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500'];
                                    const colorIndex = ((member.displayName || member.email || '').length + (member.id || 0)) % colors.length;
                                    const avatarColorClass = colors[colorIndex];

                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    {/* Avatar */}
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white shadow-sm overflow-hidden
                                                        ${avatarColorClass}
                                                    `}>
                                                        {member.photo_url || member.avatar ? (
                                                            <img
                                                                src={member.photo_url || member.avatar}
                                                                alt={member.displayName}
                                                                className="w-full h-full object-cover object-top"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span>{initials}</span>
                                                        )}
                                                    </div>

                                                    {/* Name & Email */}
                                                    <div className="flex flex-col">
                                                        <span
                                                            className="text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer"
                                                            onClick={() => router.push(`/members/${member.id}`)}
                                                        >
                                                            {member.displayName || 'Unknown Name'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            {member.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role Badge */}
                                            {showRoleColumn && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`
                                                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                    ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                            member.role === 'staff' ? 'bg-sky-100 text-sky-700' :
                                                                member.role === 'mentor' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}
                                                `}>
                                                        {member.role || 'Student'}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                                {member.joinedDate}
                                            </td>

                                            {/* Batches as Tags */}
                                            <td className="px-6 py-4">
                                                {member.batches ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {member.batches.split(',').slice(0, 2).map((batch, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[11px] font-medium">
                                                                {batch.trim()}
                                                            </span>
                                                        ))}
                                                        {member.batches.split(',').length > 2 && (
                                                            <span className="text-[10px] text-slate-400 self-center font-medium">
                                                                +{member.batches.split(',').length - 2} more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xl leading-none">&middot;</span>
                                                )}
                                            </td>

                                            {/* Status Dot */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div
                                                    title={member.is_blocked ? 'Blocked' : 'Active'}
                                                    className={`w-2.5 h-2.5 rounded-full mx-auto ${member.is_blocked ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                ></div>
                                            </td>

                                            {/* Connect */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <a
                                                        href={`https://wa.me/${member.phone_number || member.phone || member.mobile || ''}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all shadow-sm border border-emerald-100/50"
                                                        title="WhatsApp Member"
                                                    >
                                                        <MessageSquare size={16} />
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {openMenuId === member.id && (
                                                    <div className="absolute right-8 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                        {member.role === 'student' && (
                                                            <>
                                                                <div
                                                                    className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors text-left"
                                                                    onClick={() => {
                                                                        router.push(`/admin/store/coupons/new?influencer_email=${encodeURIComponent(member.email)}&influencer_name=${encodeURIComponent(member.displayName)}`);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    <Users size={14} className="text-slate-400" /> Make Influencer
                                                                </div>
                                                                <div
                                                                    className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors text-left"
                                                                    onClick={() => handlePromoteClick(member)}
                                                                >
                                                                    <Trophy size={14} className="text-amber-500" /> Mark as Winner
                                                                </div>
                                                                <div
                                                                    className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors text-left"
                                                                    onClick={() => {
                                                                        router.push(`/members/${member.id}/progress`);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    <TrendingUp size={14} className="text-slate-400" /> View Progress
                                                                </div>
                                                            </>
                                                        )}
                                                        <div
                                                            className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors text-left"
                                                            onClick={() => handleChangePasswordClick(member)}
                                                        >
                                                            <Key size={14} className="text-slate-400" /> Change Password
                                                        </div>
                                                        <div
                                                            className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 cursor-pointer transition-colors text-left"
                                                            onClick={() => {
                                                                router.push(`/members/${member.id}`);
                                                                setOpenMenuId(null);
                                                            }}
                                                        >
                                                            <Edit size={14} className="text-slate-400" /> Edit
                                                        </div>
                                                        <Can I="delete" a="users">
                                                            <div
                                                                className="px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2 cursor-pointer transition-colors text-left border-t border-slate-100"
                                                                onClick={() => handleDeleteClick(member)}
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </div>
                                                        </Can>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search size={32} className="text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">No members found</h3>
                                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                                            Try adjusting your search or filter to find who you're looking for.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div >

                {/* Pagination */}
                {
                    pagination.totalCount > 0 && (
                        <div className="border-t border-slate-200">
                            <AdvancedPagination
                                currentPage={currentPage}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalCount}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                                pageSizeOptions={[10, 20, 50, 100]}
                            />
                        </div>
                    )
                }
            </div >

            {/* Confirmation Modal */}
            {confirmationModal.isOpen && (
                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmationModal.onConfirm}
                    title={confirmationModal.title}
                    message={confirmationModal.message}
                    confirmText={confirmationModal.confirmText}
                    cancelText={confirmationModal.cancelText}
                    isDanger={confirmationModal.isDanger}
                />
            )}

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

            {/* Testpress Import Modal */}
            {testpressImportModalOpen && (
                <TestpressUsersImportModal
                    isOpen={testpressImportModalOpen}
                    onClose={() => setTestpressImportModalOpen(false)}
                />
            )}

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

            {promoteModal.isOpen && (
                <PromoteMemberModal
                    member={promoteModal.member}
                    onClose={() => setPromoteModal({ isOpen: false, member: null })}
                    onSuccess={() => {
                        setPromoteModal({ isOpen: false, member: null });
                        fetchMembers();
                    }}
                />
            )}
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

        // Use the auth_user_id (auth id) if available, otherwise fallback to member id
        const targetId = user.auth_user_id || user.id;

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>

                {success ? (
                    <div className="text-center py-6 text-emerald-600 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check size={24} />
                        </div>
                        <p className="font-medium">Password updated successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="text-sm text-slate-500 mb-4">
                            Update password for <strong className="text-slate-900">{user?.displayName}</strong>
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    const { fetchUsers } = useUsers();
    const { batches } = useBatches();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [failedRows, setFailedRows] = useState([]);

    // Progress tracking
    const [progress, setProgress] = useState({
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0
    });

    // Email validation regex
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Phone validation regex (10 digits)
    const PHONE_REGEX = /^\d{10}$/;

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setLogs([]);
        setFailedRows([]);
        setProgress({ total: 0, processed: 0, successful: 0, failed: 0, percentage: 0 });
    };

    const addLog = (message, type = 'info') => {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        setLogs(prev => [...prev, { message, color: colors[type] || colors.info }]);
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
                'City': 'New York',
                'State': 'NY',
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
                'Report Card URL': 'https://example.com/report.pdf',
                'Photo ID Proof (Aadhaar card)': 'https://example.com/aadhaar.pdf'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Bulk_Upload_Template.xlsx");
    };

    const handleExportFailed = () => {
        if (failedRows.length === 0) return;

        const worksheet = XLSX.utils.json_to_sheet(failedRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Failed");
        XLSX.writeFile(workbook, `Failed_Uploads_${new Date().getTime()}.xlsx`);
        addLog(`✅ Exported ${failedRows.length} failed rows`, 'success');
    };

    const validateEmail = (email) => {
        if (!email) return 'Email is required';
        if (!EMAIL_REGEX.test(email)) return 'Invalid email format';
        return null;
    };

    const validatePhone = (phone) => {
        if (!phone) return null; // Phone is optional
        const cleaned = phone.toString().replace(/\D/g, '');
        if (!PHONE_REGEX.test(cleaned)) return 'Phone must be 10 digits';
        return null;
    };

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'number') {
            // Excel Serial Date
            const date = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
            return !isNaN(date.getTime()) ? date.toISOString() : null;
        }

        const str = dateStr.toString().trim();
        // Try DD/MM/YYYY format
        const match = str.match(/^(\d{1,2})[\\/\-](\d{1,2})[\\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
        if (match) {
            const [_, day, month, year, hour, minute] = match;
            const dateObj = new Date(year, parseInt(month) - 1, day, hour || 0, minute || 0);
            if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
        }

        const fallbackDate = new Date(dateStr);
        return !isNaN(fallbackDate.getTime()) ? fallbackDate.toISOString() : null;
    };

    const handleUpload = async () => {
        if (!file) return;

        // File size validation (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            addLog('❌ File too large (max 5MB)', 'error');
            return;
        }

        setUploading(true);
        setLogs([]);
        setFailedRows([]);
        setProgress({ total: 0, processed: 0, successful: 0, failed: 0, percentage: 0 });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Empty file validation
                if (jsonData.length === 0) {
                    addLog('❌ No data found in file', 'error');
                    setUploading(false);
                    return;
                }

                // Row count validation (1000 rows max)
                if (jsonData.length > 1000) {
                    addLog('❌ Too many rows (max 1000). Please split into smaller files.', 'error');
                    setUploading(false);
                    return;
                }

                addLog(`📊 Found ${jsonData.length} rows. Starting validation...`, 'info');

                // Track duplicate emails within the file
                const seenEmails = new Set();
                const duplicateEmails = new Set();

                // Prepare members data and perform client-side validation
                const membersToProcess = [];
                const validationErrors = [];

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 1;

                    // Map Excel columns to member object
                    const memberData = {
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
                        joining_date: parseDate(row['Date of Joining'] || row['date_of_joining'] || row['DateOfJoining']),
                        birth_date: parseDate(row['Birth Date'] || row['birth_date'] || row['BirthDate']),
                        expiry_date: row['Expiry Date'] || row['expiry_date'] || row['ExpiryDate'] || null,
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
                        photo_url: row['Photo'] || row['photo'] || row['photo_url'] || null,
                        report_card_url: row['Report Card URL'] || row['report_card_url'] || null,
                        aadhaar_url: row['Photo ID Proof (Aadhaar card)'] || row['aadhaar_url'] || row['id_proof_url'] || null,
                        batches: row['Batches'] || row['batches'] || null,
                        display_name: row['Display Name'] || row['display_name'] ||
                            (row['First Name'] && row['Last Name'] ?
                                `${row['First Name']} ${row['Last Name']}`.trim() :
                                row['UserName'] || '')
                    };

                    // Validation
                    const errors = [];

                    const emailError = validateEmail(memberData.email);
                    if (emailError) errors.push(emailError);

                    const phoneError = validatePhone(memberData.phone);
                    if (phoneError) errors.push(phoneError);

                    // Check for duplicates within file
                    if (memberData.email) {
                        const emailLower = memberData.email.toLowerCase();
                        if (seenEmails.has(emailLower)) {
                            duplicateEmails.add(emailLower);
                            errors.push('Duplicate email in file');
                        } else {
                            seenEmails.add(emailLower);
                        }
                    }

                    if (errors.length > 0) {
                        validationErrors.push({ row: rowNum, email: memberData.email, errors });
                        setFailedRows(prev => [...prev, {
                            'Row': rowNum,
                            'Email': memberData.email || 'N/A',
                            'First Name': memberData.first_name,
                            'Last Name': memberData.last_name,
                            'Error': errors.join(', ')
                        }]);
                    } else {
                        membersToProcess.push(memberData);
                    }
                }

                // Log validation results
                if (validationErrors.length > 0) {
                    addLog(`⚠️ ${validationErrors.length} rows failed validation`, 'warning');
                    validationErrors.forEach(err => {
                        addLog(`❌ Row ${err.row} (${err.email}): ${err.errors.join(', ')}`, 'error');
                    });
                }

                if (membersToProcess.length === 0) {
                    addLog('❌ No valid rows to process', 'error');
                    setUploading(false);
                    return;
                }

                addLog(`✅ ${membersToProcess.length} rows passed validation. Starting upload...`, 'success');

                // Initialize progress
                setProgress({
                    total: membersToProcess.length,
                    processed: 0,
                    successful: 0,
                    failed: validationErrors.length,
                    percentage: 0
                });

                let successCount = 0;
                let failCount = validationErrors.length;

                // Process in batches of 10
                const BATCH_SIZE = 10;
                for (let i = 0; i < membersToProcess.length; i += BATCH_SIZE) {
                    const batch = membersToProcess.slice(i, i + BATCH_SIZE);

                    addLog(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(membersToProcess.length / BATCH_SIZE)}...`, 'info');

                    try {
                        const response = await fetch('/api/members/bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ members: batch })
                        });

                        const result = await response.json();

                        if (result.success && result.results) {
                            result.results.forEach(r => {
                                if (r.success) {
                                    addLog(`✅ Row ${r.rowIndex}: ${r.email}`, 'success');
                                    successCount++;
                                } else {
                                    addLog(`❌ Row ${r.rowIndex}: ${r.email} - ${r.errors?.join(', ')}`, 'error');
                                    failCount++;
                                    setFailedRows(prev => [...prev, {
                                        'Row': r.rowIndex,
                                        'Email': r.email,
                                        'Error': r.errors?.join(', ') || 'Unknown error'
                                    }]);
                                }
                            });
                        }

                        // Update progress
                        const processed = Math.min(i + BATCH_SIZE, membersToProcess.length);
                        setProgress({
                            total: jsonData.length,
                            processed: processed + validationErrors.length,
                            successful: successCount,
                            failed: failCount,
                            percentage: Math.round(((processed + validationErrors.length) / jsonData.length) * 100)
                        });

                    } catch (error) {
                        addLog(`❌ Batch error: ${error.message}`, 'error');
                        batch.forEach(member => {
                            failCount++;
                            setFailedRows(prev => [...prev, {
                                'Email': member.email,
                                'Error': 'Network/Server error'
                            }]);
                        });
                    }
                }

                addLog(`🎉 Upload complete! Success: ${successCount}, Failed: ${failCount}`, 'success');

                if (successCount > 0) {
                    // Refresh users list
                    await fetchUsers();

                    setTimeout(() => {
                        if (failCount === 0) {
                            onSuccess();
                        }
                    }, 2000);
                }

            } catch (error) {
                console.error('Error parsing file:', error);
                addLog(`❌ Error: ${error.message}`, 'error');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };


    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-semibold text-slate-900">Bulk Upload Members</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6">
                        <p className="text-sm text-slate-600 mb-3">
                            Upload an Excel file (.xlsx) with the following columns (only <strong className="text-slate-900 font-semibold">Email</strong> is required):
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div>1. UserName</div>
                            <div>11. Is_Active</div>
                            <div>2. First Name</div>
                            <div>12. Is_Blocked</div>
                            <div>3. Last Name</div>
                            <div>13. Birth Date</div>
                            <div>4. <strong className="font-semibold text-slate-700">Email</strong> (required)</div>
                            <div>14. Photo</div>
                            <div>5. Phone (10 digits)</div>
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
                        </div>

                        <div className="flex gap-2 my-4">
                            <button
                                className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                onClick={handleDownloadTemplate}
                            >
                                <Download size={14} className="mr-2" /> Download Template
                            </button>
                            {failedRows.length > 0 && (
                                <button
                                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-red-200 shadow-sm text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                    onClick={handleExportFailed}
                                >
                                    <Download size={14} className="mr-2" /> Export Failed ({failedRows.length})
                                </button>
                            )}
                        </div>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-400 transition-all group relative overflow-hidden">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                id="bulk-upload-input"
                            />
                            <div className="pointer-events-none">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                    {file ? file.name : 'Click to select Excel file'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Max 5MB, 1000 rows
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {progress.total > 0 && (
                        <div className="mb-6 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-medium text-slate-500">
                                    Progress: <span className="text-slate-900">{progress.processed}/{progress.total}</span>
                                </span>
                                <span className="text-sm font-bold text-blue-600">
                                    {progress.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            <div className="flex gap-4 text-xs font-medium">
                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                    <Check size={10} strokeWidth={3} /> Success: {progress.successful}
                                </span>
                                <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                    <X size={10} strokeWidth={3} /> Failed: {progress.failed}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-y-auto mb-2 min-h-[160px] max-h-[240px] shadow-inner">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                                <Activity size={20} className="mb-2" />
                                <span>Waiting for upload logs...</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className={`${log.color === '#ef4444' ? 'text-red-400 bg-red-900/10 -mx-2 px-2 py-0.5 rounded' : ''}`}>
                                        <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                        {log.message}
                                    </div>
                                ))}
                                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-lg">
                    <button
                        className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Close
                    </button>
                    <button
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Processing...
                            </>
                        ) : (
                            'Start Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Testpress Users Import Modal Component
const TestpressUsersImportModal = ({ isOpen, onClose }) => {
    const [importing, setImporting] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleImport = async () => {
        setImporting(true);
        setError(null);
        setResults(null);
        setProgress(null);

        try {
            // Start background job
            const response = await fetch('/api/testpress/sync-users-bg', {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start import');
            }

            setJobId(data.jobId);

            // Start polling for progress
            pollJobStatus(data.jobId);

        } catch (err) {
            setError(err.message);
            setImporting(false);
        }
    };

    const pollJobStatus = async (jobId) => {
        let retryCount = 0;
        const maxRetries = 3;

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/jobs/status?jobId=${jobId}`);

                if (!response.ok) {
                    // If job not found and retry count low, keep trying (job might not be created yet)
                    if (response.status === 404 && retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Job not found yet, retry ${retryCount}/${maxRetries}`);
                        return;
                    }

                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch job status');
                }

                const job = await response.json();
                console.log('Job status:', job.status, job.progress);

                // Update progress
                if (job.progress) {
                    setProgress(job.progress);
                }

                // Check if complete
                if (job.status === 'completed') {
                    clearInterval(pollInterval);
                    setResults({ total: job.results.total, results: job.results });
                    setImporting(false);

                    // Refresh page after 3 seconds
                    setTimeout(() => window.location.reload(), 3000);
                }

                // Check if failed
                if (job.status === 'failed') {
                    clearInterval(pollInterval);
                    setError(job.error || 'Import failed');
                    setImporting(false);
                }

            } catch (err) {
                console.error('Polling error:', err);
                clearInterval(pollInterval);
                setError(err.message);
                setImporting(false);
            }
        }, 2000); // Poll every 2 seconds
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Import Users from Testpress</h3>

                {results ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 font-bold text-emerald-800 mb-3">
                            <CheckCircle2 size={20} /> Import Complete!
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-emerald-700">
                            <div>📊 Total: <span className="font-semibold">{results.total}</span></div>
                            <div>✅ Imported: <span className="font-semibold">{results.results.imported}</span></div>
                            <div>🔄 Updated: <span className="font-semibold">{results.results.updated}</span></div>
                            <div>⏭️ Skipped: <span className="font-semibold">{results.results.skipped}</span></div>
                        </div>
                        {results.results.failed > 0 && (
                            <div className="text-red-600 text-sm mt-3 pt-3 border-t border-emerald-200 font-medium">
                                ❌ Failed: {results.results.failed}
                            </div>
                        )}
                        <div className="mt-4 text-xs text-emerald-600/70 italic flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" /> Page will refresh in 3 seconds...
                        </div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div>{error}</div>
                    </div>
                ) : importing ? (
                    <div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-6 mb-4 flex flex-col items-center justify-center text-center">
                            <RefreshCw size={32} className="text-blue-600 animate-spin mb-4" />
                            <div className="w-full">
                                {progress ? (
                                    <>
                                        <div className="font-medium text-slate-900 mb-2">{progress.message}</div>
                                        {progress.total > 0 && (
                                            <>
                                                <div className="text-xs text-slate-500 mb-2">
                                                    Progress: {progress.current} / {progress.total}
                                                </div>
                                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-slate-600">Starting import...</div>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 text-center">
                            💡 You can close this - import continues in background
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            Import all users from Testpress in the background. This may take several minutes for large datasets.
                        </p>
                        <button
                            onClick={handleImport}
                            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                        >
                            <RefreshCw size={18} /> Start Background Import
                        </button>
                    </>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        disabled={importing && !results}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {results ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PromoteMemberModal = ({ member, onClose, onSuccess }) => {
    const { institute } = useInstitute();
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [promoData, setPromoData] = useState({
        examTag: '',
        rank: '',
        marks: '',
        department: 'Civil',
        year: new Date().getFullYear(),
        quote: ''
    });

    useEffect(() => {
        const fetchConfigs = async () => {
            const { data } = await supabase
                .from('exam_configurations')
                .select('*')
                .eq('institute_id', institute?.id || 10)
                .order('created_at', { ascending: false });
            setConfigs(data || []);
            setLoading(false);
        };
        fetchConfigs();
    }, [institute?.id]);

    const handlePromote = async (e) => {
        e.preventDefault();
        if (!promoData.examTag) return;

        setSubmitting(true);
        const selectedConfig = configs.find(c => c.exam_tag === promoData.examTag);

        try {
            const res = await fetch('/api/admin/exams/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: member.id,
                    examTag: promoData.examTag,
                    examName: selectedConfig?.exam_name || promoData.examTag,
                    ...promoData
                })
            });
            const data = await res.json();
            if (data.success) {
                onSuccess();
            } else {
                alert(data.error || 'Promotion failed');
            }
        } catch (err) {
            console.error('Promotion error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Mark as Winner</h3>
                            <p className="text-sm font-medium text-slate-500">Promote {member?.displayName} to Achiever</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handlePromote} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Exam</label>
                        <select
                            required
                            value={promoData.examTag}
                            onChange={(e) => setPromoData({ ...promoData, examTag: e.target.value })}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none"
                        >
                            <option value="">Choose an exam...</option>
                            {configs.map(c => (
                                <option key={c.id} value={c.exam_tag}>{c.exam_name} ({c.exam_tag})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rank</label>
                            <input
                                type="text"
                                required
                                value={promoData.rank}
                                onChange={e => setPromoData({ ...promoData, rank: e.target.value })}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none"
                                placeholder="e.g. 71"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                            <input
                                type="number"
                                required
                                value={promoData.year}
                                onChange={e => setPromoData({ ...promoData, year: e.target.value })}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inspiring Quote</label>
                        <textarea
                            value={promoData.quote}
                            onChange={e => setPromoData({ ...promoData, quote: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none min-h-[100px]"
                            placeholder="A few words about their success..."
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 px-6 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading}
                            className="flex-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Promoting...' : 'Promote Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MembersManagement;
