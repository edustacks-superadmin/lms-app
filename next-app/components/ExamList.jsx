'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Info, Edit, Trash2, BarChart3, FileQuestion, Copy, FileDown, Play, Printer } from 'lucide-react';
import { useExams } from '../context/ExamContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { exportExamToPDF } from '../utils/pdfExport';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import PrintPreviewModal from './PrintPreviewModal';
import AdvancedPagination from './AdvancedPagination';
import { useInstitute } from '../context/InstituteContext';
import { SkeletonList } from './SkeletonLoader';

const ExamList = ({ activeTab = 'running', selectedCourses = [], selectedTags = [] }) => {
    const { deleteExam, cloneExam, fetchExamQuestions } = useExams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { institute } = useInstitute();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, exam: null });
    const [printModal, setPrintModal] = useState({ isOpen: false, exam: null });

    // Initialize page from URL or default to 1
    const [currentPage, setCurrentPage] = useState(() => {
        const pageParam = searchParams.get('page');
        return pageParam ? parseInt(pageParam) : 1;
    });

    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNext: false,
        hasPrev: false
    });

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch exams from API
    useEffect(() => {
        if (institute?.id) {
            fetchExams();
        }
    }, [activeTab, currentPage, debouncedSearchQuery, institute?.id, searchParams]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: activeTab,
                page: currentPage.toString(),
                ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
                instituteId: institute?.id
            });

            // Add course filter from URL
            const courseId = searchParams.get('courseId');
            if (courseId) {
                params.set('courseId', courseId);
            }

            // Add tags filter from URL
            const tags = searchParams.get('tags');
            if (tags) {
                params.set('tags', tags);
            }

            const response = await fetch(`/api/exams?${params}`);
            const data = await response.json();

            if (data.exams) {
                setExams(data.exams);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (exam) => {
        setDeleteModal({ isOpen: true, exam });
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.exam) {
            try {
                await deleteExam(deleteModal.exam.id);
                setExams(prev => prev.filter(e => e.id !== deleteModal.exam.id));
                setDeleteModal({ isOpen: false, exam: null });
                fetchExams();
            } catch (error) {
                console.error('Error deleting exam:', error);
                alert('Failed to delete exam');
            }
        }
    };

    const handleClone = async (id) => {
        if (!window.confirm('Are you sure you want to clone this exam?')) return;
        try {
            setLoading(true);
            await cloneExam(id);
            await fetchExams();
            alert('Exam cloned successfully!');
        } catch (error) {
            console.error('Error cloning exam:', error);
            alert('Failed to clone exam');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async (exam) => {
        try {
            setLoading(true);
            const questions = await fetchExamQuestions(exam.id);
            if (!questions || questions.length === 0) {
                alert('No questions found for this exam.');
                return;
            }
            await exportExamToPDF(exam, questions);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF');
        } finally {
            setLoading(false);
        }
    };

    const handleTakeExam = (exam) => {
        const previewUrl = `/student/exam/${exam.id}/take`;
        window.open(previewUrl, '_blank');
    };

    // Track initial mount to prevent resetting page on load
    const isFirstRun = useRef(true);

    // Reset to page 1 when tab or search changes
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        // Only reset if we are NOT already on page 1
        if (currentPage !== 1) {
            setCurrentPage(1);
            // Also update URL to reflect page 1
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [activeTab, selectedCourses, selectedTags, debouncedSearchQuery]);

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

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto">
            {/* Top Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-1">
                <h2 className="text-2xl font-bold text-gray-900">
                    {activeTab === 'running' ? 'Running Tests' : activeTab === 'upcoming' ? 'Upcoming Tests' : 'Completed Tests'}
                </h2>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Search exams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            // Removed onKeyDown logic as it is now auto-debounced
                            className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {loading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <Search size={18} />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Showing Info */}
            <div className="py-3 text-sm text-gray-500 border-t border-gray-100 mb-2 px-1">
                Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, pagination.totalCount)} of {pagination.totalCount} {activeTab} exams
            </div>

            {/* Exam Items */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    <SkeletonList count={5} />
                ) : exams.length === 0 ? (
                    <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                        {searchQuery
                            ? 'No exams match your search.'
                            : `No ${activeTab} exams found.`}
                    </div>
                ) : (
                    exams.map((exam) => (
                        <div
                            key={exam.id}
                            className="group flex flex-col xl:flex-row gap-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h3
                                        className="text-lg font-bold text-gray-900 group-hover:text-blue-600 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/exams/edit/${exam.id}`)}
                                    >
                                        {exam.title}
                                    </h3>
                                    {exam.is_active ? (
                                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100">
                                            Draft
                                        </span>
                                    )}
                                </div>

                                <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                                    <span className="font-medium">Course:</span>
                                    {exam.course_exams && exam.course_exams.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {exam.course_exams.map((ce, idx) => (
                                                <span key={ce.courses?.id || idx} className="flex items-center">
                                                    {idx > 0 && <span className="mr-1">,</span>}
                                                    <span
                                                        className="text-blue-600 hover:underline cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/courses/${ce.courses?.id}/chapters`);
                                                        }}
                                                    >
                                                        {ce.courses?.title}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Not assigned to any course</span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">Start:</span>
                                        <span className="font-medium text-gray-900">
                                            {exam.start_date ? new Date(exam.start_date).toLocaleString('en-GB', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', hour12: true
                                            }) : 'N/A'}
                                        </span>
                                    </div>
                                    {exam.end_date && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">End:</span>
                                            <span className="font-medium text-gray-900">
                                                {new Date(exam.end_date).toLocaleString('en-GB', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {exam.description && (
                                    <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                                        {exam.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 border-t xl:border-t-0 xl:border-l border-gray-100 pt-4 xl:pt-0 xl:pl-6">
                                <div className="flex flex-row lg:flex-col gap-y-2 gap-x-6 text-sm text-gray-600 min-w-[140px]">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-gray-400" />
                                        <span>{exam.duration_minutes} mins</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Info size={16} className="text-gray-400" />
                                        <span>{exam.total_marks || 0} marks • {exam.number_of_questions || 0} Qs</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BarChart3 size={16} className="text-gray-400" />
                                        <span>{exam.attempts_count || 0} Attempts</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full sm:w-auto">
                                    {/* Primary Actions */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => router.push(`/exams/${exam.id}/statistics`)}
                                            title="Statistics"
                                        >
                                            <BarChart3 size={18} />
                                        </button>
                                        <button
                                            className="p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => router.push(`/exams/${exam.id}/questions`)}
                                            title="Manage Questions"
                                        >
                                            <FileQuestion size={18} />
                                        </button>
                                        <button
                                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => router.push(`/exams/edit/${exam.id}`)}
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(exam)}
                                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                                            title="Delete Exam"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Secondary Actions */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => handleClone(exam.id)}
                                            title="Clone Exam"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => handleExportPDF(exam)}
                                            title="Export to PDF"
                                        >
                                            <FileDown size={18} />
                                        </button>
                                        <button
                                            className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => handleTakeExam(exam)}
                                            title="Take Exam (Preview)"
                                        >
                                            <Play size={18} />
                                        </button>
                                        <button
                                            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center"
                                            onClick={() => setPrintModal({ isOpen: true, exam })}
                                            title="Print Preview"
                                        >
                                            <Printer size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="mt-8">
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
            )}

            {/* Print Preview Modal */}
            <PrintPreviewModal
                isOpen={printModal.isOpen}
                onClose={() => setPrintModal({ isOpen: false, exam: null })}
                exam={printModal.exam}
                onPreview={(queryString) => {
                    window.open(`/exams/${printModal.exam.id}/print?${queryString}`, '_blank');
                }}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, exam: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Exam"
                message="Deleting this exam will remove all associated questions and student results. This action cannot be undone."
                itemName={deleteModal.exam?.title}
                confirmText="Delete Exam"
            />
        </div>
    );
};

export default ExamList;
