'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UserPlus, X, Search, Users, ChevronDown, Trash2, Mail, Calendar, Shield, AlertCircle } from 'lucide-react';
import { useInstitute } from '../../../../context/InstituteContext';

const COURSE_ROLES = [
    { value: 'mentor', label: 'Mentor', description: 'Can view learners, answer doubts, grade assignments' },
    { value: 'staff', label: 'Staff', description: 'Can manage content, upload materials' },
    { value: 'content_manager', label: 'Content Manager', description: 'Can edit course content only' },
    { value: 'assistant', label: 'Assistant', description: 'Limited access, view-only' }
];

const CourseStaffsPage = () => {
    const router = useRouter();
    const { id } = useParams();
    const { institute } = useInstitute();

    const [course, setCourse] = useState(null);
    const [staff, setStaff] = useState([]);
    const [availableMembers, setAvailableMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('staff');
    const [actionLoading, setActionLoading] = useState(null);

    // Fetch course details
    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await fetch(`/api/admin/courses/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setCourse(data);
                }
            } catch (error) {
                console.error('Error fetching course:', error);
            }
        };
        if (id) fetchCourse();
    }, [id]);

    // Fetch assigned staff
    const fetchStaff = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/courses/${id}/staffs`);
            if (response.ok) {
                const data = await response.json();
                setStaff(data.staff || []);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchStaff();
    }, [id]);

    // Fetch available staff members when modal opens
    const fetchAvailableMembers = async (search = '') => {
        if (!institute?.id) return;
        try {
            const response = await fetch(`/api/admin/members/staff?institute_id=${institute.id}&search=${search}`);
            if (response.ok) {
                const data = await response.json();
                // Filter out already assigned members
                const assignedIds = staff.map(s => s.member_id);
                const available = (data.members || []).filter(m => !assignedIds.includes(m.id));
                setAvailableMembers(available);
            }
        } catch (error) {
            console.error('Error fetching available members:', error);
        }
    };

    useEffect(() => {
        if (showAddModal) {
            fetchAvailableMembers(searchQuery);
        }
    }, [showAddModal, searchQuery, institute?.id]);

    const handleAddStaff = async (memberId) => {
        setActionLoading(memberId);
        try {
            const response = await fetch(`/api/admin/courses/${id}/staffs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: memberId, role: selectedRole })
            });

            if (response.ok) {
                fetchStaff();
                setShowAddModal(false);
                setSearchQuery('');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add staff');
            }
        } catch (error) {
            console.error('Error adding staff:', error);
            alert('Failed to add staff');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveStaff = async (staffId) => {
        if (!confirm('Remove this staff member from the course?')) return;

        setActionLoading(staffId);
        try {
            const response = await fetch(`/api/admin/courses/${id}/staffs?staff_id=${staffId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchStaff();
            } else {
                alert('Failed to remove staff');
            }
        } catch (error) {
            console.error('Error removing staff:', error);
            alert('Failed to remove staff');
        } finally {
            setActionLoading(null);
        }
    };

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'mentor': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'staff': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'content_manager': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'assistant': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <span onClick={() => router.push('/courses')} className="hover:text-blue-600 cursor-pointer transition-colors">Courses</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900 font-medium">{course?.title || 'Loading...'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="text-blue-600" size={24} /> Course Staff
                    </h1>
                    <p className="text-slate-500 mt-1">Manage mentors, assistants, and staff assigned to this course.</p>
                </div>
                <div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all font-medium text-sm"
                    >
                        <UserPlus size={18} />
                        Add Staff Member
                    </button>
                </div>
            </div>

            {/* Staff List Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_150px_180px_100px] gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                    <div>Member</div>
                    <div>Course Role</div>
                    <div>Added On</div>
                    <div className="text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-50">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300 mb-3"></div>
                            Loading staff members...
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Users size={32} className="text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-900">No staff assigned yet</p>
                            <p className="text-sm mt-1 max-w-xs text-center">Add mentors or assistants to help manage this course.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 text-blue-600 font-medium text-sm hover:underline"
                            >
                                Add first member
                            </button>
                        </div>
                    ) : (
                        staff.map((s) => (
                            <div key={s.id} className="grid grid-cols-[1fr_150px_180px_100px] gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors group">
                                {/* Member Info */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 text-slate-500 font-medium">
                                        {s.members?.photo_url ? (
                                            <img src={s.members.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            (s.members?.first_name?.[0] || 'U').toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-900 truncate">
                                            {s.members?.first_name} {s.members?.last_name}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                            <Mail size={12} /> {s.members?.email}
                                        </div>
                                    </div>
                                </div>

                                {/* Role */}
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeStyle(s.role)} capitalize`}>
                                        {s.role.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Date */}
                                <div className="text-sm text-slate-500 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-slate-400" />
                                    {new Date(s.created_at).toLocaleDateString()}
                                </div>

                                {/* Actions */}
                                <div className="text-right">
                                    <button
                                        onClick={() => handleRemoveStaff(s.id)}
                                        disabled={actionLoading === s.id}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Remove from course"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Add Staff to Course</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Role Selection */}
                        <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                Assign Role
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm appearance-none cursor-pointer"
                                >
                                    {COURSE_ROLES.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 ml-1">
                                {COURSE_ROLES.find(r => r.value === selectedRole)?.description}
                            </p>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search staff by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Member List */}
                        <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
                            {availableMembers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                                    <AlertCircle size={24} className="mb-2 opacity-50" />
                                    <p className="text-sm">No available staff members found</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {availableMembers.map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => handleAddStaff(member.id)}
                                            disabled={actionLoading === member.id}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left group disabled:opacity-50"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                                                {member.photo_url ? (
                                                    <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-500">{(member.first_name?.[0] || 'U').toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                    {member.first_name} {member.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate">{member.email}</div>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-lg capitalize">
                                                {member.role || 'Member'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseStaffsPage;
