import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useChapters } from '../context/ChapterContext';
import { PlayCircle, FileText, CheckCircle, Lock, ChevronDown, ChevronRight, Menu, ArrowRight, Clock, Eye, FileQuestion, Folder, Award, AlertCircle, HelpCircle } from 'lucide-react';
import PDFViewer from './PDFViewer';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const ChapterIcon = ({ chapter, index, isActive, size = 32 }) => {
    const [imgError, setImgError] = useState(false);

    const imgSrc = chapter.image || chapter.icon;
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
            {imgSrc && !imgError ? (
                <img
                    src={imgSrc}
                    alt={chapter.title || chapter.name}
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
    const [examAttempts, setExamAttempts] = useState({});
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [examDetails, setExamDetails] = useState(null);

    // Fetch full exam details when activeContent is an exam
    useEffect(() => {
        if (activeContent?.type === 'exam' && (activeContent.exam_id || activeContent.content_url)) {
            const examId = activeContent.exam_id || activeContent.content_url;
            if (activeContent.exams?.number_of_questions && activeContent.exams?.marks_per_question !== undefined) {
                setExamDetails(activeContent.exams);
                return;
            }

            const fetchExam = async () => {
                try {
                    const { data: ex, error: exErr } = await supabase
                        .from('exams')
                        .select('*')
                        .eq('id', examId)
                        .maybeSingle();

                    if (!exErr && ex) {
                        let qCount = ex.number_of_questions;
                        if (!qCount || qCount === 0) {
                            const { count } = await supabase
                                .from('exam_questions')
                                .select('*', { count: 'exact', head: true })
                                .eq('exam_id', examId);
                            if (count) qCount = count;
                        }
                        setExamDetails({ ...ex, number_of_questions: qCount });
                    }
                } catch (err) {
                    console.error('Error fetching exam details:', err);
                }
            };
            fetchExam();
        } else {
            setExamDetails(null);
        }
    }, [activeContent]);

    useEffect(() => {
        if (user?.email) {
            const fetchMemberId = async () => {
                const { data } = await supabase.from('members').select('id').eq('email', user.email).maybeSingle();
                if (data) setMemberId(data.id);
            };
            fetchMemberId();
        }
    }, [user]);

    // Fetch student's exam attempts and content progress
    useEffect(() => {
        if (!memberId) return;

        const fetchStudentProgressAndAttempts = async () => {
            try {
                // 1. Fetch exam attempts
                const { data: attempts, error: attError } = await supabase
                    .from('exam_attempts')
                    .select('id, exam_id, score, total_marks, submitted_at, status, attempt_number')
                    .eq('member_id', memberId)
                    .not('submitted_at', 'is', null)
                    .order('submitted_at', { ascending: false });

                if (!attError && attempts) {
                    const attemptsMap = {};
                    attempts.forEach(att => {
                        const eid = Number(att.exam_id);
                        if (!attemptsMap[eid]) attemptsMap[eid] = [];
                        attemptsMap[eid].push(att);
                    });
                    setExamAttempts(attemptsMap);
                }

                // 2. Fetch content progress for this course
                if (id) {
                    const { data: progList, error: progError } = await supabase
                        .from('content_progress')
                        .select('content_id, completed')
                        .eq('member_id', memberId)
                        .eq('course_id', id);

                    if (!progError && progList) {
                        const progMap = {};
                        progList.forEach(p => {
                            if (p.completed) progMap[p.content_id] = true;
                        });
                        setContentProgress(progMap);
                    }
                }
            } catch (err) {
                console.error('Error fetching student attempts/progress:', err);
            }
        };

        fetchStudentProgressAndAttempts();
    }, [memberId, id]);

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
                .eq('member_id', memberId)
                .eq('content_id', contentId)
                .eq('content_type', 'video')
                .single();

            if (!existing) {
                // Insert initial view record
                const { error } = await supabase
                    .from('content_progress')
                    .insert({
                        member_id: memberId,
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
                    member_id: memberId,
                    course_id: id,
                    chapter_id: activeChapter?.id,
                    content_type: 'video',
                    content_id: contentId,
                    content_title: videoContent.title,
                    completed: completed,
                    completion_percentage: Math.round(percentage),
                    completed_at: completed ? new Date().toISOString() : null
                }, {
                    onConflict: 'member_id,content_id'
                });

            if (error) {
                console.error('Error updating video progress:', error);
            } else if (completed && !contentProgress[contentId]) {
                // Update local state if newly completed
                setContentProgress(prev => ({ ...prev, [contentId]: true }));

                // Recalculate course progress
                await supabase.rpc('calculate_course_progress', {
                    p_member_id: memberId,
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
                    member_id: memberId,
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
                    onConflict: 'member_id,content_id'
                });

            if (progressError) throw progressError;

            // Update local progress state
            setContentProgress(prev => ({ ...prev, [contentId]: true }));

            // Recalculate course progress
            const { data: newProgress, error: calcError } = await supabase
                .rpc('calculate_course_progress', {
                    p_member_id: memberId,
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
            const eid = Number(content.exam_id || (content.exams && content.exams.id) || content.content_url);
            if (eid && examAttempts[eid] && examAttempts[eid].length > 0) {
                return true;
            }
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
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{activeChapter.title || activeChapter.name}</h2>
                                    <p style={{ color: '#6b7280', margin: 0 }}>
                                        {visibleChapters.length > 0 && `${visibleChapters.length} ${visibleChapters.length === 1 ? 'Sub-chapter' : 'Sub-chapters'} • `}
                                        {visibleContents.length} {visibleContents.length === 1 ? 'Content' : 'Contents'}
                                    </p>
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
                            const subChaptersCount = chapters.filter(c => c.parent_id === chapter.id).length;
                            const contentsCount = chapter.chapter_contents ? chapter.chapter_contents.length : 0;
                            const chapterTitle = chapter.title || chapter.name || `Chapter ${index + 1}`;
                            const chapterImg = chapter.image || chapter.icon;

                            let subtitle = 'Empty folder';
                            if (subChaptersCount > 0 && contentsCount > 0) {
                                subtitle = `${subChaptersCount} ${subChaptersCount === 1 ? 'Sub-chapter' : 'Sub-chapters'} • ${contentsCount} ${contentsCount === 1 ? 'Item' : 'Items'}`;
                            } else if (subChaptersCount > 0) {
                                subtitle = `${subChaptersCount} ${subChaptersCount === 1 ? 'Sub-chapter' : 'Sub-chapters'}`;
                            } else if (contentsCount > 0) {
                                subtitle = `${contentsCount} ${contentsCount === 1 ? 'Item' : 'Items'}`;
                            }

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
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden', flexShrink: 0
                                        }}>
                                            {chapterImg ? (
                                                <img src={chapterImg} alt={chapterTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Folder size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>{chapterTitle}</h3>
                                            <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                                {subtitle}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} color="#9ca3af" />
                                </div>
                            );
                        })}

                        {/* Render Contents */}
                        {visibleContents.map((content, index) => {
                            const isExam = content.type === 'exam';
                            const examId = isExam ? Number(content.exam_id || (content.exams && content.exams.id) || content.content_url) : null;
                            const attempts = (isExam && examId && examAttempts[examId]) ? examAttempts[examId] : [];
                            const isAttempted = attempts.length > 0;
                            const latestAttempt = isAttempted ? attempts[0] : null;
                            const bestScore = isAttempted ? Math.max(...attempts.map(a => a.score ?? 0)) : null;
                            const totalMarks = isAttempted ? (latestAttempt?.total_marks || content.exams?.total_marks) : null;
                            const percentage = (isAttempted && totalMarks) ? Math.round((bestScore / totalMarks) * 100) : null;
                            const isComplete = isAttempted || isContentComplete(content);

                            return (
                                <div
                                    key={content.id}
                                    onClick={() => handleContentClick(activeChapter, content)}
                                    style={{
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        cursor: 'pointer',
                                        borderBottom: index === visibleContents.length - 1 ? 'none' : '1px solid #e5e7eb',
                                        transition: 'background-color 0.2s',
                                        backgroundColor: isAttempted ? '#fcfdfd' : 'white'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = isAttempted ? '#f0fdf4' : '#f9fafb'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = isAttempted ? '#fcfdfd' : 'white'}
                                >
                                    {isAttempted ? (
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: '#dcfce7',
                                            color: '#16a34a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }} title="Attempted">
                                            <CheckCircle size={16} />
                                        </div>
                                    ) : (
                                        <ContentIcon content={content} isActive={false} />
                                    )}

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '500', color: '#1f2937', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                                            {content.type === 'exam' && content.exams ? content.exams.title : content.title}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
                                            <span>{content.type === 'video' ? 'Video Content' : content.type === 'exam' ? 'Quiz / Exam' : 'Document'}</span>

                                            {isExam && isAttempted && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 9px',
                                                    backgroundColor: '#ecfdf5',
                                                    color: '#059669',
                                                    border: '1px solid #a7f3d0',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '600'
                                                }}>
                                                    <CheckCircle size={12} />
                                                    Attempted {attempts.length > 1 ? `(${attempts.length}x)` : ''} • Score: {bestScore}{totalMarks ? `/${totalMarks}` : ''} {percentage !== null ? `(${percentage}%)` : ''}
                                                </span>
                                            )}

                                            {isExam && !isAttempted && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '2px 8px',
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#64748b',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '500'
                                                }}>
                                                    Not Attempted
                                                </span>
                                            )}

                                            {!isExam && isComplete && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: '500' }}>
                                                    <CheckCircle size={12} /> Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                        {isAttempted ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/student/exam/${examId}/results`, { state: { courseId: id } });
                                                }}
                                                style={{
                                                    padding: '6px 14px',
                                                    backgroundColor: '#f0fdf4',
                                                    color: '#15803d',
                                                    border: '1px solid #bbf7d0',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#16a34a';
                                                    e.currentTarget.style.color = '#ffffff';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f0fdf4';
                                                    e.currentTarget.style.color = '#15803d';
                                                }}
                                            >
                                                <Eye size={13} /> View Result
                                            </button>
                                        ) : (
                                            <div style={{ color: '#d1d5db' }}>
                                                <PlayCircle size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

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
                                (() => {
                                    const currentExam = examDetails || activeContent.exams || {};
                                    const examTitle = currentExam.title || activeContent.title;
                                    const examDesc = currentExam.description || 'Ready to take this exam?';
                                    const numQuestions = currentExam.number_of_questions || (currentExam.total_marks && currentExam.marks_per_question ? Math.round(currentExam.total_marks / currentExam.marks_per_question) : null);
                                    const durationMins = currentExam.duration_minutes || activeContent.duration || 0;
                                    const marksPerQ = currentExam.marks_per_question ? parseFloat(currentExam.marks_per_question) : (currentExam.total_marks && numQuestions ? parseFloat((currentExam.total_marks / numQuestions).toFixed(2)) : 1);
                                    const isNegEnabled = Boolean(currentExam.negative_marking_enabled);
                                    const negMarks = isNegEnabled ? (currentExam.negative_marking_enabled && currentExam.negative_marks_per_question ? parseFloat(currentExam.negative_marks_per_question) : 0.33) : 0;
                                    const totalMarks = currentExam.total_marks ? parseFloat(currentExam.total_marks) : (numQuestions ? numQuestions * marksPerQ : null);
                                    const passMarks = currentExam.passing_marks ? parseFloat(currentExam.passing_marks) : null;

                                    const activeExamId = Number(activeContent.exam_id || activeContent.content_url || currentExam.id);
                                    const activeAttempts = (activeExamId && examAttempts[activeExamId]) ? examAttempts[activeExamId] : [];
                                    const hasAttempted = activeAttempts.length > 0;
                                    const latestAttempt = hasAttempted ? activeAttempts[0] : null;
                                    const bestScore = hasAttempted ? Math.max(...activeAttempts.map(a => a.score ?? 0)) : null;
                                    const examTotalMarks = latestAttempt?.total_marks || totalMarks;
                                    const scorePercentage = (hasAttempted && examTotalMarks) ? Math.round((bestScore / examTotalMarks) * 100) : null;

                                    return (
                                        <div style={{ textAlign: 'center', padding: '36px 24px', maxWidth: '820px', margin: '0 auto' }}>
                                            <div style={{ width: '72px', height: '72px', backgroundColor: hasAttempted ? '#dcfce7' : '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: hasAttempted ? '#16a34a' : '#0284c7' }}>
                                                {hasAttempted ? <CheckCircle size={38} /> : <FileText size={38} />}
                                            </div>
                                            <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '12px', color: '#0f172a' }}>{examTitle}</h2>
                                            {examDesc && (
                                                <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.6', fontSize: '15px' }}>{examDesc}</p>
                                            )}

                                            {/* Attempt Summary Banner (if attempted) */}
                                            {hasAttempted && (
                                                <div style={{
                                                    backgroundColor: '#f0fdf4',
                                                    border: '1px solid #86efac',
                                                    borderRadius: '12px',
                                                    padding: '16px 20px',
                                                    marginBottom: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: '16px',
                                                    textAlign: 'left'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div style={{
                                                            width: '42px',
                                                            height: '42px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#dcfce7',
                                                            color: '#16a34a',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            <CheckCircle size={22} />
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                    Already Attempted
                                                                </span>
                                                                <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600' }}>
                                                                    {activeAttempts.length} {activeAttempts.length === 1 ? 'Attempt' : 'Attempts'}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#14532d', marginTop: '2px' }}>
                                                                Best Score: {bestScore} {examTotalMarks ? `/ ${examTotalMarks}` : ''}
                                                                {scorePercentage !== null && (
                                                                    <span style={{ fontSize: '14px', fontWeight: '600', marginLeft: '6px', color: '#15803d' }}>
                                                                        ({scorePercentage}%)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {latestAttempt?.submitted_at && (
                                                                <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
                                                                    Last attempt: {new Date(latestAttempt.submitted_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => navigate(`/student/exam/${activeExamId}/results`, { state: { courseId: id } })}
                                                        style={{
                                                            padding: '9px 16px',
                                                            backgroundColor: '#16a34a',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                                        }}
                                                    >
                                                        <Eye size={15} /> View Results & Solutions
                                                    </button>
                                                </div>
                                            )}

                                            {/* Exam Glimpse Grid */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                                gap: '14px',
                                                marginBottom: '24px',
                                                textAlign: 'left'
                                            }}>
                                                {/* MCQs / Questions */}
                                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '8px' }}>
                                                        <FileQuestion size={18} />
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</span>
                                                    </div>
                                                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>
                                                        {numQuestions ? `${numQuestions} MCQs` : '50 MCQs'}
                                                    </div>
                                                </div>

                                                {/* Duration */}
                                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', marginBottom: '8px' }}>
                                                        <Clock size={18} />
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</span>
                                                    </div>
                                                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>
                                                        {durationMins} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Mins</span>
                                                    </div>
                                                </div>

                                                {/* Marks per Question */}
                                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9333ea', marginBottom: '8px' }}>
                                                        <Award size={18} />
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marks / Q</span>
                                                    </div>
                                                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>
                                                        +{marksPerQ}
                                                        {totalMarks && (
                                                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '6px' }}>({totalMarks} M)</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Negative Marking */}
                                                <div style={{
                                                    backgroundColor: isNegEnabled ? '#fff1f2' : '#f8fafc',
                                                    border: isNegEnabled ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    padding: '16px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isNegEnabled ? '#e11d48' : '#64748b', marginBottom: '8px' }}>
                                                        <AlertCircle size={18} />
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: isNegEnabled ? '#be123c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Negative Mark</span>
                                                    </div>
                                                    <div style={{ fontSize: '20px', fontWeight: '700', color: isNegEnabled ? '#9f1239' : '#0f172a' }}>
                                                        {isNegEnabled ? `-${negMarks}` : 'None'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Extra details strip */}
                                            <div style={{
                                                backgroundColor: '#f1f5f9',
                                                borderRadius: '8px',
                                                padding: '10px 18px',
                                                marginBottom: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexWrap: 'wrap',
                                                gap: '20px',
                                                fontSize: '13px',
                                                color: '#475569'
                                            }}>
                                                {passMarks && (
                                                    <span><strong>Passing Marks:</strong> {passMarks}</span>
                                                )}
                                                <span><strong>Auto-submit:</strong> On Timeout</span>
                                                <span><strong>Attempts:</strong> {currentExam.max_attempts ? `${currentExam.max_attempts} Attempt(s)` : 'Unlimited'}</span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {hasAttempted ? (
                                                    <>
                                                        <button
                                                            onClick={() => navigate(`/student/exam/${activeExamId}/results`, { state: { courseId: id } })}
                                                            style={{ padding: '12px 24px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)' }}
                                                        >
                                                            <Eye size={18} /> View Results & Solutions
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/student/exam/${activeExamId}/take`, { state: { courseId: id } })}
                                                            style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                                                        >
                                                            Re-take Exam <ArrowRight size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/student/exam/${activeExamId}/take`, { state: { courseId: id } })}
                                                        style={{ padding: '12px 28px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                                                    >
                                                        Start Exam <ArrowRight size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : activeContent.type === 'pdf' ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ width: '80px', height: '80px', backgroundColor: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#1976d2' }}>
                                        <FileText size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>{activeContent.title}</h2>
                                    <button
                                        onClick={() => {
                                            setPdfViewerUrl(`/api/proxy-pdf?id=${activeContent.id}`);
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
