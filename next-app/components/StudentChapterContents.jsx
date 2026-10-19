'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { FileText, Video, File, ArrowLeft, PlayCircle, Eye, ExternalLink, X, Plus, Minus, RotateCw, Maximize, Minimize, CheckCircle } from 'lucide-react';
import { pdfjs, Document, Page } from 'react-pdf';
import { useAuth } from '../context/AuthContext';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

const StudentChapterContents = ({ courseId, chapterId }) => {
    const router = useRouter();
    const { user } = useAuth();
    const [contents, setContents] = useState([]);
    const [examAttempts, setExamAttempts] = useState({});
    const [loading, setLoading] = useState(true);
    const [chapter, setChapter] = useState(null);
    const [videoViewerUrl, setVideoViewerUrl] = useState(null);
    const [pdfViewerContent, setPdfViewerContent] = useState(null);
    const [numPages, setNumPages] = useState(null);

    // Viewer State
    const [scale, setScale] = useState(1.5); // Default to 1.5 safely, will adjust in effect
    const [rotation, setRotation] = useState(0);

    // Set initial scale based on device
    useEffect(() => {
        // Use 768px (iPad/Tablet portrait) as the cutoff for "Mobile" vs "Desktop" view
        if (window.innerWidth >= 768) {
            setScale(1.5); // 150% for Laptops/Desktops/Tablets
        } else {
            setScale(0.8); // 80% for Mobile to fit width better
        }
    }, []);

    useEffect(() => {
        const fetchContents = async () => {
            if (!chapterId) return;

            try {
                // Fetch chapter details
                const { data: chapterData } = await supabase
                    .from('chapters')
                    .select('name, course_id')
                    .eq('id', chapterId)
                    .single();

                if (chapterData) setChapter(chapterData);

                // Fetch contents
                const { data, error } = await supabase
                    .from('chapter_contents')
                    .select('*')
                    .eq('chapter_id', chapterId)
                    .order('order', { ascending: true });

                if (error) throw error;
                setContents(data);
            } catch (err) {
                console.error('Error fetching contents:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContents();
    }, [chapterId]);

    // Fetch student's exam attempts
    useEffect(() => {
        if (!user?.email) return;

        const fetchAttempts = async () => {
            try {
                const { data: member } = await supabase.from('members').select('id').eq('email', user.email).maybeSingle();
                if (!member) return;

                const { data: attempts, error: attError } = await supabase
                    .from('exam_attempts')
                    .select('id, exam_id, score, total_marks, submitted_at, status')
                    .eq('member_id', member.id)
                    .not('submitted_at', 'is', null)
                    .order('submitted_at', { ascending: false });

                if (!attError && attempts) {
                    const map = {};
                    attempts.forEach(att => {
                        const eid = Number(att.exam_id);
                        if (!map[eid]) map[eid] = [];
                        map[eid].push(att);
                    });
                    setExamAttempts(map);
                }
            } catch (err) {
                console.error('Error fetching attempts in StudentChapterContents:', err);
            }
        };

        fetchAttempts();
    }, [user]);

    // Helper to determine secure default scale
    const getDefaultScale = () => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            return 1.5; // 150% for Laptops/Desktops/Tablets
        }
        return 0.8; // 80% for Mobile
    };

    const handleContentClick = (content) => {
        if (content.type === 'video') {
            setVideoViewerUrl(content.url);
        } else if (content.type === 'pdf' || (content.type === 'file' && content.url && content.url.toLowerCase().endsWith('.pdf'))) {
            setPdfViewerContent(content);
            setNumPages(null);
            setScale(getDefaultScale()); // Use smart default instead of hardcoded 1.0
            setRotation(0);
        } else if (content.type === 'file') {
            window.open(content.url, '_blank');
        } else if (content.type === 'exam') {
            if (content.exam_id) {
                router.push(`/student/exam/${content.exam_id}`);
            }
        }
    };

    const handleDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const closePdfViewer = () => {
        setPdfViewerContent(null);
        setNumPages(null);
    };

    const changeScale = (delta) => {
        setScale(prevScale => {
            const newScale = prevScale + delta;
            return Math.min(Math.max(newScale, 0.5), 3.0);
        });
    };

    const rotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'video': return <Video size={20} className="text-indigo-500" />;
            case 'pdf': return <FileText size={20} className="text-red-500" />;
            case 'exam': return <FileText size={20} className="text-amber-500" />;
            default: return <File size={20} className="text-slate-400" />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'video': return 'Video';
            case 'pdf': return 'PDF Document';
            case 'exam': return 'Quiz / Exam';
            default: return 'File';
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-slate-500">
                Loading content...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push(`/student/course/${courseId}`)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> Back to Chapters
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-50 rounded-xl text-pink-600 shadow-sm border border-pink-100">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                {chapter?.name || 'Chapter Content'}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1 font-medium">
                                {contents.length} {contents.length === 1 ? 'Content' : 'Contents'} inside
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contents List */}
                {contents.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <File size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                            No content yet
                        </h3>
                        <p className="text-slate-500 text-sm">
                            This chapter is currently empty.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-100">
                        {contents.map((content, index) => {
                            const isExam = content.type === 'exam';
                            const hasExamId = isExam && content.exam_id;
                            const isLegacyUrl = content.url && content.url.includes('testpress.in');
                            const isDisabled = isExam && !hasExamId;

                            const examId = isExam ? Number(content.exam_id) : null;
                            const attempts = (isExam && examId && examAttempts[examId]) ? examAttempts[examId] : [];
                            const isAttempted = attempts.length > 0;
                            const latestAttempt = isAttempted ? attempts[0] : null;
                            const bestScore = isAttempted ? Math.max(...attempts.map(a => a.score ?? 0)) : null;
                            const totalMarks = isAttempted ? latestAttempt?.total_marks : null;
                            const percentage = (isAttempted && totalMarks) ? Math.round((bestScore / totalMarks) * 100) : null;

                            return (
                                <div
                                    key={content.id}
                                    onClick={() => !isDisabled && handleContentClick(content)}
                                    className={`
                                        group p-5 flex items-center gap-4 transition-all duration-200
                                        ${isDisabled ? 'bg-slate-50 opacity-60 cursor-not-allowed' : isAttempted ? 'bg-[#fcfdfd] hover:bg-emerald-50/40 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'}
                                    `}
                                >
                                    {/* Icon */}
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border
                                        ${isAttempted ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : isDisabled ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100 group-hover:bg-white group-hover:shadow-sm'}
                                    `}>
                                        {isAttempted ? <CheckCircle size={22} className="text-emerald-600" /> : getIcon(content.type)}
                                    </div>

                                    {/* Content Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-base font-semibold mb-1 truncate flex items-center gap-2 ${isDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-600 transition-colors'}`}>
                                            {content.title}
                                            {isLegacyUrl && (
                                                <span className="text-[10px] uppercase font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full tracking-wide">
                                                    Legacy
                                                </span>
                                            )}
                                            {isDisabled && (
                                                <span className="text-[10px] uppercase font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full tracking-wide">
                                                    Unavailable
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center flex-wrap gap-2 text-xs font-medium">
                                            <span className="text-slate-500">{getTypeLabel(content.type)}</span>

                                            {isExam && isAttempted && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                                    <CheckCircle size={12} />
                                                    Attempted {attempts.length > 1 ? `(${attempts.length}x)` : ''} • Score: {bestScore}{totalMarks ? `/${totalMarks}` : ''} {percentage !== null ? `(${percentage}%)` : ''}
                                                </span>
                                            )}

                                            {isExam && !isAttempted && !isDisabled && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px]">
                                                    Not Attempted
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Icon */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isAttempted ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/student/exam/${examId}/results?courseId=${courseId}`);
                                                }}
                                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                            >
                                                <Eye size={13} /> View Result
                                            </button>
                                        ) : (
                                            <div className={`
                                                ${isDisabled ? 'text-slate-300' : 'text-slate-300 group-hover:text-blue-500 scale-90 group-hover:scale-100 transition-all'}
                                            `}>
                                                {content.type === 'video' ? <PlayCircle size={24} /> : <ExternalLink size={20} />}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Video Viewer Modal */}
                {videoViewerUrl && (
                    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm animate-in fade-in duration-200">
                        <button
                            onClick={() => setVideoViewerUrl(null)}
                            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer border border-white/10 hover:rotate-90 duration-300 z-50"
                        >
                            <X size={24} />
                        </button>
                        <div className="w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                            <video
                                controls
                                autoPlay
                                controlsList="nodownload"
                                className="w-full h-full object-contain"
                            >
                                <source src={videoViewerUrl} type="video/mp4" />
                                <source src={videoViewerUrl} type="video/webm" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                )}

                {/* PDF Viewer Modal */}
                {pdfViewerContent && (
                    <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-[95vw] h-[95vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col ring-1 ring-gray-900/5">
                            {/* Toolbar Header */}
                            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white z-10 shadow-sm relative">
                                <span className="font-semibold text-slate-800 flex items-center gap-2 min-w-0 pr-4">
                                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                        <FileText size={18} />
                                    </div>
                                    <span className="truncate">{pdfViewerContent.title || 'Document Viewer'}</span>
                                </span>

                                {/* Controls */}
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => changeScale(-0.1)}
                                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
                                        title="Zoom Out"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <span className="text-xs font-mono font-medium w-12 text-center text-slate-600">
                                        {Math.round(scale * 100)}%
                                    </span>
                                    <button
                                        onClick={() => changeScale(0.1)}
                                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
                                        title="Zoom In"
                                    >
                                        <Plus size={18} />
                                    </button>
                                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                    <button
                                        onClick={rotate}
                                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
                                        title="Rotate"
                                    >
                                        <RotateCw size={18} />
                                    </button>
                                </div>

                                <button
                                    onClick={closePdfViewer}
                                    className="ml-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Secure PDF Container */}
                            <div
                                className="flex-1 bg-slate-100 overflow-auto flex relative"
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                <div className="m-auto p-8 select-none">
                                    <Document
                                        file={`/api/proxy-pdf?id=${pdfViewerContent.id}`}
                                        onLoadSuccess={handleDocumentLoadSuccess}
                                        className="flex flex-col gap-6"
                                        loading={
                                            <div className="flex flex-col items-center gap-3 mt-40">
                                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                                                <p className="text-slate-500 font-medium">Loading Document...</p>
                                            </div>
                                        }
                                        error={(error) => (
                                            <div className="text-red-400 text-center py-10 px-4 mt-20 bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md mx-auto">
                                                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                                                    <FileText size={24} />
                                                </div>
                                                <p className="font-bold mb-2 text-slate-800">Unable to load document</p>
                                                <p className="text-sm text-slate-500 mb-6">{error?.message || 'Please try opening in a new tab.'}</p>
                                                <button
                                                    onClick={() => window.open(pdfViewerContent.url, '_blank')}
                                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm transition-colors w-full"
                                                >
                                                    Open in New Tab (Fallback)
                                                </button>
                                            </div>
                                        )}
                                    >
                                        {numPages && Array.from(new Array(numPages), (el, index) => (
                                            <div key={`page_${index + 1}`} className="relative shadow-lg pointer-events-none">
                                                <Page
                                                    pageNumber={index + 1}
                                                    scale={scale}
                                                    rotate={rotation}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    className="bg-white"
                                                />
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-400">
                                                    Page {index + 1} of {numPages}
                                                </div>
                                            </div>
                                        ))}
                                    </Document>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentChapterContents;

