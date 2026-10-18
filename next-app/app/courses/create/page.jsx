'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bold, Italic, Underline, List, Image, Link, FileText } from 'lucide-react';
import { useCourses } from '../../../context/CourseContext';
import TagSelector from '../../../components/TagSelector';
import Sidebar from '../../../components/Sidebar';
import IconPicker from '../../../components/IconPicker';

const CreateCourse = () => {
    const router = useRouter();
    const { addCourse } = useCourses();

    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        image: '',
        showScheduledContent: true,
        enableProgressiveLock: false,
        courseLayout: 'List',
        tags: []
    });

    const [showIconPicker, setShowIconPicker] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCourseData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreate = async () => {
        if (!courseData.title.trim()) {
            alert('Please enter a course title');
            return;
        }

        await addCourse(courseData);
        router.push('/courses');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
            {/* Reusing Sidebar Layout Pattern */}
            <div style={{ width: '250px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', paddingTop: '20px' }}>
                <Sidebar
                    selectedTags={[]}
                    onTagsChange={() => { }}
                    sortBy=""
                    onSortChange={() => { }}
                    onApplyFilters={() => { }}
                />
            </div>

            <div className="flex-1 p-10 overflow-y-auto">
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header Section inside Card */}
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                            <span
                                className="cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => router.push('/courses')}
                            >
                                Courses
                            </span>
                            <span>/</span>
                            <span className="text-slate-800 font-medium">Create</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 m-0">
                            Create course
                        </h2>
                    </div>

                    <div className="p-8">
                        {/* Title */}
                        <div className="flex mb-6 items-center">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6">Title:</label>
                            <input
                                type="text"
                                name="title"
                                value={courseData.title}
                                onChange={handleChange}
                                className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="e.g. Advanced Mathematics"
                            />
                        </div>

                        {/* Description */}
                        <div className="flex mb-6 items-start">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6 mt-2">Description:</label>
                            <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                                <div className="p-2 border-b border-slate-200 flex gap-3 bg-slate-50">
                                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium"><FileText size={14} /> Source</span>
                                    <div className="w-px h-5 bg-slate-300"></div>
                                    <Bold size={16} className="text-slate-500 cursor-pointer hover:text-slate-700" />
                                    <Italic size={16} className="text-slate-500 cursor-pointer hover:text-slate-700" />
                                    <Underline size={16} className="text-slate-500 cursor-pointer hover:text-slate-700" />
                                </div>
                                <textarea
                                    className="w-full h-40 p-3 border-none resize-y outline-none text-slate-700"
                                    name="description"
                                    value={courseData.description}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                        </div>

                        {/* Icon */}
                        <div className="flex mb-6 items-center">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6">Icon:</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                                    {courseData.image ? (
                                        <img src={courseData.image} alt="Course Icon" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl text-slate-300">📚</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowIconPicker(true)}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                                >
                                    Select Icon
                                </button>
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="flex mb-6 items-center">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6">Show scheduled content:</label>
                            <input
                                type="checkbox"
                                name="showScheduledContent"
                                checked={courseData.showScheduledContent}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex mb-6 items-start">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6 mt-1">Enable Progressive Lock:</label>
                            <div className="flex flex-col">
                                <input
                                    type="checkbox"
                                    name="enableProgressiveLock"
                                    checked={courseData.enableProgressiveLock}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <div className="text-xs text-slate-500 mt-1.5">Users cannot access the next test if the current test is not completed</div>
                            </div>
                        </div>

                        <div className="flex mb-6 items-start">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6 mt-2">Course Layout:</label>
                            <div className="flex-1">
                                <select
                                    name="courseLayout"
                                    value={courseData.courseLayout}
                                    onChange={handleChange}
                                    className="w-40 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                >
                                    <option value="List">List</option>
                                    <option value="Grid">Grid</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex mb-10 items-start">
                            <label className="w-48 font-semibold text-slate-600 text-right mr-6 mt-2">Tags:</label>
                            <div className="flex-1">
                                <TagSelector
                                    selectedTags={courseData.tags || []}
                                    onChange={(tags) => setCourseData(prev => ({ ...prev, tags }))}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 ml-[216px]">
                            <button
                                className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-semibold shadow-sm"
                                onClick={handleCreate}
                            >
                                Create course
                            </button>
                            <button
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors font-semibold"
                                onClick={() => router.push('/courses')}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Icon Picker Modal */}
            <IconPicker
                isOpen={showIconPicker}
                onClose={() => setShowIconPicker(false)}
                onSelect={(url) => {
                    setCourseData(prev => ({ ...prev, image: url }));
                    setShowIconPicker(false);
                }}
                currentIcon={courseData.image}
            />
        </div>
    );
};

export default CreateCourse;
