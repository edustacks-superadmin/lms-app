'use client';

import React, { useEffect, useMemo } from 'react';
import {
    BookOpen, Settings, Lock, Copy, Users, DollarSign,
    FileText, Tag, Layers, GraduationCap, ClipboardList,
    MessageSquare, Trash2, ArrowLeft, MoreHorizontal, BarChart
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useChapters } from '../context/ChapterContext';

const CourseManageSidebar = ({ courseId }) => {
    const router = useRouter();
    const pathname = usePathname();
    const id = courseId; // Passed from parent page
    const { chapters, fetchChapters } = useChapters();

    const lastFetchedId = React.useRef(null);

    useEffect(() => {
        if (id && lastFetchedId.current !== id) {
            // If we already have chapters for this course, mark as fetched and skip
            if (chapters && chapters.length > 0 && chapters[0].course_id == id) {
                lastFetchedId.current = id;
                return;
            }

            // Otherwise fetch
            fetchChapters(id);
            lastFetchedId.current = id;
        }
    }, [id, chapters, fetchChapters]);

    const contentCount = useMemo(() => {
        if (!chapters) return 0;

        return chapters.reduce((total, chapter) => {
            // Only count contents if the chapter belongs to the current course (safety check)
            if (chapter.course_id != id) return total;
            return total + (chapter.chapter_contents?.length || 0);
        }, 0);
    }, [chapters, id]);

    const menuItems = [
        { name: 'Contents', icon: BookOpen, count: contentCount, path: `/courses/${id}/chapters` },
        { name: 'Settings', icon: Settings, path: `/courses/${id}/settings` },
        { name: 'Access Control', icon: Lock, path: `/courses/${id}/access-control` },
        { name: 'Clone', icon: Copy, path: `/courses/${id}/clone` },
        { name: 'Add Staffs', icon: Users, path: `/courses/${id}/staffs` },
        { isSeparator: true },




        { name: 'Learners', icon: GraduationCap, path: `/courses/${id}/learners` },
        { name: 'Video Statistics', icon: BarChart, path: `/courses/${id}/video-stats` },
        { name: 'Assignments', icon: ClipboardList, comingSoon: true },
        { name: 'Feedback', icon: MessageSquare, path: `/courses/${id}/feedback` },
        { isSeparator: true },
        { name: 'Delete', icon: Trash2, path: `/courses/${id}/delete`, isDestructive: true },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-4">
                <button
                    onClick={() => router.push('/courses')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors mb-6 text-sm font-medium w-full"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Courses</span>
                </button>

                <div className="space-y-1">
                    {menuItems.map((item, index) => {
                        if (item.isSeparator) {
                            return <div key={index} className="h-px bg-slate-100 my-3 mx-2" />;
                        }

                        const isActive = item.path && pathname === item.path;
                        const isDestructive = item.isDestructive;
                        const isDisabled = item.comingSoon || !item.path;

                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    if (item.path && !isDisabled) {
                                        router.push(item.path);
                                    }
                                }}
                                disabled={isDisabled}
                                className={`
                                    w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                        : isDestructive
                                            ? 'text-red-600 hover:bg-red-50'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                    ${isDisabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={isActive ? 'text-blue-600' : isDestructive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-500'} />
                                    <span>{item.name}</span>
                                </div>

                                {item.count !== undefined && item.count !== null && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                        {item.count}
                                    </span>
                                )}

                                {item.comingSoon && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        Soon
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};

export default CourseManageSidebar;
