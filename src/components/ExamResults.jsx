import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ChevronLeft, FileText, Bookmark, Flag, X } from 'lucide-react';
import MathText from './MathText';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const ExamResults = () => {
    const params = useParams();
    const id = params.id; // Exam ID (Student mode)
    const attemptId = params.attemptId; // Attempt ID (Admin mode)
    const navigate = useNavigate();
    const location = useLocation();
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
                    const { data: exam, error: examErr } = await supabase
                        .from('exams')
                        .select('title, duration_minutes')
                        .eq('id', id)
                        .single();

                    if (examErr || !exam) throw new Error("Exam not found");

                    // 1. Check if attemptId passed in location.state
                    const passedAttemptId = location.state?.attemptId;
                    if (passedAttemptId) {
                        const { data: attempt } = await supabase
                            .from('exam_attempts')
                            .select('*')
                            .eq('id', passedAttemptId)
                            .maybeSingle();
                        if (attempt) {
                            currentAttempt = attempt;
                        }
                    }

                    // 2. Fallback to latest attempt for this student
                    if (!currentAttempt) {
                        let memberId = null;
                        if (user?.email) {
                            const { data: member } = await supabase
                                .from('members')
                                .select('id')
                                .eq('email', user.email)
                                .maybeSingle();
                            if (member) memberId = member.id;
                        }

                        let query = supabase
                            .from('exam_attempts')
                            .select('*')
                            .eq('exam_id', id);

                        if (memberId) {
                            query = query.eq('member_id', memberId);
                        }

                        const { data: attempt, error: attemptError } = await query
                            .order('submitted_at', { ascending: false, nullsFirst: false })
                            .limit(1)
                            .maybeSingle();

                        if (attemptError) throw attemptError;
                        currentAttempt = attempt;
                    }

                    if (!currentAttempt) {
                        throw new Error("No exam attempt found.");
                    }

                    currentAttempt.exams = exam;
                }

                const exam = currentAttempt.exams;
                if (!exam) throw new Error("Exam details not found");

                // Fetch Student Details (for Admin Mode or correct display)
                let studentName = 'Student';
                if (currentAttempt.member_id) {
                    const { data: memberData } = await supabase
                        .from('members')
                        .select('display_name, first_name, last_name, email')
                        .eq('id', currentAttempt.member_id)
                        .maybeSingle();

                    if (memberData) {
                        studentName = memberData.email || memberData.display_name || 
                            ([memberData.first_name, memberData.last_name].filter(Boolean).join(' '));
                    } else if (user) {
                        studentName = user.email || user.user_metadata?.full_name;
                    }
                } else if (user) {
                    studentName = user.email || user.user_metadata?.full_name;
                }

                // 3. Fetch Answers
                const { data: answersData } = await supabase
                    .from('exam_answers')
                    .select('*')
                    .eq('attempt_id', currentAttempt.id);

                const answers = answersData || [];

                // 4. Fetch Questions with Options (with schema cache fallback)
                let qData = null;
                const { data: directQData, error: qError } = await supabase
                    .from('exam_questions')
                    .select(`
                        *,
                        questions (
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
                        )
                    `)
                    .eq('exam_id', currentExamId)
                    .order('order', { ascending: true });

                if (!qError && directQData) {
                    qData = directQData;
                } else {
                    // Fallback: fetch exam_questions and questions separately
                    const { data: eqList, error: eqError } = await supabase
                        .from('exam_questions')
                        .select('*')
                        .eq('exam_id', currentExamId)
                        .order('order', { ascending: true });

                    if (eqError) throw eqError;

                    if (eqList && eqList.length > 0) {
                        const questionIds = eqList.map(eq => eq.question_id).filter(Boolean);
                        const { data: questionsData, error: qFetchError } = await supabase
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

                        if (qFetchError) throw qFetchError;

                        const questionsMap = new Map((questionsData || []).map(q => [q.id, q]));
                        qData = eqList.map(eq => ({
                            ...eq,
                            questions: questionsMap.get(eq.question_id) || null
                        }));
                    } else {
                        qData = [];
                    }
                }

                // Fallback: If exam_questions has no rows, fetch questions directly from answers
                if ((!qData || qData.length === 0) && answers.length > 0) {
                    const answerQuestionIds = answers.map(a => a.question_id).filter(Boolean);
                    if (answerQuestionIds.length > 0) {
                        const { data: qAnswersList, error: qaError } = await supabase
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
                            .in('id', answerQuestionIds);

                        if (!qaError && qAnswersList) {
                            const qMap = new Map(qAnswersList.map(q => [q.id, q]));
                            qData = answers.map((ans, idx) => ({
                                id: ans.id || idx,
                                question_id: ans.question_id,
                                order: idx + 1,
                                marks: exam.marks_per_question || 1,
                                questions: qMap.get(ans.question_id) || null
                            })).filter(item => item.questions !== null);
                        }
                    }
                }

                // Fetch Question Stats
                let questionStats = {};
                if (qData && qData.length > 0) {
                    try {
                        const questionIds = qData.map(q => q.questions?.id).filter(Boolean);
                        if (questionIds.length > 0) {
                            const { data: statsData, error: statsError } = await supabase
                                .rpc('get_questions_stats', { question_ids: questionIds });

                            if (!statsError && statsData) {
                                statsData.forEach(stat => {
                                    questionStats[stat.question_id] = stat.percentage_correct;
                                });
                            }
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
                    const rawOptions = q.question_options || q.options || [];
                    const sortedOptions = [...rawOptions].sort((a, b) =>
                        (a.option_label || '').localeCompare(b.option_label || '')
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

                const rawDate = currentAttempt.submitted_at || currentAttempt.started_at;
                let formattedDate = '--';
                if (rawDate) {
                    const d = new Date(rawDate);
                    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    let timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    timeStr = timeStr.replace(' AM', ' a.m.').replace(' PM', ' p.m.');
                    formattedDate = `${dateStr}, ${timeStr}`;
                }

                let durationStr = `${exam.duration_minutes || 0} mins`;
                if (currentAttempt.started_at && currentAttempt.submitted_at) {
                    const diffSec = Math.max(0, Math.floor((new Date(currentAttempt.submitted_at) - new Date(currentAttempt.started_at)) / 1000));
                    const hrs = Math.floor(diffSec / 3600);
                    const mins = Math.floor((diffSec % 3600) / 60);
                    const secs = diffSec % 60;
                    durationStr = `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }

                const marksPerQ = exam.marks_per_question !== undefined && exam.marks_per_question !== null
                    ? Number(exam.marks_per_question).toFixed(2)
                    : (processedQuestions.length > 0 && processedQuestions[0].marks ? Number(processedQuestions[0].marks).toFixed(2) : '1.00');

                setResultData({
                    name: studentName,
                    takenOn: formattedDate,
                    duration: durationStr,
                    totalQuestions: processedQuestions.length,
                    marksPerQuestion: marksPerQ,
                    totalCorrect: processedQuestions.filter(q => q.status === 'correct').length,
                    totalWrong: processedQuestions.filter(q => q.status === 'incorrect').length,
                    score: Number(currentAttempt.score || 0).toFixed(2),
                    rank: currentAttempt.rank ? String(currentAttempt.rank) : "N/A",
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

    const styles = {
        container: { padding: '0', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', userSelect: 'none', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
        title: { fontSize: '24px', color: '#333', margin: 0 },
        backBtn: { color: '#007bff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', border: 'none', background: 'none', marginBottom: '8px' },
        card: { backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '0', marginBottom: '20px', maxWidth: '800px', width: '100%', overflowX: 'auto' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #eee', color: '#333', fontWeight: 'bold', width: '40%', fontSize: '14px' },
        td: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #eee', color: '#555', fontSize: '14px' },
        row: { borderBottom: '1px solid #eee' },
        statusIcon: { color: '#4caf50' },
        filterBar: { display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'flex-end', flexWrap: 'wrap' },
        filterBtn: { padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#333' },
        activeFilter: { backgroundColor: '#e0e0e0', borderColor: '#bbb' },
        questionItem: { backgroundColor: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '16px', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' },
        qText: { fontSize: '14px', color: '#333', marginBottom: '12px', fontWeight: 'bold', wordBreak: 'break-word' },
        optionList: { listStyle: 'none', padding: 0, margin: 0 },
        optionItem: { padding: '8px 12px', marginBottom: '8px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid transparent', maxWidth: '100%', overflowX: 'hidden' },
        optionBadge: { width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#555', flexShrink: 0 },
        correctOption: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
        wrongOption: { backgroundColor: '#ffebee', borderColor: '#ffcdd2' },
        userSelected: { fontWeight: 'bold' }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Results...</div>;
    if (!resultData) return <div style={{ padding: '20px' }}>No results found.</div>;

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '16px' }}>
                <button onClick={() => {
                    if (window.history.length > 1) {
                        navigate(-1);
                    } else if (location.state?.fromAdmin && location.state?.examId) {
                        navigate(`/exams/${location.state.examId}/statistics`);
                    } else if (location.state?.courseId) {
                        navigate(`/student/course/${location.state.courseId}`);
                    } else {
                        navigate('/student/exams');
                    }
                }} style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s'
                }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                    <ChevronLeft size={16} /> Back
                </button>
            </div>

            <div style={styles.header}>
                <h1 style={styles.title}>{resultData.examTitle}</h1>
                <button style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>
                    Actions ▼
                </button>
            </div>

            <div style={styles.card}>
                <table style={styles.table}>
                    <tbody>
                        <tr><td style={styles.th}>Member</td><td style={{ ...styles.td, color: '#007bff' }}>{resultData.name}</td></tr>
                        <tr><td style={styles.th}>Taken On</td><td style={styles.td}>{resultData.takenOn}</td></tr>
                        <tr><td style={styles.th}>Total Duration</td><td style={styles.td}>{resultData.duration}</td></tr>
                        <tr><td style={styles.th}>Total Questions</td><td style={styles.td}>{resultData.totalQuestions}</td></tr>
                        <tr><td style={styles.th}>Marks Per Question</td><td style={styles.td}>{resultData.marksPerQuestion}</td></tr>
                        <tr><td style={styles.th}>Total Correct Answers</td><td style={styles.td}>{resultData.totalCorrect}</td></tr>
                        <tr><td style={styles.th}>Total Wrong Answers</td><td style={styles.td}>{resultData.totalWrong}</td></tr>
                        <tr><td style={styles.th}>Score</td><td style={styles.td}>{resultData.score}</td></tr>
                        <tr><td style={styles.th}>Rank</td><td style={styles.td}>{resultData.rank}</td></tr>
                        <tr><td style={{ ...styles.th, borderBottom: 'none' }}>Grading Status</td><td style={{ ...styles.td, borderBottom: 'none' }}><CheckCircle size={20} color="#4caf50" /> {resultData.gradingStatus}</td></tr>
                    </tbody>
                </table>
            </div>

            <div style={styles.filterBar}>
                <button
                    style={{ ...styles.filterBtn, ...(filter === 'all' ? styles.activeFilter : {}) }}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    style={{ ...styles.filterBtn, ...(filter === 'incorrect' ? styles.activeFilter : {}) }}
                    onClick={() => setFilter('incorrect')}
                >
                    <span style={{ backgroundColor: '#f44336', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{resultData.totalWrong}</span> Incorrect
                </button>
                <button
                    style={{ ...styles.filterBtn, ...(filter === 'unanswered' ? styles.activeFilter : {}) }}
                    onClick={() => setFilter('unanswered')}
                >
                    <span style={{ backgroundColor: '#ff9800', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{resultData.totalQuestions - resultData.totalCorrect - resultData.totalWrong}</span> Unanswered
                </button>
                <button
                    style={{ ...styles.filterBtn, ...(filter === 'correct' ? styles.activeFilter : {}) }}
                    onClick={() => setFilter('correct')}
                >
                    <span style={{ backgroundColor: '#4caf50', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{resultData.totalCorrect}</span> Correct
                </button>
            </div>

            <div>
                {filteredQuestions.map((q, idx) => (
                    <div key={q.id} style={styles.questionItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={styles.qText}>
                                {idx + 1}. <MathText>{q.question}</MathText>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => toggleBookmark(q.questionId)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
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
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef5350' }}
                                    title="Report"
                                >
                                    <Flag size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={styles.optionList}>
                            {q.options && q.options.map((opt, i) => {
                                const isSelected = q.userOption === i;
                                const isCorrect = q.correctOption === i;

                                let itemStyle = { ...styles.optionItem };
                                if (isSelected && isCorrect) itemStyle = { ...itemStyle, ...styles.correctOption };
                                else if (isSelected && !isCorrect) itemStyle = { ...itemStyle, ...styles.wrongOption };
                                else if (isCorrect) itemStyle = { ...itemStyle, ...styles.correctOption, opacity: 0.7 };

                                return (
                                    <div key={i} style={itemStyle}>
                                        <span style={{
                                            ...styles.optionBadge,
                                            backgroundColor: isSelected ? (isCorrect ? '#4caf50' : '#f44336') : '#eee',
                                            color: isSelected ? 'white' : '#555'
                                        }}>
                                            {String.fromCharCode(97 + i)}
                                        </span>
                                        <span style={{ ...(isSelected ? styles.userSelected : {}), flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                                            <MathText>{opt}</MathText>
                                        </span>
                                        {isSelected && <span style={{ fontSize: '10px', marginLeft: 'auto', color: isCorrect ? '#4caf50' : '#f44336' }}>(Your Answer)</span>}
                                        {!isSelected && isCorrect && <span style={{ fontSize: '10px', marginLeft: 'auto', color: '#4caf50' }}>(Correct Answer)</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        {
                            q.explanation && (
                                <div className="explanation-container" style={{ marginTop: '16px', padding: '14px 20px', backgroundColor: '#f5f9ff', borderLeft: '4px solid #2196f3', borderRadius: '4px', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1976d2', marginBottom: '6px' }}>
                                        Explanation:
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6', maxWidth: '100%', overflowX: 'hidden' }} className="explanation-content">
                                        <MathText>{q.explanation}</MathText>
                                    </div>
                                </div>
                            )
                        }

                        {/* Subject Info */}
                        {
                            q.subject && (
                                <div style={{ marginTop: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ color: '#475569' }}>Subject:</strong>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 8px',
                                        backgroundColor: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '12px',
                                        color: '#1d4ed8',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                    }}>
                                        {q.subject}
                                    </span>
                                </div>
                            )
                        }

                        {/* Metadata */}
                        < div style={{ marginTop: '12px', fontSize: '12px', color: '#999', display: 'flex', gap: '16px' }}>
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
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div style={{
                            backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontFamily: 'Arial, sans-serif', position: 'relative'
                        }}>
                            <button
                                onClick={() => setShowReportModal(false)}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} color="#666" />
                            </button>

                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>Report Issue</h3>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Issue Type</label>
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                >
                                    <option value="flag">Flag Content (Inappropriate/Irrelevant)</option>
                                    <option value="error">Question Error (Wrong answer/Typo)</option>
                                    <option value="feedback">General Feedback</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Details</label>
                                <textarea
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                    placeholder="Describe the issue..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportSubmit}
                                    disabled={reporting}
                                    style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#ef5350', color: 'white', cursor: 'pointer', fontWeight: 'bold', opacity: reporting ? 0.7 : 1 }}
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
