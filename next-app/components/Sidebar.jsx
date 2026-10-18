'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CheckCircle, Archive, Layers, FileText, ChevronDown, HelpCircle, Image, BookOpen, Users, Briefcase, MessageSquare, Database } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import TagFilter from './TagFilter';

const Sidebar = ({ selectedTags = [], onTagsChange, sortBy = '', onSortChange }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { institute } = useInstitute();
    // const { tags, loading, fetchTags } = useTags(); // Removed in favor of TagFilter

    const isAdminPage = pathname.startsWith('/admin');
    const isCoursesPage = pathname.startsWith('/courses');
    const isArchivedPage = pathname === '/courses/archived';

    const handleTagToggle = (tagId) => {
        if (selectedTags.includes(tagId)) {
            onTagsChange(selectedTags.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTags, tagId]);
        }
    };

    const sortOptions = [
        { value: 'title-asc', label: 'Title (A-Z)' },
        { value: 'title-desc', label: 'Title (Z-A)' },
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' }
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Navigation</h3>
                <div className="space-y-2">

                    {/* COURSES SIDEBAR */}
                    {isCoursesPage && (
                        <>
                            <button
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${!isArchivedPage
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                onClick={() => router.push('/courses')}
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} />
                                    <span>Published</span>
                                </div>
                            </button>

                            <button
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isArchivedPage
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                onClick={() => router.push('/courses/archived')}
                            >
                                <div className="flex items-center gap-3">
                                    <Archive size={18} />
                                    <span>Archived</span>
                                </div>
                            </button>
                        </>
                    )}

                    {/* ADMIN SIDEBAR */}
                    {isAdminPage && (
                        <>
                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin')}
                            >
                                <div className="flex items-center gap-3">
                                    <Layers size={18} />
                                    <span>Dashboard</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/posts')}
                            >
                                <div className="flex items-center gap-3">
                                    <FileText size={18} />
                                    <span>Posts</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/resources')}
                            >
                                <div className="flex items-center gap-3">
                                    <BookOpen size={18} />
                                    <span>Resources</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/gallery')}
                            >
                                <div className="flex items-center gap-3">
                                    <Image size={18} />
                                    <span>Gallery</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/pages')}
                            >
                                <div className="flex items-center gap-3">
                                    <Layers size={18} />
                                    <span>Pages</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/faqs')}
                            >
                                <div className="flex items-center gap-3">
                                    <HelpCircle size={18} />
                                    <span>FAQs</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/team')}
                            >
                                <div className="flex items-center gap-3">
                                    <Users size={18} />
                                    <span>Team</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/careers')}
                            >
                                <div className="flex items-center gap-3">
                                    <Briefcase size={18} />
                                    <span>Careers</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/forum')}
                            >
                                <div className="flex items-center gap-3">
                                    <MessageSquare size={18} />
                                    <span>Forum</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/exam-config')}
                            >
                                <div className="flex items-center gap-3">
                                    <Database size={18} />
                                    <span>Exam Config</span>
                                </div>
                            </button>

                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                onClick={() => router.push('/admin/help')}
                            >
                                <div className="flex items-center gap-3">
                                    <HelpCircle size={18} />
                                    <span>Help & Guide</span>
                                </div>
                            </button>
                        </>
                    )}
                </div>

                {isCoursesPage && (
                    <>
                        <div className="border-t border-slate-100 my-6"></div>

                        <div className="mb-6">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Sort by</h3>
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => onSortChange(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8"
                                >
                                    <option value="">Default</option>
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 my-6"></div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters</h3>
                                {(selectedTags.length > 0 || sortBy !== '') && (
                                    <button
                                        onClick={() => {
                                            onTagsChange([]);
                                            onSortChange('');
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {/* Replaced manual tag list with TagFilter component */}
                            <div className="mt-2">
                                <TagFilter type={['course', 'all']} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
