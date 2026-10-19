'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChapters } from '../context/ChapterContext';
import { useCourses } from '../context/CourseContext';
import { useExams } from '../context/ExamContext';
import { useInstitute } from '../context/InstituteContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Edit2, Trash2, Video, FileText, FileQuestion, Move, Save, X, ArrowLeft, ExternalLink, ArrowRight, BarChart3, GripVertical, Folder, Eye, Search, File, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import SendNotificationModal from './SendNotificationModal';

import dynamic from 'next/dynamic';


const PDFViewer = dynamic(() => import('./PDFViewerComponent'), { ssr: false });


const ChapterContents = () => {
    const { id: courseId, chapterId } = useParams();
    const router = useRouter();
    const navigate = (path) => router.push(path);
    const { chapters, fetchChapters, addContent, updateContent, deleteContent, addChapter, updateChapter, reorderContents, reorderChapters } = useChapters();
    const { courses } = useCourses();
    const { exams, fetchExams } = useExams();
    const { institute } = useInstitute();

    const [course, setCourse] = useState(null);
    const [chapter, setChapter] = useState(null);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Content Modal State
    const [contentModal, setContentModal] = useState({ isOpen: false, type: null, isEditing: false, contentId: null });
    const [contentFormData, setContentFormData] = useState({ title: '', description: '', url: '', file: null, exam_ids: [] });
    const [examSearchQuery, setExamSearchQuery] = useState('');

    // Sub-Chapter Modal State
    const [subChapterModal, setSubChapterModal] = useState({ isOpen: false, isEditing: false, chapterId: null });
    const [subChapterFormData, setSubChapterFormData] = useState({ title: '', description: '', imageFile: null, imageUrl: null });

    // PDF/Video Viewer State
    const [pdfViewerUrl, setPdfViewerUrl] = useState(null);
    const [videoViewerUrl, setVideoViewerUrl] = useState(null);

    // Delete Modal State
    const [deleteContentModal, setDeleteContentModal] = useState({ isOpen: false, content: null });

    // Notification Modal State
    const [notificationModal, setNotificationModal] = useState({ isOpen: false, content: null });

    // Add Content Dropdown State
    const [showAddDropdown, setShowAddDropdown] = useState(false);

    const [subChapters, setSubChapters] = useState([]);

    useEffect(() => {
        loadData();
    }, [courseId, chapterId, courses]);

    useEffect(() => {
        console.log('🔄 ChapterContents mounted. Institute:', institute);
        if (institute?.id) {
            console.log('🚀 Triggering fetchExams with institute ID:', institute.id);
            fetchExams(institute.id);
        } else {
            console.warn('⚠️ Institute ID missing, cannot fetch exams.');
        }
    }, [institute?.id]);

    useEffect(() => {
        console.log('📦 Exams state updated:', exams?.length);
        if (exams?.length > 0) {
            console.log('Sample exam:', exams[0]);
        }
    }, [exams]);

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
            const normalizedChapter = {
                ...chapterData,
                title: chapterData.name || chapterData.title || '',
                name: chapterData.name || chapterData.title || '',
                image: chapterData.icon || chapterData.image || null,
                icon: chapterData.icon || chapterData.image || null,
            };
            setChapter(normalizedChapter);
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
            const normalizedSubs = subChaptersData.map(ch => ({
                ...ch,
                title: ch.name || ch.title || '',
                name: ch.name || ch.title || '',
                image: ch.icon || ch.image || null,
                icon: ch.icon || ch.image || null,
            }));
            setSubChapters(normalizedSubs);
        }

        setLoading(false);
    };

    const handleSubChapterSubmit = async (e) => {
        e.preventDefault();

        let imageUrl = null;

        if (subChapterFormData.imageFile) {
            try {
                const formData = new FormData();
                formData.append('file', subChapterFormData.imageFile);
                formData.append('folder', 'chapter-content');

                // Dynamic import to ensure server action is called correctly
                const { uploadImage } = await import('../app/actions/images');
                const result = await uploadImage(formData);

                if (!result.success) throw new Error(result.error || 'Upload failed');

                imageUrl = result.url;
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload image: ' + error.message);
                return;
            }
        }

        const chapterData = {
            course_id: courseId,
            title: subChapterFormData.title,
            // description removed
            parent_id: chapterId,
            // Only update order if new
            ...(subChapterModal.isEditing ? {} : { order: subChapters.length }),
            image: imageUrl || subChapterFormData.imageUrl
        };

        let result;
        if (subChapterModal.isEditing) {
            result = await updateChapter(subChapterModal.chapterId, chapterData);
        } else {
            result = await addChapter(chapterData);
        }

        if (result.success) {
            setSubChapterModal({ isOpen: false, isEditing: false, chapterId: null });
            setSubChapterFormData({ title: '', description: '', imageFile: null, imageUrl: null });
            loadData();
        } else {
            alert('Failed to save sub-chapter: ' + result.error);
        }
    };

    const handleEditSubChapter = (subChapter) => {
        setSubChapterModal({ isOpen: true, isEditing: true, chapterId: subChapter.id });
        setSubChapterFormData({
            title: subChapter.name,
            description: subChapter.description || '', // Keep description in form state even if not saved, or remove
            imageFile: null,
            imageUrl: subChapter.image
        });
    };

    const [videoTab, setVideoTab] = useState('url');
    // Reset forceIframe when opening a new video
    const [forceIframe, setForceIframe] = useState(false);
    useEffect(() => {
        setForceIframe(false);
    }, [videoViewerUrl]);

    // Auto-resolve Testpress API links
    const [resolvedUrl, setResolvedUrl] = useState(null);
    const [isResolving, setIsResolving] = useState(false);
    const [resolveError, setResolveError] = useState(null);

    useEffect(() => {
        if (videoViewerUrl && videoViewerUrl.includes('testpress.in/api/')) {
            setIsResolving(true);
            setResolveError(null);
            fetch(`/api/proxy/testpress-video?url=${encodeURIComponent(videoViewerUrl)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.url) {
                        setResolvedUrl(data.url);
                    } else {
                        setResolveError(data.error || 'Failed to resolve video');
                    }
                })
                .catch(err => setResolveError(err.message))
                .finally(() => setIsResolving(false));
        } else {
            setResolvedUrl(null);
            setResolveError(null);
            setIsResolving(false);
        }
    }, [videoViewerUrl]);

    const handleOpenContentModal = (type) => {
        setContentModal({ isOpen: true, type, isEditing: false, contentId: null });
        setContentFormData({ title: '', description: '', url: '', file: null, exam_ids: [] });
        setVideoTab('url');
        setShowAddDropdown(false);
    };

    const handleEditContent = (content) => {
        setContentModal({ isOpen: true, type: content.type, isEditing: true, contentId: content.id });
        setContentFormData({
            title: content.title,
            description: content.description || '',
            url: content.url || '',
            file: null,
            exam_ids: content.exams ? [content.exams.id] : []
        });
        setVideoTab('url');
        setShowAddDropdown(false);
    };

    const handleCloseContentModal = () => {
        setContentModal({ isOpen: false, type: null, isEditing: false, contentId: null });
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
            // For other content types (PDF, video, file)
            const contentData = {
                chapter_id: chapterId,
                type: contentModal.type,
                ...contentFormData,
                // Ensure content_url is passed if editing and no new file/url provided
                content_url: contentFormData.url
            };

            let result;
            if (contentModal.isEditing) {
                result = await updateContent(contentModal.contentId, chapterId, contentData);
            } else {
                result = await addContent(contentData);
            }

            if (result.success) {
                handleCloseContentModal();
                loadData(); // Reload content
            } else {
                alert('Failed to save content: ' + result.error);
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

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        // Prevent dragging across different lists
        if (source.droppableId !== destination.droppableId) return;

        if (source.droppableId === 'sub-chapters') {
            const items = Array.from(subChapters);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            setSubChapters(items);

            // Update orders in DB manually for sub-chapters to avoid context state overwrite issues (since reorderChapters expects full list context)
            const updates = items.map((chapter, index) => ({
                id: chapter.id,
                order: index
            }));

            for (const update of updates) {
                await supabase.from('chapters').update({ order: update.order }).eq('id', update.id);
            }
        } else if (source.droppableId === 'contents') {
            const items = Array.from(contents);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            setContents(items);
            await reorderContents(chapterId, items);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!chapter) return <div className="p-10 text-center">Chapter not found</div>;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="chapter-contents-container">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-sm">
                    <button
                        onClick={() => navigate('/courses')}
                        className="bg-transparent border-none cursor-pointer flex items-center p-0 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="text-gray-600 cursor-pointer hover:underline" onClick={() => navigate('/courses')}>Courses</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-600 cursor-pointer hover:underline" onClick={() => navigate(`/courses/${courseId}/chapters`)}>{course?.title}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-600 cursor-pointer hover:underline" onClick={() => navigate(`/courses/${courseId}/chapters`)}>Chapters</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900 font-semibold">{chapter.name || chapter.title}</span>
                </div>

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 m-0">{chapter.name || chapter.title}</h2>
                        {chapter.description && <p className="text-gray-600 mt-1 text-sm">{chapter.description}</p>}
                    </div>

                </div>

                {/* Sub-Chapters List */}
                {subChapters.length > 0 && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-semibold text-gray-500 m-0 uppercase tracking-wide">Sub-Chapters</h3>
                            <div className="relative">
                                <button
                                    className="btn bg-teal-500 text-white border-none py-2 px-4 rounded-md flex items-center gap-2 text-sm font-medium shadow-sm hover:bg-teal-600 cursor-pointer transition-all"
                                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                                >
                                    <Plus size={18} /> Add Content
                                </button>
                                {showAddDropdown && (
                                    <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 w-[200px] z-10 overflow-hidden">
                                        {contents.length === 0 && (
                                            <button onClick={() => { setSubChapterModal({ isOpen: true }); setShowAddDropdown(false); }} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                <Folder size={16} /> Add Sub-chapter
                                            </button>
                                        )}

                                        {subChapters.length === 0 && (
                                            <>
                                                <button onClick={() => handleOpenContentModal('pdf')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                    <FileText size={16} /> Add PDF
                                                </button>
                                                <button onClick={() => handleOpenContentModal('video')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                    <Video size={16} /> Add Video
                                                </button>
                                                <button onClick={() => handleOpenContentModal('file')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                    <File size={16} /> Add File
                                                </button>
                                                <button onClick={() => handleOpenContentModal('exam')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                    <FileText size={16} /> Add Exam
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <Droppable droppableId="sub-chapters">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white"
                                >
                                    {subChapters.map((subChapter, index) => (
                                        <Draggable key={subChapter.id} draggableId={subChapter.id.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`py-4 px-5 flex items-center justify-between cursor-pointer transition-colors ${index === subChapters.length - 1 ? '' : 'border-b border-gray-200'} ${snapshot.isDragging ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                                                    style={provided.draggableProps.style}
                                                    onClick={() => router.push(`/courses/${courseId}/chapters/${subChapter.id}/contents`)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {/* Drag Handle */}
                                                        <div {...provided.dragHandleProps} className="text-gray-300 cursor-grab flex items-center" onClick={(e) => e.stopPropagation()}>
                                                            <GripVertical size={20} />
                                                        </div>

                                                        <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center overflow-hidden relative">
                                                            {subChapter.image || subChapter.icon ? (
                                                                <img src={subChapter.image || subChapter.icon} alt={subChapter.name || subChapter.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Folder size={20} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-base font-semibold text-gray-800 m-0">{subChapter.name || subChapter.title}</h4>
                                                            <span className="text-xs text-gray-500">
                                                                {subChapter.description || ''}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditSubChapter(subChapter); }}
                                                            className="border-none bg-transparent cursor-pointer text-gray-500 p-1 hover:text-gray-700"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <ArrowRight size={18} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                )}

                {/* Content List */}
                {
                    contents.length === 0 && subChapters.length === 0 ? (
                        <div className="p-16 text-center text-gray-600 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <div className="mb-4 text-gray-300">
                                <File size={48} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No content yet</h3>
                            <p className="text-sm text-gray-500 mb-6">Add sub-chapters, videos, PDFs, files, or exams to this chapter.</p>
                            <div className="relative inline-block">
                                <button
                                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                                    className="text-teal-500 bg-transparent border border-teal-500 py-2 px-4 rounded-md cursor-pointer font-medium hover:bg-teal-50 transition-colors"
                                >
                                    Add Content
                                </button>
                                {showAddDropdown && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 w-[200px] z-10 overflow-hidden text-left">
                                        <button onClick={() => { setSubChapterModal({ isOpen: true }); setShowAddDropdown(false); }} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                            <Folder size={16} /> Add Sub-chapter
                                        </button>
                                        <button onClick={() => handleOpenContentModal('pdf')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                            <FileText size={16} /> Add PDF
                                        </button>
                                        <button onClick={() => handleOpenContentModal('video')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                            <Video size={16} /> Add Video
                                        </button>
                                        <button onClick={() => handleOpenContentModal('file')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                            <File size={16} /> Add File
                                        </button>
                                        <button onClick={() => handleOpenContentModal('exam')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                            <FileText size={16} /> Add Exam
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {contents.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-base font-semibold text-gray-500 m-0 uppercase tracking-wide">Contents</h3>
                                        <div className="relative">
                                            <button
                                                className="btn bg-teal-500 text-white border-none py-2 px-4 rounded-md flex items-center gap-2 text-sm font-medium shadow-sm hover:bg-teal-600 cursor-pointer transition-all"
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            >
                                                <Plus size={18} /> Add Content
                                            </button>
                                            {showAddDropdown && (
                                                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 w-[200px] z-10 overflow-hidden">
                                                    {contents.length === 0 && (
                                                        <button onClick={() => { setSubChapterModal({ isOpen: true }); setShowAddDropdown(false); }} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                            <Folder size={16} /> Add Sub-chapter
                                                        </button>
                                                    )}

                                                    {subChapters.length === 0 && (
                                                        <>
                                                            <button onClick={() => handleOpenContentModal('pdf')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                                <FileText size={16} /> Add PDF
                                                            </button>
                                                            <button onClick={() => handleOpenContentModal('video')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                                <Video size={16} /> Add Video
                                                            </button>
                                                            <button onClick={() => handleOpenContentModal('file')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                                <File size={16} /> Add File
                                                            </button>
                                                            <button onClick={() => handleOpenContentModal('exam')} className="w-full py-3 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                                <FileText size={16} /> Add Exam
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Droppable droppableId="contents">
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="flex flex-col border border-gray-200 rounded-xl overflow-hidden"
                                            >
                                                {contents.map((content, index) => (
                                                    <Draggable key={content.id} draggableId={content.id.toString()} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`flex items-center p-5 gap-4 ${index === 0 ? '' : 'border-t border-[var(--border-color)]'} ${snapshot.isDragging ? 'bg-gray-50' : 'bg-white'}`}
                                                                style={provided.draggableProps.style}
                                                            >
                                                                {/* Drag Handle */}
                                                                <div {...provided.dragHandleProps} className="text-gray-300 cursor-grab flex items-center">
                                                                    <GripVertical size={20} />
                                                                </div>

                                                                {/* Content Icon */}
                                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${content.type === 'exam' ? 'bg-blue-50 text-blue-600' : content.type === 'video' ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {content.type === 'pdf' && <FileText size={24} />}
                                                                    {content.type === 'video' && <Video size={24} />}
                                                                    {content.type === 'file' && <File size={24} />}
                                                                    {content.type === 'exam' && <FileText size={24} />}
                                                                </div>

                                                                {/* Content Info */}
                                                                <div className="flex-1">
                                                                    <div className="flex items-start justify-between">
                                                                        <div>
                                                                            <h4 className="text-base font-medium text-gray-900 m-0 mb-1">
                                                                                {content.type === 'exam' && content.exams ? content.exams.title : content.title}
                                                                                {content.type === 'exam' && <span className="ml-2 text-[11px] text-blue-600 font-bold bg-blue-50 py-0.5 px-2 rounded">EXAM</span>}
                                                                            </h4>
                                                                            {content.description && <p className="text-sm text-gray-600 m-0">{content.description}</p>}
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex gap-3 text-[13px] text-[var(--primary-color)] mt-2">
                                                                        <span
                                                                            className="cursor-pointer underline inline-flex items-center gap-1 text-amber-500 hover:text-amber-600"
                                                                            onClick={() => handleEditContent(content)}
                                                                        >
                                                                            <Edit2 size={14} />
                                                                            Edit
                                                                        </span>
                                                                        <span>•</span>

                                                                        {(content.url || content.type === 'exam') && (
                                                                            <>
                                                                                <span
                                                                                    className="cursor-pointer underline inline-flex items-center gap-1 hover:opacity-80"
                                                                                    onClick={() => {
                                                                                        if (content.type === 'pdf') {
                                                                                            setPdfViewerUrl(content.url);
                                                                                        } else if (content.type === 'video') {
                                                                                            setVideoViewerUrl(content.url);
                                                                                        } else if (content.type === 'exam') {
                                                                                            navigate(`/student/exam/${content.exam_id || content.url}/take`);
                                                                                        } else {
                                                                                            window.open(content.url, '_blank');
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
                                                                                    className="cursor-pointer underline inline-flex items-center gap-1 text-violet-500 hover:text-violet-600"
                                                                                    onClick={() => {
                                                                                        if (content.type === 'video') {
                                                                                            navigate(`/courses/${courseId}/content/${content.id}/statistics`);
                                                                                        } else if (content.type === 'exam') {
                                                                                            navigate(`/exams/${content.exam_id || content.url}/statistics`);
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
                                                                            className="cursor-pointer underline inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                                                            onClick={() => setNotificationModal({ isOpen: true, content })}
                                                                        >
                                                                            <Bell size={14} />
                                                                            Send Notification
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span
                                                                            className="cursor-pointer underline text-red-600 inline-flex items-center gap-1 hover:text-red-700"
                                                                            onClick={() => handleDeleteContentClick(content)}
                                                                        >
                                                                            <X size={14} />
                                                                            Delete
                                                                        </span>
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
                                </div>
                            )}
                        </>
                    )
                }

                {/* Content Modal */}
                {
                    contentModal.isOpen && contentModal.type && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
                            <div className={`bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh] ${contentModal.type === 'exam' ? 'w-[600px]' : 'w-[500px]'}`}>
                                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                    <h3 className="m-0 text-[22px] font-bold text-gray-900">
                                        {contentModal.isEditing ? 'Edit' : 'Add'} {contentModal.type === 'pdf' ? 'PDF' : contentModal.type === 'video' ? 'Video' : contentModal.type === 'exam' ? 'Exams' : 'File'}
                                    </h3>
                                    <button onClick={handleCloseContentModal} className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleContentSubmit} className="p-6">
                                    {contentModal.type === 'exam' ? (
                                        <div className="mb-6">
                                            <label className="block mb-2 font-medium text-sm text-gray-700">Select Exams</label>
                                            <div className="mb-3 relative">
                                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search exams..."
                                                    value={examSearchQuery}
                                                    onChange={(e) => setExamSearchQuery(e.target.value)}
                                                    className="w-full p-2.5 pl-10 border border-gray-200 rounded-md text-sm outline-none focus:border-teal-500 transition-colors"
                                                />
                                            </div>
                                            <div className="mb-3 flex flex-wrap gap-2 items-center justify-between">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => {
                                                        const filteredExams = exams.filter(exam => exam.title.toLowerCase().includes(examSearchQuery.toLowerCase()));
                                                        setContentFormData({ ...contentFormData, exam_ids: filteredExams.map(e => e.id) });
                                                    }} className="py-1.5 px-3 text-xs border border-teal-500 bg-white text-teal-500 rounded-md cursor-pointer font-medium hover:bg-teal-50">
                                                        Select All
                                                    </button>
                                                    <button type="button" onClick={() => setContentFormData({ ...contentFormData, exam_ids: [] })} className="py-1.5 px-3 text-xs border border-gray-300 bg-white text-gray-600 rounded-md cursor-pointer font-medium hover:bg-gray-50">
                                                        Clear All
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400">
                                                        {exams?.length || 0} loaded
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => institute?.id && fetchExams(institute.id)}
                                                        className="p-1 px-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded cursor-pointer transition-colors"
                                                        title="Force Refresh List"
                                                    >
                                                        ↻ Refresh
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                                                {!institute?.id && (
                                                    <div className="p-3 mb-2 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200">
                                                        Warning: Institute ID not detected. Please refresh the page.
                                                    </div>
                                                )}
                                                {exams.length === 0 ? (
                                                    <div className="text-center p-8">
                                                        <p className="text-gray-500 text-sm mb-2">No exams loaded.</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => institute?.id && fetchExams(institute.id)}
                                                            className="text-teal-600 text-xs hover:underline cursor-pointer"
                                                        >
                                                            Try Refreshing
                                                        </button>
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const filteredExams = exams.filter(exam => exam.title.toLowerCase().includes(examSearchQuery.toLowerCase()));

                                                        if (filteredExams.length === 0) {
                                                            return <p className="text-gray-500 text-sm text-center p-5">No exams found matching "{examSearchQuery}"</p>;
                                                        }

                                                        return filteredExams.map(exam => (
                                                            <label key={exam.id} className={`flex items-center p-3 cursor-pointer rounded-md transition-all mb-1 ${contentFormData.exam_ids.includes(exam.id) ? 'bg-teal-50 border border-teal-500' : 'bg-transparent border border-transparent hover:bg-gray-100'}`}>
                                                                <input type="checkbox" checked={contentFormData.exam_ids.includes(exam.id)} onChange={(e) => {
                                                                    const newExamIds = e.target.checked ? [...contentFormData.exam_ids, exam.id] : contentFormData.exam_ids.filter(id => id !== exam.id);
                                                                    setContentFormData({ ...contentFormData, exam_ids: newExamIds });
                                                                }} className="mr-3 w-[18px] h-[18px] cursor-pointer accent-teal-500" />
                                                                <span className={`text-sm text-gray-700 ${contentFormData.exam_ids.includes(exam.id) ? 'font-medium' : 'font-normal'}`}>{exam.title}</span>
                                                            </label>
                                                        ));
                                                    })()
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 flex justify-between items-center">
                                                <span>Select one or more exams to add to this chapter.</span>
                                                <span className="font-semibold text-teal-500">{contentFormData.exam_ids.length} selected</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-5">
                                                <label className="block mb-2 font-medium text-sm text-gray-700">Title</label>
                                                <input type="text" value={contentFormData.title} onChange={(e) => setContentFormData({ ...contentFormData, title: e.target.value })} required placeholder={contentModal.type === 'video' ? "e.g. Introduction Video" : contentModal.type === 'pdf' ? "e.g. Course Syllabus" : "e.g. Document Title"} className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-teal-500 transition-colors" />
                                            </div>
                                            <div className="mb-5">
                                                <label className="block mb-2 font-medium text-sm text-gray-700">Description (Optional)</label>
                                                <textarea value={contentFormData.description} onChange={(e) => setContentFormData({ ...contentFormData, description: e.target.value })} placeholder="Brief description..." rows={3} className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none resize-y font-inherit focus:border-teal-500 transition-colors" />
                                            </div>


                                            {/* Video Tabs */}
                                            {contentModal.type === 'video' && (
                                                <div className="flex border-b border-gray-200 mb-6">
                                                    <button
                                                        type="button"
                                                        onClick={() => setVideoTab('url')}
                                                        className={`flex-1 p-3 bg-transparent border-none cursor-pointer font-medium ${videoTab === 'url' ? 'border-b-2 border-teal-500 text-teal-500' : 'border-b-2 border-transparent text-gray-600'}`}
                                                    >
                                                        Video URL
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setVideoTab('upload')}
                                                        className={`flex-1 p-3 bg-transparent border-none cursor-pointer font-medium ${videoTab === 'upload' ? 'border-b-2 border-teal-500 text-teal-500' : 'border-b-2 border-transparent text-gray-600'}`}
                                                    >
                                                        Upload Video
                                                    </button>
                                                </div>
                                            )}

                                            <div className="mb-8">
                                                <label className="block mb-2 font-medium text-sm text-gray-700">
                                                    {contentModal.type === 'video'
                                                        ? (videoTab === 'url' ? 'Video URL' : 'Upload Video File')
                                                        : (contentModal.type === 'pdf' ? 'PDF File' : 'File')
                                                    }
                                                </label>

                                                {contentModal.type === 'video' ? (
                                                    videoTab === 'url' ? (
                                                        <input
                                                            type="url"
                                                            value={contentFormData.url}
                                                            onChange={(e) => setContentFormData({ ...contentFormData, url: e.target.value, file: null })}
                                                            placeholder="https://www.youtube.com/watch?v=..."
                                                            className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-teal-500 transition-colors"
                                                            required={videoTab === 'url'}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="file"
                                                            onChange={(e) => setContentFormData({ ...contentFormData, file: e.target.files[0], url: '' })}
                                                            accept="video/*"
                                                            className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none"
                                                            required={videoTab === 'upload'}
                                                        />
                                                    )
                                                ) : (
                                                    contentModal.type === 'pdf' || contentModal.type === 'file' ? (
                                                        <input type="file" onChange={(e) => setContentFormData({ ...contentFormData, file: e.target.files[0] })} accept={contentModal.type === 'pdf' ? '.pdf' : '*'} className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none" required />
                                                    ) : (
                                                        <input type="url" value={contentFormData.url} onChange={(e) => setContentFormData({ ...contentFormData, url: e.target.value })} placeholder="https://..." className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-teal-500 transition-colors" required />
                                                    )
                                                )}
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={handleCloseContentModal} className="bg-gray-100 text-gray-600 border-none py-2.5 px-5 rounded-lg font-medium cursor-pointer hover:bg-gray-200 transition-all">Cancel</button>
                                        <button type="submit" className="bg-teal-500 text-white border-none py-2.5 px-5 rounded-lg font-medium cursor-pointer flex items-center gap-2 hover:bg-teal-600 transition-all">
                                            {contentModal.isEditing ? <Save size={18} /> : <Plus size={18} />}
                                            {contentModal.isEditing ? 'Save Changes' : `Add ${contentModal.type === 'exam' ? 'Exams' : 'Content'}`}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {pdfViewerUrl && (<PDFViewer url={pdfViewerUrl} onClose={() => setPdfViewerUrl(null)} />)}

                {
                    videoViewerUrl && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setVideoViewerUrl(null)}>
                            <div className="bg-white rounded-xl shadow-xl w-[80%] max-w-[900px] overflow-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                    <h3 className="m-0 text-[22px] font-bold text-gray-900">Video Viewer</h3>
                                    <button onClick={() => setVideoViewerUrl(null)} className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"><X size={24} /></button>
                                </div>
                                <div className="p-5">
                                    {(() => {
                                        // Use resolved URL if available, otherwise original
                                        const targetUrl = resolvedUrl || videoViewerUrl;

                                        if (isResolving) {
                                            return (
                                                <div className="h-[500px] flex items-center justify-center bg-black rounded-lg text-white">
                                                    <div className="text-center">
                                                        <div className="border-[3px] border-white/30 border-t-white rounded-full w-[30px] h-[30px] animate-spin mx-auto mb-4"></div>
                                                        <p>Resolving secure video link...</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (resolveError) {
                                            return (
                                                <div className="p-5 text-center text-gray-600 bg-gray-100 rounded-lg">
                                                    <p className="m-0 mb-2 font-bold text-red-600">Error Resolving Video</p>
                                                    <p className="text-sm">{resolveError}</p>
                                                </div>
                                            );
                                        }

                                        const getEmbedUrl = (url) => {
                                            if (!url) return null;
                                            const cleanUrl = url.trim();

                                            // YouTube Regex
                                            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                                            const youtubeMatch = cleanUrl.match(youtubeRegex);
                                            if (youtubeMatch && youtubeMatch[1]) {
                                                return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
                                            }

                                            // Vimeo Regex
                                            const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
                                            const vimeoMatch = cleanUrl.match(vimeoRegex);
                                            if (vimeoMatch && vimeoMatch[1]) {
                                                return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
                                            }

                                            // Google Drive Regex (Convert /view to /preview)
                                            if (cleanUrl.includes('drive.google.com')) {
                                                // Extract ID
                                                const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                                if (idMatch && idMatch[1]) {
                                                    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
                                                }
                                            }

                                            return null;
                                        };

                                        const embedUrl = getEmbedUrl(targetUrl);
                                        const finalUrl = embedUrl || targetUrl;
                                        const isEmbed = !!embedUrl || forceIframe; // Modified line

                                        if (isEmbed) {
                                            return (
                                                <iframe
                                                    width="100%"
                                                    height="500"
                                                    src={finalUrl}
                                                    title="Video player"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="rounded-lg border border-gray-100"
                                                ></iframe>
                                            );
                                        } else {
                                            return (
                                                <div>
                                                    <video
                                                        src={targetUrl}
                                                        controls
                                                        className="w-full rounded-lg"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            document.getElementById('video-error').style.display = 'block';
                                                        }}
                                                    />
                                                    <div id="video-error" className="hidden p-5 text-center text-gray-600 bg-gray-100 rounded-lg">
                                                        <p className="m-0 mb-2 font-bold text-red-600">Error loading video</p>
                                                        <p className="text-sm mb-4">
                                                            The browser cannot play this file directly. The format might be unsupported, or it is a link to a website/API instead of a video file.
                                                        </p>

                                                        <button
                                                            onClick={() => setForceIframe(true)}
                                                            className="py-2 px-4 bg-teal-500 text-white border-none rounded cursor-pointer text-sm font-medium hover:bg-teal-600"
                                                        >
                                                            Try opening as Webpage (Iframe)
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-2.5 break-all font-mono">
                                                        Source: {targetUrl}
                                                    </p>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    )
                }

                <DeleteConfirmationModal isOpen={deleteContentModal.isOpen} itemName={deleteContentModal.content?.title || 'this content'} onConfirm={() => { handleDeleteContentConfirm(); setDeleteContentModal({ isOpen: false, content: null }); }} onCancel={() => setDeleteContentModal({ isOpen: false, content: null })} />

                {/* Sub-Chapter Modal */}
                {
                    subChapterModal.isOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
                            <div className="bg-white rounded-xl shadow-xl w-[500px] overflow-auto max-h-[90vh]">
                                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                    <h3 className="m-0 text-[22px] font-bold text-gray-900">
                                        {subChapterModal.isEditing ? 'Edit Sub-Chapter' : 'Add Sub-Chapter'}
                                    </h3>
                                    <button onClick={() => setSubChapterModal({ isOpen: false, isEditing: false })} className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubChapterSubmit} className="p-6">
                                    <div className="mb-5">
                                        <label className="block mb-2 font-medium text-sm text-gray-700">Title</label>
                                        <input type="text" value={subChapterFormData.title} onChange={(e) => setSubChapterFormData({ ...subChapterFormData, title: e.target.value })} required placeholder="e.g. Topic 1" className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-teal-500 transition-colors" />
                                    </div>
                                    <div className="mb-5">
                                        <label className="block mb-2 font-medium text-sm text-gray-700">Icon (Optional)</label>
                                        <input type="file" onChange={(e) => setSubChapterFormData({ ...subChapterFormData, imageFile: e.target.files[0] })} accept="image/*" className="w-full p-2.5 border border-gray-200 rounded-md text-sm outline-none" />
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setSubChapterModal({ isOpen: false, isEditing: false })} className="bg-gray-100 text-gray-600 border-none py-2.5 px-5 rounded-lg font-medium cursor-pointer hover:bg-gray-200 transition-all">Cancel</button>
                                        <button type="submit" className="bg-teal-500 text-white border-none py-2.5 px-5 rounded-lg font-medium cursor-pointer flex items-center gap-2 hover:bg-teal-600 transition-all">
                                            {subChapterModal.isEditing ? <Save size={18} /> : <Plus size={18} />}
                                            {subChapterModal.isEditing ? 'Save Changes' : 'Add Sub-Chapter'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
                <PDFViewer url={pdfViewerUrl} onClose={() => setPdfViewerUrl(null)} />

                {/* Send Notification Modal */}
                <SendNotificationModal
                    isOpen={notificationModal.isOpen}
                    onClose={() => setNotificationModal({ isOpen: false, content: null })}
                    contentId={notificationModal.content?.id}
                    contentName={notificationModal.content?.title || notificationModal.content?.exams?.title}
                    chapterName={chapter?.name}
                    chapterId={chapterId}
                    courseId={courseId}
                    courseName={course?.title}
                    onSuccess={(data) => {
                        console.log('Notification sent:', data);
                    }}
                />
            </div>
        </DragDropContext>
    );
};

export default ChapterContents;
