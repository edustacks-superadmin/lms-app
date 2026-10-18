'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, MoreVertical, Book, Copy, RefreshCw, Layers, Edit, Trash2, Users, Clock, Lock, Menu, Eye, GripVertical, LayoutGrid, BookOpen } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCourses } from '../context/CourseContext';
import { supabase } from '../supabaseClient';
import AdvancedPagination from './AdvancedPagination';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CourseStats from './CourseStats';

const CourseList = ({ sortBy: propSortBy = '' }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const {
        courses,
        reorderCourses,
        page,
        totalPages,
        totalItems,
        limit,
        goToPage,
        searchCourses,
        changeItemsPerPage,
        fetchCourses,
        toggleCoursePublicStatus,
        loading
    } = useCourses();

    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [courseToClone, setCourseToClone] = useState(null);
    const [cloneName, setCloneName] = useState('');
    const [cloning, setCloning] = useState(false);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [activeMenuId, setActiveMenuId] = useState(null);

    React.useEffect(() => {
        const pageParam = parseInt(searchParams.get('page')) || 1;
        const searchParam = searchParams.get('search') || '';
        const tagsParam = searchParams.get('tags');
        const tags = tagsParam ? tagsParam.split(',').map(Number).filter(Boolean) : [];

        fetchCourses(pageParam, searchParam, limit, tags);

        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
        goToPage(newPage);
    };

    const sortBy = propSortBy;

    const displayedCourses = useMemo(() => {
        let result = courses;
        if (sortBy) {
            result = [...result];
            switch (sortBy) {
                case 'title-asc': result.sort((a, b) => a.title.localeCompare(b.title)); break;
                case 'title-desc': result.sort((a, b) => b.title.localeCompare(a.title)); break;
                case 'newest': result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
                case 'oldest': result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
                default: break;
            }
        }
        return result;
    }, [courses, sortBy]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        reorderCourses(result.source.index, result.destination.index);
    };

    const handleCloneClick = (e, course) => {
        e.stopPropagation();
        setCourseToClone(course);
        setCloneName(`${course.title} (Copy)`);
        setCloneModalOpen(true);
        setActiveMenuId(null);
    };

    const handleCloneCourse = async () => {
        if (!courseToClone || !cloneName.trim()) {
            alert('Please enter a course name');
            return;
        }

        try {
            setCloning(true);
            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: cloneName.trim(),
                    description: courseToClone.description,
                    allowed_batches: [],
                    allowed_products: [],
                    allowed_devices: courseToClone.allowed_devices,
                    video_watch_count: courseToClone.video_watch_count,
                    image: courseToClone.image,
                    video_watch_time_limit: courseToClone.video_watch_time_limit,
                    access_control: courseToClone.access_control,
                    allowed_network: courseToClone.allowed_network,
                    category: courseToClone.category,
                    level: courseToClone.level,
                    duration: courseToClone.duration
                })
                .select()
                .single();

            if (courseError) throw courseError;

            const { data: chapters, error: chaptersError } = await supabase
                .from('chapters')
                .select('*')
                .eq('course_id', courseToClone.id)
                .order('order');

            if (chaptersError) throw chaptersError;

            for (const chapter of chapters) {
                const { data: newChapter, error: chapterError } = await supabase
                    .from('chapters')
                    .insert({
                        course_id: newCourse.id,
                        title: chapter.title,
                        order: chapter.order,
                        description: chapter.description
                    })
                    .select()
                    .single();

                if (chapterError) throw chapterError;

                const { data: contentItems, error: contentError } = await supabase
                    .from('chapter_contents')
                    .select('*')
                    .eq('chapter_id', chapter.id)
                    .order('order');

                if (contentError) throw contentError;

                if (contentItems && contentItems.length > 0) {
                    const newContent = [];
                    for (const item of contentItems) {
                        let newExamId = item.exam_id;
                        if (item.type === 'exam' && item.exam_id) {
                            try {
                                const { data: originalExam } = await supabase.from('exams').select('*').eq('id', item.exam_id).single();
                                if (originalExam) {
                                    const { id, created_at, updated_at, ...examData } = originalExam;
                                    const { data: newExam } = await supabase.from('exams').insert({ ...examData, title: `${originalExam.title} (Copy)`, is_active: false }).select().single();
                                    if (newExam) {
                                        newExamId = newExam.id;
                                        const { data: examQuestions } = await supabase.from('exam_questions').select('*').eq('exam_id', item.exam_id);
                                        if (examQuestions?.length) {
                                            await supabase.from('exam_questions').insert(examQuestions.map(eq => ({ exam_id: newExam.id, question_id: eq.question_id, marks: eq.marks, order: eq.order })));
                                        }
                                    }
                                }
                            } catch (err) { console.error('Error cloning exam:', err); }
                        }
                        newContent.push({
                            chapter_id: newChapter.id, title: item.title, type: item.type, content_url: item.content_url, content_data: item.content_data, description: item.description, exam_id: newExamId, order: item.order
                        });
                    }
                    await supabase.from('chapter_contents').insert(newContent);
                }
            }
            alert(`Course "${cloneName}" has been successfully cloned!`);
            setCloneModalOpen(false);
            setCourseToClone(null);
            setCloneName('');
            window.location.reload();
        } catch (error) {
            console.error('Error cloning course:', error);
            alert('Failed to clone course: ' + error.message);
        } finally {
            setCloning(false);
        }
    };

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    // Assuming `filteredCourses` is `displayedCourses` for the purpose of this edit
    const filteredCourses = displayedCourses;
    const handleDragEnd = onDragEnd; // Renaming for consistency with the provided snippet

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto">
            {/* Stats Dashboard */}
            <CourseStats />

            {/* Unified Card Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col mt-6">
                {/* Header / Top Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-100 bg-white first:rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Course Management</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Manage your courses, chapters, and content efficiently.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchCourses(searchInput)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400"
                                />
                            </div>
                            {searchInput && (
                                <button
                                    onClick={() => {
                                        setSearchInput('');
                                        searchCourses('');
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest px-2 whitespace-nowrap"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <button
                            onClick={fetchCourses}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                            title="Refresh List"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2 text-sm font-medium"
                            onClick={() => router.push('/courses/create')}
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">New Course</span>
                        </button>
                    </div>
                </div>

                {/* Course List */}
                <div className="flex-1 overflow-visible min-h-[400px]">
                    {loading && courses.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <RefreshCw className="animate-spin mb-2 mx-auto" />
                            Loading courses...
                        </div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <LayoutGrid size={32} className="mx-auto mb-3 opacity-20" />
                            <p>No courses found matching your search.</p>
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="courses-list">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="divide-y divide-slate-100"
                                    >
                                        {filteredCourses.map((course, index) => (
                                            <Draggable key={course.id.toString()} draggableId={course.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group ${snapshot.isDragging ? 'bg-blue-50 shadow-lg ring-1 ring-blue-200' : ''}`}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            zIndex: activeMenuId === course.id ? 50 : (snapshot.isDragging ? 50 : 1),
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {/* Drag Handle & Index */}
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="flex items-center gap-3 w-12 shrink-0 text-slate-400 cursor-grab active:cursor-grabbing"
                                                        >
                                                            <GripVertical size={16} className="hover:text-slate-600" />
                                                            <span className="text-xs font-mono w-4">{index + 1}</span>
                                                        </div>

                                                        {/* Thumbnail */}
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                                                            {course.thumbnail || course.image ? (
                                                                <img src={course.thumbnail || course.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                    <BookOpen size={20} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Course Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h3 className="font-semibold text-slate-900 truncate">{course.title}</h3>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleCoursePublicStatus(course.id);
                                                                    }}
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${course.is_public
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                                                        }`}
                                                                    title={course.is_public ? 'Click to make Private' : 'Click to make Public'}
                                                                >
                                                                    {course.is_public ? 'Public' : 'Private'}
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                                <div className="flex items-center gap-1">
                                                                    <Users size={12} />
                                                                    <span>{course.enrollments_count || 0} Learners</span>
                                                                </div>
                                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                                <div className="flex items-center gap-1">
                                                                    <BookOpen size={12} />
                                                                    <span>{course.chapters_count || 0} Chapters</span>
                                                                </div>
                                                                {course.price > 0 && (
                                                                    <>
                                                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                                        <span className="font-medium text-slate-700">₹{course.price}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions - All Inline */}
                                                        <div className="flex items-center gap-1 ml-4">
                                                            <button
                                                                onClick={() => router.push(`/courses/${course.id}/settings`)}
                                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                                                title="Settings"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/courses/${course.id}/chapters`)}
                                                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                                                title="Manage Content"
                                                            >
                                                                <Layers size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/courses/${course.id}/clone`)}
                                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                                                title="Clone Course"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/courses/${course.id}/access-control`)}
                                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                                                title="Access Control"
                                                            >
                                                                <Lock size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/courses/${course.id}/delete`)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </div>
            </div>

            {/* Pagination & Modals */}
            <div className="mt-8">
                {totalPages > 0 && <AdvancedPagination currentPage={page} totalPages={totalPages} totalItems={totalItems} itemsPerPage={limit} onPageChange={handlePageChange} onItemsPerPageChange={changeItemsPerPage} pageSizeOptions={[10, 20, 50, 100]} />}
            </div>

            {cloneModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"> {/* Increased Z-Index */}
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center"><Copy size={20} className="text-blue-600" /></div>
                            <h2 className="text-2xl font-bold text-slate-900">Clone Course</h2>
                        </div>
                        <p className="text-slate-600 mb-6">Create a copy of <strong className="text-slate-900">{courseToClone?.title}</strong>.</p>
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">New Course Name</label>
                            <input type="text" value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="e.g., Python Masterclass (Cohort 2)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" autoFocus onKeyPress={(e) => { if (e.key === 'Enter' && !cloning) { handleCloneCourse(); } }} />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setCloneModalOpen(false); setCourseToClone(null); setCloneName(''); }} disabled={cloning} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
                            <button onClick={handleCloneCourse} disabled={cloning || !cloneName.trim()} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all flex items-center gap-2">{cloning ? 'Cloning...' : 'Clone Course'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseList;
