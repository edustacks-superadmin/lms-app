'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check, BookOpen } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useInstitute } from '../context/InstituteContext';

const CourseFilter = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { institute } = useInstitute();

    // Dropdown State
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Data State
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Derived state
    const currentCourseId = searchParams.get('courseId');
    // We need the selected course object to display its title even when list is not fully loaded
    // Ensure loose comparison or string conversion for IDs as URL params are strings
    const selectedCourse = courses.find(c => String(c.id) === currentCourseId);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch courses with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) {
                fetchCourses(1, true);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, institute?.id, isOpen]);

    // Initial fetch for pre-selected course
    useEffect(() => {
        const fetchInitialCourse = async () => {
            if (currentCourseId && !selectedCourse && !loading) {
                // Fetch the specific course to get its title
                try {
                    const response = await fetch(`/api/admin/courses/${currentCourseId}`);
                    if (response.ok) {
                        const courseData = await response.json();
                        // Add to list if valid
                        if (courseData) {
                            setCourses(prev => {
                                // Prevent duplicates
                                if (prev.some(c => c.id === courseData.id)) return prev;
                                return [courseData, ...prev];
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching initial course:', error);
                }
            }
        };

        if (currentCourseId) {
            fetchInitialCourse();
        }
    }, [currentCourseId]); // Removed selectedCourse dependence to avoid loops, handled by logic

    const fetchCourses = async (pageNum, reset = false) => {
        if (!institute?.id) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: '10',
                search: searchTerm,
                institute_id: institute.id,
                archived: 'false'
            });

            const response = await fetch(`/api/admin/courses?${params}`);
            const data = await response.json();

            if (data.data) {
                setCourses(prev => {
                    const newCourses = reset ? data.data : [...prev, ...data.data];
                    return Array.from(new Map(newCourses.map(c => [c.id, c])).values());
                });
                setHasMore(data.pagination?.hasNext || false);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = (course) => {
        const params = new URLSearchParams(searchParams);
        if (!course) {
            params.delete('courseId');
        } else {
            if (course.id === currentCourseId) {
                params.delete('courseId'); // Toggle off if clicked again
            } else {
                params.set('courseId', course.id);
            }
        }
        setIsOpen(false);
        setSearchTerm(''); // Clear search on select
        router.push(`${pathname}?${params.toString()}`);
    };

    const loadMore = (e) => {
        e.stopPropagation();
        if (!loading && hasMore) {
            fetchCourses(page + 1);
        }
    };

    return (
        <div className="mt-auto pt-4" ref={containerRef}>
            <div className="flex items-center gap-2 mb-2 px-1">
                <BookOpen size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter by Course</span>
            </div>

            <div className="relative">
                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-xl text-sm transition-all duration-200
                        ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}
                        ${currentCourseId ? 'text-blue-700 bg-blue-50/50 border-blue-200' : 'text-slate-600'}
                    `}
                >
                    <span className="truncate font-medium">
                        {selectedCourse ? selectedCourse.title : (currentCourseId ? 'Loading course...' : 'All Courses')}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom">

                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[220px] overflow-y-auto p-1 custom-scrollbar">
                            <style jsx>{`
                                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
                            `}</style>

                            <button
                                onClick={() => handleCourseSelect(null)}
                                className={`
                                    w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-slate-50 transition-colors mb-0.5
                                    ${!currentCourseId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'}
                                `}
                            >
                                <span>All Courses</span>
                                {!currentCourseId && <Check size={14} />}
                            </button>

                            {courses.map(course => (
                                <button
                                    key={course.id}
                                    onClick={() => handleCourseSelect(course)}
                                    className={`
                                        w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-slate-50 transition-colors mb-0.5
                                        ${currentCourseId === course.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'}
                                    `}
                                >
                                    <span className="truncate">{course.title}</span>
                                    {currentCourseId === course.id && <Check size={14} />}
                                </button>
                            ))}

                            {loading && (
                                <div className="text-xs text-center py-2 text-slate-400">Loading...</div>
                            )}

                            {!loading && courses.length === 0 && (
                                <div className="text-xs text-center py-2 text-slate-400">No courses found</div>
                            )}

                            {!loading && hasMore && (
                                <button
                                    onClick={loadMore}
                                    className="w-full text-xs text-blue-600 hover:bg-blue-50 py-2 rounded-lg mt-1 font-medium transition-colors"
                                >
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseFilter;
