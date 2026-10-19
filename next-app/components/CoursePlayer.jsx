'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useChapters } from '../context/ChapterContext';
import { PlayCircle, FileText, CheckCircle, Lock, ChevronDown, ChevronRight, Menu, ArrowRight, Clock, Eye, FileQuestion, Folder, Award, AlertCircle, HelpCircle } from 'lucide-react';
import PDFViewer from './PDFViewer';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import FeedbackModal from './FeedbackModal';

const ChapterIcon = ({ chapter, index, isActive, size = 32 }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            className={`rounded-full flex items-center justify-center font-semibold overflow-hidden flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
            style={{ width: size, height: size, fontSize: size < 32 ? '12px' : '14px' }}
        >
            {chapter.image && !imgError ? (
                <img
                    src={chapter.image}
                    alt={chapter.title}
                    className="w-full h-full object-cover"
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
        <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}>
            {content.image && !imgError ? (
                <img
                    src={content.image}
                    alt={content.title}
                    className="w-full h-full object-cover"
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { chapters, fetchChapters, loading } = useChapters();

    // Helper to update search params
    const updateSearchParams = (newParams) => {
        const params = new URLSearchParams(searchParams.toString());

        // If passed null/undefined, remove them? Or just set?
        // Assuming object like { chapterId: '...' }
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        router.push(`?${params.toString()}`);
    };

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
    const [videoAccess, setVideoAccess] = useState(null);
    const [videoBlocked, setVideoBlocked] = useState(false);
    const [lastWatchUpdate, setLastWatchUpdate] = useState(0);

    // Feedback State
    const [feedbackForm, setFeedbackForm] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [examDetails, setExamDetails] = useState(null);

    // Fetch full exam details when activeContent is an exam
    useEffect(() => {
        if (activeContent?.type === 'exam' && (activeContent.exam_id || activeContent.content_url || activeContent.url)) {
            const examId = activeContent.exam_id || activeContent.content_url || activeContent.url;
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

    // Function to check for feedback triggers
    const checkFeedback = async () => {
        try {
            if (!id) return;
            const response = await fetch(`/api/courses/${id}/feedback/check`);
            if (response.ok) {
                const data = await response.json();
                if (data.should_trigger && data.form) {
                    setFeedbackForm(data.form);
                    setShowFeedbackModal(true);
                }
            }
        } catch (error) {
            console.error('Error checking feedback:', error);
        }
    };

    useEffect(() => {
        if (user?.email) {
            const fetchMemberId = async () => {
                const { data } = await supabase.from('members').select('id').eq('email', user.email).single();
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
        if (id) checkFeedback(); // Check on mount/id change
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
        updateSearchParams({ chapterId: chapter.id });
    };

    const handleContentClick = (chapter, content) => {
        updateSearchParams({ chapterId: chapter.id, contentId: content.id });
        localStorage.setItem(`lastAccessedChapter_${id}`, chapter.id);
    };

    const handleBackToParent = () => {
        if (activeContent) {
            // Back to current chapter contents
            updateSearchParams({ chapterId: activeChapter.id, contentId: null });
        } else if (activeChapter && activeChapter.parent_id) {
            // Back to parent chapter
            const parent = chapters.find(c => c.id === activeChapter.parent_id);
            updateSearchParams({ chapterId: parent.id, contentId: null });
        } else {
            // Back to root
            // To clear params, we need to basically restart. 
            // Or just pass nulls if updateSearchParams handles it.
            // Simplified:
            router.push(`?`);
        }
    };

    // Check video access before playing
    const checkVideoAccess = async (videoContent) => {
        if (!videoContent || !id) return { canAccess: true };

        try {
            const response = await fetch('/api/student/video/check-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentId: videoContent.id,
                    courseId: id
                })
            });

            if (response.ok) {
                const data = await response.json();
                setVideoAccess(data);
                return data;
            }
        } catch (error) {
            console.error('Error checking video access:', error);
        }
        return { canAccess: true };
    };

    // Track video view when it starts playing
    const trackVideoView = async (videoContent) => {
        if (!videoContent || !memberId || !id) return;

        try {
            // Check access first
            const access = await checkVideoAccess(videoContent);
            if (!access.canAccess) {
                setVideoBlocked(true);
                alert('Video limit reached: ' + access.reason);
                return false;
            }

            // Track view via API
            await fetch('/api/student/video/track-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentId: videoContent.id,
                    courseId: id,
                    chapterId: activeChapter?.id,
                    contentTitle: videoContent.title
                })
            });

            return true;
        } catch (error) {
            console.error('Error tracking video view:', error);
            return true;
        }
    };

    // Update video progress and watch time
    const updateVideoProgress = async (videoContent, percentage, currentTime) => {
        if (!videoContent || !memberId || !id) return;

        try {
            const contentId = videoContent.id;
            const completed = percentage >= 90; // Consider 90% as completed

            // Update watch time every 10 seconds
            if (currentTime && currentTime - lastWatchUpdate >= 10) {
                const secondsToAdd = currentTime - lastWatchUpdate;
                await fetch('/api/student/video/update-watch-time', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contentId: contentId,
                        secondsWatched: secondsToAdd
                    })
                });
                setLastWatchUpdate(currentTime);
            }

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

            // Check feedback triggers after completion
            await checkFeedback();

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
            const eid = Number(content.exam_id || (content.exams && content.exams.id) || content.content_url || content.url);
            if (eid && examAttempts[eid] && examAttempts[eid].length > 0) {
                return true;
            }
            contentId = content.exam_id || content.content_url || content.url;
        }
        return contentProgress[contentId] === true;
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Loading course content...</div>;
    }

    if (pdfViewerUrl) {
        return <PDFViewer url={pdfViewerUrl} onClose={() => setPdfViewerUrl(null)} />;
    }

    // Filter chapters to show
    const visibleChapters = chapters.filter(c => activeChapter ? c.parent_id === activeChapter.id : c.parent_id === null);
    const visibleContents = activeChapter ? (activeChapter.chapter_contents || []) : [];

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-6">

            {/* List View (Chapters + Contents) */}
            {!activeContent && (
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        {activeChapter ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBackToParent}
                                    className="bg-white p-2 rounded-full shadow-sm border border-gray-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                                >
                                    <ArrowRight size={20} className="rotate-180" />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 m-0">{activeChapter.title}</h2>
                                    <p className="text-slate-500 text-sm">{visibleChapters.length} Sub-chapters • {visibleContents.length} Content</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Course Curriculum</h2>
                                <p className="text-slate-500 text-sm mt-1">Select a chapter to view content</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {/* Render Sub-chapters */}
                        {visibleChapters.map((chapter, index) => {
                            const hasChildren = chapters.some(child => child.parent_id === chapter.id);
                            return (
                                <div
                                    key={chapter.id}
                                    onClick={() => handleChapterClick(chapter)}
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors">
                                            {chapter.image ? (
                                                <img src={chapter.image} alt={chapter.title} className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <Folder size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{chapter.title}</h3>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {chapters.filter(c => c.parent_id === chapter.id).length} Sub-chapters
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            );
                        })}

                        {/* Render Contents */}
                        {visibleContents.map((content, index) => {
                            const isExam = content.type === 'exam';
                            const examId = isExam ? Number(content.exam_id || (content.exams && content.exams.id) || content.content_url || content.url) : null;
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
                                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors group ${
                                        isAttempted ? 'bg-[#fcfdfd] hover:bg-emerald-50/40' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    {isAttempted ? (
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0" title="Attempted">
                                            <CheckCircle size={16} />
                                        </div>
                                    ) : (
                                        <ContentIcon content={content} isActive={false} />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-semibold text-slate-800 mb-1 truncate group-hover:text-blue-600 transition-colors">
                                            {content.type === 'exam' && content.exams ? content.exams.title : content.title}
                                        </h4>
                                        <div className="flex items-center flex-wrap gap-2 text-xs font-medium">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase tracking-wide text-[10px]">
                                                {content.type === 'video' ? 'Video' : content.type === 'exam' ? 'Quiz / Exam' : 'PDF'}
                                            </span>

                                            {isExam && isAttempted && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                                    <CheckCircle size={12} />
                                                    Attempted {attempts.length > 1 ? `(${attempts.length}x)` : ''} • Score: {bestScore}{totalMarks ? `/${totalMarks}` : ''} {percentage !== null ? `(${percentage}%)` : ''}
                                                </span>
                                            )}

                                            {isExam && !isAttempted && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px]">
                                                    Not Attempted
                                                </span>
                                            )}

                                            {!isExam && isComplete && (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <CheckCircle size={12} /> Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {isAttempted ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/student/exam/${examId}/results?courseId=${id}`);
                                                }}
                                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                            >
                                                <Eye size={13} /> View Result
                                            </button>
                                        ) : (
                                            <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                                                <PlayCircle size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {visibleChapters.length === 0 && visibleContents.length === 0 && (
                            <div className="p-10 text-center text-slate-400">
                                <FileQuestion size={48} className="mx-auto mb-3 text-slate-200" />
                                <p>No content found in this folder.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Player View */}
            {/* Player View */}
            {activeContent && (
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={handleBackToParent}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium mb-5 px-1 py-1 -ml-1 transition-colors"
                    >
                        <ArrowRight size={20} className="rotate-180" /> Back to {activeChapter?.title}
                    </button>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Player Content */}
                        <div className="p-6 md:p-8">
                            {activeContent.type === 'video' ? (
                                <div>
                                    {/* Video Access Info */}
                                    {videoAccess && (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center justify-between text-sm">
                                                {videoAccess.viewsRemaining !== null && videoAccess.viewsRemaining !== undefined && (
                                                    <span className="text-blue-700 font-medium">
                                                        📹 {videoAccess.viewsRemaining} views remaining
                                                    </span>
                                                )}
                                                {videoAccess.watchTimeRemaining !== null && videoAccess.watchTimeRemaining !== undefined && (
                                                    <span className="text-blue-700 font-medium">
                                                        ⏱️ {Math.round(videoAccess.watchTimeRemaining / 60)} minutes remaining
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-sm mb-6 relative group">
                                        {videoBlocked ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                <div className="text-center text-white p-8">
                                                    <div className="text-6xl mb-4">🚫</div>
                                                    <h3 className="text-2xl font-bold mb-2">Video Limit Reached</h3>
                                                    <p className="text-gray-300">{videoAccess?.reason}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <video
                                                key={activeContent.url || activeContent.content_url}
                                                controls
                                                controlsList="nodownload"
                                                className="w-full h-full object-contain"
                                                onPlay={async () => {
                                                    const canPlay = await trackVideoView(activeContent);
                                                    if (!canPlay) {
                                                        const video = document.querySelector('video');
                                                        if (video) video.pause();
                                                    }
                                                }}
                                                onTimeUpdate={(e) => {
                                                    const video = e.target;
                                                    if (video.duration) {
                                                        const percentage = (video.currentTime / video.duration) * 100;
                                                        if (Math.floor(percentage / 10) > Math.floor((video.dataset.lastProgress || 0) / 10)) {
                                                            video.dataset.lastProgress = percentage;
                                                            updateVideoProgress(activeContent, percentage, video.currentTime);
                                                        }
                                                    }
                                                }}
                                                onEnded={() => updateVideoProgress(activeContent, 100)}
                                            >
                                                <source src={activeContent.url || activeContent.content_url} type="video/mp4" />
                                                <source src={activeContent.url || activeContent.content_url} type="video/webm" />
                                                Your browser does not support the video tag.
                                            </video>
                                        )}
                                    </div>
                                </div>
                            ) : activeContent.type === 'exam' ? (() => {
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

                                const activeExamId = Number(activeContent.exam_id || activeContent.content_url || activeContent.url || currentExam.id);
                                const activeAttempts = (activeExamId && examAttempts[activeExamId]) ? examAttempts[activeExamId] : [];
                                const hasAttempted = activeAttempts.length > 0;
                                const latestAttempt = hasAttempted ? activeAttempts[0] : null;
                                const bestScore = hasAttempted ? Math.max(...activeAttempts.map(a => a.score ?? 0)) : null;
                                const examTotalMarks = latestAttempt?.total_marks || totalMarks;
                                const scorePercentage = (hasAttempted && examTotalMarks) ? Math.round((bestScore / examTotalMarks) * 100) : null;

                                return (
                                    <div className="text-center py-8 px-4 max-w-2xl mx-auto">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm ${
                                            hasAttempted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {hasAttempted ? <CheckCircle size={32} /> : <FileText size={32} />}
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">{examTitle}</h2>
                                        {examDesc && (
                                            <p className="text-slate-500 mb-6 leading-relaxed text-sm sm:text-base">{examDesc}</p>
                                        )}

                                        {/* Attempt Summary Banner (if attempted) */}
                                        {hasAttempted && (
                                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-center justify-between flex-wrap gap-4 text-left">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <CheckCircle size={22} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                                                Already Attempted
                                                            </span>
                                                            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                                                                {activeAttempts.length} {activeAttempts.length === 1 ? 'Attempt' : 'Attempts'}
                                                            </span>
                                                        </div>
                                                        <div className="text-lg sm:text-xl font-bold text-emerald-950 mt-0.5">
                                                            Best Score: {bestScore} {examTotalMarks ? `/ ${examTotalMarks}` : ''}
                                                            {scorePercentage !== null && (
                                                                <span className="text-sm font-semibold ml-1.5 text-emerald-700">
                                                                    ({scorePercentage}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {latestAttempt?.submitted_at && (
                                                            <div className="text-xs text-emerald-700 mt-0.5">
                                                                Last attempt: {new Date(latestAttempt.submitted_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => router.push(`/student/exam/${activeExamId}/results?courseId=${id}`)}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                                >
                                                    <Eye size={15} /> View Results & Solutions
                                                </button>
                                            </div>
                                        )}

                                        {/* Exam Glimpse Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-left">
                                            {/* Questions */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                                <div className="flex items-center gap-1.5 text-blue-600 mb-1.5">
                                                    <FileQuestion size={16} />
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Questions</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900">
                                                    {numQuestions ? `${numQuestions} MCQs` : '50 MCQs'}
                                                </div>
                                            </div>

                                            {/* Duration */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                                <div className="flex items-center gap-1.5 text-emerald-600 mb-1.5">
                                                    <Clock size={16} />
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duration</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900">
                                                    {durationMins} <span className="text-xs font-medium text-slate-500">Mins</span>
                                                </div>
                                            </div>

                                            {/* Marks / Q */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                                <div className="flex items-center gap-1.5 text-purple-600 mb-1.5">
                                                    <Award size={16} />
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Marks / Q</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900">
                                                    +{marksPerQ}
                                                    {totalMarks && (
                                                        <span className="text-[11px] font-medium text-slate-500 ml-1">({totalMarks} M)</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Negative Mark */}
                                            <div className={`border rounded-xl p-3.5 ${isNegEnabled ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className={`flex items-center gap-1.5 mb-1.5 ${isNegEnabled ? 'text-rose-600' : 'text-slate-500'}`}>
                                                    <AlertCircle size={16} />
                                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isNegEnabled ? 'text-rose-700' : 'text-slate-500'}`}>Negative Mark</span>
                                                </div>
                                                <div className={`text-xl font-bold ${isNegEnabled ? 'text-rose-900' : 'text-slate-900'}`}>
                                                    {isNegEnabled ? `-${negMarks}` : 'None'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Extra Details Banner */}
                                        <div className="bg-slate-100 rounded-lg py-2 px-4 mb-8 flex items-center justify-center flex-wrap gap-4 text-xs font-medium text-slate-600">
                                            {passMarks && (
                                                <span><strong>Passing Marks:</strong> {passMarks}</span>
                                            )}
                                            <span><strong>Auto-submit:</strong> On Timeout</span>
                                            <span><strong>Attempts:</strong> {currentExam.max_attempts ? `${currentExam.max_attempts} Attempt(s)` : 'Unlimited'}</span>
                                        </div>

                                        <div className="flex gap-4 justify-center flex-wrap">
                                            {hasAttempted ? (
                                                <>
                                                    <button
                                                        onClick={() => router.push(`/student/exam/${activeExamId}/results?courseId=${id}`)}
                                                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                                    >
                                                        <Eye size={18} /> View Results & Solutions
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/student/exam/${activeExamId}/take?courseId=${id}`)}
                                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                                    >
                                                        Re-take Exam <ArrowRight size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => router.push(`/student/exam/${activeExamId}/take?courseId=${id}`)}
                                                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                                >
                                                    Start Exam <ArrowRight size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                            ) : activeContent.type === 'pdf' ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText size={40} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{activeContent.title}</h2>
                                    <button
                                        onClick={() => {
                                            setPdfViewerUrl(activeContent.url || activeContent.content_url);
                                            setTimeout(() => markContentComplete(), 2000);
                                        }}
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all mx-auto"
                                    >
                                        <Eye size={20} /> View PDF
                                    </button>
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4">{activeContent.title}</h2>
                                    <p className="text-slate-600 mb-6">{activeContent.description}</p>
                                    {(activeContent.url || activeContent.content_url) && (
                                        <a
                                            href={activeContent.url || activeContent.content_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 font-semibold hover:underline"
                                        >
                                            View Content
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Mark Complete Button */}
                            {activeContent.type !== 'exam' && (
                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={markContentComplete}
                                        disabled={isContentComplete(activeContent) || isMarkingComplete}
                                        className={`
                                            px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all
                                            ${isContentComplete(activeContent)
                                                ? 'bg-emerald-50 text-emerald-600 cursor-default'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 cursor-pointer'}
                                            ${isMarkingComplete ? 'opacity-70 cursor-not-allowed' : ''}
                                        `}
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

            {/* Feedback Modal */}
            {showFeedbackModal && feedbackForm && (
                <FeedbackModal
                    form={feedbackForm}
                    onClose={() => setShowFeedbackModal(false)}
                    onSuccess={() => {
                        setShowFeedbackModal(false);
                        alert('Thank you for your feedback!');
                    }}
                />
            )}
        </div>
    );
};

export default CoursePlayer;
