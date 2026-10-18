'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { Book, ChevronRight, FileText, Folder, ArrowLeft, ShieldAlert } from 'lucide-react';

const StudentCourseChapters = ({ courseId }) => {
    const router = useRouter();
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        const fetchChapters = async () => {
            if (!courseId) return;

            try {
                const { data: courseData, error: courseError } = await supabase
                    .from('courses')
                    .select('title, platform_availability')
                    .eq('id', courseId)
                    .single();

                if (courseError) throw courseError;

                const currentPlatform = 'web';
                const platformAvailability = courseData?.platform_availability || {};

                if (platformAvailability && platformAvailability.web === false) {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                if (courseData) setCourse(courseData);

                const { data, error } = await supabase
                    .from('chapters')
                    .select(`
                        id,
                        name,
                        icon,
                        order,
                        chapter_contents (count)
                    `)
                    .eq('course_id', courseId)
                    .order('order', { ascending: true });

                if (error) throw error;

                const formattedChapters = data.map(ch => ({
                    ...ch,
                    title: ch.name,
                    image: ch.icon,
                    contentsCount: ch.chapter_contents ? ch.chapter_contents[0]?.count : 0
                }));

                setChapters(formattedChapters);
            } catch (err) {
                console.error('Error fetching chapters:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChapters();
    }, [courseId]);

    if (loading) {
        return (
            <div className="p-10 text-center text-gray-500">
                Loading chapters...
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="py-8 px-6 max-w-[600px] mx-auto min-h-screen flex items-center justify-center">
                <div className="text-center py-12 px-8 bg-red-50 rounded-2xl border border-red-200">
                    <div className="inline-flex p-4 bg-red-100 rounded-full mb-6">
                        <ShieldAlert size={48} className="text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-800 mb-4">
                        Access Restricted
                    </h2>
                    <p className="text-red-900 text-base mb-6 leading-relaxed">
                        This course is not available on web browsers. Please access it using the mobile app.
                    </p>
                    <button
                        onClick={() => router.push('/student/courses')}
                        className="py-3 px-6 bg-red-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors hover:bg-red-700"
                    >
                        Back to My Courses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8 px-6 max-w-[1000px] mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.push('/student/courses')}
                    className="flex items-center gap-2 bg-transparent border-none text-gray-500 cursor-pointer text-sm mb-4 p-0 hover:text-gray-700"
                >
                    <ArrowLeft size={16} /> Back to Courses
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                        <Book size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 m-0">
                            {course?.title || 'Course Chapters'}
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chapters List */}
            {chapters.length === 0 ? (
                <div className="text-center py-16 px-6 bg-gray-50 rounded-xl border border-gray-200">
                    <Folder size={48} className="text-gray-300 mb-4 mx-auto" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No chapters yet
                    </h3>
                    <p className="text-gray-500 text-sm">
                        This course doesn't have any chapters published yet.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {chapters.map((chapter, index) => (
                        <div
                            key={chapter.id}
                            onClick={() => router.push(`/student/course/${courseId}/chapter/${chapter.id}`)}
                            className={`py-5 px-6 cursor-pointer transition-colors flex items-center gap-4 hover:bg-gray-50 ${index < chapters.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            {/* Chapter Number/Icon */}
                            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 font-semibold">
                                {index + 1}
                            </div>

                            {/* Chapter Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-gray-900 m-0 mb-1 truncate">
                                    {chapter.title}
                                </h3>
                                <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <FileText size={14} />
                                    <span>{chapter.contentsCount || 0} {(chapter.contentsCount || 0) === 1 ? 'Content' : 'Contents'}</span>
                                </div>
                            </div>

                            <ChevronRight size={20} className="text-gray-400 shrink-0" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentCourseChapters;
