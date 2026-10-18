'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bold, Italic, Underline, List, Link, Image, Type, FileText, Check, AlertCircle, Save, X, Book } from 'lucide-react';
import { useCourses } from '../context/CourseContext';
import TagSelector from './TagSelector';
import IconPicker from './IconPicker';
import VideoRestrictionsSettings from './VideoRestrictionsSettings';
import VideoOverridesManager from './VideoOverridesManager';

const CourseSettings = ({ courseId }) => {
    const router = useRouter();
    const id = courseId;
    const { updateCourse } = useCourses();

    const [courseData, setCourseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await fetch(`/api/admin/courses/${id}`);
                if (!response.ok) throw new Error('Failed to fetch course');
                const data = await response.json();
                setCourseData(data);
            } catch (err) {
                console.error('Error fetching course:', err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchCourse();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCourseData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            const result = await updateCourse(id, courseData, null);
            if (result.success) {
                router.push('/courses');
            } else {
                alert('Failed to update course: ' + result.error);
            }
        } catch (error) {
            console.error('Update failed:', error);
            alert('An unexpected error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const handleIconSelect = (url) => {
        setCourseData(prev => ({ ...prev, image: url }));
        setShowIconPicker(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
        );
    }

    if (!courseData) return <div className="p-8 text-center text-slate-500">Course not found</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Settings</h1>
                <p className="text-slate-500 mt-1">Manage basic details and configuration for {courseData.title}.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Form Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">General Information</h2>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        ID: {courseData.id}
                    </span>
                </div>

                <div className="p-6 space-y-8">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Course Title</label>
                        <input
                            type="text"
                            name="title"
                            value={courseData.title}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
                            placeholder="e.g. Advanced React Patterns"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                        <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            {/* Toolbar */}
                            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
                                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"><Bold size={16} /></button>
                                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"><Italic size={16} /></button>
                                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"><Underline size={16} /></button>
                                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"><List size={16} /></button>
                                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"><Link size={16} /></button>
                                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"><Image size={16} /></button>
                            </div>
                            <textarea
                                name="description"
                                value={courseData.description}
                                onChange={handleChange}
                                className="w-full h-32 p-4 outline-none resize-none text-slate-700 text-sm leading-relaxed"
                                placeholder="Write a catchy description for your course..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Two Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* Icon Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Course Thumbnail</label>
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-20 h-20 rounded-xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-200 transition-all"
                                        onClick={() => setShowIconPicker(true)}
                                    >
                                        {courseData.image ? (
                                            <img src={courseData.image} alt="Icon" className="w-full h-full object-cover" />
                                        ) : (
                                            <Book size={24} className="text-slate-300" />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowIconPicker(true)}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                                    >
                                        Change Icon
                                    </button>
                                </div>
                            </div>

                            {/* Layout Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Content Layout</label>
                                <div className="relative">
                                    <select
                                        name="courseLayout"
                                        value={courseData.courseLayout}
                                        onChange={handleChange}
                                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none transition-all text-sm"
                                    >
                                        <option value="List">List View</option>
                                        <option value="Grid">Grid View</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">How contents are displayed to learners.</p>
                            </div>
                        </div>

                        {/* Right Column (Toggles) */}
                        <div className="space-y-6">
                            {/* Public Course Visibility */}
                            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <div className="mt-1">
                                    <input
                                        type="checkbox"
                                        name="is_public"
                                        checked={courseData.is_public || false}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-emerald-900 cursor-pointer">Public Course</label>
                                    <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                                        Make this course visible to everyone. If unchecked, only enrolled users or assigned batches can access it.
                                    </p>
                                </div>
                            </div>

                            {/* Progressive Lock */}
                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="mt-1">
                                    <input
                                        type="checkbox"
                                        name="enableProgressiveLock"
                                        checked={courseData.enableProgressiveLock}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 cursor-pointer">Progressive Lock</label>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                        Require learners to complete items in order. Prevents access to the next item until the previous one is finished.
                                    </p>
                                </div>
                            </div>

                            {/* Scheduled Content */}
                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="mt-1">
                                    <input
                                        type="checkbox"
                                        name="showScheduledContent"
                                        checked={courseData.showScheduledContent}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 cursor-pointer">Show Scheduled Content</label>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                        Display content that is scheduled for a future release date (marked as 'Coming Soon').
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tags Section */}
                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tags / Categories</label>
                        <TagSelector
                            selectedTags={courseData.tags || []}
                            onChange={(tags) => setCourseData(prev => ({ ...prev, tags }))}
                        />
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        onClick={() => router.push('/courses')}
                        className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-lg shadow-blue-500/10 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Video Restrictions Section */}
            <div className="mt-8 space-y-8">
                <VideoRestrictionsSettings courseId={id} />
                <VideoOverridesManager courseId={id} />
            </div>

            {showIconPicker && (
                <IconPicker
                    isOpen={showIconPicker}
                    onClose={() => setShowIconPicker(false)}
                    onSelect={handleIconSelect}
                    currentIcon={courseData.image}
                />
            )}
        </div>
    );
};

export default CourseSettings;
