import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { supabase } from '../supabaseClient';
import { Copy, ArrowLeft } from 'lucide-react';

const CloneCourse = () => {
    const navigate = useNavigate();
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

            // 1. Create new course
            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: cloneName.trim(),
                    description: course.description,
                    allowed_batches: [], // Clear batches
                    allowed_products: [], // Clear products
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

            // 2. Clone chapters and contents (This logic should ideally be shared or moved to a database function/context)
            // For now, we'll just create the course shell as per the previous implementation in CourseList.
            // If full content cloning is needed, we would need to duplicate the logic from CourseList.jsx
            // Let's assume the user wants the same behavior as the "Clone" button in the list.

            // Re-using the logic from CourseList.jsx (simplified for this component)
            // Fetch chapters for the original course
            const { data: chapters, error: chaptersError } = await supabase
                .from('chapters')
                .select('*, chapter_contents(*)')
                .eq('course_id', id)
                .order('sort_order', { ascending: true });

            if (chaptersError) throw chaptersError;

            if (chapters && chapters.length > 0) {
                for (const chapter of chapters) {
                    // Create new chapter
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

                    // Clone contents
                    if (chapter.chapter_contents && chapter.chapter_contents.length > 0) {
                        const contentsToInsert = chapter.chapter_contents.map(content => ({
                            chapter_id: newChapter.id,
                            title: content.title,
                            type: content.type,
                            url: content.url,
                            duration: content.duration,
                            is_free: content.is_free,
                            sort_order: content.sort_order,
                            exam_id: content.exam_id // Note: This links to the SAME exam. Deep cloning exams is complex.
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
            navigate('/courses');

        } catch (error) {
            console.error('Error cloning course:', error);
            alert('Failed to clone course: ' + error.message);
        } finally {
            setCloning(false);
        }
    };

    if (!course) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <button
                onClick={() => navigate(`/courses/${id}/settings`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px', color: '#666' }}
            >
                <ArrowLeft size={16} /> Back to Settings
            </button>

            <h2 style={{ fontSize: '24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Copy size={24} /> Clone Course
            </h2>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>New Course Name</label>
                    <input
                        type="text"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => navigate(`/courses/${id}/settings`)}
                        style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClone}
                        disabled={cloning}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '4px',
                            border: 'none',
                            background: cloning ? '#ccc' : '#00bfa5',
                            color: 'white',
                            cursor: cloning ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {cloning ? 'Cloning...' : 'Clone Course'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloneCourse;
