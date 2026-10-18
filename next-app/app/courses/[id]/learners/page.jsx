'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, ChevronUp, ChevronDown, Filter, Eye, ArrowLeft, ArrowRight, Download, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CourseLearnersPage = ({ params }) => {
    const router = useRouter();
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const [learners, setLearners] = useState([]);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('display_name');
    const [sortDirection, setSortDirection] = useState('asc');

    useEffect(() => {
        if (id) {
            fetchCourse();
            fetchLearners();
        }
    }, [id]);

    const fetchCourse = async () => {
        try {
            const res = await fetch(`/api/courses/${id}`);
            const data = await res.json();
            setCourse(data);
        } catch (error) {
            console.error('Error fetching course:', error);
            // Fallback for demo if API fails
            setCourse({ title: 'Course Details' });
        }
    };

    const fetchLearners = async () => {
        try {
            const res = await fetch(`/api/courses/${id}/learners`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setLearners(data);
            }
        } catch (error) {
            console.error('Error fetching learners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp size={14} className="text-slate-300" />;
        return <ChevronUp size={14} className={`text-slate-900 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />;
    };

    const sortedLearners = [...learners]
        .filter(l =>
            l.student?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case 'display_name':
                    aVal = a.student?.display_name || '';
                    bVal = b.student?.display_name || '';
                    break;
                case 'progress':
                    aVal = a.progress || 0;
                    bVal = b.progress || 0;
                    break;
                case 'exams':
                    aVal = a.exams_completed || 0;
                    bVal = b.exams_completed || 0;
                    break;
                case 'attachments':
                    aVal = a.attachments_viewed || 0;
                    bVal = b.attachments_viewed || 0;
                    break;
                default:
                    aVal = '';
                    bVal = '';
            }
            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

    return (
        <div className="w-full max-w-7xl mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <span onClick={() => router.push('/courses')} className="hover:text-blue-600 cursor-pointer transition-colors">Courses</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900 font-medium">{course?.title || 'Loading...'}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enrolled Students</h1>
                    <p className="text-slate-500 mt-1">Manage and track progress of students in this course.</p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Controls Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                    <div className="relative w-full sm:w-80">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors hidden sm:flex">
                            <Filter size={16} /> Filter
                        </button>
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
                            <Download size={16} /> Export
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th onClick={() => handleSort('display_name')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none">
                                    <div className="flex items-center gap-2">Student <SortIcon field="display_name" /></div>
                                </th>
                                <th onClick={() => handleSort('progress')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none">
                                    <div className="flex items-center gap-2">Progress <SortIcon field="progress" /></div>
                                </th>
                                <th onClick={() => handleSort('exams')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none">
                                    <div className="flex items-center gap-2">Exams <SortIcon field="exams" /></div>
                                </th>
                                <th onClick={() => handleSort('attachments')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none">
                                    <div className="flex items-center gap-2">Materials <SortIcon field="attachments" /></div>
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-slate-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300 mx-auto mb-3"></div>
                                        Loading student data...
                                    </td>
                                </tr>
                            ) : sortedLearners.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <User size={32} className="text-slate-300" />
                                        </div>
                                        <p className="font-medium text-slate-900">No students found</p>
                                        <p className="text-sm mt-1">Try adjusting your search criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedLearners.map((learner) => (
                                    <tr key={learner.enrollment_id} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                                                    {learner.student?.photo_url ? (
                                                        <img src={learner.student.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={18} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{learner.student?.display_name || learner.student?.first_name || 'Unknown User'}</p>
                                                    <p className="text-xs text-slate-500 truncate">{learner.student?.email || 'No email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${learner.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${learner.progress || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 w-10 text-right">{Math.round(learner.progress || 0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                ${learner.exams_completed === learner.total_exams && learner.total_exams > 0
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}>
                                                {learner.exams_completed || 0} / {learner.total_exams || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100">
                                                {learner.attachments_viewed || 0} / {learner.total_attachments || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => router.push(`/courses/${id}/learners/${learner.student?.id || learner.enrollment_id}`)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group-hover:text-slate-600"
                                                title="View Details"
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Placeholder */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <div>Showing {sortedLearners.length} students</div>
                    {/* Add actual pagination if needed later */}
                </div>
            </div>
        </div>
    );
};

export default CourseLearnersPage;
