'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, RotateCcw, Award, ChevronLeft, Bookmark, Flag, X } from 'lucide-react';
import MathText from './MathText';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useExams } from '../context/ExamContext';

const ExamResults = () => {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = searchParams?.get('courseId');
    const attemptId = searchParams?.get('attemptId');
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [resultData, setResultData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [filter, setFilter] = useState('all'); // all, correct, incorrect, unanswered
    const [bookmarks, setBookmarks] = useState(new Set());
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('flag');
    const [reportComment, setReportComment] = useState('');
    const [reporting, setReporting] = useState(false);
    const [reportingQuestionId, setReportingQuestionId] = useState(null);

    // Disable copy/paste and right-click
    useEffect(() => {
        const handlePrevent = (e) => {
            e.preventDefault();
            return false;
        };

        document.addEventListener('contextmenu', handlePrevent);
        document.addEventListener('copy', handlePrevent);
        document.addEventListener('cut', handlePrevent);
        document.addEventListener('paste', handlePrevent);
        document.addEventListener('selectstart', handlePrevent);

        return () => {
            document.removeEventListener('contextmenu', handlePrevent);
            document.removeEventListener('copy', handlePrevent);
            document.removeEventListener('cut', handlePrevent);
            document.removeEventListener('paste', handlePrevent);
            document.removeEventListener('selectstart', handlePrevent);
        };
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                let currentExamId = id;
                let currentAttempt = null;

                if (attemptId) {
                    // Admin Mode: Fetch specific attempt
                    const { data: attempt, error: attemptError } = await supabase
                        .from('exam_attempts')
                        .select('*, exams(*)')
                        .eq('id', attemptId)
                        .single();

                    if (attemptError) throw attemptError;
                    currentAttempt = attempt;
                    currentExamId = attempt.exam_id;

                    // If exam details are joined, use them, otherwise fetch
                    if (!attempt.exams) {
                        const { data: exam } = await supabase
                            .from('exams')
                            .select('title, duration_minutes')
                            .eq('id', currentExamId)
                            .single();
                        currentAttempt.exams = exam;
                    }

                } else {
                    // Student Mode: Fetch Exam & Latest Attempt
                    const { data: exam } = await supabase
                        .from('exams')
                        .select('title, duration_minutes')
                        .eq('id', id)
                        .single();

                    if (!exam) throw new Error("Exam not found");

                    // Resolve member_id
                    const { data: memberData, error: memberError } = await supabase
                        .from('members')
                        .select('id')
                        .eq('auth_user_id', user.id)
                        .single();

                    if (memberError || !memberData) throw new Error("Student profile not found");
                    const memberId = memberData.id;

                    const { data: attempt, error: attemptError } = await supabase
                        .from('exam_attempts')
                        .select('*')
                        .eq('exam_id', id)
                        .eq('member_id', memberId) // Use member_id
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (attemptError) throw attemptError;
                    currentAttempt = attempt;
                    currentAttempt.exams = exam;
                }

                const exam = currentAttempt.exams;
                if (!exam) throw new Error("Exam details not found");

                // Fetch Student Details (for Admin Mode or correct display)
                let studentName = 'Student';
                if (currentAttempt.user_id) {
                    const { data: memberData } = await supabase
                        .from('members')
                        .select('name, email')
                        .eq('user_id', currentAttempt.user_id)
                        .single();

                    if (memberData) {
                        studentName = memberData.name || memberData.email;
                    } else if (user.id === currentAttempt.user_id) {
                        // Fallback to logged-in user if it's their own attempt
                        studentName = user.user_metadata?.full_name || user.email;
                    }
                }

                // 3. Fetch Answers
                const { data: answersData, error: answersError } = await supabase
                    .from('exam_answers')
                    .select('*')
                    .eq('attempt_id', currentAttempt.id);

                const answers = answersData || [];

                // 4. Fetch Questions with Options
                const { data: eqData, error: eqError } = await supabase
                    .from('exam_questions')
                    .select('*')
                    .eq('exam_id', currentExamId)
                    .order('order', { ascending: true });

                if (eqError) throw eqError;

                let qData = [];
                if (eqData && eqData.length > 0) {
                    const questionIds = eqData.map(eq => eq.question_id).filter(Boolean);
                    if (questionIds.length > 0) {
                        const { data: questions, error: qError } = await supabase
                            .from('questions')
                            .select(`
                                id,
                                question_text,
                                explanation,
                                subjects (name),
                                question_options (
                                    id,
                                    option_label,
                                    option_text,
                                    is_correct
                                )
                            `)
                            .in('id', questionIds);

                        if (qError) throw qError;

                        qData = eqData.map(eq => ({
                            ...eq,
                            questions: questions.find(q => q.id === eq.question_id)
                        }));
                    } else {
                        qData = eqData;
                    }
                }

                // Fetch Question Stats
                let questionStats = {};
                if (qData && qData.length > 0) {
                    try {
                        const questionIds = qData.map(q => q.questions.id);
                        const { data: statsData, error: statsError } = await supabase
                            .rpc('get_questions_stats', { question_ids: questionIds });

                        if (!statsData && statsError) {
                            // console.warn("Failed to fetch question stats:", statsError);
                        } else if (statsData) {
                            statsData.forEach(stat => {
                                questionStats[stat.question_id] = stat.percentage_correct;
                            });
                        }
                    } catch (err) {
                        console.warn("Failed to fetch question stats:", err);
                    }
                }

                // Process Data
                const processedQuestions = (qData || []).map(item => {
                    const q = item.questions;
                    if (!q) return null; // Skip if question data is missing

                    const answer = answers.find(a => a.question_id === q.id);

                    // Sort options by label
                    const sortedOptions = (q.question_options || []).sort((a, b) =>
                        a.option_label.localeCompare(b.option_label)
                    );

                    const optionTexts = sortedOptions.map(opt => opt.option_text);
                    const correctIndex = sortedOptions.findIndex(opt => opt.is_correct);

                    let status = 'unanswered';
                    if (answer && answer.selected_option_index !== null && answer.selected_option_index !== undefined) {
                        status = answer.is_correct ? 'correct' : 'incorrect';
                    }

                    return {
                        id: item.id, // Use exam_question_id for reports/bookmarks
                        questionId: q.id, // Keep global id if needed
                        question: q.question_text,
                        explanation: q.explanation,
                        options: optionTexts,
                        correctOption: correctIndex,
                        userOption: answer ? answer.selected_option_index : null,
                        status: status,
                        marks: item.marks,
                        subject: q.subjects?.name,
                        percentageCorrect: questionStats[q.id]
                    };
                }).filter(Boolean); // Remove nulls

                setResultData({
                    name: studentName,
                    takenOn: new Date(currentAttempt.started_at).toLocaleString(),
                    duration: `${exam.duration_minutes} mins`,
                    totalQuestions: processedQuestions.length,
                    marksPerQuestion: processedQuestions.length > 0 ? processedQuestions[0].marks : 0,
                    totalCorrect: processedQuestions.filter(q => q.status === 'correct').length,
                    totalWrong: processedQuestions.filter(q => q.status === 'incorrect').length,
                    score: currentAttempt.score,
                    rank: "N/A",
                    gradingStatus: currentAttempt.status === 'completed' ? 'Completed' : 'Pending',
                    examTitle: exam.title
                });

                setQuestions(processedQuestions);

            } catch (error) {
                console.error("Error fetching results:", error);
                alert("Error loading results. Please check console.");
            } finally {
                setLoading(false);
            }
        };

        if ((user && id) || attemptId) fetchResults();
    }, [id, attemptId, user]);

    // Fetch Bookmarks
    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user || questions.length === 0) return;
            try {
                const qIds = questions.map(q => q.id);
                const { data, error } = await supabase
                    .from('question_bookmarks')
                    .select('question_id')
                    .eq('user_id', user.id)
                    .in('question_id', qIds);

                if (error) {
                    console.warn('Error fetching bookmarks:', error);
                    return;
                }

                if (data) {
                    setBookmarks(new Set(data.map(b => b.question_id)));
                }
            } catch (err) {
                console.error('Error in fetchBookmarks:', err);
            }
        };
        fetchBookmarks();
    }, [user, questions]);

    const toggleBookmark = async (questionId) => {
        const isBookmarked = bookmarks.has(questionId);

        setBookmarks(prev => {
            const newSet = new Set(prev);
            if (isBookmarked) newSet.delete(questionId);
            else newSet.add(questionId);
            return newSet;
        });

        try {
            if (isBookmarked) {
                await supabase
                    .from('question_bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('question_id', questionId);
            } else {
                // Check if already exists to avoid 409 Conflict
                const { data: existing } = await supabase
                    .from('question_bookmarks')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('question_id', questionId)
                    .maybeSingle();

                if (!existing) {
                    try {
                        const { error } = await supabase
                            .from('question_bookmarks')
                            .insert({ user_id: user.id, question_id: questionId });

                        // If error is 409 Conflict, ignore it (treat as success)
                        if (error && error.code !== '23505' && error.status !== 409) {
                            throw error;
                        }
                    } catch (insertError) {
                        // Double check for conflict in catch block just in case
                        if (insertError.code !== '23505' && insertError.status !== 409 && !insertError.message?.includes('Conflict')) {
                            throw insertError;
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error toggling bookmark:', err);
            setBookmarks(prev => {
                const newSet = new Set(prev);
                if (isBookmarked) newSet.add(questionId);
                else newSet.delete(questionId);
                return newSet;
            });
            alert('Failed to update bookmark.');
        }
    };

    const openReportModal = (qId) => {
        setReportingQuestionId(qId);
        setShowReportModal(true);
    };

    const handleReportSubmit = async () => {
        if (!reportComment.trim()) {
            alert('Please enter a comment.');
            return;
        }
        setReporting(true);
        try {
            const { error } = await supabase
                .from('question_reports')
                .insert({
                    user_id: user.id,
                    question_id: reportingQuestionId,
                    report_type: reportType,
                    comment: reportComment
                });

            if (error) throw error;
            alert('Report submitted successfully.');
            setShowReportModal(false);
            setReportComment('');
            setReportType('flag');
            setReportingQuestionId(null);
        } catch (err) {
            console.error('Error submitting report:', err);
            alert(`Error submitting report: ${err.message}`);
        } finally {
            setReporting(false);
        }
    };

    const filteredQuestions = questions.filter(q => {
        if (filter === 'all') return true;
        return q.status === filter;
    });

    if (loading) return <div className="p-5 text-center">Loading Results...</div>;
    if (!resultData) return <div className="p-5 text-center">No results found.</div>;

    return (
        <div className="font-sans bg-gray-50 select-none pb-12">
            <div className="flex gap-2 w-full mb-4">
                <button
                    onClick={() => {
                        if (courseId) {
                            router.push(`/student/course/${courseId}`);
                        } else if (user?.role === 'admin') {
                            router.push('/admin/exams');
                        } else {
                            router.push('/student/dashboard');
                        }
                    }}
                    className="flex-1 p-2 bg-blue-600 text-white border-none rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-1 transition-colors hover:bg-blue-700"
                >
                    <ChevronLeft size={16} /> Back to {courseId ? 'Course' : 'Exams'}
                </button>
            </div>

            <div className="flex justify-between items-center mb-5">
                <h1 className="text-2xl text-gray-800 m-0 font-bold">{resultData.examTitle}</h1>
                <button className="px-3 py-1.5 border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 text-sm">
                    Actions ▼
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded mb-5 p-0 overflow-hidden max-w-3xl">
                <table className="w-full border-collapse">
                    <tbody>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Name</td>
                            <td className="text-left px-4 py-3 text-blue-600 font-medium text-sm">{resultData.name}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Taken On</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.takenOn}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Total Duration</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.duration}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Total Questions</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.totalQuestions}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Marks Per Question</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.marksPerQuestion}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Total Correct Answers</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.totalCorrect}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Total Wrong Answers</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.totalWrong}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Score</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.score}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Rank</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm">{resultData.rank}</td>
                        </tr>
                        <tr>
                            <td className="text-left px-4 py-3 text-gray-800 font-bold w-2/5 text-sm">Grading Status</td>
                            <td className="text-left px-4 py-3 text-gray-600 text-sm flex items-center gap-2">
                                <CheckCircle size={20} className="text-green-500" /> {resultData.gradingStatus}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex gap-2 mb-5 justify-end flex-wrap">
                <button
                    className={`px-3 py-1.5 border rounded text-xs cursor-pointer flex items-center gap-1.5 transition-colors
                        ${filter === 'all'
                            ? 'bg-gray-300 border-gray-400 text-gray-900 font-medium'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`px-3 py-1.5 border rounded text-xs cursor-pointer flex items-center gap-1.5 transition-colors
                        ${filter === 'incorrect'
                            ? 'bg-gray-300 border-gray-400 text-gray-900 font-medium'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setFilter('incorrect')}
                >
                    <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{resultData.totalWrong}</span> Incorrect
                </button>
                <button
                    className={`px-3 py-1.5 border rounded text-xs cursor-pointer flex items-center gap-1.5 transition-colors
                        ${filter === 'unanswered'
                            ? 'bg-gray-300 border-gray-400 text-gray-900 font-medium'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setFilter('unanswered')}
                >
                    <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{resultData.totalQuestions - resultData.totalCorrect - resultData.totalWrong}</span> Unanswered
                </button>
                <button
                    className={`px-3 py-1.5 border rounded text-xs cursor-pointer flex items-center gap-1.5 transition-colors
                        ${filter === 'correct'
                            ? 'bg-gray-300 border-gray-400 text-gray-900 font-medium'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setFilter('correct')}
                >
                    <span className="bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{resultData.totalCorrect}</span> Correct
                </button>
            </div>

            <div>
                {filteredQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-5 border border-gray-200 rounded mb-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="text-sm text-gray-800 font-bold leading-relaxed flex-1 mr-4">
                                {idx + 1}. <MathText>{q.question}</MathText>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => toggleBookmark(q.questionId)}
                                    className="bg-transparent border-none cursor-pointer p-1 rounded hover:bg-gray-100 transition-colors"
                                    title={bookmarks.has(q.questionId) ? "Remove Bookmark" : "Bookmark Question"}
                                >
                                    <Bookmark
                                        size={20}
                                        fill={bookmarks.has(q.questionId) ? "#FFD700" : "none"}
                                        color={bookmarks.has(q.questionId) ? "#FFD700" : "#ccc"}
                                    />
                                </button>
                                <button
                                    onClick={() => openReportModal(q.questionId)}
                                    className="bg-transparent border-none cursor-pointer text-red-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition-colors"
                                    title="Report"
                                >
                                    <Flag size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="list-none p-0 m-0">
                            {q.options && q.options.map((opt, i) => {
                                const isSelected = q.userOption === i;
                                const isCorrect = q.correctOption === i;

                                let itemClasses = "px-3 py-2 mb-2 rounded text-[13px] flex items-center gap-2 border transition-all ";

                                if (isSelected && isCorrect) {
                                    itemClasses += "bg-green-50 border-green-200 text-green-800";
                                } else if (isSelected && !isCorrect) {
                                    itemClasses += "bg-red-50 border-red-200 text-red-800";
                                } else if (isCorrect) {
                                    itemClasses += "bg-green-50 border-green-200 text-green-800 opacity-80";
                                } else {
                                    itemClasses += "bg-white border-transparent hover:bg-gray-50";
                                }

                                return (
                                    <div key={i} className={itemClasses}>
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                            ${isSelected
                                                ? (isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                                                : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {String.fromCharCode(97 + i)}
                                        </span>
                                        <span className={isSelected ? 'font-bold' : ''}>
                                            <MathText>{opt}</MathText>
                                        </span>
                                        {isSelected && <span className={`text-[10px] ml-auto font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>(Your Answer)</span>}
                                        {!isSelected && isCorrect && <span className="text-[10px] ml-auto text-green-600 font-medium">(Correct Answer)</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Subject Info */}
                        {
                            q.subject && (
                                <div className="mt-3 text-[13px] text-gray-600">
                                    <strong>Subject:</strong> {q.subject}
                                </div>
                            )
                        }

                        {/* Explanation */}
                        {
                            q.explanation && (
                                <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                                    <div className="text-xs font-bold text-blue-700 mb-1">
                                        Explanation:
                                    </div>
                                    <div className="text-[13px] text-gray-800 leading-relaxed">
                                        <MathText>{q.explanation}</MathText>
                                    </div>
                                </div>
                            )
                        }

                        {/* Metadata */}
                        <div className="mt-3 text-xs text-gray-400 flex gap-4">
                            {q.percentageCorrect !== undefined && (
                                <span>Percentage correct: {q.percentageCorrect}%</span>
                            )}
                        </div>
                    </div>
                ))
                }
            </div >

            {/* Report Modal */}
            {
                showReportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
                        <div className="bg-white p-6 rounded-lg w-[400px] shadow-lg relative font-sans">
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="absolute top-3 right-3 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="m-0 mb-4 text-lg text-gray-800 font-bold">Report Issue</h3>

                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-bold text-gray-700">Issue Type</label>
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="flag">Flag Content (Inappropriate/Irrelevant)</option>
                                    <option value="error">Question Error (Wrong answer/Typo)</option>
                                    <option value="feedback">General Feedback</option>
                                </select>
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm font-bold text-gray-700">Details</label>
                                <textarea
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                    placeholder="Describe the issue..."
                                    className="w-full p-2 rounded border border-gray-300 min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportSubmit}
                                    disabled={reporting}
                                    className={`px-4 py-2 border-none rounded bg-red-500 text-white cursor-pointer font-bold text-sm hover:bg-red-600 transition-colors ${reporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {reporting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ExamResults;
