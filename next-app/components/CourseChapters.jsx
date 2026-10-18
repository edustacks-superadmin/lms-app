'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useChapters } from '../context/ChapterContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Move, Video, FileText, Folder, Save, X, ArrowLeft, GripVertical, File, Eye, ExternalLink, BarChart3, ArrowRight, Search, Menu, MoreVertical, CheckCircle, AlertCircle, LayoutGrid, FileType, Layers, Lock, Unlock, LayoutList, Columns, RefreshCw } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { useCourses } from '../context/CourseContext';
import { useExams } from '../context/ExamContext';
import { useInstitute } from '../context/InstituteContext';
import IconPicker from './IconPicker';
import TransferModal from './TransferModal';
import { Copy, ArrowRightCircle } from 'lucide-react';

const CourseChapters = () => {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // ... existing hooks from context ...
    const {
        chapters, fetchChapters, addChapter, updateChapter, deleteChapter, reorderChapters,
        addContent, deleteContent, updateContent, reorderContents, loading, error,
        copyChapter, moveChapter, copyContent, moveContent
    } = useChapters();

    const rootChapters = chapters.filter(c => !c.parent_id).sort((a, b) => a.order - b.order);

    // ... existing context hooks ...
    const { courses, loading: coursesLoading } = useCourses();
    const { exams, fetchExams } = useExams();
    const { institute } = useInstitute();
    const [course, setCourse] = useState(null);
    const lastFetchedId = useRef(null);
    const isInitializedCheck = useRef(false);

    useEffect(() => {
        if (institute?.id) {
            fetchExams(institute.id);
        }
    }, [institute?.id]);

    // ... existing state definitions ...
    // Layout View State
    const [layoutView, setLayoutView] = useState('list'); // 'list' | 'split'
    const [selectedChapterId, setSelectedChapterId] = useState(null);

    // Initialize selected chapter for split view
    useEffect(() => {
        if (layoutView === 'split' && !selectedChapterId && rootChapters.length > 0) {
            setSelectedChapterId(rootChapters[0].id);
        }
    }, [layoutView, rootChapters, selectedChapterId]);

    // Chapter Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChapter, setEditingChapter] = useState(null);
    const [targetParentId, setTargetParentId] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', image: '' });


    // Transfer Modal State
    const [transferConfig, setTransferConfig] = useState({
        isOpen: false,
        operation: 'COPY', // 'COPY' | 'MOVE'
        item: null,
        itemType: 'CONTENT' // 'CHAPTER' | 'SUBCHAPTER' | 'CONTENT'
    });

    const handleOpenTransferModal = (operation, item, itemType) => {
        setTransferConfig({
            isOpen: true,
            operation,
            item,
            itemType
        });
    };

    const handleTransferSubmit = async (destination) => {
        const { operation, item, itemType } = transferConfig;
        const { courseId, chapterId } = destination;

        let result = { success: false };

        if (operation === 'COPY') {
            if (itemType === 'CONTENT') {
                result = await copyContent(item.id, chapterId);
            } else {
                // Determine target parent if copying a sub-chapter to same structure?
                // For simplicity, chapter copy goes to root or specified target if we supported hierarchy selection.
                // Our Context copyChapter supports targetParentId. 
                // The Modal currently selects a Course (and optionally a Chapter).
                // If itemType is CHAPTER (root), and we select a Course, it goes to root.
                // If itemType is SUBCHAPTER, and we select a Course... it goes to root unless we select a parent?
                // The modal lets us select a Chapter. If selected, it becomes a child of that chapter.
                // So if chapterId is present, targetParentId = chapterId.
                result = await copyChapter(item.id, courseId, chapterId || null);
            }
        } else {
            // MOVE
            if (itemType === 'CONTENT') {
                // Move content requires source chapter ID key for optimistic updates if we tracked it, 
                // but our context might not strictly need it if it scans all.
                // Actually context moveContent(contentId, targetChapterId, sourceChapterId)
                // We need sourceChapterId. For content item, we can get it from item.chapter_id
                result = await moveContent(item.id, chapterId, item.chapter_id);
            } else {
                result = await moveChapter(item.id, courseId, chapterId || null);
            }
        }

        if (result.success) {
            setTransferConfig({ ...transferConfig, isOpen: false });
            // If moved to another course, refresh might be needed or router push
            if (operation === 'MOVE' && courseId !== course?.id && (itemType === 'CHAPTER' || itemType === 'SUBCHAPTER')) {
                // Item moved away. State update in context handles removal.
            }
        } else {
            alert(`Failed to ${operation.toLowerCase()} item: ${result.error}`);
        }
    };

    // Content Modal State
    const [contentModal, setContentModal] = useState({ isOpen: false, type: null, chapterId: null });
    const [editingContent, setEditingContent] = useState(null);
    const [contentFormData, setContentFormData] = useState({ title: '', description: '', url: '', file: null, exam_ids: [], available_from: '' });

    // Exam search state
    const [examSearchQuery, setExamSearchQuery] = useState('');

    // Dropdown State
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Delete Modal States
    const [deleteChapterModal, setDeleteChapterModal] = useState({ isOpen: false, chapter: null });
    const [deleteContentModal, setDeleteContentModal] = useState({ isOpen: false, content: null });

    // Preview Modal State
    const [previewContent, setPreviewContent] = useState(null);

    // Expand/Collapse state for chapters
    const [expandedChapters, setExpandedChapters] = useState({});



    useEffect(() => {
        if (courses.length > 0) {
            const courseData = courses.find(c => c.id == id);
            if (courseData) {
                setCourse(courseData);
                if (lastFetchedId.current !== id) {
                    fetchChapters(id);
                    lastFetchedId.current = id;
                }
            }
        }
    }, [id, courses, fetchChapters]);

    // Initialize expanded state: from URL 'open' param OR default all expanded
    useEffect(() => {
        if (chapters.length > 0 && !isInitializedCheck.current) {
            const openParam = searchParams.get('open');
            let newState = {};

            if (openParam) {
                // Initialize from URL
                const openIds = openParam.split(',').map(id => parseInt(id));
                openIds.forEach(id => { newState[id] = true; });
            } else {
                // Default: Expand all root chapters
                const rootChaps = chapters.filter(c => !c.parent_id);
                rootChaps.forEach(chapter => {
                    newState[chapter.id] = true;
                });
            }

            setExpandedChapters(newState);
            isInitializedCheck.current = true;
        }
    }, [chapters, searchParams]); // Run once when chapters load

    // Sync expanded state to URL whenever it changes
    useEffect(() => {
        if (isInitializedCheck.current) {
            const openIds = Object.keys(expandedChapters).filter(id => expandedChapters[id]);
            const params = new URLSearchParams(searchParams ? searchParams.toString() : '');

            // Construct new open param
            if (openIds.length > 0) {
                const newOpenVal = openIds.join(',');
                if (params.get('open') !== newOpenVal) {
                    params.set('open', newOpenVal);
                    // Only update if changed
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }
            } else {
                if (params.has('open')) {
                    params.delete('open');
                    // Only update if changed
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }
            }
        }
    }, [expandedChapters, pathname, router, searchParams]);

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
    };

    const onDragEnd = async (result) => {
        const { source, destination, type } = result;

        if (!destination) return;

        // 1. Reordering Root Chapters
        if (source.droppableId === 'chapters-list' && destination.droppableId === 'chapters-list') {
            const items = Array.from(rootChapters);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            await reorderChapters(items);
            return;
        }

        // 2. Reordering Sub-chapters
        if (source.droppableId.startsWith('subchapters-') && destination.droppableId === source.droppableId) {
            const parentId = parseInt(source.droppableId.split('-')[1]);
            const siblings = chapters.filter(c => c.parent_id === parentId).sort((a, b) => a.order - b.order);

            const items = Array.from(siblings);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            await reorderChapters(items);
            return;
        }

        // 3. Reordering Contents
        if (source.droppableId.startsWith('contents-') && destination.droppableId === source.droppableId) {
            const chapterId = parseInt(source.droppableId.split('-')[1]);
            const chapter = chapters.find(c => c.id === chapterId);

            if (chapter && chapter.chapter_contents) {
                const items = Array.from(chapter.chapter_contents).sort((a, b) => a.order - b.order);
                const [reorderedItem] = items.splice(source.index, 1);
                items.splice(destination.index, 0, reorderedItem);

                await reorderContents(chapterId, items);
            }
            return;
        }
    };

    // Chapter Handlers
    const handleOpenModal = (chapter = null, parentId = null) => {
        if (chapter) {
            setEditingChapter(chapter);
            setFormData({ title: chapter.title, description: chapter.description || '', image: chapter.image || '' });
            setTargetParentId(chapter.parent_id || null);
        } else {
            setEditingChapter(null);
            setFormData({ title: '', description: '', image: '' });
            setTargetParentId(parentId);
        }
        setIsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ title: '', description: '', image: '' });
        setEditingChapter(null);
        setTargetParentId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const chapterData = {
            title: formData.title,
            image: formData.image,
            parent_id: targetParentId
        };
        let result;
        if (editingChapter) {
            result = await updateChapter(editingChapter.id, chapterData);
        } else {
            result = await addChapter({ ...chapterData, courseId: id });
        }
        if (result.success) handleCloseModal();
        else alert('Failed to save chapter: ' + result.error);
    };

    const handleDeleteChapterClick = (chapter) => setDeleteChapterModal({ isOpen: true, chapter });
    const handleDeleteChapterConfirm = async () => {
        if (deleteChapterModal.chapter) {
            const result = await deleteChapter(deleteChapterModal.chapter.id);
            if (result.success) {
                setDeleteChapterModal({ isOpen: false, chapter: null });
                window.location.reload();
            }
        }
    };


    const handleTogglePreview = async (content, chapterId) => {
        const newStatus = !content.free_preview;
        const result = await updateContent(content.id, chapterId, { free_preview: newStatus });
        if (!result.success) {
            alert('Failed to update preview status: ' + result.error);
        }
    };

    // Content Handlers
    const handleOpenContentModal = (type, chapterId) => {
        setContentModal({ isOpen: true, type, chapterId });
        setContentFormData({ title: '', description: '', url: '', file: null, exam_ids: [], available_from: '' });
        setOpenDropdownId(null);
    };

    const handleCloseContentModal = () => {
        setContentModal({ isOpen: false, type: null, chapterId: null });
        setEditingContent(null);
        setContentFormData({ title: '', description: '', url: '', file: null, exam_ids: [] });
        setExamSearchQuery('');
    };

    const handleEditContentClick = (content, chapterId) => {
        setEditingContent(content);
        setContentModal({ isOpen: true, type: content.type, chapterId });

        // Format available_from for datetime-local input (YYYY-MM-DDTHH:MM)
        let formattedAvailableFrom = '';
        if (content.available_from) {
            const date = new Date(content.available_from);
            // Format to YYYY-MM-DDTHH:MM in Local Time using manual construction
            // This prevents timezone shifts when converting to UTC-based ISO strings
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            formattedAvailableFrom = `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        setContentFormData({
            title: content.title || '',
            description: content.description || '',
            url: content.url || '',
            file: null,
            exam_ids: content.type === 'exam' ? [content.exam_id] : [],
            available_from: formattedAvailableFrom
        });
        setOpenDropdownId(null);
    };

    const handleContentSubmit = async (e) => {
        e.preventDefault();

        // Handle Exam Type (Multi-select)
        if (contentModal.type === 'exam' && contentFormData.exam_ids?.length > 0) {
            // ... (Existing logic for bulk exam add - keeping simplified for UI refresh)
            for (const examId of contentFormData.exam_ids) {
                const selectedExam = exams.find(ex => ex.id === examId);
                if (selectedExam) {
                    await addContent({
                        chapter_id: contentModal.chapterId,
                        type: 'exam',
                        exam_id: examId,
                        title: selectedExam.title
                    });
                }
            }
            handleCloseContentModal();
            return;
        }

        // Handle File/Video/PDF
        const contentToAdd = {
            chapter_id: contentModal.chapterId,
            type: contentModal.type,
            title: contentFormData.title,
            description: contentFormData.description,
            content_url: contentFormData.url, // For video/link/external pdf
            file: contentFormData.file, // For direct upload
            available_from: contentFormData.available_from || null // For scheduling
        };

        const result = editingContent
            ? await updateContent(editingContent.id, contentModal.chapterId, contentToAdd)
            : await addContent(contentToAdd);

        if (result.success) handleCloseContentModal();
        else alert(`Failed to ${editingContent ? 'update' : 'add'} content: ` + result.error);
    };

    const handleDeleteContentClick = (content, chapterId) => setDeleteContentModal({ isOpen: true, content, chapterId });
    const handleDeleteContentConfirm = async () => {
        if (deleteContentModal.content) {
            const result = await deleteContent(deleteContentModal.content.id, deleteContentModal.chapterId);
            if (result.success) {
                setDeleteContentModal({ isOpen: false, content: null });
                window.location.reload();
            }
        }
    };

    const getEmbedUrl = (url) => {
        if (!url) return '';

        // Handle YouTube
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch) {
            return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
        }

        return url;
    };

    const handleViewContent = (content) => {
        if (content.type === 'exam' && content.exam_id) {
            router.push(`/admin/exams/${content.exam_id}`);
        } else if (content.type === 'video' && content.url) {
            setPreviewContent(content);
        } else if (content.url) {
            window.open(content.url, '_blank');
        } else {
            alert('No URL available for this content.');
        }
    };


    // Helpers
    const getIconForType = (type) => {
        switch (type) {
            case 'video': return <Video size={16} className="text-blue-500" />;
            case 'pdf': return <FileText size={16} className="text-red-500" />;
            case 'exam': return <CheckCircle size={16} className="text-emerald-500" />;
            case 'file': return <File size={16} className="text-slate-500" />;
            default: return <File size={16} className="text-slate-400" />;
        }
    };

    // Recursive helper to render chapters
    const renderChapter = (chapter, index, provided = null, snapshot = null) => {
        const childChapters = chapters.filter(c => c.parent_id === chapter.id).sort((a, b) => a.order - b.order);
        const isRoot = !chapter.parent_id;

        // Styles based on hierarchy depth (Level 1 vs Level 2+)
        const containerClasses = isRoot
            ? `bg-white border mb-4 rounded-xl transition-all duration-200 overflow-hidden ${snapshot?.isDragging ? 'shadow-2xl ring-2 ring-blue-500/20 rotate-1 z-50 border-blue-200' : 'border-slate-300 shadow-sm'}`
            : `mt-2 mb-1 ml-4 mr-2 border border-slate-200 bg-slate-50 rounded-lg transition-all duration-200 shadow-sm ${snapshot?.isDragging ? 'opacity-50' : ''}`;

        const headerClasses = isRoot
            ? `flex items-center gap-3 p-3 cursor-pointer group transition-colors border-b border-slate-200 ${expandedChapters[chapter.id] ? 'bg-slate-100' : 'bg-slate-50/80 hover:bg-slate-100'}`
            : `flex items-center gap-2 py-2 px-3 rounded-t-lg cursor-pointer group transition-colors border-b border-slate-200 ${expandedChapters[chapter.id] ? 'bg-slate-200/60' : 'bg-slate-100 hover:bg-slate-200/50'}`;

        const titleClasses = isRoot
            ? `text-lg font-bold text-slate-800`
            : `text-sm font-bold text-slate-700 uppercase tracking-wide`;

        return (
            <div
                ref={provided?.innerRef}
                {...provided?.draggableProps}
                className={containerClasses}
            >
                {/* Chapter Header */}
                <div className={headerClasses}>
                    {provided && (
                        <div {...provided.dragHandleProps} className={`text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 ${!isRoot && 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                            <GripVertical size={isRoot ? 20 : 16} />
                        </div>
                    )}

                    <div className="flex-1 min-w-0" onClick={() => toggleChapter(chapter.id)}>
                        <div className="flex items-center gap-3 cursor-pointer">
                            <div className={`transition-transform duration-200 ${expandedChapters[chapter.id] ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}>
                                <ChevronRight size={isRoot ? 20 : 18} />
                            </div>

                            <div className={`p-0.5 rounded text-slate-400 ${expandedChapters[chapter.id] ? 'text-blue-500' : ''}`}>
                                {isRoot ? <Layers size={20} /> : <Folder size={18} />}
                            </div>

                            <div className="flex-1">
                                <h3 className={`${titleClasses} truncate flex items-center gap-3`}>
                                    {chapter.title}
                                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                        {(chapter.chapter_contents?.length || 0) + childChapters.length} items
                                    </span>
                                </h3>
                                {chapter.description && isRoot && <p className="text-sm text-slate-500 truncate mt-0.5">{chapter.description}</p>}
                            </div>
                        </div>
                    </div>

                    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isRoot ? '' : 'scale-90'}`}>
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === chapter.id ? null : chapter.id); }}
                                className={`p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm font-medium ${openDropdownId === chapter.id ? 'bg-blue-50 text-blue-600' : ''}`}
                                title="Add Content"
                            >
                                <Plus size={18} />
                            </button>
                            {openDropdownId === chapter.id && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                    <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wide">Add to {isRoot ? 'Chapter' : 'Sub-chapter'}</div>
                                    <button onClick={() => handleOpenModal(null, chapter.id)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Folder size={16} className="text-amber-500" /> Sub-chapter</button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button onClick={() => handleOpenContentModal('video', chapter.id)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Video size={16} className="text-blue-500" /> Video Lesson</button>
                                    <button onClick={() => handleOpenContentModal('pdf', chapter.id)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"><FileText size={16} className="text-red-500" /> PDF Material</button>
                                    <button onClick={() => handleOpenContentModal('exam', chapter.id)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Quiz / Exam</button>
                                </div>
                            )}
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); handleOpenTransferModal('COPY', chapter, isRoot ? 'CHAPTER' : 'SUBCHAPTER'); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Copy Chapter"><Copy size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenTransferModal('MOVE', chapter, isRoot ? 'CHAPTER' : 'SUBCHAPTER'); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Move Chapter"><ArrowRightCircle size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(chapter); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChapterClick(chapter); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                </div>

                {/* Chapter Contents and Child Chapters */}
                {expandedChapters[chapter.id] && (
                    <div className={isRoot ? "p-2" : "mt-2 space-y-1"}>

                        {/* Contents Droppable - NOW FIRST (Optional: standard practice is contents then subchapters, or vice versa. I'll keep contents first for list-feel) */}
                        <Droppable droppableId={`contents-${chapter.id}`} type={`CONTENTS_${chapter.id}`}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className={isRoot ? "divide-y divide-slate-100" : "divide-y divide-slate-100 pl-2"}>
                                    {chapter.chapter_contents && chapter.chapter_contents.sort((a, b) => a.order - b.order).map((content, index) => (
                                        <Draggable key={content.id} draggableId={`content-${content.id}`} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex items-center gap-3 py-2 px-3 group transition-all
                                                        ${snapshot.isDragging
                                                            ? 'bg-white shadow-lg ring-1 ring-slate-200 z-50 rounded-lg relative'
                                                            : 'hover:bg-slate-50 border-transparent'}
                                                    `}
                                                >
                                                    <div {...provided.dragHandleProps} className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing p-1">
                                                        <GripVertical size={14} />
                                                    </div>
                                                    <div className="shrink-0 text-slate-400">
                                                        {getIconForType(content.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">{content.title}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            {content.available_from && <p className="text-[10px] text-slate-400">Available: {new Date(content.available_from).toLocaleDateString()}</p>}
                                                        </div>
                                                    </div>
                                                    {content.free_preview && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md uppercase tracking-wide shrink-0 mr-2">Preview</span>}
                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                        <button onClick={() => handleTogglePreview(content, chapter.id)} className={`p-1.5 rounded-md transition-colors ${content.free_preview ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`} title={content.free_preview ? "Disable Free Preview" : "Enable Free Preview"}>
                                                            {content.free_preview ? <Unlock size={14} /> : <Lock size={14} />}
                                                        </button>
                                                        <button onClick={() => handleViewContent(content)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="View Content"><Eye size={14} /></button>
                                                        <button onClick={() => handleOpenTransferModal('COPY', content, 'CONTENT')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Copy Content"><Copy size={14} /></button>
                                                        <button onClick={() => handleOpenTransferModal('MOVE', content, 'CONTENT')} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Move Content"><ArrowRightCircle size={14} /></button>
                                                        <button onClick={() => handleEditContentClick(content, chapter.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Content"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteContentClick(content, chapter.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Content"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {/* Nested Sub-chapters Droppable */}
                        {childChapters.length > 0 && (
                            <Droppable droppableId={`subchapters-${chapter.id}`} type={`SUBCHAPTER_${chapter.id}`}>
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={isRoot ? "pt-2" : ""}
                                    >
                                        {childChapters.map((childChapter, index) => (
                                            <Draggable key={childChapter.id} draggableId={`subchapter-${childChapter.id}`} index={index}>
                                                {(provided, snapshot) => renderChapter(childChapter, index, provided, snapshot)}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        )}

                        {(!chapter.chapter_contents || chapter.chapter_contents.length === 0) && childChapters.length === 0 && (
                            <div className="py-4 text-center border-t border-dashed border-slate-100 mt-2">
                                <p className="text-xs text-slate-400 inline-block mr-2">Empty chapter.</p>
                                <button
                                    onClick={() => { setOpenDropdownId(chapter.id); if (!expandedChapters[chapter.id]) toggleChapter(chapter.id); }}
                                    className="text-xs text-blue-600 font-medium hover:underline"
                                >
                                    Add Content
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if ((loading || coursesLoading) && chapters.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }



    return (
        <div className="w-full max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Content</h1>
                    <p className="text-slate-500 mt-1">Organize your course with chapters and lessons.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 rounded-md transition-all text-slate-500 hover:text-slate-700 hover:bg-white hover:shadow-sm"
                            title="Refresh Page"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1"></div>
                        <button
                            onClick={() => setLayoutView('list')}
                            className={`p-2 rounded-md transition-all ${layoutView === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="List View"
                        >
                            <LayoutList size={20} />
                        </button>
                        <button
                            onClick={() => setLayoutView('split')}
                            className={`p-2 rounded-md transition-all ${layoutView === 'split' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Split View (Master-Detail)"
                        >
                            <Columns size={20} />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        <span>New Chapter</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {layoutView === 'split' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-12 gap-6 items-start">
                        {/* Sidebar Tree View */}
                        <div className="col-span-12 md:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8 max-h-[calc(100vh-100px)] overflow-y-auto">
                            <div className="p-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center text-xs">
                                <span>Chapters</span>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{chapters.length}</span>
                            </div>
                            <div className="p-2 border-b border-slate-100">
                                <Droppable droppableId="chapters-list" type="CHAPTER">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0.5">
                                            {rootChapters.map(chapter => {
                                                const childChapters = chapters.filter(c => c.parent_id === chapter.id).sort((a, b) => a.order - b.order);
                                                const isSelected = selectedChapterId === chapter.id;
                                                return (
                                                    <Draggable key={chapter.id} draggableId={`chapter-${chapter.id}`} index={chapter.order || 0}>
                                                        {(provided, snapshot) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps}>
                                                                <div
                                                                    onClick={() => { setSelectedChapterId(chapter.id); setExpandedChapters(prev => ({ ...prev, [chapter.id]: true })); }}
                                                                    className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}
                                                                >
                                                                    <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5">
                                                                        <GripVertical size={13} />
                                                                    </div>
                                                                    <div className={`p-0.5 rounded text-slate-400 ${isSelected ? 'text-blue-500' : ''}`}>
                                                                        {chapter.parent_id ? <Folder size={15} /> : <Layers size={15} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-sm font-medium truncate ${isSelected ? 'font-semibold' : ''}`}>{chapter.title}</p>
                                                                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{(chapter.chapter_contents?.length || 0) + childChapters.length} items</p>
                                                                    </div>
                                                                    {childChapters.length > 0 && (
                                                                        <button onClick={(e) => { e.stopPropagation(); toggleChapter(chapter.id); }} className="p-0.5 hover:bg-black/5 rounded text-slate-400">
                                                                            {expandedChapters[chapter.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Recursive Sub-chapters in Sidebar */}
                                                                {expandedChapters[chapter.id] && childChapters.length > 0 && (
                                                                    <Droppable droppableId={`subchapters-${chapter.id}`} type={`SUBCHAPTER_${chapter.id}`}>
                                                                        {(provided) => (
                                                                            <div {...provided.droppableProps} ref={provided.innerRef} className="ml-3 pl-2 border-l border-slate-200 space-y-0.5 mt-0.5 mb-0.5">
                                                                                {childChapters.map((child, index) => {
                                                                                    const isChildSelected = selectedChapterId === child.id;
                                                                                    return (
                                                                                        <Draggable key={child.id} draggableId={`subchapter-${child.id}`} index={index}>
                                                                                            {(provided, snapshot) => (
                                                                                                <div ref={provided.innerRef} {...provided.draggableProps}>
                                                                                                    <div
                                                                                                        onClick={() => setSelectedChapterId(child.id)}
                                                                                                        className={`flex items-center gap-2 py-1 px-1.5 rounded-lg cursor-pointer transition-all ${isChildSelected ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}
                                                                                                    >
                                                                                                        <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5">
                                                                                                            <GripVertical size={12} />
                                                                                                        </div>
                                                                                                        <div className={`text-slate-400 ${isChildSelected ? 'text-blue-500' : ''}`}>
                                                                                                            <Folder size={13} />
                                                                                                        </div>
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <p className={`text-xs font-medium truncate ${isChildSelected ? 'font-semibold' : ''}`}>{child.title}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </Draggable>
                                                                                    );
                                                                                })}
                                                                                {provided.placeholder}
                                                                            </div>
                                                                        )}
                                                                    </Droppable>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                            <div className="p-2 border-t border-slate-100">
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="w-full py-1.5 flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors border border-dashed border-slate-300 hover:border-slate-400"
                                >
                                    <Plus size={14} /> New Chapter
                                </button>
                            </div>
                        </div>

                        {/* Main Content Area (Selected Chapter) */}
                        <div className="col-span-12 md:col-span-8 space-y-4">
                            {selectedChapterId ? (() => {
                                const selectedChapter = chapters.find(c => c.id === selectedChapterId);
                                if (!selectedChapter) return <div className="text-slate-500 text-center py-10">Chapter not found</div>;

                                return (
                                    <>
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
                                            {/* Chapter Content Header */}
                                            <div className="p-4 border-b border-slate-100">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                                {selectedChapter.parent_id ? 'Sub-chapter' : 'Chapter'}
                                                            </span>
                                                            <h2 className="text-2xl font-bold text-slate-900">{selectedChapter.title}</h2>
                                                        </div>
                                                        <p className="text-slate-500">{selectedChapter.description || 'No description provided.'}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleOpenTransferModal('COPY', selectedChapter, selectedChapter.parent_id ? 'SUBCHAPTER' : 'CHAPTER')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Copy Chapter"><Copy size={16} /></button>
                                                        <button onClick={() => handleOpenTransferModal('MOVE', selectedChapter, selectedChapter.parent_id ? 'SUBCHAPTER' : 'CHAPTER')} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Move Chapter"><ArrowRightCircle size={16} /></button>
                                                        <button onClick={() => handleOpenModal(selectedChapter)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDeleteChapterClick(selectedChapter)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {!selectedChapter.parent_id && (
                                                        <button onClick={() => handleOpenModal(null, selectedChapter.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"><Folder size={14} /> Add Sub-chapter</button>
                                                    )}
                                                    <button onClick={() => handleOpenContentModal('video', selectedChapter.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"><Video size={14} /> Add Video</button>
                                                    <button onClick={() => handleOpenContentModal('pdf', selectedChapter.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"><FileText size={14} /> Add PDF</button>
                                                    <button onClick={() => handleOpenContentModal('exam', selectedChapter.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"><CheckCircle size={14} /> Add Exam</button>
                                                </div>
                                            </div>

                                            {/* Draggable Content List */}
                                            <div className="px-0">
                                                <Droppable droppableId={`contents-${selectedChapter.id}`} type={`CONTENTS_${selectedChapter.id}`}>
                                                    {(provided) => (
                                                        <div {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-slate-100">
                                                            {(selectedChapter.chapter_contents || []).sort((a, b) => a.order - b.order).map((content, index) => (
                                                                <Draggable key={content.id} draggableId={`content-${content.id}`} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            className={`flex items-center gap-3 py-2 px-3 transition-all group
                                                                            ${snapshot.isDragging
                                                                                    ? 'bg-white shadow-xl ring-1 ring-slate-200 rounded-lg z-50 relative'
                                                                                    : 'hover:bg-slate-50'}
                                                                        `}
                                                                        >
                                                                            <div {...provided.dragHandleProps} className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                                                                <GripVertical size={16} />
                                                                            </div>
                                                                            <div className="shrink-0 text-slate-400">
                                                                                {getIconForType(content.type)}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className="font-medium text-slate-900 truncate">{content.title}</h4>
                                                                                {content.available_from && (
                                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0">
                                                                                        <span>Available: {new Date(content.available_from).toLocaleDateString()}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {content.free_preview && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md uppercase tracking-wide shrink-0 mr-2">Preview</span>}
                                                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                                                <button onClick={() => handleTogglePreview(content, selectedChapter.id)} className={`p-1.5 rounded-md transition-colors ${content.free_preview ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`} title={content.free_preview ? "Disable Free Preview" : "Enable Free Preview"}>
                                                                                    {content.free_preview ? <Unlock size={14} /> : <Lock size={14} />}
                                                                                </button>
                                                                                <button onClick={() => handleViewContent(content)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="View Content"><Eye size={14} /></button>
                                                                                <button onClick={() => handleOpenTransferModal('COPY', content, 'CONTENT')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Copy Content"><Copy size={14} /></button>
                                                                                <button onClick={() => handleOpenTransferModal('MOVE', content, 'CONTENT')} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Move Content"><ArrowRightCircle size={14} /></button>
                                                                                <button onClick={() => handleEditContentClick(content, selectedChapter.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Content"><Edit2 size={14} /></button>
                                                                                <button onClick={() => handleDeleteContentClick(content, selectedChapter.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Content"><Trash2 size={14} /></button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                            {(!selectedChapter.chapter_contents || selectedChapter.chapter_contents.length === 0) && (
                                                                <div className="py-12 text-center">
                                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                        <Folder size={24} className="text-slate-300" />
                                                                    </div>
                                                                    <p className="text-slate-500 font-medium">This chapter is empty</p>
                                                                    <p className="text-slate-400 text-sm mt-1">Add contents using the buttons above</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        </div>
                                    </>
                                );
                            })() : (
                                <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-2xl border border-dashed border-slate-300 text-center p-8">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                        <LayoutGrid size={32} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">Select a Chapter</h3>
                                    <p className="text-slate-500 max-w-sm mt-2">Click on a chapter from the sidebar to view and manage its contents.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DragDropContext>
            ) : (
                /* Original List View */
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="chapters-list">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {rootChapters.map((chapter, index) => (
                                    <Draggable key={chapter.id} draggableId={chapter.id.toString()} index={index}>
                                        {(provided, snapshot) => renderChapter(chapter, index, provided, snapshot)}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {rootChapters.length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Layers size={32} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">Start Building Your Course</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mt-1 mb-6">Create your first chapter to organize lessons, quizzes, and resources.</p>
                                        <button
                                            onClick={() => handleOpenModal()}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-95"
                                        >
                                            Add Chapter
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {/* Modals - Simplified for this task, can be componentized further */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">{editingChapter ? 'Edit Chapter' : (targetParentId ? 'New Sub-chapter' : 'New Chapter')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chapter Title</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="e.g. Introduction to React" required autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-24" placeholder="Briefly describe what this chapter covers..." />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-md transition-all">Save Chapter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Content Modal (Simplified) */}
            {contentModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                {getIconForType(contentModal.type)}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{editingContent ? 'Edit' : 'Add'} {contentModal.type === 'pdf' ? 'PDF' : contentModal.type === 'exam' ? 'Exam' : 'Video'} Content</h2>
                        </div>

                        <form onSubmit={handleContentSubmit} className="space-y-4">
                            {contentModal.type === 'exam' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Exams</label>
                                    <div className="mb-3 flex flex-wrap gap-2 items-center justify-between">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => {
                                                const filteredExams = exams.filter(exam => exam.title.toLowerCase().includes(examSearchQuery.toLowerCase()));
                                                setContentFormData({ ...contentFormData, exam_ids: filteredExams.map(e => e.id) });
                                            }} className="py-1.5 px-3 text-xs border border-blue-500 bg-white text-blue-500 rounded-md cursor-pointer font-medium hover:bg-blue-50">
                                                Select All
                                            </button>
                                            <button type="button" onClick={() => setContentFormData({ ...contentFormData, exam_ids: [] })} className="py-1.5 px-3 text-xs border border-slate-300 bg-white text-slate-600 rounded-md cursor-pointer font-medium hover:bg-slate-50">
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">
                                                {exams?.length || 0} loaded
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => institute?.id && fetchExams(institute.id)}
                                                className="p-1 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer transition-colors flex items-center gap-1"
                                                title="Force Refresh List"
                                            >
                                                <span>↻</span> Refresh
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                                        {!institute?.id && (
                                            <div className="p-3 mb-2 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 flex items-center gap-2">
                                                <AlertCircle size={14} />
                                                <span>Warning: Institute ID not detected. Please refresh the page.</span>
                                            </div>
                                        )}
                                        {/* Exam selection logic */}
                                        <input type="text" placeholder="Search exams..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" onChange={(e) => setExamSearchQuery(e.target.value)} />

                                        {exams.length === 0 ? (
                                            <div className="text-center p-8">
                                                <p className="text-slate-500 text-sm mb-2">No exams loaded.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => institute?.id && fetchExams(institute.id)}
                                                    className="text-blue-600 text-xs hover:underline cursor-pointer"
                                                >
                                                    Try Refreshing
                                                </button>
                                            </div>
                                        ) : (
                                            (() => {
                                                const filteredExams = exams.filter(ex => ex.title.toLowerCase().includes(examSearchQuery.toLowerCase()));

                                                if (filteredExams.length === 0) {
                                                    return <p className="text-slate-500 text-sm text-center p-5">No exams found matching "{examSearchQuery}"</p>;
                                                }

                                                return filteredExams.map(exam => (
                                                    <label key={exam.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                                                        <input
                                                            type="checkbox"
                                                            checked={contentFormData.exam_ids?.includes(exam.id)}
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                            onChange={(e) => {
                                                                const ids = contentFormData.exam_ids || [];
                                                                if (e.target.checked) setContentFormData({ ...contentFormData, exam_ids: [...ids, exam.id] });
                                                                else setContentFormData({ ...contentFormData, exam_ids: ids.filter(id => id !== exam.id) });
                                                            }}
                                                        />
                                                        <span className={`text-sm text-slate-700 group-hover:text-slate-900 transition-colors ${contentFormData.exam_ids?.includes(exam.id) ? 'font-medium' : ''}`}>{exam.title}</span>
                                                    </label>
                                                ));
                                            })()
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                                        <input type="text" value={contentFormData.title} onChange={e => setContentFormData({ ...contentFormData, title: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" required autoFocus />
                                    </div>

                                    {(contentModal.type === 'pdf' || contentModal.type === 'file' || contentModal.type === 'video') && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Upload {contentModal.type === 'pdf' ? 'PDF' : contentModal.type === 'video' ? 'Video' : 'File'}</label>
                                            <div className="flex flex-col gap-2">
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        accept={contentModal.type === 'pdf' ? '.pdf' : contentModal.type === 'video' ? 'video/*' : '*/*'}
                                                        onChange={(e) => setContentFormData({ ...contentFormData, file: e.target.files[0], url: '' })}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className="w-full px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 group-hover:bg-slate-100 group-hover:border-slate-400 transition-all">
                                                        <Plus size={18} className="text-slate-400" />
                                                        <span className="text-sm text-slate-600 font-medium">
                                                            {contentFormData.file ? contentFormData.file.name : `Choose ${contentModal.type === 'pdf' ? 'PDF' : contentModal.type === 'video' ? 'Video' : 'file'} from computer`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 py-2">
                                                    <div className="h-px bg-slate-200 flex-1"></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
                                                    <div className="h-px bg-slate-200 flex-1"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            {contentModal.type === 'video' ? 'Video URL / Embed Code' : `${contentModal.type === 'pdf' ? 'PDF' : 'File'} URL (External)`}
                                        </label>
                                        <input
                                            type="text"
                                            value={contentFormData.url}
                                            onChange={e => setContentFormData({ ...contentFormData, url: e.target.value, file: null })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="https://..."
                                            disabled={!!contentFormData.file}
                                        />
                                        {contentFormData.file && <p className="text-[11px] text-amber-600 mt-1 font-medium">Using uploaded file instead of URL.</p>}
                                    </div>

                                    {/* Schedule Available From */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            📅 Available From (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={contentFormData.available_from}
                                            onChange={e => setContentFormData({ ...contentFormData, available_from: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">Leave empty to make available immediately. If set, students will be notified at this time.</p>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={handleCloseContentModal} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>{contentFormData.file ? 'Uploading...' : 'Saving...'}</span>
                                        </>
                                    ) : (
                                        editingContent ? 'Save Changes' : 'Add Content'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewContent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-black/90 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-white font-medium truncate flex-1 pr-4">{previewContent.title}</h3>
                            <button
                                onClick={() => setPreviewContent(null)}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="aspect-video bg-black relative">
                            {previewContent.url.includes('youtube') || previewContent.url.includes('youtu.be') ? (
                                <iframe
                                    src={getEmbedUrl(previewContent.url)}
                                    className="absolute inset-0 w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <video
                                    src={previewContent.url}
                                    controls
                                    autoPlay
                                    className="absolute inset-0 w-full h-full"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={deleteChapterModal.isOpen}
                onClose={() => setDeleteChapterModal({ isOpen: false, chapter: null })}
                onConfirm={handleDeleteChapterConfirm}
                itemName={deleteChapterModal.chapter?.title}
                itemType="chapter"
            />

            <DeleteConfirmationModal
                isOpen={deleteContentModal.isOpen}
                onClose={() => setDeleteContentModal({ isOpen: false, content: null })}
                onConfirm={handleDeleteContentConfirm}
                itemName={deleteContentModal.content?.title}
                itemType="content item"
            />

            <TransferModal
                isOpen={transferConfig.isOpen}
                onClose={(data) => {
                    if (data) handleTransferSubmit(data);
                    else setTransferConfig({ ...transferConfig, isOpen: false });
                }}
                operation={transferConfig.operation}
                item={transferConfig.item}
                itemType={transferConfig.itemType}
                currentCourseId={chapters.length > 0 ? chapters[0].course_id : null}
            />
        </div>
    );
};

export default CourseChapters;
