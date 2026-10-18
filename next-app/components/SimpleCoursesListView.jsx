'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, Monitor, Smartphone, Laptop, ShieldAlert } from 'lucide-react';

const SimpleCoursesListView = ({ courses }) => {
    const router = useRouter();

    if (!courses || courses.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-gray-50 rounded-xl border border-gray-200">
                <BookOpen size={48} className="text-gray-300 mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2 text-gray-700">
                    No courses yet
                </h3>
                <p className="text-gray-500 text-sm">
                    You haven't enrolled in any courses yet.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {courses.map((enrollment, index) => {
                const course = enrollment.courses;

                // Calculate counts safely
                const chaptersCount = course.chapters?.length || 0;
                let contentsCount = 0;
                if (course.chapters && Array.isArray(course.chapters)) {
                    contentsCount = course.chapters.reduce((sum, ch) => {
                        if (ch.chapter_contents && Array.isArray(ch.chapter_contents) && ch.chapter_contents[0]) {
                            return sum + (ch.chapter_contents[0].count || 0);
                        }
                        return sum;
                    }, 0);
                }

                // Check platform availability (for web browser)
                const platformAvailability = course.platform_availability || { web: true, mobile: true, desktop: true };
                const isAccessibleOnWeb = platformAvailability.web !== false;
                const availablePlatforms = [
                    platformAvailability.web !== false ? 'web' : null,
                    platformAvailability.mobile !== false ? 'mobile' : null,
                    platformAvailability.desktop !== false ? 'desktop' : null
                ].filter(Boolean);

                return (
                    <div
                        key={enrollment.id}
                        onClick={isAccessibleOnWeb ? () => router.push(`/student/course/${enrollment.course_id}`) : undefined}
                        className={`p-4 flex items-center gap-4 transition-colors ${index < courses.length - 1 ? 'border-b border-gray-100' : ''} ${isAccessibleOnWeb ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-60'}`}
                    >
                        {/* Left Image/Icon */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-blue-50 flex items-center justify-center flex-shrink-0">
                            {course.image_url ? (
                                <img
                                    src={course.image_url}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <BookOpen size={24} className="text-blue-600" />
                            )}
                        </div>

                        {/* Right Info */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <h3 className={`text-base font-semibold m-0 overflow-hidden text-ellipsis whitespace-nowrap leading-tight ${isAccessibleOnWeb ? 'text-gray-900' : 'text-gray-400'}`}>
                                {course?.title || 'Untitled Course'}
                                {!isAccessibleOnWeb && (
                                    <span className="inline-block ml-2 py-0.5 px-2 bg-red-50 border border-red-200 rounded text-[11px] font-semibold text-red-600">
                                        ⚠ Web Restricted
                                    </span>
                                )}
                            </h3>
                            <div className="text-[13px] text-gray-500 flex items-center gap-2 flex-wrap">
                                <span>{chaptersCount} Chapters • {contentsCount} Contents</span>
                                {!isAccessibleOnWeb && availablePlatforms.length > 0 && (
                                    <span className="text-[11px] text-blue-500 flex items-center gap-1">
                                        • Available on:
                                        {availablePlatforms.includes('mobile') && <Smartphone size={12} />}
                                        {availablePlatforms.includes('desktop') && <Laptop size={12} />}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                    </div>
                );
            })}
        </div>
    );
};

export default SimpleCoursesListView;
