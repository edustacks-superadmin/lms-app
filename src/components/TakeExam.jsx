import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Info, FileText, Bookmark, Flag, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useExams } from '../context/ExamContext';
import MathText from './MathText';

const TakeExam = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { canTakeExam, getStudentAttempts, getExamSections, fetchExamQuestionsWithSections } = useExams();

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
    const [attemptId, setAttemptId] = useState(null);
    const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);

    // Section state
    const [sections, setSections] = useState([]);
    const [currentSection, setCurrentSection] = useState(0);

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
            try {
                // Fetch Exam Details
                const { data: examData, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (examError) throw examError;
                setExam(examData);
                setTimeLeft(examData.duration_minutes * 60);

                // Fetch sections
                const sectionsData = await getExamSections(id);
                setSections(sectionsData || []);

                // Fetch Questions with sections
                const qData = await fetchExamQuestionsWithSections(id);

                console.log("Fetched qData with sections:", qData);

                if (!qData || qData.length === 0) {
                    console.warn("No questions found for this exam");
                    setQuestions([]);
                    return;
                }

                // Format questions with section info
                const formattedQuestions = qData.map(item => {
                    const q = item.questions;

                    if (!q) {
                        console.error("Question data missing for item:", item);
                        return null;
                    }

                    // Sort options by label
                    const sortedOptions = (q.options || []).sort((a, b) =>
                        a.option_label.localeCompare(b.option_label)
                    );

                    const optionTexts = sortedOptions.map(opt => opt.option_text);
                    const correctIndex = sortedOptions.findIndex(opt => opt.is_correct);

                    return {
                        id: q.id,
                        question: q.question_text,
                        options: optionTexts,
                        marks: item.marks,
                        correctAnswerIndex: correctIndex,
                        section_id: item.section_id,
                        is_mandatory: false,
                        exam_sections: item.exam_sections
                    };
                }).filter(q => q !== null);

                console.log("Formatted questions:", formattedQuestions);

                // Apply randomization if enabled
                let finalQuestions = formattedQuestions;

                // Randomize question order (within sections if sections exist)
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
                console.error("Error details:", {
                    message: error.message,
                    stack: error.stack,
                    examId: id
                });
                alert(`Error loading exam: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchExamData();
    }, [id]);

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
                const qIds = questions.map(q => q.id);
                const { data, error } = await supabase
                    .from('question_bookmarks')
                    .select('question_id')
                    .eq('user_id', user.id)
                    .in('question_id', qIds);

                if (error) {
                    // Ignore error if table doesn't exist yet
                    console.warn('Error fetching bookmarks (table might not exist):', error);
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

    // Tab Switch Detection
    useEffect(() => {
        if (!exam?.detect_tab_switch) return;

        const handleVisibilityChange = () => {
            if (document.hidden && !submitting) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    console.warn(`Tab switch detected (${newCount})`);
                    return newCount;
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [exam, submitting]);

    // Copy-Paste Restrictions
    useEffect(() => {
        if (!exam?.restrict_copy_paste) return;

        const preventCopyPaste = (e) => {
            e.preventDefault();
            console.warn('Copy/paste is disabled during this exam');
        };

        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);

        return () => {
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
        };
    }, [exam]);

    // Timer
    useEffect(() => {
        if (!exam || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto submit if enabled
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
    }, [exam, timeLeft]);

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

        // Optimistic update
        setBookmarks(prev => {
            const newSet = new Set(prev);
            if (isBookmarked) newSet.delete(currentId);
            else newSet.add(currentId);
            return newSet;
        });

        try {
            if (isBookmarked) {
                await supabase
                    .from('question_bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('question_id', currentId);
            } else {
                // Check if already exists to avoid 409 Conflict
                const { data: existing } = await supabase
                    .from('question_bookmarks')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('question_id', currentId)
                    .maybeSingle();

                if (!existing) {
                    try {
                        const { error } = await supabase
                            .from('question_bookmarks')
                            .insert({ user_id: user.id, question_id: currentId });

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
            // Revert on error
            setBookmarks(prev => {
                const newSet = new Set(prev);
                if (isBookmarked) newSet.add(currentId);
                else newSet.delete(currentId);
                return newSet;
            });
            alert('Failed to update bookmark. Please try again.');
        }
    };

    // Section helper functions
    const getCurrentSectionQuestions = () => {
        if (sections.length === 0) return questions;

        const currentSectionData = sections[currentSection];
        if (!currentSectionData) return questions;

        return questions.filter(q => q.section_id === currentSectionData.id);
    };

    const getUnansweredMandatory = () => {
        return questions.filter(q =>
            q.is_mandatory && answers[q.id] === undefined
        );
    };

    const getSectionProgress = (sectionId) => {
        const sectionQuestions = questions.filter(q => q.section_id === sectionId);
        const answered = sectionQuestions.filter(q => answers[q.id] !== undefined).length;
        return { total: sectionQuestions.length, answered };
    };

    const handleReportSubmit = async () => {
        if (!reportComment.trim()) {
            alert('Please enter a comment.');
            return;
        }
        setReporting(true);
        try {
            const currentId = questions[currentQuestionIndex].id;
            const { error } = await supabase
                .from('question_reports')
                .insert({
                    user_id: user.id,
                    question_id: currentId,
                    report_type: reportType,
                    comment: reportComment
                });

            if (error) throw error;
            alert('Report submitted successfully.');
            setShowReportModal(false);
            setReportComment('');
            setReportType('flag');
        } catch (err) {
            console.error('Error submitting report:', err);
            alert('Failed to submit report. Please try again.');
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
        // Check for unanswered mandatory questions - Logic moved to Modal display
        // We allow submission even if mandatory questions are missed if the user confirms in the modal
        // or if it's an auto-submit

        setSubmitting(true);
        try {
            // Calculate Score with Negative Marking
            let score = 0;

            // Prepare answers for DB
            const answerRecords = questions.map(q => {
                const selectedIdx = answers[q.id];
                const isCorrect = selectedIdx !== undefined && selectedIdx === q.correctAnswerIndex;

                if (isCorrect) {
                    score += (q.marks || 1);
                } else if (selectedIdx !== undefined && exam.negative_marking_enabled) {
                    // Deduct marks for wrong answers
                    score -= exam.negative_marks_per_question;
                }

                return {
                    question_id: q.id,
                    selected_option_index: selectedIdx,
                    is_correct: isCorrect
                };
            });

            // Don't allow negative total score
            score = Math.max(0, score);

            // Get student member ID and institute ID
            let memberId = null;
            let instituteId = exam.institute_id || 10;
            if (user?.email) {
                const { data: member } = await supabase
                    .from('members')
                    .select('id, institute_id')
                    .eq('email', user.email)
                    .maybeSingle();
                if (member) {
                    memberId = member.id;
                    if (member.institute_id) instituteId = member.institute_id;
                }
            }

            // Create Attempt Record with correct schema columns
            const attemptPayload = {
                exam_id: id,
                member_id: memberId,
                institute_id: instituteId,
                score: score,
                total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
                status: 'completed',
                started_at: new Date(Date.now() - (exam.duration_minutes * 60 - timeLeft) * 1000).toISOString(),
                submitted_at: new Date().toISOString(),
                answers: answers,
                tab_switches: tabSwitchCount,
                is_auto_submitted: isAutoSubmitted
            };

            const { data: attempt, error: attemptError } = await supabase
                .from('exam_attempts')
                .insert([attemptPayload])
                .select()
                .single();

            if (attemptError) throw attemptError;

            // Insert Answers
            if (attempt && answerRecords.length > 0) {
                const answersToInsert = answerRecords.map(a => ({
                    attempt_id: attempt.id,
                    question_id: a.question_id,
                    selected_option_index: a.selected_option_index,
                    is_correct: a.is_correct,
                    institute_id: instituteId
                }));

                const { error: answersError } = await supabase
                    .from('exam_answers')
                    .insert(answersToInsert);

                if (answersError) {
                    console.warn('Error inserting exam answers:', answersError);
                }
            }

            // Track exam completion in content_progress
            if (location.state?.courseId) {
                try {
                    // Get student member ID
                    const { data: member } = await supabase
                        .from('members')
                        .select('id')
                        .eq('email', user.email)
                        .single();

                    if (member) {
                        // Mark exam as complete
                        await supabase
                            .from('content_progress')
                            .upsert({
                                student_id: member.id,
                                course_id: location.state.courseId,
                                chapter_id: exam.chapter_id,
                                content_type: 'exam',
                                content_id: id,
                                content_title: exam.title,
                                completed: true,
                                completion_percentage: Math.round((score / exam.total_marks) * 100),
                                completed_at: new Date().toISOString()
                            }, {
                                onConflict: 'student_id,content_id,content_type'
                            });

                        // Recalculate course progress
                        await supabase.rpc('calculate_course_progress', {
                            p_student_id: member.id,
                            p_course_id: location.state.courseId
                        });
                    }
                } catch (progressError) {
                    // Don't fail exam submission if progress tracking fails
                    console.error('Error tracking exam progress:', progressError);
                }
            }

            // Redirect to Results
            navigate(`/student/exam/${id}/results`, { state: { courseId: location.state?.courseId, attemptId: attempt?.id } });

        } catch (error) {
            console.error("Error submitting exam:", error);
            alert(`Failed to submit exam: ${error.message}`);
        } finally {
            setSubmitting(false);
            setShowSubmitModal(false);
        }
    };

    // Stats Calculation
    const stats = {
        answered: Object.keys(answers).length,
        notAnswered: visited.size - Object.keys(answers).length,
        notVisited: questions.length - visited.size,
        marked: markedForReview.size,
        answeredMarked: 0
    };

    // Mobile Responsiveness
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showSidebar, setShowSidebar] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setShowSidebar(false); // Reset on desktop
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Styles
    const styles = {
        container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', fontSize: isMobile ? '14px' : '14px' },
        header: { backgroundColor: '#333', color: 'white', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '50px' },
        headerRight: { display: 'flex', gap: isMobile ? '8px' : '16px', fontSize: '12px', alignItems: 'center' },
        headerBtn: { background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px' },
        infoBar: { backgroundColor: 'white', borderBottom: '1px solid #ccc', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px', fontSize: isMobile ? '12px' : '14px' },
        sectionTitle: { fontWeight: 'bold', color: '#007bff' },
        timer: { fontWeight: 'bold', color: '#333' },
        timerBox: { backgroundColor: '#f0f0f0', padding: '2px 8px', border: '1px solid #ccc', borderRadius: '4px', marginLeft: '8px' },
        tabBar: { backgroundColor: 'white', borderBottom: '1px solid #ccc', padding: '0 16px', display: 'flex', alignItems: 'flex-end', height: '36px', gap: '4px', overflowX: 'auto' },
        tab: { backgroundColor: '#f0f0f0', color: '#666', padding: '6px 16px', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: '1px solid #ccc', borderBottom: 'none', whiteSpace: 'nowrap' },
        activeTab: { backgroundColor: '#007bff', color: 'white', padding: '6px 16px', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: '1px solid #007bff', borderBottom: 'none', whiteSpace: 'nowrap' },
        main: { display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' },
        questionArea: { flex: 1, display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid #ccc' },
        questionContent: { flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px' },
        questionHeader: { borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px', fontWeight: 'bold', fontSize: isMobile ? '14px' : '16px', color: '#d32f2f' },
        questionText: { marginBottom: '24px', fontSize: isMobile ? '14px' : '15px', lineHeight: '1.5', color: '#333' },
        options: { display: 'flex', flexDirection: 'column', gap: '12px' },
        optionLabel: { display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: isMobile ? '8px 0' : '0' },
        radio: { marginTop: '3px' },
        footer: { borderTop: '1px solid #ccc', padding: '8px 16px', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? '12px' : '0' },
        btnGroup: { display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' },
        btn: { padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white', flex: isMobile ? 1 : 'auto' },
        btnPrimary: { padding: '8px 24px', border: '1px solid #0056b3', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', flex: isMobile ? 1 : 'auto' },
        sidebar: {
            width: isMobile ? '80%' : '320px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#eef5fa',
            borderLeft: '1px solid #ccc',
            position: isMobile ? 'absolute' : 'static',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            transform: isMobile ? (showSidebar ? 'translateX(0)' : 'translateX(100%)') : 'none',
            transition: 'transform 0.3s ease-in-out',
            boxShadow: isMobile ? '-2px 0 8px rgba(0,0,0,0.2)' : 'none'
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 90,
            display: isMobile && showSidebar ? 'block' : 'none'
        },
        profile: { backgroundColor: 'white', padding: '12px', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: '12px' },
        profileImg: { width: '48px', height: '48px', backgroundColor: '#ddd', borderRadius: '4px', objectFit: 'cover' },
        profileName: { fontWeight: 'bold', color: '#333' },
        legend: { padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', borderBottom: '1px solid #ccc', backgroundColor: 'white' },
        legendItem: { display: 'flex', alignItems: 'center', gap: '8px' },
        legendBox: { width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', borderRadius: '12px 0 12px 0' },
        legendCircle: { width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', borderRadius: '50%' },
        paletteHeader: { backgroundColor: '#4db6ac', color: 'white', padding: '4px 12px', fontWeight: 'bold', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        palette: { flex: 1, overflowY: 'auto', padding: '8px', backgroundColor: 'white' },
        paletteGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
        paletteBtn: { height: '32px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', position: 'relative' },
        submitArea: { padding: '8px', backgroundColor: '#e1f5fe', borderTop: '1px solid #b3e5fc' },
        submitBtn: { width: '100%', padding: '8px', backgroundColor: '#0288d1', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
        mobileToggle: {
            display: isMobile ? 'flex' : 'none',
            alignItems: 'center',
            gap: '4px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
        }
    };

    const getStatusStyle = (status) => {
        const base = { ...styles.paletteBtn };
        if (status === 'marked' || status === 'answered-marked') {
            base.borderRadius = '50%';
        } else {
            base.borderRadius = '12px 0 12px 0';
        }

        switch (status) {
            case 'answered':
                base.backgroundColor = '#4caf50';
                base.color = 'white';
                base.borderColor = '#388e3c';
                break;
            case 'not-answered':
                base.backgroundColor = '#f44336';
                base.color = 'white';
                base.borderColor = '#d32f2f';
                break;
            case 'marked':
                base.backgroundColor = '#7b1fa2';
                base.color = 'white';
                base.borderColor = '#4a148c';
                break;
            case 'answered-marked':
                base.backgroundColor = '#7b1fa2';
                base.color = 'white';
                base.borderColor = '#4a148c';
                break;
            case 'not-visited':
            default:
                base.backgroundColor = '#f5f5f5';
                base.color = 'black';
                base.borderColor = '#ccc';
                break;
        }
        return base;
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Exam...</div>;
    if (!exam) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Exam not found</div>;
    if (questions.length === 0) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>No questions in this exam</div>;

    // Show blocked screen if user cannot take exam
    if (canAttempt === false) {
        return (
            <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
                <div style={{
                    background: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '24px'
                }}>
                    <h2 style={{ margin: '0 0 16px 0', color: '#856404' }}>
                        ⚠️ Cannot Start Exam
                    </h2>
                    <p style={{ margin: 0, fontSize: '16px', color: '#856404' }}>
                        {attemptError}
                    </p>
                </div>

                {previousAttempts.length > 0 && (
                    <div style={{
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '24px'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>Your Previous Attempts</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {previousAttempts.map((attempt, idx) => (
                                <div key={attempt.id} style={{
                                    padding: '12px',
                                    background: '#f8f9fa',
                                    borderRadius: '4px',
                                    border: '1px solid #e9ecef'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>
                                            Attempt #{attempt.attempt_number || idx + 1}
                                        </span>
                                        <span style={{ color: '#666', fontSize: '14px' }}>
                                            {new Date(attempt.completed_at || attempt.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    {attempt.score !== null && (
                                        <div style={{ marginTop: '8px', fontSize: '14px' }}>
                                            Score: <strong>{attempt.score} / {attempt.total_marks}</strong>
                                            {attempt.is_auto_submitted &&
                                                <span style={{ marginLeft: '8px', color: '#dc3545' }}>(Auto-submitted)</span>
                                            }
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={() => {
                        if (location.state?.courseId) {
                            navigate(`/student/course/${location.state.courseId}`);
                        } else {
                            navigate('/student/exams');
                        }
                    }}
                    style={{
                        marginTop: '24px',
                        padding: '12px 24px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Back to {location.state?.courseId ? 'Course' : 'Exams'}
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Top Bar */}
            <header style={styles.header}>
                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '150px' : 'auto' }}>{exam.title}</div>
                <div style={styles.headerRight}>
                    {!isMobile && (
                        <>
                            <button style={styles.headerBtn}>
                                <FileText size={14} color="#69f0ae" /> Question Paper
                            </button>
                            <button style={styles.headerBtn}>
                                <Info size={14} color="#448aff" /> Instructions
                            </button>
                        </>
                    )}
                    {isMobile && (
                        <button style={styles.mobileToggle} onClick={() => setShowSidebar(true)}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '14px' }}>
                                <div style={{ width: '6px', height: '6px', background: 'white' }}></div>
                                <div style={{ width: '6px', height: '6px', background: 'white' }}></div>
                                <div style={{ width: '6px', height: '6px', background: 'white' }}></div>
                                <div style={{ width: '6px', height: '6px', background: 'white' }}></div>
                            </div>
                            Palette
                        </button>
                    )}
                </div>
            </header>

            {/* Info Bar */}
            <div style={styles.infoBar}>
                <div style={styles.sectionTitle}>Section</div>
                <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#333' }}>
                    Time Left : <span style={styles.timerBox}>{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Warning Banners */}
            {tabSwitchCount > 0 && exam.detect_tab_switch && (
                <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    padding: '8px 16px',
                    margin: '0 16px',
                    borderRadius: '4px',
                    color: '#856404',
                    fontSize: '14px'
                }}>
                    ⚠️ Tab switches detected: {tabSwitchCount}
                </div>
            )}

            {exam.negative_marking_enabled && (
                <div style={{
                    background: '#d1ecf1',
                    border: '1px solid #17a2b8',
                    padding: '8px 16px',
                    margin: '8px 16px 0',
                    borderRadius: '4px',
                    color: '#0c5460',
                    fontSize: '14px'
                }}>
                    ℹ️ Negative marking: -{exam.negative_marks_per_question} marks for wrong answers
                </div>
            )}

            {/* Section Tabs */}
            {sections.length > 0 ? (
                <div style={styles.tabBar}>
                    {sections.map((section, idx) => {
                        const progress = getSectionProgress(section.id);
                        const isActive = currentSection === idx;
                        return (
                            <div
                                key={section.id}
                                onClick={() => setCurrentSection(idx)}
                                style={{
                                    ...styles.tab,
                                    ...(isActive ? styles.activeTab : {})
                                }}
                            >
                                {section.section_name}
                                <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                                    ({progress.answered}/{progress.total})
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={styles.tabBar}>
                    <div style={styles.activeTab}>
                        General <Info size={12} />
                    </div>
                </div>
            )}

            {/* Section Instructions */}
            {sections.length > 0 && sections[currentSection]?.instructions && (
                <div style={{
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    padding: '12px 16px',
                    margin: '0 16px',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    <strong>Instructions:</strong> {sections[currentSection].instructions}
                    {sections[currentSection].total_marks && (
                        <span style={{ marginLeft: '16px', color: '#666' }}>
                            (Total: {sections[currentSection].total_marks} marks)
                        </span>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div style={styles.main}>
                {/* Overlay for mobile sidebar */}
                <div style={styles.overlay} onClick={() => setShowSidebar(false)}></div>

                {/* Left: Question Area */}
                <main style={styles.questionArea}>
                    <div style={styles.questionContent}>
                        <div style={styles.questionHeader}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Question No. {currentQuestionIndex + 1}</span>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={toggleBookmark}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: bookmarks.has(questions[currentQuestionIndex]?.id) ? '#fbc02d' : '#9e9e9e',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px'
                                        }}
                                        title="Bookmark this question"
                                    >
                                        <Bookmark size={18} fill={bookmarks.has(questions[currentQuestionIndex]?.id) ? '#fbc02d' : 'none'} />
                                        {bookmarks.has(questions[currentQuestionIndex]?.id) ? 'Bookmarked' : 'Bookmark'}
                                    </button>
                                    <button
                                        onClick={() => setShowReportModal(true)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#ef5350',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px'
                                        }}
                                        title="Report an issue"
                                    >
                                        <Flag size={18} />
                                        Report
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={styles.questionText}>
                            <MathText>{questions[currentQuestionIndex].question}</MathText>
                        </div>

                        <div style={styles.options}>
                            {questions[currentQuestionIndex].options && questions[currentQuestionIndex].options.map((option, idx) => (
                                <label key={idx} style={styles.optionLabel}>
                                    <input
                                        type="radio"
                                        name={`q-${questions[currentQuestionIndex].id}`}
                                        style={styles.radio}
                                        checked={answers[questions[currentQuestionIndex].id] === idx}
                                        onChange={() => handleAnswer(idx)}
                                    />
                                    <span><MathText>{option}</MathText></span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div style={styles.footer}>
                        <div style={styles.btnGroup}>
                            <button style={styles.btn} onClick={handleMarkForReview}>
                                {isMobile ? 'Mark Review' : 'Mark for review & Next'}
                            </button>
                            <button style={styles.btn} onClick={clearResponse}>
                                Clear
                            </button>
                        </div>

                        <div style={styles.btnGroup}>
                            <button style={styles.btn} onClick={() => {
                                const prevIndex = Math.max(0, currentQuestionIndex - 1);
                                setCurrentQuestionIndex(prevIndex);
                                setVisited(prev => new Set(prev).add(prevIndex));
                            }} disabled={currentQuestionIndex === 0}>
                                Previous
                            </button>
                            <button style={styles.btnPrimary} onClick={() => handleNext(true)}>
                                Save & Next
                            </button>
                        </div>
                    </div>
                </main>

                {/* Right: Sidebar */}
                <aside style={styles.sidebar}>
                    {/* Profile */}
                    <div style={styles.profile}>
                        <img
                            src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || user?.email || 'Student')}&background=random`}
                            alt="Profile"
                            style={styles.profileImg}
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || user?.email || 'Student')}&background=random`; }}
                        />
                        <div style={styles.profileName}>{user?.user_metadata?.full_name || user?.email || "Student"}</div>
                        {isMobile && (
                            <button onClick={() => setShowSidebar(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        )}
                    </div>

                    {/* Legend */}
                    <div style={styles.legend}>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendBox, backgroundColor: '#4caf50' }}>0</span>
                            <span>Answered</span>
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendBox, backgroundColor: '#f44336' }}>1</span>
                            <span>Not Answered</span>
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendBox, backgroundColor: '#f5f5f5', color: 'black', border: '1px solid #ccc' }}>19</span>
                            <span>Not Visited</span>
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendCircle, backgroundColor: '#7b1fa2' }}>0</span>
                            <span>Marked for Review</span>
                        </div>
                        <div style={{ ...styles.legendItem, gridColumn: 'span 2' }}>
                            <span style={{ ...styles.legendCircle, backgroundColor: '#7b1fa2', position: 'relative' }}>
                                0
                                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#4caf50', borderRadius: '50%', border: '1px solid white' }}></div>
                            </span>
                            <span>Answered & Marked for Review (will be considered for evaluation)</span>
                        </div>
                    </div>

                    {/* Question Palette Header */}
                    <div style={styles.paletteHeader}>
                        <span>Choose a question</span>
                    </div>

                    {/* Palette Grid */}
                    <div style={styles.palette}>
                        <div style={styles.paletteGrid}>
                            {questions.map((q, idx) => {
                                const status = getQuestionStatus(q.id, idx);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setCurrentQuestionIndex(idx);
                                            setVisited(prev => new Set(prev).add(idx));
                                            if (isMobile) setShowSidebar(false);
                                        }}
                                        style={getStatusStyle(status)}
                                    >
                                        {idx + 1}
                                        {status === 'answered-marked' && (
                                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#4caf50', borderRadius: '50%', border: '1px solid white' }}></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit Button Area */}
                    <div style={styles.submitArea}>
                        <button style={styles.submitBtn} onClick={() => setShowSubmitModal(true)}>
                            Submit Exam
                        </button>
                    </div>
                </aside>
            </div>

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontFamily: 'Arial, sans-serif'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>Submit Exam?</h3>

                        <div style={{ marginBottom: '20px', fontSize: '14px', color: '#555' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Answered:</span> <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{stats.answered}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Not Answered:</span> <span style={{ fontWeight: 'bold', color: '#f44336' }}>{stats.notAnswered}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Marked for Review:</span> <span style={{ fontWeight: 'bold', color: '#7b1fa2' }}>{stats.marked}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Not Visited:</span> <span style={{ fontWeight: 'bold', color: '#757575' }}>{stats.notVisited}</span>
                            </div>
                        </div>

                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
                            Are you sure you want to submit? You cannot change your answers after submission.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#0288d1', color: 'white', cursor: 'pointer', fontWeight: 'bold', opacity: submitting ? 0.7 : 1 }}
                            >
                                {submitting ? 'Submitting...' : 'Yes, Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
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
            )}
        </div>
    );
};

export default TakeExam;
