import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useChapters } from '../context/ChapterContext';
import { PlayCircle, FileText, CheckCircle, Lock, ChevronDown, ChevronRight, Menu, ArrowRight, Clock, Eye, FileQuestion, Folder } from 'lucide-react';
import PDFViewer from './PDFViewer';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const ChapterIcon = ({ chapter, index, isActive, size = 32 }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            backgroundColor: isActive ? '#2563eb' : '#e5e7eb',
            color: isActive ? 'white' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size < 32 ? '12px' : '14px',
            fontWeight: '600',
            overflow: 'hidden',
            flexShrink: 0
        }}>
            {chapter.image && !imgError ? (
                <img
                    src={chapter.image}
                    alt={chapter.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImgError(true)}
                />
            ) : (
                <span>{index + 1}</span>
            )}
        </div>
    );
};

const ContentIcon = ({ content, isActive }) => {
    const [imgError, setImgError] = useState(false);

    const getIcon = () => {
        if (content.type === 'video') return <PlayCircle size={16} />;
        if (content.type === 'exam') return <FileQuestion size={16} />;
        return <FileText size={16} />;
    };

    return (
        <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: isActive ? '#dbeafe' : '#f3f4f6',
            color: isActive ? '#2563eb' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
        }}>
            {content.image && !imgError ? (
                <img
                    src={content.image}
                    alt={content.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImgError(true)}
                />
            ) : (
                getIcon()
            )}
        </div>
    );
};

