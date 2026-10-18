import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChapters } from '../context/ChapterContext';
import { useCourses } from '../context/CourseContext';
import { useExams } from '../context/ExamContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Plus, Folder, FileText, Video, File, GripVertical, ArrowRight, Eye, ExternalLink, BarChart3, X, Search } from 'lucide-react';
import PDFViewer from './PDFViewer';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { supabase } from '../supabaseClient';

const ChapterContents = () => {
    const { id: courseId, chapterId } = useParams();
    const navigate = useNavigate();
    const { chapters, fetchChapters, addContent, deleteContent, addChapter } = useChapters();
    const { courses } = useCourses();
    const { exams } = useExams();

    const [course, setCourse] = useState(null);
    const [chapter, setChapter] = useState(null);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Content Modal State
    const [contentModal, setContentModal] = useState({ isOpen: false, type: null });
    const [contentFormData, setContentFormData] = useState({ title: '', description: '', url: '', file: null, exam_ids: [] });
    const [examSearchQuery, setExamSearchQuery] = useState('');

    // Sub-Chapter Modal State
    const [subChapterModal, setSubChapterModal] = useState({ isOpen: false });
    const [subChapterFormData, setSubChapterFormData] = useState({ title: '', description: '', imageFile: null });

    // PDF/Video Viewer State
    const [pdfViewerUrl, setPdfViewerUrl] = useState(null);
    const [videoViewerUrl, setVideoViewerUrl] = useState(null);

    // Delete Modal State
    const [deleteContentModal, setDeleteContentModal] = useState({ isOpen: false, content: null });

    // Add Content Dropdown State
    const [showAddDropdown, setShowAddDropdown] = useState(false);

    const [subChapters, setSubChapters] = useState([]);

    useEffect(() => {
        loadData();
    }, [courseId, chapterId, courses]);

    const loadData = async () => {
        if (courses.length > 0) {
            const courseData = courses.find(c => c.id == courseId);
            if (courseData) {
                setCourse(courseData);
            }
        }

        await fetchChapters(courseId);

        // Get chapter data
        const { data: chapterData, error } = await supabase
            .from('chapters')
            .select('*, chapter_contents(*,  exams(*))')
            .eq('id', chapterId)
            .single();

        if (!error && chapterData) {
            setChapter(chapterData);
            // Sort contents by order
            const sortedContents = (chapterData.chapter_contents || []).sort((a, b) => a.order - b.order);
            setContents(sortedContents);
        }

        // Get sub-chapters
        const { data: subChaptersData, error: subError } = await supabase
            .from('chapters')
            .select('*')
            .eq('parent_id', chapterId)
            .order('order', { ascending: true });

        if (!subError && subChaptersData) {
            setSubChapters(subChaptersData);
        }

        setLoading(false);
    };

    const handleSubChapterSubmit = async (e) => {
        e.preventDefault();

        let imageUrl = null;

        if (subChapterFormData.imageFile) {
            try {
                const file = subChapterFormData.imageFile;
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
                alert('Failed to upload image');
                return;
            }
        }

        const newChapter = {
            course_id: courseId,
            title: subChapterFormData.title,
            description: subChapterFormData.description,
            parent_id: chapterId,
            order: subChapters.length,
            image: imageUrl
        };

        await addChapter(newChapter);
        setSubChapterModal({ isOpen: false });
        setSubChapterFormData({ title: '', description: '', imageFile: null });
        loadData();
    };

    const handleOpenContentModal = (type) => {
        setContentModal({ isOpen: true, type });
        setContentFormData({ title: '', description: '', url: '', file: null, exam_ids: [] });
        setShowAddDropdown(false);
    };

    const handleCloseContentModal = () => {
        setContentModal({ isOpen: false, type: null });
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
                    chapter_id: chapterId,
                    type: contentModal.type,
                    exam_id: examId,
                    title: selectedExam.title
                };

                // Add entry to course_exams junction table
                try {
                    await supabase
                        .from('course_exams')
                        .insert([{
                            course_id: courseId,
                            exam_id: examId
                        }]);
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
            loadData(); // Reload content
        } else {
            // For other content types (PDF, video, file)
            const contentToAdd = {
                chapter_id: chapterId,
                type: contentModal.type,
                ...contentFormData
            };

            const result = await addContent(contentToAdd);

            if (result.success) {
                handleCloseContentModal();
                loadData(); // Reload content
            } else {
                alert('Failed to add content: ' + result.error);
            }
        }
    };

    const handleDeleteContentClick = (content) => {
        setDeleteContentModal({ isOpen: true, content });
    };

    const handleDeleteContentConfirm = async () => {
        if (deleteContentModal.content) {
            await deleteContent(deleteContentModal.content.id, chapterId);
            loadData(); // Reload content
        }
    };

    const onSubChapterDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(subChapters);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setSubChapters(items);

        // Update orders in DB
        const updates = items.map((chapter, index) => ({
            id: chapter.id,
            order: index
        }));

        for (const update of updates) {
            await supabase.from('chapters').update({ order: update.order }).eq('id', update.id);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    if (!chapter) return <div style={{ padding: '40px', textAlign: 'center' }}>Chapter not found</div>;

    return (
        <div className="chapter-contents-container">
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <button
                    onClick={() => navigate('/courses')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#666' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <span style={{ color: '#666', cursor: 'pointer' }} onClick={() => navigate('/courses')}>Courses</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#666', cursor: 'pointer' }} onClick={() => navigate(`/courses/${courseId}/chapters`)}>{course?.title}</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#666', cursor: 'pointer' }} onClick={() => navigate(`/courses/${courseId}/chapters`)}>Chapters</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#111', fontWeight: '600' }}>{chapter.title}</span>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: 0 }}>{chapter.title}</h2>
                    {chapter.description && <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>{chapter.description}</p>}
                </div>
                <div style={{ position: 'relative' }}>
                    <button
                        className="btn"
                        onClick={() => setShowAddDropdown(!showAddDropdown)}
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
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={20} /> Add Content
                    </button>
                    {showAddDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            border: '1px solid #eee',
                            width: '200px',
                            zIndex: 10,
                            overflow: 'hidden'
                        }}>
                            {contents.length === 0 && (
                                <button onClick={() => { setSubChapterModal({ isOpen: true }); setShowAddDropdown(false); }} style={dropdownItemStyle}>
                                    <Folder size={16} /> Add Sub-chapter
                                </button>
                            )}

                            {subChapters.length === 0 && (
                                <>
                                    <button onClick={() => handleOpenContentModal('pdf')} style={dropdownItemStyle}>
                                        <FileText size={16} /> Add PDF
                                    </button>
                                    <button onClick={() => handleOpenContentModal('video')} style={dropdownItemStyle}>
                                        <Video size={16} /> Add Video
                                    </button>
                                    <button onClick={() => handleOpenContentModal('file')} style={dropdownItemStyle}>
                                        <File size={16} /> Add File
                                    </button>
                                    <button onClick={() => handleOpenContentModal('exam')} style={dropdownItemStyle}>
                                        <FileText size={16} /> Add Exam
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-Chapters List */}
            {subChapters.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sub-Chapters</h3>
                    <DragDropContext onDragEnd={onSubChapterDragEnd}>
                        <Droppable droppableId="sub-chapters">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}
                                >
                                    {subChapters.map((subChapter, index) => (
                                        <Draggable key={subChapter.id} draggableId={subChapter.id.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        padding: '16px 20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        borderBottom: index === subChapters.length - 1 ? 'none' : '1px solid #e5e7eb',
                                                        transition: 'background-color 0.2s',
                                                        backgroundColor: snapshot.isDragging ? '#f9fafb' : 'white'
                                                    }}
                                                    onClick={() => navigate(`/courses/${courseId}/chapters/${subChapter.id}/contents`)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        {/* Drag Handle */}
                                                        <div {...provided.dragHandleProps} style={{ color: '#ccc', cursor: 'grab', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                            <GripVertical size={20} />
                                                        </div>

                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '50%',
                                                            backgroundColor: '#e0f2fe', color: '#0284c7',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            overflow: 'hidden', position: 'relative'
                                                        }}>
                                                            {subChapter.image ? (
                                                                <img src={subChapter.image} alt={subChapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <Folder size={20} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>{subChapter.title}</h4>
                                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {subChapter.description || 'No description'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={18} color="#9ca3af" />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}

            {/* Content List */}
            {contents.length === 0 && subChapters.length === 0 ? (
                <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: '#666',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    border: '2px dashed #e9ecef'
                }}>
                    <div style={{ marginBottom: '16px', color: '#ccc' }}>
                        <File size={48} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>No content yet</h3>
                    <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>Add sub-chapters, videos, PDFs, files, or exams to this chapter.</p>
                    <button
                        onClick={() => setShowAddDropdown(!showAddDropdown)}
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
                        Add Content
                    </button>
                </div>
            ) : (
                <>
                    {contents.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contents</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                                {contents.map((content, index) => (
                                    <div
                                        key={content.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '20px',
                                            borderTop: index === 0 ? 'none' : '1px solid var(--border-color)',
                                            background: 'white',
                                            gap: '16px'
                                        }}
                                    >
                                        {/* Content Icon */}
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '8px',
                                            background: content.type === 'exam' ? '#e3f2fd' : content.type === 'video' ? '#fce4ec' : '#f0f0f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: content.type === 'exam' ? '#1976d2' : content.type === 'video' ? '#c2185b' : '#666',
                                            flexShrink: 0
                                        }}>
                                            {content.type === 'pdf' && <FileText size={24} />}
                                            {content.type === 'video' && <Video size={24} />}
                                            {content.type === 'file' && <File size={24} />}
                                            {content.type === 'exam' && <FileText size={24} />}
                                        </div>

                                        {/* Content Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                <div>
                                                    <h4 style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: '0 0 4px 0' }}>
                                                        {content.type === 'exam' && content.exams ? content.exams.title : content.title}
                                                        {content.type === 'exam' && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1976d2', fontWeight: 'bold', backgroundColor: '#e3f2fd', padding: '2px 8px', borderRadius: '4px' }}>EXAM</span>}
                                                    </h4>
                                                    {content.description && <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>{content.description}</p>}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--primary-color)', marginTop: '8px' }}>
                                                {(content.content_url || content.type === 'exam') && (
                                                    <>
                                                        <span
                                                            style={{ cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                            onClick={() => {
                                                                if (content.type === 'pdf') {
                                                                    setPdfViewerUrl(content.content_url);
                                                                } else if (content.type === 'video') {
                                                                    setVideoViewerUrl(content.content_url);
                                                                } else if (content.type === 'exam') {
                                                                    navigate(`/student/exam/${content.exam_id || content.content_url}/take`);
                                                                } else {
                                                                    window.open(content.content_url, '_blank');
                                                                }
                                                            }}
                                                        >
                                                            {content.type === 'pdf' ? <Eye size={14} /> : content.type === 'exam' ? <ArrowRight size={14} /> : <ExternalLink size={14} />}
                                                            {content.type === 'exam' ? 'Take Exam' : 'View'}
                                                        </span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                {(content.type === 'video' || content.type === 'exam') && (
                                                    <>
                                                        <span
                                                            style={{ cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#8b5cf6' }}
                                                            onClick={() => {
                                                                if (content.type === 'video') {
                                                                    navigate(`/courses/${courseId}/content/${content.id}/statistics`);
                                                                } else if (content.type === 'exam') {
                                                                    navigate(`/exams/${content.exam_id || content.content_url}/statistics`);
                                                                }
                                                            }}
                                                        >
                                                            <BarChart3 size={14} />
                                                            Statistics
                                                        </span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                <span
                                                    style={{ cursor: 'pointer', textDecoration: 'underline', color: '#d32f2f', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => handleDeleteContentClick(content)}
                                                >
                                                    <X size={14} />
                                                    Delete
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Content Modal */}
            {contentModal.isOpen && contentModal.type && (
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
                        <form onSubmit={handleContentSubmit} style={{ padding: '24px' }}>
                            {contentModal.type === 'exam' ? (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={labelStyle}>Select Exams</label>
                                    <div style={{ marginBottom: '12px', position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                        <input
                                            type="text"
                                            placeholder="Search exams..."
                                            value={examSearchQuery}
                                            onChange={(e) => setExamSearchQuery(e.target.value)}
                                            style={{ ...inputStyle, paddingLeft: '40px', fontSize: '14px' }}
                                        />
                                    </div>
                                    {exams.length > 0 && (
                                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                                            <button type="button" onClick={() => {
                                                const filteredExams = exams.filter(exam => exam.title.toLowerCase().includes(examSearchQuery.toLowerCase()));
                                                setContentFormData({ ...contentFormData, exam_ids: filteredExams.map(e => e.id) });
                                            }} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #00bfa5', background: 'white', color: '#00bfa5', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                                                Select All
                                            </button>
                                            <button type="button" onClick={() => setContentFormData({ ...contentFormData, exam_ids: [] })} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #ccc', background: 'white', color: '#666', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                    <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '8px', backgroundColor: '#fafafa' }}>
                                        {exams.length === 0 ? (
                                            <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No exams available. Create an exam first.</p>
                                        ) : (
                                            exams.filter(exam => exam.title.toLowerCase().includes(examSearchQuery.toLowerCase())).map(exam => (
                                                <label key={exam.id} style={{ display: 'flex', alignItems: 'center', padding: '12px', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s', marginBottom: '4px', backgroundColor: contentFormData.exam_ids.includes(exam.id) ? '#e8f5f3' : 'transparent', border: contentFormData.exam_ids.includes(exam.id) ? '1px solid #00bfa5' : '1px solid transparent' }}>
                                                    <input type="checkbox" checked={contentFormData.exam_ids.includes(exam.id)} onChange={(e) => {
                                                        const newExamIds = e.target.checked ? [...contentFormData.exam_ids, exam.id] : contentFormData.exam_ids.filter(id => id !== exam.id);
                                                        setContentFormData({ ...contentFormData, exam_ids: newExamIds });
                                                    }} style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00bfa5' }} />
                                                    <span style={{ fontSize: '14px', color: '#333', fontWeight: contentFormData.exam_ids.includes(exam.id) ? '500' : '400' }}>{exam.title}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Select one or more exams to add to this chapter.</span>
                                        <span style={{ fontWeight: '600', color: '#00bfa5' }}>{contentFormData.exam_ids.length} selected</span>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>Title</label>
                                        <input type="text" value={contentFormData.title} onChange={(e) => setContentFormData({ ...contentFormData, title: e.target.value })} required placeholder={contentModal.type === 'video' ? "e.g. Introduction Video" : contentModal.type === 'pdf' ? "e.g. Course Syllabus" : "e.g. Document Title"} style={inputStyle} />
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>Description (Optional)</label>
                                        <textarea value={contentFormData.description} onChange={(e) => setContentFormData({ ...contentFormData, description: e.target.value })} placeholder="Brief description..." rows={3} style={textareaStyle} />
                                    </div>
                                    <div style={{ marginBottom: '32px' }}>
                                        <label style={labelStyle}>{contentModal.type === 'video' ? 'Video URL' : contentModal.type === 'pdf' ? 'PDF File' : 'File'}</label>
                                        {contentModal.type === 'pdf' || contentModal.type === 'file' ? (
                                            <input type="file" onChange={(e) => setContentFormData({ ...contentFormData, file: e.target.files[0] })} accept={contentModal.type === 'pdf' ? '.pdf' : '*'} style={inputStyle} required />
                                        ) : (
                                            <input type="url" value={contentFormData.url} onChange={(e) => setContentFormData({ ...contentFormData, url: e.target.value })} placeholder="https://..." style={inputStyle} required />
                                        )}
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={handleCloseContentModal} style={cancelButtonStyle}>Cancel</button>
                                <button type="submit" style={saveButtonStyle}><Plus size={18} /> Add {contentModal.type === 'exam' ? 'Exams' : 'Content'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {pdfViewerUrl && (<PDFViewer url={pdfViewerUrl} onClose={() => setPdfViewerUrl(null)} />)}

            {videoViewerUrl && (
                <div style={modalOverlayStyle} onClick={() => setVideoViewerUrl(null)}>
                    <div style={{ ...modalContentStyle, width: '80%', maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111' }}>Video Viewer</h3>
                            <button onClick={() => setVideoViewerUrl(null)} style={closeButtonStyle}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <video src={videoViewerUrl} controls style={{ width: '100%', borderRadius: '8px' }} />
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal isOpen={deleteContentModal.isOpen} itemName={deleteContentModal.content?.title || 'this content'} onConfirm={() => { handleDeleteContentConfirm(); setDeleteContentModal({ isOpen: false, content: null }); }} onCancel={() => setDeleteContentModal({ isOpen: false, content: null })} />

            {/* Sub-Chapter Modal */}
            {subChapterModal.isOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111' }}>Add Sub-Chapter</h3>
                            <button onClick={() => setSubChapterModal({ isOpen: false })} style={closeButtonStyle}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubChapterSubmit} style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Title</label>
                                <input type="text" value={subChapterFormData.title} onChange={(e) => setSubChapterFormData({ ...subChapterFormData, title: e.target.value })} required placeholder="e.g. Topic 1" style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Icon (Optional)</label>
                                <input type="file" onChange={(e) => setSubChapterFormData({ ...subChapterFormData, imageFile: e.target.files[0] })} accept="image/*" style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: '32px' }}>
                                <label style={labelStyle}>Description</label>
                                <textarea value={subChapterFormData.description} onChange={(e) => setSubChapterFormData({ ...subChapterFormData, description: e.target.value })} placeholder="Brief description..." rows={3} style={textareaStyle} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setSubChapterModal({ isOpen: false })} style={cancelButtonStyle}>Cancel</button>
                                <button type="submit" style={saveButtonStyle}><Plus size={18} /> Add Sub-Chapter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const dropdownItemStyle = { width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const modalContentStyle = { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', width: '500px', maxHeight: '90vh', overflow: 'auto' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e0e0e0' };
const closeButtonStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', transition: 'color 0.2s' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#333' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' };
const textareaStyle = { width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' };
const saveButtonStyle = { backgroundColor: '#00bfa5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' };
const cancelButtonStyle = { backgroundColor: '#f5f5f5', color: '#666', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' };

export default ChapterContents;
