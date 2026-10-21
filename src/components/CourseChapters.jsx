import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChapters } from '../context/ChapterContext';
import { useCourses } from '../context/CourseContext';
import { useExams } from '../context/ExamContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Edit2, Trash2, X, Save, ArrowLeft, FileText, Video, File, MoreVertical, ChevronDown, ChevronUp, ExternalLink, Eye, ArrowRight, Search, BarChart3, Folder } from 'lucide-react';
import PDFViewer from './PDFViewer';
import { supabase } from '../supabaseClient';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const CourseChapters = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        chapters, fetchChapters, addChapter, updateChapter, deleteChapter, reorderChapters,
        addContent, updateContent, deleteContent, loading, error
    } = useChapters();
    const { courses } = useCourses();
    const { exams } = useExams();
    const [course, setCourse] = useState(null);
    const lastFetchedId = useRef(null);

    // Chapter Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChapter, setEditingChapter] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', image: '', imageFile: null });

    // Edit Content Modal State
    const [editContentModal, setEditContentModal] = useState({ isOpen: false, content: null, chapterId: null });
    const [editContentForm, setEditContentForm] = useState({
        title: '',
        description: '',
        free_preview: false,
        is_locked: false,
        allow_download: true
    });
    const [savingEditContent, setSavingEditContent] = useState(false);

    // Content Modal State
    const [contentModal, setContentModal] = useState({ isOpen: false, type: null, chapterId: null });
    const [contentFormData, setContentFormData] = useState({ title: '', description: '', url: '', file: null, exam_ids: [] });

    // Exam search state
    const [examSearchQuery, setExamSearchQuery] = useState('');

    // Dropdown State
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // PDF Viewer State
    const [pdfViewerUrl, setPdfViewerUrl] = useState(null);

    // Video Viewer State
    const [videoViewerUrl, setVideoViewerUrl] = useState(null);

    // Delete Modal States
    const [deleteChapterModal, setDeleteChapterModal] = useState({ isOpen: false, chapter: null });
    const [deleteContentModal, setDeleteContentModal] = useState({ isOpen: false, content: null });

    const rootChapters = chapters.filter(c => !c.parent_id).sort((a, b) => a.order - b.order);

    useEffect(() => {
        if (courses.length > 0) {
            const courseData = courses.find(c => c.id == id);
            if (courseData) {
                setCourse(courseData);
                // Only fetch if we haven't fetched for this ID yet
                if (lastFetchedId.current !== id) {
                    fetchChapters(id);
                    lastFetchedId.current = id;
                }
            }
        }
    }, [id, courses, fetchChapters]);

    // Chapter Handlers
    const handleOpenModal = (chapter = null) => {
        if (chapter) {
            setEditingChapter(chapter);
            setFormData({ title: chapter.title, description: chapter.description || '', image: chapter.image || '', imageFile: null });
        } else {
            setEditingChapter(null);
            setFormData({ title: '', description: '', image: '', imageFile: null });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ title: '', description: '', image: '', imageFile: null });
        setEditingChapter(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let imageUrl = formData.image;

        // Handle Image Upload
        if (formData.imageFile) {
            try {
                const file = formData.imageFile;
                const fileExt = file.name.split('.').pop();
                const fileName = `chapter-icon-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('chapter-content')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('chapter-content')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload image: ' + error.message);
                return;
            }
        }

        const chapterData = {
            title: formData.title,
            description: formData.description,
            image: imageUrl
        };

        let result;
        if (editingChapter) {
            result = await updateChapter(editingChapter.id, chapterData);
        } else {
            result = await addChapter({ ...chapterData, courseId: id });
        }

        if (result.success) {
            handleCloseModal();
        } else {
            alert('Failed to save chapter: ' + result.error);
        }
    };

    const handleDeleteChapterClick = (chapter) => {
        setDeleteChapterModal({ isOpen: true, chapter });
    };

    const handleDeleteChapterConfirm = async () => {
        if (deleteChapterModal.chapter) {
            await deleteChapter(deleteChapterModal.chapter.id);
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(rootChapters);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update orders in DB
        const updates = items.map((chapter, index) => ({
            id: chapter.id,
            order: index
        }));

        for (const update of updates) {
            await supabase.from('chapters').update({ order: update.order }).eq('id', update.id);
        }

        fetchChapters(id);
    };

    // Content Handlers
    const handleOpenContentModal = (type, chapterId) => {
        setContentModal({ isOpen: true, type, chapterId });
        setContentFormData({ title: '', description: '', url: '', file: null, exam_ids: [] });
        setOpenDropdownId(null);
    };

    const handleCloseContentModal = () => {
        setContentModal({ isOpen: false, type: null, chapterId: null });
        setContentFormData({ title: '', description: '', url: '', file: null, exam_ids: [] });
        setExamSearchQuery('');
    };

    const handleContentSubmit = async (e) => {
        e.preventDefault();

        // For exam type, handle multiple exams
        if (contentModal.type === 'exam' && contentFormData.exam_ids && contentFormData.exam_ids.length > 0) {
            let successCount = 0;
            let failCount = 0;

            for (const examId of contentFormData.exam_ids) {
                const selectedExam = exams.find(exam => exam.id === examId);
                if (!selectedExam) continue;

                const contentToAdd = {
                    chapter_id: contentModal.chapterId,
                    type: contentModal.type,
                    exam_id: examId,
                    title: selectedExam.title
                };

                // Add entry to course_exams junction table
                try {
                    const { error } = await supabase
                        .from('course_exams')
                        .insert([{
                            course_id: id,
                            exam_id: examId
                        }]);

                    if (error && error.code !== '23505') {
                        console.error('Error linking exam to course:', error);
                    }
                } catch (err) {
                    console.error('Error linking exam to course:', err);
                }

                // Add content
                const result = await addContent(contentToAdd);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            if (failCount > 0) {
                alert(`Added ${successCount} exam(s), ${failCount} failed`);
            }
            handleCloseContentModal();
        } else {
            // For other content types (PDF, video, file)
            const contentToAdd = {
                chapter_id: contentModal.chapterId,
                type: contentModal.type,
                ...contentFormData
            };

            const result = await addContent(contentToAdd);

            if (result.success) {
                handleCloseContentModal();
            } else {
                alert('Failed to add content: ' + result.error);
            }
        }
    };

    const handleDeleteContentClick = (content, chapterId) => {
        setDeleteContentModal({ isOpen: true, content: { ...content, chapterId } });
    };

    const handleDeleteContentConfirm = async () => {
        if (deleteContentModal.content) {
            await deleteContent(deleteContentModal.content.id, deleteContentModal.content.chapterId);
        }
    };

    const handleOpenEditContentModal = (content, chapterId) => {
        setEditContentModal({ isOpen: true, content, chapterId });
        setEditContentForm({
            title: content.title || (content.exams?.title || ''),
            description: content.description || '',
            free_preview: !!content.free_preview,
            is_locked: !!content.is_locked,
            allow_download: content.allow_download !== undefined ? !!content.allow_download : true
        });
    };

    const handleCloseEditContentModal = () => {
        setEditContentModal({ isOpen: false, content: null, chapterId: null });
        setEditContentForm({
            title: '',
            description: '',
            free_preview: false,
            is_locked: false,
            allow_download: true
        });
    };

    const handleUpdateContentSubmit = async (e) => {
        e.preventDefault();
        if (!editContentModal.content) return;

        setSavingEditContent(true);
        try {
            const updates = {
                title: editContentForm.title.trim(),
                description: editContentForm.description ? editContentForm.description.trim() : null,
                free_preview: editContentForm.free_preview,
                is_locked: editContentForm.is_locked
            };

            const res = await updateContent(editContentModal.content.id, editContentModal.chapterId, updates);
            if (res.success) {
                handleCloseEditContentModal();
            } else {
                alert('Failed to update content: ' + res.error);
            }
        } catch (err) {
            console.error('Error updating content:', err);
            alert('Error: ' + err.message);
        } finally {
            setSavingEditContent(false);
        }
    };

    const toggleDropdown = (chapterId) => {
        setOpenDropdownId(openDropdownId === chapterId ? null : chapterId);
    };

    if (!course) return <div>Loading course...</div>;

    return (
        <div className="course-chapters-container">
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <button
                    onClick={() => navigate('/courses')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#666' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <span style={{ color: '#666' }}>Courses</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#666' }}>{course.title}</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#111', fontWeight: '600' }}>Chapters</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: 0 }}>Chapters</h2>
                    <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>Manage and organize the content of your course.</p>
                </div>
                <button
                    className="btn"
                    onClick={() => handleOpenModal()}
                    style={{
                        backgroundColor: '#00bfa5',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}
                >
                    <Plus size={20} /> Add Chapter
                </button>
            </div>

            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    border: '1px solid #ffcdd2',
                    fontSize: '14px'
                }}>
                    Error: {error}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#666' }}>Loading chapters...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="chapters">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
                            >
                                {chapters.length === 0 && (
                                    <div style={{
                                        padding: '60px',
                                        textAlign: 'center',
                                        color: '#666',
                                        background: '#f8f9fa',
                                        borderRadius: '12px',
                                        border: '2px dashed #e9ecef'
                                    }}>
                                        <div style={{ marginBottom: '16px', color: '#ccc' }}>
                                            <Plus size={48} />
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>No chapters yet</h3>
                                        <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>Get started by creating your first chapter.</p>
                                        <button
                                            onClick={() => handleOpenModal()}
                                            style={{
                                                color: '#00bfa5',
                                                background: 'none',
                                                border: '1px solid #00bfa5',
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Create Chapter
                                        </button>
                                    </div>
                                )}
                                {rootChapters.map((chapter, index) => (
                                    <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    padding: '20px 0 20px 20px',
                                                    borderTop: '1px solid var(--border-color)',
                                                    background: snapshot.isDragging ? '#f9fafb' : 'white',
                                                    transition: 'all 0.2s',
                                                    ...provided.draggableProps.style
                                                }}
                                            >
                                                {/* Drag Handle */}
                                                <div
                                                    {...provided.dragHandleProps}
                                                    style={{ marginRight: '16px', color: 'var(--text-light)', marginTop: '20px', cursor: 'grab' }}
                                                >
                                                    <GripVertical size={20} />
                                                </div>

                                                {/* Chapter Icon */}
                                                <div style={{ width: '54px', height: '54px', borderRadius: '50%', overflow: 'hidden', marginRight: '20px', border: '1px solid #eee', position: 'relative', backgroundColor: '#e0f2f1' }}>
                                                    {chapters.some(c => c.parent_id === chapter.id) ? (
                                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                                                            <Folder size={24} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span style={{ fontWeight: '600', fontSize: '18px', color: '#00695c' }}>{index + 1}</span>
                                                        </div>
                                                    )}
                                                    {chapter.image && (
                                                        <img
                                                            src={chapter.image}
                                                            alt={chapter.title}
                                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Chapter Content */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '4px' }}>{chapter.title}</h3>
                                                            {chapter.description && <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '4px' }}>{chapter.description}</p>}

                                                            {/* Inline Actions */}
                                                            <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--primary-color)', marginTop: '8px' }}>
                                                                <span
                                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    onClick={() => navigate(`/courses/${id}/chapters/${chapter.id}/contents`)}
                                                                >
                                                                    Content
                                                                </span>
                                                                <span>•</span>
                                                                <span
                                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    onClick={() => handleOpenModal(chapter)}
                                                                >
                                                                    Update
                                                                </span>
                                                                <span>•</span>
                                                                <span
                                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    onClick={() => handleDeleteChapterClick(chapter)}
                                                                >
                                                                    Delete
                                                                </span>
                                                                {chapter.chapter_contents && chapter.chapter_contents.length > 0 && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span style={{ color: '#999' }}>
                                                                            {chapter.chapter_contents.length} {chapter.chapter_contents.length === 1 ? 'item' : 'items'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Chapter Contents */}
                                                {chapter.chapter_contents && chapter.chapter_contents.length > 0 && (
                                                    <div className="chapter-content-list">
                                                        {chapter.chapter_contents.map((content) => (
                                                            <div key={content.id} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                padding: '12px',
                                                                borderBottom: '1px solid #f5f5f5',
                                                                gap: '12px'
                                                            }}>
                                                                <div style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '6px',
                                                                    background: content.type === 'exam' ? '#e3f2fd' : '#f0f0f0',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: content.type === 'exam' ? '#1976d2' : '#666'
                                                                }}>
                                                                    {content.type === 'pdf' && <FileText size={18} />}
                                                                    {content.type === 'video' && <Video size={18} />}
                                                                    {content.type === 'file' && <File size={18} />}
                                                                    {content.type === 'exam' && <FileText size={18} />}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                        {content.type === 'exam' && content.exams ? content.exams.title : content.title}
                                                                        {content.type === 'exam' && <span style={{ fontSize: '11px', color: '#1976d2', fontWeight: 'bold' }}>EXAM</span>}
                                                                        {content.free_preview && (
                                                                            <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                                                                Preview
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {content.description && <div style={{ fontSize: '12px', color: '#888' }}>{content.description}</div>}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    {(content.url || content.content_url || content.type === 'exam') && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const viewUrl = content.url || content.content_url;
                                                                                if (content.type === 'pdf') {
                                                                                    setPdfViewerUrl(viewUrl);
                                                                                } else if (content.type === 'video') {
                                                                                    setVideoViewerUrl(viewUrl);
                                                                                } else if (content.type === 'exam') {
                                                                                    // Navigate to exam
                                                                                    navigate(`/student/exam/${content.exam_id || viewUrl}/take`);
                                                                                } else {
                                                                                    window.open(viewUrl, '_blank');
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                color: content.type === 'exam' ? '#1976d2' : '#00bfa5',
                                                                                padding: '4px',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            }}
                                                                            title={content.type === 'exam' ? 'Take Exam' : content.type === 'pdf' ? 'View PDF' : 'View Content'}
                                                                        >
                                                                            {content.type === 'pdf' ? <Eye size={16} /> : content.type === 'exam' ? <ArrowRight size={16} /> : <ExternalLink size={16} />}
                                                                        </button>
                                                                    )}
                                                                    {/* Statistics button for videos and exams */}
                                                                    {(content.type === 'video' || content.type === 'exam') && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (content.type === 'video') {
                                                                                    navigate(`/courses/${id}/content/${content.id}/statistics`);
                                                                                } else if (content.type === 'exam') {
                                                                                    navigate(`/exams/${content.exam_id || content.url || content.content_url}/statistics`);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                color: '#8b5cf6',
                                                                                padding: '4px',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            }}
                                                                            title={content.type === 'video' ? 'View Video Statistics' : 'View Exam Statistics'}
                                                                        >
                                                                            <BarChart3 size={16} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenEditContentModal(content, chapter.id)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            color: '#0284c7',
                                                                            padding: '4px',
                                                                            display: 'flex',
                                                                            alignItems: 'center'
                                                                        }}
                                                                        title="Update Content"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteContentClick(content, chapter.id)}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '4px' }}
                                                                        title="Delete Content"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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

            {/* Chapter Modal */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111' }}>
                                {editingChapter ? 'Edit Chapter' : 'Add Chapter'}
                            </h3>
                            <button onClick={handleCloseModal} style={closeButtonStyle}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g. Introduction to React"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Chapter Icon</label>
                                <input
                                    type="file"
                                    onChange={(e) => setFormData({ ...formData, imageFile: e.target.files[0] })}
                                    accept="image/*"
                                    style={inputStyle}
                                />
                                {formData.image && !formData.imageFile && (
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                        Current icon: <a href={formData.image} target="_blank" rel="noopener noreferrer" style={{ color: '#00bfa5' }}>View</a>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginBottom: '32px' }}>
                                <label style={labelStyle}>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Briefly describe what this chapter covers..."
                                    rows={4}
                                    style={textareaStyle}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={handleCloseModal} style={cancelButtonStyle}>Cancel</button>
                                <button type="submit" style={saveButtonStyle}><Save size={18} /> Save Chapter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Content Modal */}
            {contentModal.isOpen && (
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalContentStyle, width: contentModal.type === 'exam' ? '600px' : '500px' }}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111' }}>
                                Add {contentModal.type === 'pdf' ? 'PDF' : contentModal.type === 'video' ? 'Video' : contentModal.type === 'exam' ? 'Exams' : 'File'}
                            </h3>
                            <button onClick={handleCloseContentModal} style={closeButtonStyle}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleContentSubmit}>
                            {contentModal.type === 'exam' ? (
                                // For exams, show checkbox list for multi-select with search
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={labelStyle}>Select Exams</label>

                                    {/* Search Box */}
                                    <div style={{ marginBottom: '12px', position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                        <input
                                            type="text"
                                            placeholder="Search exams..."
                                            value={examSearchQuery}
                                            onChange={(e) => setExamSearchQuery(e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                paddingLeft: '40px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    {/* Select All / None Buttons */}
                                    {exams.length > 0 && (
                                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const filteredExams = exams.filter(exam =>
                                                        exam.title.toLowerCase().includes(examSearchQuery.toLowerCase())
                                                    );
                                                    setContentFormData({
                                                        ...contentFormData,
                                                        exam_ids: filteredExams.map(e => e.id)
                                                    });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    border: '1px solid #00bfa5',
                                                    background: 'white',
                                                    color: '#00bfa5',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setContentFormData({ ...contentFormData, exam_ids: [] })}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    border: '1px solid #ccc',
                                                    background: 'white',
                                                    color: '#666',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}

                                    {/* Exam List */}
                                    <div style={{
                                        maxHeight: '320px',
                                        overflowY: 'auto',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        backgroundColor: '#fafafa'
                                    }}>
                                        {exams.length === 0 ? (
                                            <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                                                No exams available. Create an exam first.
                                            </p>
                                        ) : (
                                            (() => {
                                                const filteredExams = exams.filter(exam =>
                                                    exam.title.toLowerCase().includes(examSearchQuery.toLowerCase())
                                                );

                                                if (filteredExams.length === 0) {
                                                    return (
                                                        <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                                                            No exams match your search.
                                                        </p>
                                                    );
                                                }

                                                return filteredExams.map(exam => (
                                                    <label
                                                        key={exam.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '12px',
                                                            cursor: 'pointer',
                                                            borderRadius: '6px',
                                                            transition: 'all 0.2s',
                                                            marginBottom: '4px',
                                                            backgroundColor: contentFormData.exam_ids.includes(exam.id) ? '#e8f5f3' : 'transparent',
                                                            border: contentFormData.exam_ids.includes(exam.id) ? '1px solid #00bfa5' : '1px solid transparent'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!contentFormData.exam_ids.includes(exam.id)) {
                                                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!contentFormData.exam_ids.includes(exam.id)) {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={contentFormData.exam_ids.includes(exam.id)}
                                                            onChange={(e) => {
                                                                const newExamIds = e.target.checked
                                                                    ? [...contentFormData.exam_ids, exam.id]
                                                                    : contentFormData.exam_ids.filter(id => id !== exam.id);
                                                                setContentFormData({ ...contentFormData, exam_ids: newExamIds });
                                                            }}
                                                            style={{
                                                                marginRight: '12px',
                                                                width: '18px',
                                                                height: '18px',
                                                                cursor: 'pointer',
                                                                accentColor: '#00bfa5'
                                                            }}
                                                        />
                                                        <span style={{
                                                            fontSize: '14px',
                                                            color: '#333',
                                                            fontWeight: contentFormData.exam_ids.includes(exam.id) ? '500' : '400'
                                                        }}>
                                                            {exam.title}
                                                        </span>
                                                    </label>
                                                ));
                                            })()
                                        )}
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Select one or more exams to add to this chapter.</span>
                                        <span style={{ fontWeight: '600', color: '#00bfa5' }}>
                                            {contentFormData.exam_ids.length} selected
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                // For other types (PDF, video, file), show full form
                                <>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>Title</label>
                                        <input
                                            type="text"
                                            value={contentFormData.title}
                                            onChange={(e) => setContentFormData({ ...contentFormData, title: e.target.value })}
                                            required
                                            placeholder={`e.g. ${contentModal.type === 'video' ? 'Lecture Video' : 'Lecture Notes'}`}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>
                                            {contentModal.type === 'video' ? 'Video File' : 'Upload File'}
                                        </label>
                                        <input
                                            type="file"
                                            onChange={(e) => setContentFormData({ ...contentFormData, file: e.target.files[0] })}
                                            required
                                            accept={contentModal.type === 'pdf' ? '.pdf' : contentModal.type === 'video' ? 'video/*' : '*/*'}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '32px' }}>
                                        <label style={labelStyle}>Description</label>
                                        <textarea
                                            value={contentFormData.description}
                                            onChange={(e) => setContentFormData({ ...contentFormData, description: e.target.value })}
                                            placeholder="Optional description..."
                                            rows={3}
                                            style={textareaStyle}
                                        />
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={handleCloseContentModal} style={cancelButtonStyle}>Cancel</button>
                                <button type="submit" style={saveButtonStyle}><Save size={18} /> Add Content</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Content / Attachment Modal */}
            {editContentModal.isOpen && editContentModal.content && (
                <div style={modalOverlayStyle} onClick={handleCloseEditContentModal}>
                    <div style={{ ...modalContentStyle, width: '560px', maxWidth: '92%' }} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#111' }}>
                                Update {editContentModal.content.type === 'pdf' ? 'Attachment' : editContentModal.content.type === 'video' ? 'Video' : editContentModal.content.type === 'exam' ? 'Exam' : 'Content'}
                            </h3>
                            <button onClick={handleCloseEditContentModal} style={closeButtonStyle}>
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateContentSubmit} style={{ padding: '24px' }}>
                            {/* Attachment Info Preview */}
                            <div style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '6px',
                                    backgroundColor: editContentModal.content.type === 'exam' ? '#e3f2fd' : editContentModal.content.type === 'video' ? '#fce4ec' : '#fee2e2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: editContentModal.content.type === 'exam' ? '#1976d2' : editContentModal.content.type === 'video' ? '#c2185b' : '#dc2626',
                                    flexShrink: 0
                                }}>
                                    {editContentModal.content.type === 'pdf' ? <FileText size={20} /> : editContentModal.content.type === 'video' ? <Video size={20} /> : <File size={20} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {editContentModal.content.url ? editContentModal.content.url.split('/').pop().split('?')[0] : (editContentModal.content.title || 'Attachment')}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' }}>
                                        {editContentModal.content.type || 'File'}
                                    </div>
                                </div>
                            </div>

                            {/* Title Field */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>
                                    Title <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editContentForm.title}
                                    onChange={(e) => setEditContentForm({ ...editContentForm, title: e.target.value })}
                                    placeholder="Enter title"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Description Field */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Description</label>
                                <textarea
                                    value={editContentForm.description}
                                    onChange={(e) => setEditContentForm({ ...editContentForm, description: e.target.value })}
                                    placeholder="Brief description (optional)..."
                                    rows={3}
                                    style={textareaStyle}
                                />
                            </div>

                            {/* Checkbox Options */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                {/* Allow free preview */}
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editContentForm.free_preview}
                                        onChange={(e) => setEditContentForm({ ...editContentForm, free_preview: e.target.checked })}
                                        style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#00bfa5' }}
                                    />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                            Allow free preview
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                                            If enabled this content can be previewed before purchasing the course.
                                        </div>
                                    </div>
                                </label>

                                {/* Bypass progressive lock */}
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!editContentForm.is_locked}
                                        onChange={(e) => setEditContentForm({ ...editContentForm, is_locked: !e.target.checked })}
                                        style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#00bfa5' }}
                                    />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                            Bypass progressive lock
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                                            Enabling this will allow user access to the next content irrespective of the progressive lock setting on the course.
                                        </div>
                                    </div>
                                </label>

                                {/* Allow download for documents / pdfs */}
                                {(editContentModal.content.type === 'pdf' || editContentModal.content.type === 'file' || editContentModal.content.type === 'notes') && (
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={editContentForm.allow_download}
                                            onChange={(e) => setEditContentForm({ ...editContentForm, allow_download: e.target.checked })}
                                            style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#00bfa5' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                                Allow download
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                                                If enabled, users can download this PDF/file.
                                            </div>
                                        </div>
                                    </label>
                                )}
                            </div>

                            {/* Modal Footer Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseEditContentModal}
                                    style={cancelButtonStyle}
                                    disabled={savingEditContent}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEditContent}
                                    style={{
                                        ...saveButtonStyle,
                                        backgroundColor: '#00bfa5',
                                        opacity: savingEditContent ? 0.7 : 1,
                                        cursor: savingEditContent ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {savingEditContent ? 'Updating...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PDF Viewer */}
            {pdfViewerUrl && (
                <PDFViewer
                    url={pdfViewerUrl}
                    onClose={() => setPdfViewerUrl(null)}
                />
            )}

            {/* Video Viewer Modal */}
            {videoViewerUrl && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '40px'
                }}>
                    <button
                        onClick={() => setVideoViewerUrl(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '2px solid white',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            width: '48px',
                            height: '48px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <X size={24} />
                    </button>
                    <div style={{
                        width: '100%',
                        maxWidth: '1200px',
                        aspectRatio: '16/9'
                    }}>
                        <video
                            key={videoViewerUrl}
                            controls
                            autoPlay
                            controlsList="nodownload"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px'
                            }}
                        >
                            <source src={videoViewerUrl} type="video/mp4" />
                            <source src={videoViewerUrl} type="video/webm" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}

            {/* Delete Chapter Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteChapterModal.isOpen}
                onClose={() => setDeleteChapterModal({ isOpen: false, chapter: null })}
                onConfirm={handleDeleteChapterConfirm}
                title="Delete Chapter"
                message="Deleting this chapter will remove all its content. Students will lose access."
                itemName={deleteChapterModal.chapter?.title}
                confirmText="Delete Chapter"
            />

            {/* Delete Content Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteContentModal.isOpen}
                onClose={() => setDeleteContentModal({ isOpen: false, content: null })}
                onConfirm={handleDeleteContentConfirm}
                title="Delete Content"
                message="This content will be permanently removed from the chapter."
                itemName={deleteContentModal.content?.title || (deleteContentModal.content?.type === 'exam' && deleteContentModal.content?.exams?.title)}
                confirmText="Delete Content"
            />
        </div>
    );
};

// Styles
const iconButtonStyle = {
    background: '#f5f5f5',
    border: 'none',
    cursor: 'pointer',
    color: '#555',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
};

const dropdownItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    transition: 'background 0.2s'
};

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out'
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '16px',
    width: '500px',
    maxWidth: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    transform: 'translateY(0)',
    animation: 'slideUp 0.3s ease-out'
};

const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
};

const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    transition: 'background 0.2s'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#333'
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s'
};

const textareaStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
};

const cancelButtonStyle = {
    background: '#f5f5f5',
    color: '#333',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
};

const saveButtonStyle = {
    background: '#00bfa5',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 191, 165, 0.3)'
};

export default CourseChapters;
