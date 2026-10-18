'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Trash2, Edit2, Users, Calendar, Clock, BookOpen, Link as LinkIcon, Copy, Loader, UserPlus, X, Search, CheckSquare, Square, ChevronDown, ChevronUp, ChevronLeft, UserMinus, Plus, Check } from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { useUsers } from '../context/UserContext';
import { useCourses } from '../context/CourseContext';

const BatchDetail = () => {
    const { id } = useParams();
    const router = useRouter();
    const navigate = (path) => router.push(path);
    const { batches, getBatch, getBatchMembers, getBatchCourses, removeMembersFromBatch, removeCoursesFromBatch, addMembersToBatch, addCoursesToBatch } = useBatches();
    const { users } = useUsers();
    const { courses: allCourses } = useCourses();

    const [activeTab, setActiveTab] = useState('overview');
    const [batch, setBatch] = useState(null);
    const [members, setMembers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCourses, setExpandedCourses] = useState({});
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);

    useEffect(() => {
        loadBatchDetails();
    }, [id]);

    const loadBatchDetails = async () => {
        try {
            setLoading(true);
            const batchData = getBatch(id);
            setBatch(batchData);

            const [membersData, coursesData] = await Promise.all([
                getBatchMembers(id),
                getBatchCourses(id)
            ]);

            setMembers(membersData || []);
            setCourses(coursesData || []);
        } catch (error) {
            console.error('Error loading batch details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (confirm('Remove this member from the batch?')) {
            try {
                await removeMembersFromBatch(id, [memberId]);
                await loadBatchDetails();
            } catch (error) {
                alert('Error removing member');
            }
        }
    };

    const handleRemoveCourse = async (courseId) => {
        try {
            await removeCoursesFromBatch(id, [courseId]);
            await loadBatchDetails();
        } catch (error) {
            console.error('Error removing course:', error);
            alert('Error removing course from batch');
        }
    };

    const handleAddMembers = async (selectedMemberIds) => {
        try {
            await addMembersToBatch(id, selectedMemberIds);
            await loadBatchDetails();
            setIsAddMemberModalOpen(false);
        } catch (error) {
            console.error('Error adding members:', error);
            alert('Error adding members to batch');
        }
    };

    const handleAddCourses = async (selectedCourseIds) => {
        try {
            await addCoursesToBatch(id, selectedCourseIds);
            await loadBatchDetails();
            setIsAddCourseModalOpen(false);
        } catch (error) {
            console.error('Error adding courses:', error);
            alert('Error adding courses to batch');
        }
    };


    const toggleCourseExpanded = (courseId) => {
        setExpandedCourses(prev => ({
            ...prev,
            [courseId]: !prev[courseId]
        }));
    };

    const filteredMembers = members.filter(member =>
        member.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="p-10 text-center">Loading...</div>;
    }

    if (!batch) {
        return <div className="p-10 text-center">Batch not found</div>;
    }

    return (
        <div className="flex-1 py-8 px-10">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/batches')}
                    className="flex items-center gap-2 bg-transparent border-none text-[var(--primary-color)] cursor-pointer text-sm mb-4 hover:underline"
                >
                    <ChevronLeft size={16} /> Back to Batches
                </button>
                <h2 className="text-2xl font-normal m-0">{batch.name}</h2>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
                <div className="flex gap-8">
                    {['overview', 'members', 'courses'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`bg-transparent border-none py-3 text-[15px] cursor-pointer capitalize transition-colors duration-200
                                ${activeTab === tab
                                    ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)] font-medium'
                                    : 'text-gray-600 border-b-2 border-transparent font-normal'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-8">
                        <div className="p-6 border border-gray-200 rounded-lg">
                            <div className="text-sm text-gray-600 mb-2">Total Members</div>
                            <div className="text-3xl font-medium text-[var(--primary-color)]">{batch.users}</div>
                        </div>
                        <div className="p-6 border border-gray-200 rounded-lg">
                            <div className="text-sm text-gray-600 mb-2">Total Courses</div>
                            <div className="text-3xl font-medium text-[var(--primary-color)]">{batch.courses}</div>
                        </div>
                        <div className="p-6 border border-gray-200 rounded-lg">
                            <div className="text-sm text-gray-600 mb-2">Created</div>
                            <div className="text-base font-normal text-gray-700">
                                {batch.created_at ? new Date(batch.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border border-gray-200 rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Batch Information</h3>
                        <div className="flex flex-col gap-3">
                            <div>
                                <span className="font-medium text-gray-600">Batch Name: </span>
                                <span>{batch.name}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Batch ID: </span>
                                <span>{batch.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'members' && (
                <div>
                    {/* Search */}
                    <div className="mb-5">
                        <div className="input-group w-[400px] relative">
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10"
                            />
                            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setIsAddMemberModalOpen(true)}
                            className="flex items-center gap-2 bg-[var(--primary-color)] text-white border-none py-2.5 px-5 rounded cursor-pointer text-sm font-medium hover:opacity-90"
                        >
                            <Plus size={18} /> Add Member
                        </button>
                    </div>

                    {/* Members Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Name</th>
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Email</th>
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Status</th>
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Joined</th>
                                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map(member => (
                                        <tr key={member.id} className="border-t border-gray-200">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    {member.photo_url && (
                                                        <img src={member.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                    )}
                                                    <span>{member.display_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{member.email}</td>
                                            <td className="py-3 px-4">
                                                <span className={`py-1 px-3 rounded-xl text-xs ${member.status === 'Student' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="bg-transparent border-none text-red-600 cursor-pointer text-sm flex items-center gap-1 ml-auto hover:underline"
                                                >
                                                    <UserMinus size={16} /> Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-10 text-center text-gray-400">
                                            {searchQuery ? 'No members found' : 'No members in this batch'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'courses' && (
                <div>
                    <div className="flex justify-end mb-5">
                        <button
                            onClick={() => setIsAddCourseModalOpen(true)}
                            className="flex items-center gap-2 bg-[var(--primary-color)] text-white border-none py-2.5 px-5 rounded cursor-pointer text-sm font-medium hover:opacity-90"
                        >
                            <Plus size={18} /> Add Course
                        </button>
                    </div>
                    {courses.length > 0 ? (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                            {courses.map(course => (
                                <div key={course.id} className="border border-gray-200 rounded-lg p-5 bg-white flex flex-col gap-3">
                                    <h3 className="text-base font-medium m-0">
                                        {course.title || course.name || course.course_name || 'Untitled Course'}
                                    </h3>
                                    {course.description && (
                                        <p className="text-sm text-gray-600 m-0 leading-relaxed">
                                            {course.description}
                                        </p>
                                    )}
                                    {course.assigned_at && (
                                        <div className="text-xs text-gray-400">
                                            Assigned: {new Date(course.assigned_at).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-auto">
                                        <button
                                            onClick={() => router.push(`/batches/edit/${id}`)}
                                            className="flex-1 py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm font-medium hover:bg-blue-700"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Remove "${course.title || course.name || 'this course'}" from batch?`)) {
                                                    handleRemoveCourse(course.id);
                                                }
                                            }}
                                            className="py-2 px-4 bg-white text-red-600 border border-red-600 rounded cursor-pointer text-sm font-medium hover:bg-red-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-16 text-center text-gray-400 border border-gray-200 rounded-lg">
                            No courses assigned to this batch
                        </div>
                    )}
                </div>
            )}
            {isAddMemberModalOpen && (
                <AddModal
                    title="Add Members to Batch"
                    items={users}
                    existingItems={members}
                    onClose={() => setIsAddMemberModalOpen(false)}
                    onAdd={handleAddMembers}
                    itemKey="id"
                    displayKey="displayName"
                    subDisplayKey="email"
                    searchPlaceholder="Search members..."
                />
            )}
            {isAddCourseModalOpen && (
                <AddModal
                    title="Add Courses to Batch"
                    items={allCourses}
                    existingItems={courses}
                    onClose={() => setIsAddCourseModalOpen(false)}
                    onAdd={handleAddCourses}
                    itemKey="id"
                    displayKey="title"
                    subDisplayKey="category"
                    searchPlaceholder="Search courses..."
                />
            )}
        </div>
    );
};

export default BatchDetail;

const AddModal = ({ title, items, existingItems, onClose, onAdd, itemKey, displayKey, subDisplayKey, searchPlaceholder }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);

    // Filter out items that are already in the batch
    const availableItems = items.filter(item =>
        !existingItems.some(existing => existing[itemKey] === item[itemKey])
    );

    const filteredItems = availableItems.filter(item => {
        const displayVal = item[displayKey] || '';
        const subDisplayVal = item[subDisplayKey] || '';
        const searchLower = search.toLowerCase();
        return displayVal.toLowerCase().includes(searchLower) || subDisplayVal.toLowerCase().includes(searchLower);
    });

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg w-[500px] max-h-[80vh] flex flex-col shadow-xl">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="m-0 text-lg font-medium">{title}</h3>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1"><X size={20} /></button>
                </div>

                <div className="p-5">
                    <div className="input-group mb-4">
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full p-2.5 rounded border border-gray-300"
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded">
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                                <div
                                    key={item[itemKey]}
                                    onClick={() => toggleSelect(item[itemKey])}
                                    className={`p-3 border-b border-gray-100 cursor-pointer flex items-center justify-between transition-colors ${selected.includes(item[itemKey]) ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <div>
                                        <div className="font-medium">{item[displayKey] || 'Untitled'}</div>
                                        {subDisplayKey && <div className="text-xs text-gray-600">{item[subDisplayKey]}</div>}
                                    </div>
                                    {selected.includes(item[itemKey]) && <Check size={16} className="text-[var(--primary-color)]" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-5 text-center text-gray-400">No items found</div>
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="py-2 px-4 border border-gray-300 bg-white rounded cursor-pointer hover:bg-gray-50">Cancel</button>
                    <button
                        onClick={() => onAdd(selected)}
                        disabled={selected.length === 0}
                        className={`py-2 px-4 text-white border-none rounded cursor-pointer ${selected.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:opacity-90'}`}
                    >
                        Add Selected ({selected.length})
                    </button>
                </div>
            </div>
        </div>
    );
};
