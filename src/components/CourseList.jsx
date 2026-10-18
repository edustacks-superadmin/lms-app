import React, { useState, useMemo } from 'react';
import { Search, Plus, Menu, Book, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { supabase } from '../supabaseClient';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CourseList = ({ selectedTags: propTags = [], sortBy: propSortBy = '' }) => {
    const navigate = useNavigate();
    const { courses, reorderCourses } = useCourses();
    const [searchQuery, setSearchQuery] = useState('');
    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [courseToClone, setCourseToClone] = useState(null);
    const [cloneName, setCloneName] = useState('');
    const [cloning, setCloning] = useState(false);

    // Use props if provided, otherwise use local state (for standalone usage)
    const selectedTags = propTags;
    const sortBy = propSortBy;

    // Filter and sort courses
    const filteredCourses = useMemo(() => {
        let result = courses;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(course =>
                course.title?.toLowerCase().includes(query) ||
                course.subtitle?.toLowerCase().includes(query)
            );
        }

        // Apply tag filter
        if (selectedTags.length > 0) {
            result = result.filter(course => {
                if (!course.tags || course.tags.length === 0) return false;
                return selectedTags.some(tagId => course.tags.includes(tagId));
            });
        }

        // Apply sorting
        if (sortBy) {
            result = [...result]; // Create a copy for sorting
            switch (sortBy) {
                case 'title-asc':
                    result.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'title-desc':
                    result.sort((a, b) => b.title.localeCompare(a.title));
                    break;
                case 'newest':
                    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'oldest':
                    result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    break;
                default:
                    break;
            }
        }

        return result;
    }, [courses, searchQuery, selectedTags, sortBy]);

    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }
        reorderCourses(result.source.index, result.destination.index);
    };

    const handleCloneClick = (course) => {
        setCourseToClone(course);
        setCloneName(`${course.title} (Copy)`);
        setCloneModalOpen(true);
    };

    const handleCloneCourse = async () => {
        if (!courseToClone || !cloneName.trim()) {
            alert('Please enter a course name');
            return;
        }

        try {
            setCloning(true);

            // 1. Create new course
            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: cloneName.trim(),
                    description: courseToClone.description,
                    allowed_batches: [],
                    allowed_products: [],
                    is_public: courseToClone.is_public ?? false,
                    category: courseToClone.category,
                    level: courseToClone.level,
                    duration: courseToClone.duration
                })
                .select()
                .single();

            if (courseError) throw courseError;

            // 2. Fetch all chapters from original course
            const { data: chapters, error: chaptersError } = await supabase
                .from('chapters')
                .select('*')
                .eq('course_id', courseToClone.id)
                .order('order');

            if (chaptersError) throw chaptersError;

            // 3. Clone each chapter and its content
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

                // 4. Fetch content items for this chapter
                const { data: contentItems, error: contentError } = await supabase
                    .from('chapter_contents')
                    .select('*')
                    .eq('chapter_id', chapter.id)
                    .order('order');

                if (contentError) throw contentError;

                // 5. Clone content items
                if (contentItems && contentItems.length > 0) {
                    const newContent = [];

                    for (const item of contentItems) {
                        let newExamId = item.exam_id;

                        // Deep clone exam if it exists
                        if (item.type === 'exam' && item.exam_id) {
                            try {
                                // Fetch original exam
                                const { data: originalExam } = await supabase
                                    .from('exams')
                                    .select('*')
                                    .eq('id', item.exam_id)
                                    .single();

                                if (originalExam) {
                                    // Create new exam copy
                                    const { id, created_at, updated_at, ...examData } = originalExam;
                                    const { data: newExam } = await supabase
                                        .from('exams')
                                        .insert({
                                            ...examData,
                                            title: `${originalExam.title} (Copy)`,
                                            is_active: false // Set as inactive by default
                                        })
                                        .select()
                                        .single();

                                    if (newExam) {
                                        newExamId = newExam.id;

                                        // Clone exam questions links
                                        const { data: examQuestions } = await supabase
                                            .from('exam_questions')
                                            .select('*')
                                            .eq('exam_id', item.exam_id);

                                        if (examQuestions && examQuestions.length > 0) {
                                            const newExamQuestions = examQuestions.map(eq => ({
                                                exam_id: newExam.id,
                                                question_id: eq.question_id,
                                                marks: eq.marks,
                                                order: eq.order
                                            }));

                                            await supabase
                                                .from('exam_questions')
                                                .insert(newExamQuestions);
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error('Error cloning exam:', err);
                                // Fallback to original exam ID if cloning fails
                            }
                        }

                        newContent.push({
                            chapter_id: newChapter.id,
                            title: item.title,
                            type: item.type,
                            content_url: item.content_url,
                            content_data: item.content_data,
                            description: item.description,
                            exam_id: newExamId,
                            order: item.order
                        });
                    }

                    const { error: contentInsertError } = await supabase
                        .from('chapter_contents')
                        .insert(newContent);

                    if (contentInsertError) throw contentInsertError;
                }
            }

            alert(`Course "${cloneName}" has been successfully cloned!`);
            setCloneModalOpen(false);
            setCourseToClone(null);
            setCloneName('');

            // Refresh the page to show new course
            window.location.reload();

        } catch (error) {
            console.error('Error cloning course:', error);
            alert('Failed to clone course: ' + error.message);
        } finally {
            setCloning(false);
        }
    };

    return (
        <div style={{ flex: 1 }}>
            {/* Top Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '400' }}>
                    Courses <span style={{ fontSize: '16px', color: '#666', marginLeft: '8px' }}>({filteredCourses.length})</span>
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ width: '250px', maxWidth: '100%' }}>
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button><Search size={18} /></button>
                    </div>
                    <button className="btn btn-success" onClick={() => navigate('/courses/create')} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <Plus size={18} /> Create course
                    </button>
                </div>
            </div>

            {/* Course Items */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="courses">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
                        >
                            {filteredCourses.map((course, index) => (
                                <Draggable key={course.id} draggableId={course.id.toString()} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                padding: '20px 0 20px 20px',
                                                borderTop: '1px solid var(--border-color)',
                                                background: 'white',
                                                ...provided.draggableProps.style
                                            }}
                                        >
                                            <div style={{ marginRight: '16px', color: 'var(--text-light)', marginTop: '20px', cursor: 'grab' }}>
                                                <Menu size={20} />
                                            </div>

                                            <div style={{ width: '54px', height: '54px', borderRadius: '50%', overflow: 'hidden', marginRight: '20px', border: '1px solid #eee', position: 'relative', backgroundColor: '#f0f0f0' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Book size={24} color="#999" />
                                                </div>
                                                {course.image && (
                                                    <img
                                                        src={course.image}
                                                        alt={course.title}
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                )}
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '4px' }}>{course.title}</h3>
                                                        {course.subtitle && <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '4px' }}>{course.subtitle}</p>}

                                                        <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--primary-color)', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                            <span
                                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                onClick={() => navigate(`/courses/${course.id}/chapters`)}
                                                            >
                                                                Chapters
                                                            </span> •
                                                            <span
                                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                onClick={() => navigate(`/courses/${course.id}/settings`)}
                                                            >
                                                                Update
                                                            </span> •
                                                            <span
                                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                onClick={() => navigate(`/courses/${course.id}/delete`)}
                                                            >
                                                                Delete
                                                            </span> •
                                                            <span
                                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                onClick={() => navigate(`/courses/${course.id}/access-control`)}
                                                            >
                                                                Access Control
                                                            </span> •
                                                            <span style={{ color: '#999', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                Add staffs
                                                                <span style={{
                                                                    fontSize: '9px',
                                                                    backgroundColor: '#ffa726',
                                                                    color: 'white',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '10px',
                                                                    fontWeight: 'bold'
                                                                }}>SOON</span>
                                                            </span> •
                                                            <span
                                                                style={{ cursor: 'pointer', color: '#666' }}
                                                                onClick={() => handleCloneClick(course)}
                                                            >
                                                                <Copy size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                                Clone
                                                            </span> •
                                                            <span style={{ color: '#999', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                {course.learners || 0} Learners
                                                                <span style={{
                                                                    fontSize: '9px',
                                                                    backgroundColor: '#ffa726',
                                                                    color: 'white',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '10px',
                                                                    fontWeight: 'bold'
                                                                }}>SOON</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
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

            {/* Clone Course Modal */}
            {cloneModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '32px',
                        width: '500px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <Copy size={24} color="#2563eb" />
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Clone Course</h2>
                        </div>

                        <p style={{ margin: '0 0 24px 0', color: '#666', lineHeight: '1.5' }}>
                            Create a copy of <strong>{courseToClone?.title}</strong> with all chapters and content.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                New Course Name
                            </label>
                            <input
                                type="text"
                                value={cloneName}
                                onChange={(e) => setCloneName(e.target.value)}
                                placeholder="Enter course name"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                                autoFocus
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !cloning) {
                                        handleCloneCourse();
                                    }
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setCloneModalOpen(false);
                                    setCourseToClone(null);
                                    setCloneName('');
                                }}
                                disabled={cloning}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: cloning ? 'not-allowed' : 'pointer',
                                    opacity: cloning ? 0.5 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCloneCourse}
                                disabled={cloning || !cloneName.trim()}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: cloning || !cloneName.trim() ? '#94a3b8' : '#2563eb',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: cloning || !cloneName.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {cloning ? (
                                    <>
                                        <span>Cloning...</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        <span>Clone Course</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseList;
