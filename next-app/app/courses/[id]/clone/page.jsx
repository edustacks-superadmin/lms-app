'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Copy, ArrowRight, Loader2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useInstitute } from '../../../../context/InstituteContext';

const CourseClonePage = () => {
    const router = useRouter();
    const { id } = useParams();
    const { institute } = useInstitute();

    const [course, setCourse] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                // Fetch course info
                const courseRes = await fetch(`/api/admin/courses/${id}`);
                const courseData = await courseRes.json();

                // Fetch basic chapters info for summary
                const chaptersRes = await fetch(`/api/admin/courses/${id}/chapters`);
                const chaptersData = await chaptersRes.json();

                if (courseData) {
                    setCourse(courseData);
                    setNewTitle(`Copy of ${courseData.title}`);
                }
                if (chaptersData) {
                    setChapters(chaptersData.chapters || []);
                }
            } catch (err) {
                console.error('Error fetching course details:', err);
                setError('Failed to load course details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCourseDetails();
        }
    }, [id]);

    const handleClone = async () => {
        if (!newTitle.trim()) return;
        setCloning(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/courses/${id}/clone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    institute_id: institute?.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to the new course's settings or manage page
                router.push(`/courses/${data.course.id}/settings`);
            } else {
                setError(data.error || 'Failed to clone course');
            }
        } catch (err) {
            console.error('Error cloning course:', err);
            setError('An unexpected error occurred');
        } finally {
            setCloning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={32} className="text-blue-600 animate-spin mb-3" />
                <p className="text-slate-500 font-medium">Loading course details...</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <AlertCircle size={48} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-semibold text-slate-900">Course Not Found</h2>
                <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <span onClick={() => router.push('/courses')} className="hover:text-blue-600 cursor-pointer transition-colors">Courses</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-medium">{course.title}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900">Clone</span>
            </div>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Copy size={24} className="text-blue-600" />
                    </div>
                    Duplicate Course
                </h1>
                <p className="text-slate-500 mt-2 ml-14 max-w-xl">
                    Create a new independently managed copy of this course, including all chapters and contents. User enrollments and progress will <strong>not</strong> be copied.
                </p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Source Course Info */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <BookOpen className="text-slate-300" />
                            )}
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Source Course</div>
                            <h3 className="text-lg font-bold text-slate-900">{course.title}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {chapters.length} Chapters</span>
                                {/* Add more stats if available */}
                            </div>
                        </div>
                    </div>

                    {/* New Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            New Course Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter new course title"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-base"
                            autoFocus
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            You can change this later in settings.
                        </p>
                    </div>

                    {/* Warning / Info */}
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-100 flex gap-3 items-start">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold mb-1">What will be copied?</p>
                            <ul className="list-disc list-inside space-y-1 opacity-90">
                                <li>Course details, settings, and thumbnail</li>
                                <li>All chapters and sections</li>
                                <li>All contents (videos, files, exams)</li>
                            </ul>
                            <p className="mt-2 text-xs opacity-75 pt-2 border-t border-amber-200/50">
                                Note: The new course will be set to <strong>Draft</strong> status by default.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-2 animate-in fade-in">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                        disabled={cloning}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClone}
                        disabled={!newTitle.trim() || cloning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
                    >
                        {cloning ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Cloning Course...
                            </>
                        ) : (
                            <>
                                <Copy size={18} /> Clone Course
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseClonePage;
