'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, BookOpen, Clock, Tag, FileText, Bold, Italic, Underline, List, Link, Image } from 'lucide-react';
import { useCourses } from '../context/CourseContext';
import TagSelector from './TagSelector';
import IconPicker from './IconPicker';

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
        const result = await addCourse(courseData, null);
        if (result && result.success) {
            router.push('/courses');
        } else {
            if (result && result.error) alert('Error: ' + result.error);
            // Fallback if result is undefined (legacy behavior check)
            else router.push('/courses');
        }
    };

    return (
        <div className="flex-1 p-6 max-w-5xl mx-auto">
            <div className="mb-6 flex items-center text-sm">
                <span className="text-blue-600 font-medium">Courses</span>
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-gray-600">Create</span>
            </div>

            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                    Create Course
                </h2>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-3xl">
                {/* Title */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right">Title:</label>
                    <input
                        type="text"
                        name="title"
                        value={courseData.title}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="e.g., Advanced Mathematics"
                    />
                </div>

                {/* Description (Rich Text Mock) */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right mt-2">Description:</label>
                    <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex gap-3 items-center">
                            <span className="flex items-center gap-1 text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700"><FileText size={14} /> Source</span>
                            <div className="w-px h-5 bg-gray-300"></div>
                            <Bold size={16} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            <Italic size={16} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            <Underline size={16} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            <div className="w-px h-5 bg-gray-300"></div>
                            <List size={16} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            <div className="w-px h-5 bg-gray-300"></div>
                            <Link size={16} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            <Image size={16} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                        </div>
                        <textarea
                            className="w-full h-36 p-3 border-none resize-y outline-none text-gray-700 placeholder-gray-400"
                            name="description"
                            value={courseData.description}
                            onChange={handleChange}
                            placeholder="Enter course description..."
                        ></textarea>
                    </div>
                </div>

                {/* Icon Selection */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right">Icon:</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                            {courseData.image ? (
                                <img src={courseData.image} alt="Course Icon" className="w-full h-full object-cover" />
                            ) : (
                                <BookOpen size={24} className="text-gray-300" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowIconPicker(true)}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                        >
                            Select Icon
                        </button>
                    </div>
                </div>

                {/* Show Scheduled Content */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right">Show scheduled content:</label>
                    <input
                        type="checkbox"
                        name="showScheduledContent"
                        checked={courseData.showScheduledContent}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                </div>

                {/* Enable Progressive Lock */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right">Enable Progressive Lock:</label>
                    <div>
                        <input
                            type="checkbox"
                            name="enableProgressiveLock"
                            checked={courseData.enableProgressiveLock}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">Users cannot access the next test, if the current test is not completed</p>
                    </div>
                </div>

                {/* Course Layout */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right mt-2">Course Layout:</label>
                    <div className="flex-1">
                        <select
                            name="courseLayout"
                            value={courseData.courseLayout}
                            onChange={handleChange}
                            className="w-40 p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="List">List</option>
                            <option value="Grid">Grid</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1.5">The layout in which the course contents are displayed in the learner UI</p>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <label className="md:w-40 font-semibold text-gray-700 md:text-right mt-2">Tags:</label>
                    <div className="flex-1">
                        <TagSelector
                            selectedTags={courseData.tags || []}
                            onChange={(tags) => setCourseData(prev => ({ ...prev, tags }))}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 md:ml-44">
                    <button
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition-all"
                        onClick={handleCreate}
                    >
                        Create Course
                    </button>
                    <button
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 active:scale-[0.98] transition-all"
                        onClick={() => router.push('/courses')}
                    >
                        Cancel
                    </button>
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
