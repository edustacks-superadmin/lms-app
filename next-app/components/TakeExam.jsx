'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useExams } from '../context/ExamContext';
import MathText from './MathText';
import MobileExamUI from './MobileExamUI';
import {
    Clock,
    AlertCircle,
    FileText,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Check,
    Flag,
    Bookmark,
    Info,
    Play,
    Pause,
    ArrowRight,
    ArrowLeft,
    History,
    HelpCircle,
    AlertTriangle
} from 'lucide-react';
import { getExamById, getExamSections, getExamQuestionsWithOptions } from '../app/actions/exam';

const TakeExam = () => {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = searchParams?.get('courseId');
    const { user } = useAuth();
    const { canTakeExam, getStudentAttempts } = useExams();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [canAttempt, setCanAttempt] = useState(null); // null = checking, true = can take, false = blocked
    const [attemptError, setAttemptError] = useState('');
    const [previousAttempts, setPreviousAttempts] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { qId: optionIndex }
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [visited, setVisited] = useState(new Set([0])); // Track visited question INDICES
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('flag');
    const [reportComment, setReportComment] = useState('');
    const [reporting, setReporting] = useState(false);

    // Enhancement features state
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);

    // Section state
    const [sections, setSections] = useState([]);
    const [currentSection, setCurrentSection] = useState(0);

    const [showAnswer, setShowAnswer] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Text Resizer State
    const [fontSize, setFontSize] = useState('medium'); // small, medium, large

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMobile(window.innerWidth < 768);
            const handleResize = () => {
                setIsMobile(window.innerWidth < 768);
                if (window.innerWidth >= 768) {
                    setShowSidebar(false);
                }
            };
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Utility function to shuffle array
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Fetch Exam Data
    useEffect(() => {
        const fetchExamData = async () => {
            if (!id) return;
            try {
                // -- Auto-Login for Mobile WebView --
                const token = searchParams?.get('token');
                if (token && !user) {
                    console.log("Found mobile token, attempting auto-login...");
                    const { error: authError } = await supabase.auth.setSession({
                        access_token: token,
                        refresh_token: token
                    });
                    if (authError) console.error("Auto-login failed:", authError);
                }
                // -----------------------------------

                // 1. Fetch Exam Details
                const examData = await getExamById(id);
                if (!examData) {
                    throw new Error(`Exam with ID ${id} not found`);
                }
                setExam(examData);
                setTimeLeft(examData.duration_minutes * 60);

                // 2. Fetch sections
                const sectionsData = await getExamSections(id);
                setSections(sectionsData || []);

                // 3. Fetch Questions with options
                const qData = await getExamQuestionsWithOptions(id);
                console.log("Fetched qData with options:", qData);

                if (!qData || qData.length === 0) {
                    console.warn("No questions found for this exam");
                    setQuestions([]);
                    return;
                }

                // Format questions
                const formattedQuestions = qData.map(item => {
                    const q = item.questions;
                    if (!q) return null;

                    // Options are already sorted by label in server action, but helper returns objects.
                    // Map to strings for component compatibility, but keep objects available if needed?
                    // Component expects `options` to be array of strings or MathText content.

                    // Logic to extract text from options objects:
                    const optionsArray = q.options || [];
                    const optionTexts = optionsArray.map(opt => opt.option_text);
                    const correctIndex = optionsArray.findIndex(opt => opt.is_correct);

                    return {
                        id: q.id,
                        question: q.question_text,
                        options: optionTexts,
                        marks: item.marks,
                        correctAnswerIndex: correctIndex,
                        section_id: item.section_id,
                        is_mandatory: item.is_mandatory === true,
                    };
                }).filter(Boolean);

                // Apply randomization if enabled
                let finalQuestions = formattedQuestions;

                // Randomize question order
                if (examData.randomize_questions) {
                    if (sectionsData && sectionsData.length > 0) {
                        // Group by section and randomize within each
                        const grouped = {};
                        finalQuestions.forEach(q => {
                            const sectionId = q.section_id || 'unsectioned';
                            if (!grouped[sectionId]) grouped[sectionId] = [];
                            grouped[sectionId].push(q);
                        });

                        finalQuestions = [];
                        Object.keys(grouped).forEach(sectionId => {
                            finalQuestions.push(...shuffleArray(grouped[sectionId]));
                        });
                    } else {
                        finalQuestions = shuffleArray(finalQuestions);
                    }
                }

                // Randomize options within each question
                if (examData.randomize_options) {
                    finalQuestions = finalQuestions.map(q => {
                        const optionsWithIndex = q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }));
                        const shuffledOptions = shuffleArray(optionsWithIndex);
                        const newCorrectIndex = shuffledOptions.findIndex(opt => opt.originalIndex === q.correctAnswerIndex);

                        return {
                            ...q,
                            options: shuffledOptions.map(opt => opt.text),
                            correctAnswerIndex: newCorrectIndex
                        };
                    });
                }

                setQuestions(finalQuestions);

            } catch (error) {
                console.error("Error fetching exam:", error);
                alert(`Error loading exam: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchExamData();
    }, [id, user]); // Added user dependency for auto-login check, though mostly ID matters

    // Check Attempt Eligibility
    useEffect(() => {
        const checkEligibility = async () => {
            if (!exam || !user) return;

            try {
                // Check if student can take exam
                const eligibility = await canTakeExam(id, user.id);
                setCanAttempt(eligibility.canTake);

                if (!eligibility.canTake) {
                    setAttemptError(eligibility.reason);
                }

                // Fetch previous attempts for display
                const attempts = await getStudentAttempts(id, user.id);
                setPreviousAttempts(attempts);

            } catch (error) {
                console.error('Error checking eligibility:', error);
                setCanAttempt(true); // Default to allowing if check fails
            }
        };

        checkEligibility();
    }, [exam, user, id]);

    // Fetch Bookmarks
    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user || questions.length === 0) return;
            try {
                // Use explicit query to avoid generic fetch issues
                const { data, error } = await supabase
                    .from('question_bookmarks')
                    .select('question_id')
                    .eq('user_id', user.id)
                    .in('question_id', questions.map(q => q.id));

                if (data) {
                    setBookmarks(new Set(data.map(b => b.question_id)));
                }
            } catch (err) {
                console.error('Error fetching bookmarks:', err);
            }
        };
        fetchBookmarks();
    }, [user, questions]);

    // Exam monitoring effects (Tab Switch, Copy Paste, Timer)
    useEffect(() => {
        if (!exam?.detect_tab_switch) return;
        const handleVisibilityChange = () => {
            if (document.hidden && !submitting) {
                setTabSwitchCount(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [exam, submitting]);

    useEffect(() => {
        if (!exam?.restrict_copy_paste) return;
        const preventCopyPaste = (e) => e.preventDefault();
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        return () => {
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
        };
    }, [exam]);

    useEffect(() => {
        if (!exam || timeLeft <= 0 || isPaused) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (exam.auto_submit_on_timeout) {
                        setIsAutoSubmitted(true);
                        handleSubmit();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [exam, timeLeft, isPaused]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questions[currentQuestionIndex].id]: optionIndex
        }));
    };

    const handleNext = (save = true) => {
        const nextIndex = Math.min(questions.length - 1, currentQuestionIndex + 1);
        setCurrentQuestionIndex(nextIndex);
        setVisited(prev => new Set(prev).add(nextIndex));
    };

    const handleMarkForReview = () => {
        const currentId = questions[currentQuestionIndex].id;
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            newSet.add(currentId);
            return newSet;
        });
        handleNext(false);
    };

    const clearResponse = () => {
        const currentId = questions[currentQuestionIndex].id;
        setAnswers(prev => {
            const newAnswers = { ...prev };
            delete newAnswers[currentId];
            return newAnswers;
        });
    };

    const toggleBookmark = async () => {
        const currentId = questions[currentQuestionIndex].id;
        const isBookmarked = bookmarks.has(currentId);
        setBookmarks(prev => {
            const newSet = new Set(prev);
            if (isBookmarked) newSet.delete(currentId);
            else newSet.add(currentId);
            return newSet;
        });

        try {
            if (isBookmarked) {
                await supabase.from('question_bookmarks').delete().eq('user_id', user.id).eq('question_id', currentId);
            } else {
                const { error } = await supabase.from('question_bookmarks').insert({ user_id: user.id, question_id: currentId });
                // Ignore conflict errors
            }
        } catch (err) {
            console.error('Bookmark error', err);
        }
    };

    const getUnansweredMandatory = () => {
        return questions.filter(q => q.is_mandatory && answers[q.id] === undefined);
    };

    const getSectionProgress = (sectionId) => {
        const sectionQuestions = questions.filter(q => q.section_id === sectionId);
        const answered = sectionQuestions.filter(q => answers[q.id] !== undefined).length;
        return { total: sectionQuestions.length, answered };
    };

    const handleReportSubmit = async () => {
        if (!reportComment.trim()) return alert('Please enter a comment.');
        setReporting(true);
        try {
            await supabase.from('question_reports').insert({
                user_id: user.id,
                question_id: questions[currentQuestionIndex].id,
                report_type: reportType,
                comment: reportComment
            });
            setShowReportModal(false);
            setReportComment('');
            alert('Report submitted.');
        } catch (err) {
            console.error(err);
            alert('Failed to submit report.');
        } finally {
            setReporting(false);
        }
    };

    const getQuestionStatus = (qId, index) => {
        const isAnswered = answers[qId] !== undefined;
        const isMarked = markedForReview.has(qId);
        const isVisited = visited.has(index);
        if (isAnswered && isMarked) return 'answered-marked';
        if (isMarked) return 'marked';
        if (isAnswered) return 'answered';
        if (!isVisited) return 'not-visited';
        return 'not-answered';
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            // Get member ID
            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: memberByEmail } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = memberByEmail;
            }
            if (!memberData) throw new Error('Student profile not found');

            let score = 0;
            const answerRecords = questions.map(q => {
                const selectedIdx = answers[q.id];
                const isCorrect = selectedIdx !== undefined && selectedIdx === q.correctAnswerIndex;
                if (isCorrect) score += (q.marks || 1);
                else if (selectedIdx !== undefined && exam.negative_marking_enabled) score -= exam.negative_marks_per_question;
                return { question_id: q.id, selected_option_index: selectedIdx, is_correct: isCorrect };
            });
            score = Math.max(0, score);

            const { data: attempt, error: attemptError } = await supabase.from('exam_attempts').insert([{
                exam_id: id,
                member_id: memberData.id,
                attempt_number: previousAttempts.length + 1,
                score,
                total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
                status: 'completed',
                submitted_at: new Date().toISOString(),
                answers: answers,
                tab_switches: tabSwitchCount,
                is_auto_submitted: isAutoSubmitted
            }]).select().single();

            if (attemptError) throw attemptError;

            await supabase.from('exam_answers').insert(answerRecords.map(a => ({
                attempt_id: attempt.id,
                question_id: a.question_id,
                selected_option_index: a.selected_option_index,
                is_correct: a.is_correct
            })));

            if (courseId) {
                // Progress tracking (fire and forget)
                supabase.from('content_progress').upsert({
                    student_id: memberData.id,
                    course_id: courseId,
                    chapter_id: exam.chapter_id,
                    content_type: 'exam',
                    content_id: id,
                    content_title: exam.title,
                    completed: true,
                    completion_percentage: Math.round((score / exam.total_marks) * 100),
                    completed_at: new Date().toISOString()
                }, { onConflict: 'student_id,content_id,content_type' }).then(() => {
                    supabase.rpc('calculate_course_progress', { p_student_id: memberData.id, p_course_id: courseId });
                });
            }

            router.push(`/student/exam/${id}/results?courseId=${courseId || ''}`);
        } catch (error) {
            console.error("Submission error:", error);
            alert(`Failed to submit: ${error.message}`);
        } finally {
            setSubmitting(false);
            setShowSubmitModal(false);
        }
    };

    const stats = {
        answered: Object.keys(answers).length,
        notAnswered: visited.size - Object.keys(answers).length,
        notVisited: questions.length - visited.size,
        marked: markedForReview.size,
    };

    // --- RENDER ---
    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!exam) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
            <Info size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium">Exam not found</p>
        </div>
    );

    if (questions.length === 0) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
            <FileText size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium">No questions in this exam</p>
        </div>
    );

    if (canAttempt === false) {
        return (
            <div className="max-w-3xl mx-auto mt-10 p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 flex items-start gap-4">
                    <div className="p-2 bg-amber-100/50 rounded-lg text-amber-600 shrink-0"><AlertCircle size={24} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-amber-800 mb-2">Cannot Start Exam</h2>
                        <p className="text-amber-800/80">{attemptError}</p>
                    </div>
                </div>
                {previousAttempts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <History size={20} className="text-slate-400" /> Your Previous Attempts
                        </h3>
                        <div className="space-y-3">
                            {previousAttempts.map((attempt, idx) => (
                                <div
                                    key={attempt.id}
                                    onClick={() => router.push(`/student/exam/${id}/results`)}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold text-slate-500 group-hover:text-blue-600">#{attempt.attempt_number || idx + 1}</div>
                                        <div className="text-sm text-slate-500">{new Date(attempt.submitted_at || attempt.started_at).toLocaleString()}</div>
                                    </div>
                                    {attempt.score !== null && (
                                        <div className="text-right flex items-center gap-4">
                                            <div className="font-bold text-slate-900">{attempt.score} <span className="text-slate-400 font-normal">/ {attempt.total_marks}</span></div>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <button onClick={() => router.push(courseId ? `/student/course/${courseId}` : '/student/dashboard')} className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto shadow-sm">
                    <ArrowLeft size={18} /> Back to {courseId ? 'Course' : 'Dashboard'}
                </button>
            </div>
        );
    }

    // Quiz Mode Logic
    const isQuizMode = exam?.type === 'practice' || exam?.settings?.show_answers_immediately;
    const handleCheckAnswer = () => setShowAnswer(true);

    const getDataTextSizeClass = () => {
        switch (fontSize) {
            case 'small': return 'text-sm';
            case 'large': return 'text-xl';
            default: return 'text-base';
        }
    };

    if (isMobile) {
        return (
            <MobileExamUI
                exam={exam}
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                setCurrentQuestionIndex={setCurrentQuestionIndex}
                answers={answers}
                handleAnswer={handleAnswer}
                handleNext={handleNext}
                handleMarkForReview={handleMarkForReview}
                clearResponse={clearResponse}
                timeLeft={timeLeft}
                formatTime={formatTime}
                showSubmitModal={showSubmitModal}
                setShowSubmitModal={setShowSubmitModal}
                handleSubmit={handleSubmit}
                submitting={submitting}
                stats={stats}
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                getQuestionStatus={getQuestionStatus}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                showReportModal={showReportModal}
                setShowReportModal={setShowReportModal}
                setVisited={setVisited}
                setAnswers={setAnswers}
                setShowAnswer={setShowAnswer}
                showAnswer={showAnswer}
                isQuizMode={isQuizMode}
                handleCheckAnswer={handleCheckAnswer}
                reportType={reportType}
                setReportType={setReportType}
                reportComment={reportComment}
                setReportComment={setReportComment}
                handleReportSubmit={handleReportSubmit}
                reporting={reporting}
                getUnansweredMandatory={getUnansweredMandatory}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                fontSize={fontSize}
            />
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white font-sans text-sm text-slate-900">
            {/* Top Bar */}
            <header className="bg-slate-900 text-white px-6 h-16 flex justify-between items-center shadow-md shrink-0 z-20">
                <div className="font-bold text-lg truncate max-w-md">{exam.title}</div>
                <div className="flex items-center gap-6">
                    {/* Text Resizer */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => setFontSize('small')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${fontSize === 'small' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>A-</button>
                        <button onClick={() => setFontSize('medium')} className={`px-3 py-1 rounded text-sm font-bold transition-all ${fontSize === 'medium' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>A</button>
                        <button onClick={() => setFontSize('large')} className={`px-3 py-1 rounded text-base font-bold transition-all ${fontSize === 'large' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>A+</button>
                    </div>

                    <div className="h-6 w-px bg-slate-700"></div>

                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                            <div className="p-1.5 bg-slate-800 rounded-md text-emerald-400"><FileText size={16} /></div> Question Paper
                        </button>
                        <button className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                            <div className="p-1.5 bg-slate-800 rounded-md text-blue-400"><Info size={16} /></div> Instructions
                        </button>
                    </div>
                </div>
            </header>

            {/* Info Bar */}
            <div className="bg-white border-b border-gray-200 px-6 h-14 flex justify-between items-center shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium uppercase text-xs tracking-wider">Section</span>
                    <span className="font-bold text-slate-800">{sections.length > 0 ? sections[currentSection].section_name : 'General'}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-medium text-sm">Time Left:</span>
                    <div className={`font-mono text-lg font-bold px-3 py-0.5 rounded ${timeLeft < 300 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>{formatTime(timeLeft)}</div>
                    <button onClick={() => setIsPaused(!isPaused)} className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${isPaused ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                        {isPaused ? <><ChevronRight size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
                    </button>
                </div>
            </div>

            {/* Warning Banners */}
            {tabSwitchCount > 0 && exam.detect_tab_switch && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-2 text-sm flex items-center gap-2 animate-pulse">
                    <AlertCircle size={16} /> <span className="font-medium">Tab switch warning:</span> You have switched tabs <strong>{tabSwitchCount}</strong> times.
                </div>
            )}
            {exam.negative_marking_enabled && (
                <div className="bg-blue-50 border border-blue-100 text-blue-800 px-6 py-2 text-sm flex items-center gap-2">
                    <Info size={16} /> <span className="font-medium">Negative Marking:</span> -{exam.negative_marks_per_question} marks for each incorrect answer.
                </div>
            )}

            {/* Section Tabs */}
            {sections.length > 0 && (
                <div className="bg-white border-b border-gray-200 px-6 flex items-end h-11 gap-1 overflow-x-auto shrink-0 scrollbar-hide">
                    {sections.map((section, idx) => {
                        const progress = getSectionProgress(section.id);
                        const isActive = currentSection === idx;
                        return (
                            <button key={section.id} onClick={() => setCurrentSection(idx)} className={`px-5 py-2.5 rounded-t-lg text-sm font-medium border-t border-l border-r transition-all flex items-center gap-2 min-w-fit ${isActive ? 'bg-blue-50 border-blue-100 text-blue-700 border-b-transparent relative top-px z-10' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                                {section.section_name}
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{progress.answered}/{progress.total}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Section Instructions */}
            {sections.length > 0 && sections[currentSection]?.instructions && (
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 text-sm text-slate-600 shrink-0">
                    <span className="font-bold text-slate-800 mr-2">Instructions:</span>{sections[currentSection].instructions}
                    {sections[currentSection].total_marks && <span className="ml-3 text-slate-400 font-medium">(Total: {sections[currentSection].total_marks} marks)</span>}
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden relative">
                <main className="flex-1 flex flex-col md:border-r border-gray-200 relative overflow-hidden bg-white">
                    {isPaused && (
                        <div className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                            <div className="text-6xl mb-6">⏸</div>
                            <h2 className="text-3xl font-bold text-white mb-2">Exam Paused</h2>
                            <button onClick={() => setIsPaused(false)} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg hover:scale-105 mt-8"><ChevronRight size={24} /> Resume Exam</button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-8 lg:px-12 lg:py-10">
                        <div className="border-b border-slate-100 pb-4 mb-8 flex justify-between items-start">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                                Question {currentQuestionIndex + 1}
                                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{questions[currentQuestionIndex].marks || 1} Marks</span>
                            </h3>
                            <div className="flex items-center gap-3">
                                <button onClick={toggleBookmark} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${bookmarks.has(questions[currentQuestionIndex]?.id) ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                                    <Bookmark size={16} className={bookmarks.has(questions[currentQuestionIndex]?.id) ? 'fill-amber-500' : ''} /> {bookmarks.has(questions[currentQuestionIndex]?.id) ? 'Bookmarked' : 'Bookmark'}
                                </button>
                                <button onClick={() => setShowReportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Flag size={16} /> Report</button>
                            </div>
                        </div>

                        <div className={`mb-8 leading-relaxed text-slate-800 ${getDataTextSizeClass()}`}>
                            <MathText>{questions[currentQuestionIndex].question}</MathText>
                        </div>

                        <div className="space-y-3 max-w-3xl">
                            {questions[currentQuestionIndex].options && questions[currentQuestionIndex].options.map((option, idx) => (
                                <label key={idx} className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[questions[currentQuestionIndex].id] === idx ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                                    <div className="pt-1 shrink-0 mr-4">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${answers[questions[currentQuestionIndex].id] === idx ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {answers[questions[currentQuestionIndex].id] === idx && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <input type="radio" name={`q-${questions[currentQuestionIndex].id}`} className="hidden" checked={answers[questions[currentQuestionIndex].id] === idx} onChange={() => handleAnswer(idx)} />
                                    </div>
                                    <span className={`${getDataTextSizeClass()} text-slate-700`}><MathText>{option}</MathText></span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 bg-slate-50 p-4 px-8 flex justify-between items-center shrink-0">
                        <div className="flex gap-3">
                            <button onClick={handleMarkForReview} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all shadow-sm text-sm">Mark for Review & Next</button>
                            <button onClick={clearResponse} className="px-4 py-2 text-slate-500 hover:text-rose-600 font-medium text-sm transition-colors">Clear Response</button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { const prev = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(prev); setVisited(s => new Set(s).add(prev)); }} disabled={currentQuestionIndex === 0} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${currentQuestionIndex === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 shadow-sm'}`}><ChevronLeft size={16} /> Previous</button>
                            <button onClick={() => handleNext(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">Save & Next <ArrowRight size={16} /></button>
                        </div>
                    </div>
                </main>

                <aside className="w-[320px] flex flex-col bg-slate-50 border-l border-gray-200 shrink-0">
                    <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-white">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                            <img src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'Student')}&background=random`} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-bold text-slate-900 truncate text-sm">{user?.user_metadata?.full_name || user?.email || "Student"}</div>
                            <div className="text-xs text-slate-500 truncate">Student ID: {user?.id?.slice(0, 8)}</div>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-2 border-b border-gray-200 bg-white text-xs text-slate-600">
                        <div className="flex items-center gap-2"><span className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500 text-white font-bold">{stats.answered}</span> Answered</div>
                        <div className="flex items-center gap-2"><span className="w-6 h-6 rounded flex items-center justify-center bg-rose-500 text-white font-bold">{stats.notAnswered}</span> Not Answered</div>
                        <div className="flex items-center gap-2"><span className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 border border-slate-300 text-slate-500 font-bold">{stats.notVisited}</span> Not Visited</div>
                        <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-600 text-white font-bold">{stats.marked}</span> Marked Review</div>
                    </div>

                    <div className="bg-slate-100 px-4 py-2 border-b border-gray-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        <span>Question Palette</span><span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{questions.length} Qs</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((q, idx) => {
                                const status = getQuestionStatus(q.id, idx);
                                let btnClasses = "h-9 w-full flex items-center justify-center text-xs font-bold transition-all relative rounded ";
                                if (status === 'answered') btnClasses += "bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600";
                                else if (status === 'not-answered') btnClasses += "bg-rose-500 text-white border border-rose-600 hover:bg-rose-600";
                                else if (status === 'marked') btnClasses += "bg-purple-600 text-white border border-purple-700 rounded-full hover:bg-purple-700";
                                else if (status === 'answered-marked') btnClasses += "bg-purple-600 text-white border border-purple-700 rounded-full hover:bg-purple-700 ring-2 ring-emerald-400 ring-offset-1";
                                else btnClasses += "bg-white text-slate-700 border border-slate-300 hover:border-blue-400 hover:text-blue-600";
                                if (currentQuestionIndex === idx) btnClasses += " ring-2 ring-blue-500 ring-offset-2 z-10";

                                return (
                                    <button key={q.id} onClick={() => { setCurrentQuestionIndex(idx); setVisited(s => new Set(s).add(idx)); }} className={btnClasses}>
                                        {idx + 1}
                                        {status === 'answered-marked' && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200">
                        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2" onClick={() => setShowSubmitModal(true)}>Submit Exam <Check size={16} /></button>
                    </div>
                </aside>
            </div>

            {/* Modals omitted for brevity, logic exists in main code (Submit/Report) */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-50 rounded-full text-blue-600"><HelpCircle size={28} /></div>
                            <h3 className="text-xl font-bold text-slate-900">Submit Exam?</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-sm text-slate-500">Answered</div><div className="text-xl font-bold text-emerald-600">{stats.answered}</div></div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-sm text-slate-500">Not Answered</div><div className="text-xl font-bold text-rose-500">{stats.notAnswered}</div></div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-sm text-slate-500">Marked</div><div className="text-xl font-bold text-purple-600">{stats.marked}</div></div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-sm text-slate-500">Not Visited</div><div className="text-xl font-bold text-slate-600">{stats.notVisited}</div></div>
                        </div>
                        {getUnansweredMandatory().length > 0 && <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3"><AlertTriangle size={20} /> <span className="text-sm">You have {getUnansweredMandatory().length} mandatory question(s) remaining.</span></div>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSubmitModal(false)} className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100">Cancel</button>
                            <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg">{submitting ? 'Submitting...' : 'Yes, Submit'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Flag size={20} className="text-rose-500" /> Report Issue</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Issue Type</label>
                                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 outline-none"><option value="flag">Flag Content</option><option value="error">Question Error</option><option value="feedback">Feedback</option></select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Details</label>
                                <textarea value={reportComment} onChange={(e) => setReportComment(e.target.value)} placeholder="Describe..." className="w-full p-3 rounded-lg border border-gray-300 min-h-[100px]" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-8">
                            <button onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100">Cancel</button>
                            <button onClick={handleReportSubmit} disabled={reporting} className="px-6 py-2 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600">{reporting ? 'Submitting...' : 'Submit Report'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeExam;
