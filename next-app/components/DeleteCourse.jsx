'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCourses } from '../context/CourseContext';
import { Trash2, AlertTriangle, Archive, X, RotateCcw, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const DeleteCourse = () => {
    const router = useRouter();
    const { id } = useParams();
    const { archiveCourse, restoreCourse, permanentlyDeleteCourse } = useCourses();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPermanentDelete, setShowPermanentDelete] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await fetch(`/api/admin/courses/${id}`);
                if (!response.ok) throw new Error('Failed to fetch course');
                const data = await response.json();
                setCourse(data);
            } catch (err) {
                console.error('Error fetching course:', err);
                setCourse(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCourse();
        }
    }, [id]);

    if (loading) {
        return <div className="p-5">Loading...</div>;
    }

    if (!course) {
        return <div className="p-5">Course not found</div>;
    }

    const handleArchive = async () => {
        const result = await archiveCourse(id);
        if (result.success) {
            router.push('/courses');
        } else {
            alert('Failed to archive course: ' + result.error);
        }
    };

    const handleRestore = async () => {
        const result = await restoreCourse(id);
        if (result.success) {
            router.push('/courses');
        } else {
            alert('Failed to restore course: ' + result.error);
        }
    };

    const handlePermanentDelete = async () => {
        if (!window.confirm('This action CANNOT be undone. Are you absolutely sure you want to permanently delete this course and all its chapters?')) {
            return;
        }
        const result = await permanentlyDeleteCourse(id);
        if (result.success) {
            router.push('/courses');
        } else {
            alert('Failed to delete course: ' + result.error);
        }
    };

    const isArchived = course.is_archived;

    return (
        <div className="flex-1">
            <div className="mb-5">
                <span className="text-[var(--primary-color)] text-sm">Courses</span>
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-gray-600 text-sm">{course.title}</span>
            </div>

            <h2 className="text-2xl font-normal mb-8 border-b border-gray-200 pb-4">
                {isArchived ? 'Restore or Delete' : 'Archive'} - {course.title}
            </h2>

            <div className="max-w-3xl">
                {isArchived ? (
                    // Course is already archived - show restore or permanent delete options
                    <>
                        <div className="p-4 bg-blue-50 rounded-lg mb-5 flex items-start gap-3">
                            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-blue-600 font-medium">
                                    This course is archived
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Archived on: {course.archived_at ? new Date(course.archived_at).toLocaleString() : 'Unknown'}
                                </p>
                            </div>
                        </div>

                        <p className="text-base text-gray-700 mb-5">
                            You can restore this course to make it active again, or permanently delete it.
                        </p>

                        <div className="flex gap-2.5 flex-wrap">
                            <button
                                className="btn bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300"
                                onClick={() => router.push('/courses')}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn bg-green-500 text-white border-none flex items-center gap-2 hover:bg-green-600"
                                onClick={handleRestore}
                            >
                                <RotateCcw size={16} />
                                Restore Course
                            </button>
                            <button
                                className="btn bg-red-600 text-white border-none flex items-center gap-2 hover:bg-red-700"
                                onClick={handlePermanentDelete}
                            >
                                <Trash2 size={16} />
                                Permanently Delete
                            </button>
                        </div>

                        <div className="mt-6 p-3 bg-orange-50 rounded-lg flex items-start gap-3">
                            <AlertTriangle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-orange-600">
                                <strong>Warning:</strong> Permanently deleting a course cannot be undone. All chapters and content will be lost forever.
                            </p>
                        </div>
                    </>
                ) : (
                    // Course is active - show archive option
                    <>
                        <p className="text-base text-gray-700 mb-5">
                            Are you sure you want to archive the course "{course.title}"?
                        </p>
                        <p className="text-sm text-gray-600 mb-8">
                            Archiving will hide this course from the active list. You can restore it later from the Archived section.
                            All chapters and content will be preserved.
                        </p>

                        <div className="flex gap-2.5">
                            <button
                                className="btn bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300"
                                onClick={() => router.push('/courses')}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn bg-orange-500 text-white border-none flex items-center gap-2 hover:bg-orange-600"
                                onClick={handleArchive}
                            >
                                <Archive size={16} />
                                Archive Course
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DeleteCourse;
