import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCourses } from '../context/CourseContext';
import { supabase } from '../supabaseClient';
import { Copy, ArrowLeft } from 'lucide-react';

const CloneCourse = () => {
    const router = useRouter();
    const { id } = useParams();
    const { getCourse, fetchCourses } = useCourses();
    const [course, setCourse] = useState(null);
    const [cloneName, setCloneName] = useState('');
    const [cloning, setCloning] = useState(false);

    useEffect(() => {
        const data = getCourse(id);
        if (data) {
            setCourse(data);
            setCloneName(`${data.title} (Copy)`);
        }
    }, [id, getCourse]);

    const handleClone = async () => {
        if (!cloneName.trim()) {
            alert('Please enter a name for the new course');
            return;
        }

        try {
            setCloning(true);

            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: cloneName.trim(),
                    description: course.description,
                    allowed_batches: [],
                    allowed_products: [],
                    allowed_devices: course.allowed_devices,
                    video_watch_count: course.video_watch_count,
                    image: course.image,
                    video_watch_time_limit: course.video_watch_time_limit,
                    access_control: course.access_control,
                    allowed_network: course.allowed_network,
                    category: course.category,
                    level: course.level,
                    duration: course.duration,
                    subtitle: course.subtitle,
                    language: course.language,
                    tags: course.tags,
                    requirements: course.requirements,
                    what_will_learn: course.what_will_learn,
                    price: course.price,
                    strike_price: course.strike_price,
                    is_free: course.is_free
                })
                .select()
                .single();

            if (courseError) throw courseError;

            const { data: chapters, error: chaptersError } = await supabase
                .from('chapters')
                .select('*, chapter_contents(*)')
                .eq('course_id', id)
                .order('sort_order', { ascending: true });

            if (chaptersError) throw chaptersError;

            if (chapters && chapters.length > 0) {
                for (const chapter of chapters) {
                    const { data: newChapter, error: newChapterError } = await supabase
                        .from('chapters')
                        .insert({
                            course_id: newCourse.id,
                            title: chapter.title,
                            sort_order: chapter.sort_order,
                            is_locked: chapter.is_locked
                        })
                        .select()
                        .single();

                    if (newChapterError) throw newChapterError;

                    if (chapter.chapter_contents && chapter.chapter_contents.length > 0) {
                        const contentsToInsert = chapter.chapter_contents.map(content => ({
                            chapter_id: newChapter.id,
                            title: content.title,
                            type: content.type,
                            url: content.url,
                            duration: content.duration,
                            is_free: content.is_free,
                            sort_order: content.sort_order,
                            exam_id: content.exam_id
                        }));

                        const { error: contentsError } = await supabase
                            .from('chapter_contents')
                            .insert(contentsToInsert);

                        if (contentsError) throw contentsError;
                    }
                }
            }

            await fetchCourses();
            alert('Course cloned successfully!');
            if (window.confirm('Course cloned successfully! Do you want to go to the new course?')) {
                router.push(`/courses/${newCourse.id}/edit`);
            } else {
                router.push('/courses');
            };

        } catch (error) {
            console.error('Error cloning course:', error);
            alert('Failed to clone course: ' + error.message);
        } finally {
            setCloning(false);
        }
    };

    if (!course) return <div className="p-5">Loading...</div>;

    return (
        <div className="p-5 max-w-[600px] mx-auto">
            <button
                onClick={() => router.push(`/courses/${id}/settings`)}
                className="bg-transparent border-none cursor-pointer flex items-center gap-1.5 mb-5 text-gray-500 hover:text-gray-700"
            >
                <ArrowLeft size={16} /> Back to Settings
            </button>

            <h2 className="text-2xl font-bold mb-5 flex items-center gap-2.5">
                <Copy size={24} /> Clone Course
            </h2>

            <div className="bg-white p-5 rounded-lg shadow-md">
                <div className="mb-5">
                    <label className="block mb-2 font-medium">New Course Name</label>
                    <input
                        type="text"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded border border-gray-300 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                <div className="flex gap-2.5 justify-end">
                    <button
                        onClick={() => router.push(`/courses/${id}/settings`)}
                        className="px-5 py-2.5 rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClone}
                        disabled={cloning}
                        className={`px-5 py-2.5 rounded border-none text-white flex items-center gap-2 ${cloning
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-teal-500 hover:bg-teal-600 cursor-pointer'
                            }`}
                    >
                        {cloning ? 'Cloning...' : 'Clone Course'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloneCourse;
