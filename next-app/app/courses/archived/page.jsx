'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Trash2, FileText, Clock } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';
import ConfirmModal from '../../../components/ConfirmModal';

const ArchivedCoursesPage = () => {
    const router = useRouter();
    const { institute } = useInstitute();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, course: null });
    const [restoreModal, setRestoreModal] = useState({ isOpen: false, course: null });

    const AUTO_DELETE_DAYS = 30;

    const fetchArchivedCourses = async () => {
        if (!institute?.id) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/admin/courses/archived?institute_id=${institute.id}`);
            const data = await response.json();

            if (response.ok) {
                setCourses(data.courses || []);
            } else {
                console.error('Error:', data.error);
            }
        } catch (error) {
            console.error('Error fetching archived courses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (institute?.id) {
            fetchArchivedCourses();
        }
    }, [institute?.id]);

    const handleRestore = async (course) => {
        setRestoreModal({ isOpen: true, course });
    };

    const confirmRestore = async () => {
        const courseId = restoreModal.course?.id;
        if (!courseId) return;

        setActionLoading(courseId);
        try {
            const response = await fetch('/api/admin/courses/archived', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId, action: 'restore' })
            });

            if (response.ok) {
                fetchArchivedCourses();
            } else {
                const data = await response.json();
                alert('Failed to restore: ' + data.error);
            }
        } catch (error) {
            console.error('Error restoring course:', error);
            alert('Failed to restore course');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (course) => {
        setDeleteModal({ isOpen: true, course });
    };

    const confirmDelete = async () => {
        const courseId = deleteModal.course?.id;
        if (!courseId) return;

        setActionLoading(courseId);
        try {
            const response = await fetch('/api/admin/courses/archived', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId, action: 'delete' })
            });

            if (response.ok) {
                fetchArchivedCourses();
            } else {
                const data = await response.json();
                alert('Failed to delete: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Failed to delete course');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getDaysUntilDelete = (archivedAt) => {
        if (!archivedAt) return null;
        const archiveDate = new Date(archivedAt);
        const deleteDate = new Date(archiveDate);
        deleteDate.setDate(deleteDate.getDate() + AUTO_DELETE_DAYS);

        const now = new Date();
        const diffTime = deleteDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Overdue';
        if (diffDays === 1) return '1 day';
        return `${diffDays} days`;
    };

    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Breadcrumb */}
            <div className="mb-2 text-sm">
                <span
                    className="text-[var(--primary-color)] cursor-pointer hover:underline"
                    onClick={() => router.push('/courses')}
                >
                    Courses
                </span>
                <span className="text-gray-400 mx-2">&gt;</span>
                <span className="text-gray-500">Archived Courses</span>
            </div>

            {/* Header */}
            <h1 className="text-2xl font-medium mb-6 text-gray-800">
                Archived Courses
            </h1>

            {/* Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_200px_180px_220px] py-3 px-4 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-500">
                    <div>Title</div>
                    <div>Archived on</div>
                    <div>Will be deleted in</div>
                    <div className="text-center">Actions</div>
                </div>

                {/* Table Body */}
                {loading ? (
                    <div className="p-10 text-center text-gray-500">
                        Loading archived courses...
                    </div>
                ) : courses.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <FileText size={48} className="text-gray-300 mb-3 mx-auto" />
                        <p>No archived courses</p>
                    </div>
                ) : (
                    courses.map((course) => (
                        <div
                            key={course.id}
                            className="grid grid-cols-[1fr_200px_180px_220px] p-4 border-b border-gray-200 items-center hover:bg-gray-50"
                        >
                            {/* Title with icon */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {course.image ? (
                                        <img
                                            src={course.image}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <FileText size={20} className="text-gray-400" />
                                    )}
                                </div>
                                <span className="font-medium text-gray-900">
                                    {course.title}
                                </span>
                            </div>

                            {/* Archived on */}
                            <div className="text-sm text-gray-500">
                                {formatDate(course.archived_at)}
                            </div>

                            {/* Will be deleted in */}
                            <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                <Clock size={14} />
                                {getDaysUntilDelete(course.archived_at)}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => handleRestore(course)}
                                    disabled={actionLoading === course.id}
                                    className={`bg-transparent border-none text-emerald-500 cursor-pointer text-sm font-medium flex items-center gap-1 hover:underline ${actionLoading === course.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Restore
                                </button>
                                <button
                                    onClick={() => handleDelete(course)}
                                    disabled={actionLoading === course.id}
                                    className={`bg-transparent border-none text-red-500 cursor-pointer text-sm font-medium flex items-center gap-1 hover:underline ${actionLoading === course.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Delete Permanently
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info note */}
            <p className="mt-4 text-sm text-gray-400 flex items-center gap-1.5">
                <Clock size={14} />
                Archived courses will be automatically deleted after {AUTO_DELETE_DAYS} days.
            </p>

            {/* Modals */}
            <ConfirmModal
                isOpen={restoreModal.isOpen}
                onClose={() => setRestoreModal({ isOpen: false, course: null })}
                onConfirm={confirmRestore}
                title="Restore Course"
                message="Are you sure you want to restore this course? It will be moved back to your active courses list."
                confirmText="Restore Course"
                type="primary"
            />

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, course: null })}
                onConfirm={confirmDelete}
                title="Delete Permanently"
                message="Are you sure you want to PERMANENTLY delete this course? This action is irreversible and all course data will be lost forever."
                itemName={deleteModal.course?.title}
                confirmText="Delete Permanently"
            />
        </div>
    );
};

export default ArchivedCoursesPage;