const CoursePlayer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { chapters, fetchChapters, loading } = useChapters();

    // Derived state from URL params
    const chapterId = searchParams.get('chapterId');
    const contentId = searchParams.get('contentId');

    const [activeChapter, setActiveChapter] = useState(null);
    const [activeContent, setActiveContent] = useState(null);

    const [memberId, setMemberId] = useState(null);
    const [pdfViewerUrl, setPdfViewerUrl] = useState(null);
    const [contentProgress, setContentProgress] = useState({});
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);

    useEffect(() => {
        if (user?.email) {
            const fetchMemberId = async () => {
                const { data } = await supabase.from('members').select('id').eq('email', user.email).maybeSingle();
                if (data) setMemberId(data.id);
            };
            fetchMemberId();
        }
    }, [user]);

    useEffect(() => {
        fetchChapters(id);
    }, [id, fetchChapters]);

    // Sync state with URL params and loaded chapters
    useEffect(() => {
        if (chapters.length > 0) {
            if (contentId) {
                let foundContent = null;
                let foundChapter = null;

                // Try to find content in all chapters (flattened search)
                for (const chapter of chapters) {
                    const content = chapter.chapter_contents?.find(c => c.id.toString() === contentId);
                    if (content) {
                        foundContent = content;
                        foundChapter = chapter;
                        break;
                    }
                }

                if (foundContent && foundChapter) {
                    setActiveChapter(foundChapter);
                    setActiveContent(foundContent);
                }
            } else if (chapterId) {
                const chapter = chapters.find(c => c.id.toString() === chapterId);
                if (chapter) {
                    setActiveChapter(chapter);
                    setActiveContent(null);
                }
            } else {
                setActiveChapter(null);
                setActiveContent(null);
            }
        }
    }, [chapters, chapterId, contentId]);

    const handleChapterClick = (chapter) => {
        setSearchParams({ chapterId: chapter.id });
    };

    const handleContentClick = (chapter, content) => {
        setSearchParams({ chapterId: chapter.id, contentId: content.id });
        localStorage.setItem(`lastAccessedChapter_${id}`, chapter.id);
    };

    const handleBackToParent = () => {
        if (activeContent) {
            // Back to current chapter contents
            setSearchParams({ chapterId: activeChapter.id });
        } else if (activeChapter && activeChapter.parent_id) {
            // Back to parent chapter
            const parent = chapters.find(c => c.id === activeChapter.parent_id);
            setSearchParams({ chapterId: parent.id });
        } else {
            // Back to root
            setSearchParams({});
        }
    };

    // Track video view when it starts playing
    const trackVideoView = async (videoContent) => {
        if (!videoContent || !memberId || !id) return;

        try {
            const contentId = videoContent.id;

            // Check if already tracked
            const { data: existing } = await supabase
                .from('content_progress')
                .select('id')
                .eq('student_id', memberId)
                .eq('content_id', contentId)
                .eq('content_type', 'video')
                .single();

            if (!existing) {
                // Insert initial view record
                const { error } = await supabase
                    .from('content_progress')
                    .insert({
                        student_id: memberId,
                        course_id: id,
                        chapter_id: activeChapter?.id,
                        content_type: 'video',
                        content_id: contentId,
                        content_title: videoContent.title,
                        completed: false,
                        completion_percentage: 0
                    });

                if (error) {
                    console.error('Error tracking video view:', error);
                }
            }
        } catch (error) {
            console.error('Error tracking video view:', error);
        }
    };

    // Update video progress
    const updateVideoProgress = async (videoContent, percentage) => {
        if (!videoContent || !memberId || !id) return;

        try {
            const contentId = videoContent.id;
            const completed = percentage >= 90; // Consider 90% as completed

            const { error } = await supabase
                .from('content_progress')
                .upsert({
                    student_id: memberId,
                    course_id: id,
                    chapter_id: activeChapter?.id,
                    content_type: 'video',
                    content_id: contentId,
                    content_title: videoContent.title,
                    completed: completed,
                    completion_percentage: Math.round(percentage),
                    completed_at: completed ? new Date().toISOString() : null
                }, {
                    onConflict: 'student_id,content_id,content_type'
                });

            if (error) {
                console.error('Error updating video progress:', error);
            } else if (completed && !contentProgress[contentId]) {
                // Update local state if newly completed
                setContentProgress(prev => ({ ...prev, [contentId]: true }));

                // Recalculate course progress
                await supabase.rpc('calculate_course_progress', {
                    p_student_id: memberId,
                    p_course_id: id
                });
            }
        } catch (error) {
            console.error('Error updating video progress:', error);
        }
    };

    // Mark content as complete
    const markContentComplete = async () => {
        if (!activeContent || !memberId || !id || isMarkingComplete) return;

        setIsMarkingComplete(true);

        try {
            // Determine content ID based on type
            let contentId = activeContent.id;
            if (activeContent.type === 'exam') {
                contentId = activeContent.exam_id || activeContent.content_url;
            }

            // Insert/update content_progress
            const { error: progressError } = await supabase
                .from('content_progress')
                .upsert({
                    student_id: memberId,
                    course_id: id,
                    chapter_id: activeChapter?.id,
                    content_type: activeContent.type,
                    content_id: contentId,
                    content_title: activeContent.type === 'exam' && activeContent.exams
                        ? activeContent.exams.title
                        : activeContent.title,
                    completed: true,
                    completion_percentage: 100,
                    completed_at: new Date().toISOString()
                }, {
                    onConflict: 'student_id,content_id,content_type'
                });

            if (progressError) throw progressError;

            // Update local progress state
            setContentProgress(prev => ({ ...prev, [contentId]: true }));

            // Recalculate course progress
            const { data: newProgress, error: calcError } = await supabase
                .rpc('calculate_course_progress', {
                    p_student_id: memberId,
                    p_course_id: id
                });

            if (calcError) {
                console.error('Error calculating progress:', calcError);
            } else {
                console.log('Course progress updated:', newProgress + '%');
            }

            alert('Content marked as complete!');
        } catch (error) {
            console.error('Error marking content complete:', error);
            alert('Failed to mark content as complete: ' + error.message);
        } finally {
            setIsMarkingComplete(false);
        }
    };

    // Helper to check if content is complete
    const isContentComplete = (content) => {
        let contentId = content.id;
        if (content.type === 'exam') {
            contentId = content.exam_id || content.content_url;
        }
        return contentProgress[contentId] === true;
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading course content...</div>;
    }

    if (pdfViewerUrl) {
        return <PDFViewer url={pdfViewerUrl} onClose={() => setPdfViewerUrl(null)} />;
    }

    // Filter chapters to show
    const visibleChapters = chapters.filter(c => activeChapter ? c.parent_id === activeChapter.id : c.parent_id === null);
    const visibleContents = activeChapter ? (activeChapter.chapter_contents || []) : [];

    return (
        <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#f9fafb' }}>

            {/* List View (Chapters + Contents) */}
            {!activeContent && (
                <div className="course-player-container">
                    <div style={{ marginBottom: '20px' }}>
                        {activeChapter ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                    onClick={handleBackToParent}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}
                                >
                                    <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />
                                </button>
                                <div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{activeChapter.title}</h2>
                                    <p style={{ color: '#6b7280', margin: 0 }}>{visibleChapters.length} Sub-chapters • {visibleContents.length} Content</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>Course Curriculum</h2>
                                <p style={{ color: '#6b7280' }}>Select a chapter to view content</p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
                        {/* Render Sub-chapters */}
                        {visibleChapters.map((chapter, index) => {
                            const hasChildren = chapters.some(child => child.parent_id === chapter.id);
                            return (
                                <div
                                    key={chapter.id}
                                    onClick={() => handleChapterClick(chapter)}
                                    style={{
                                        padding: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #e5e7eb',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f9fafb';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'white';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            backgroundColor: '#e0f2fe', color: '#0284c7',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {chapter.image ? (
                                                <img src={chapter.image} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                            ) : (
                                                <Folder size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>{chapter.title}</h3>
                                            <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                                {chapters.filter(c => c.parent_id === chapter.id).length} Sub-chapters
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} color="#9ca3af" />
                                </div>
                            );
                        })}

                        {/* Render Contents */}
                        {visibleContents.map((content, index) => (
                            <div
                                key={content.id}
                                onClick={() => handleContentClick(activeChapter, content)}
                                style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    cursor: 'pointer',
                                    borderBottom: index === visibleContents.length - 1 && index === visibleContents.length - 1 ? 'none' : '1px solid #e5e7eb',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <ContentIcon content={content} isActive={false} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '0 0 4px 0' }}>
                                        {content.type === 'exam' && content.exams ? content.exams.title : content.title}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
                                        <span>{content.type === 'video' ? 'Video Content' : content.type === 'exam' ? 'Quiz / Exam' : 'Document'}</span>
                                        {isContentComplete(content) && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                                                <CheckCircle size={12} /> Completed
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ color: '#d1d5db' }}>
                                    <PlayCircle size={20} />
                                </div>
                            </div>
                        ))}

                        {visibleChapters.length === 0 && visibleContents.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                No content found in this folder.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Player View */}
            {activeContent && (
                <div className="course-player-wide-container">
                    <button
                        onClick={handleBackToParent}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#4b5563',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            fontSize: '16px',
                            fontWeight: '500'
                        }}
                    >
                        <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /> Back to {activeChapter?.title}
                    </button>

                    <div className="player-card">
                        {/* Player Content */}
                        <div className="player-content">
                            {activeContent.type === 'video' ? (
                                <div style={{ aspectRatio: '16/9', backgroundColor: 'black', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                                    <video
                                        key={activeContent.content_url}
                                        controls
                                        controlsList="nodownload"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        onPlay={() => trackVideoView(activeContent)}
                                        onTimeUpdate={(e) => {
                                            const video = e.target;
                                            if (video.duration) {
                                                const percentage = (video.currentTime / video.duration) * 100;
                                                if (Math.floor(percentage / 10) > Math.floor((video.dataset.lastProgress || 0) / 10)) {
                                                    video.dataset.lastProgress = percentage;
                                                    updateVideoProgress(activeContent, percentage);
                                                }
                                            }
                                        }}
                                        onEnded={() => updateVideoProgress(activeContent, 100)}
                                    >
                                        <source src={activeContent.content_url} type="video/mp4" />
                                        <source src={activeContent.content_url} type="video/webm" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ) : activeContent.type === 'exam' ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ width: '80px', height: '80px', backgroundColor: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#1976d2' }}>
                                        <FileText size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>{activeContent.exams?.title || activeContent.title}</h2>
                                    <p style={{ color: '#6b7280', marginBottom: '32px' }}>{activeContent.exams?.description || 'Ready to take this exam?'}</p>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => navigate(`/student/exam/${activeContent.exam_id || activeContent.content_url}/take`, { state: { courseId: id } })}
                                            style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Start Exam
                                        </button>
                                        <button
                                            onClick={() => navigate(`/student/exam/${activeContent.exam_id || activeContent.content_url}/results`, { state: { courseId: id } })}
                                            style={{ padding: '12px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            View Results
                                        </button>
                                    </div>
                                </div>
                            ) : activeContent.type === 'pdf' ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ width: '80px', height: '80px', backgroundColor: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#1976d2' }}>
                                        <FileText size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>{activeContent.title}</h2>
                                    <button
                                        onClick={() => {
                                            setPdfViewerUrl(activeContent.content_url);
                                            setTimeout(() => markContentComplete(), 2000);
                                        }}
                                        style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                                    >
                                        <Eye size={20} /> View PDF
                                    </button>
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <h2>{activeContent.title}</h2>
                                    <p>{activeContent.description}</p>
                                    {activeContent.content_url && (
                                        <a href={activeContent.content_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>View Content</a>
                                    )}
                                </div>
                            )}

                            {/* Mark Complete Button */}
                            {activeContent.type !== 'exam' && (
                                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                                    <button
                                        onClick={markContentComplete}
                                        disabled={isContentComplete(activeContent) || isMarkingComplete}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: isContentComplete(activeContent) ? '#10b981' : '#2563eb',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: isContentComplete(activeContent) ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            opacity: isMarkingComplete ? 0.7 : 1
                                        }}
                                    >
                                        <CheckCircle size={18} />
                                        {isContentComplete(activeContent) ? 'Completed' : 'Mark as Complete'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoursePlayer;
