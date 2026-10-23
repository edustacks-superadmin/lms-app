
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, useWindowDimensions, Modal, BackHandler, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import MathWebView from '../../../components/MathWebView';
import SubmissionModal from '../../../components/SubmissionModal';
import ConfirmationModal from '../../../components/ConfirmationModal';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

// Helper: Shuffle Array
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Helper: Format Seconds to MM:SS
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
};

// Helper: Option Card Component with Animation and Haptics
const OptionCard = React.memo(({ item, index, isSelectedOption, handleOptionSelect, quizMode }) => {
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { translateX: translateX.value }]
        };
    });

    // Trigger animation on selection
    useEffect(() => {
        // Only run animation if THIS option is selected
        if (quizMode && isSelectedOption === index) {
            const isCorrectOption = index === item.correctAnswerIndex;
            if (isCorrectOption) {
                scale.value = withSequence(withSpring(1.05), withSpring(1));
            } else {
                translateX.value = withSequence(
                    withTiming(-10, { duration: 50 }),
                    withTiming(10, { duration: 50 }),
                    withTiming(0, { duration: 50 })
                );
            }
        }
    }, [isSelectedOption, quizMode]); // Removed item from dependency to reduce checks

    const isSelected = isSelectedOption === index;
    let borderColor = 'border-gray-200';
    let bgColor = 'bg-white';
    let indicatorColor = 'border-gray-300';
    let indicatorBg = 'transparent';

    // Logic for styling
    if (quizMode && isSelectedOption !== undefined) {
        const isCorrectOption = index === item.correctAnswerIndex;
        // Only mark wrong if THIS option was selected and is wrong
        const isSelectedWrong = isSelected && !isCorrectOption;

        // Visual optimization: only calculate complex styles if needed
        if (isCorrectOption) {
            borderColor = 'border-green-500';
            bgColor = 'bg-green-50';
            indicatorColor = 'border-green-500';
            indicatorBg = 'bg-green-500';
        } else if (isSelectedWrong) {
            borderColor = 'border-red-500';
            bgColor = 'bg-red-50';
            indicatorColor = 'border-red-500';
            indicatorBg = 'bg-red-500';
        }
    } else {
        // Standard Exam Mode
        if (isSelected) {
            borderColor = 'border-blue-500';
            bgColor = 'bg-blue-50/50';
            indicatorColor = 'border-blue-500';
            indicatorBg = 'bg-blue-500';
        }
    }

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleOptionSelect(item.id, index, item.correctAnswerIndex)}
                className={`flex-row items-center p-4 rounded-xl border-2 ${borderColor} ${bgColor}`}
            >
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${indicatorColor}`}>
                    {(isSelected || (quizMode && isSelectedOption !== undefined && index === item.correctAnswerIndex)) && (
                        <View className={`w-3 h-3 rounded-full ${indicatorBg}`} />
                    )}
                </View>
                <View className="flex-1">
                    <View pointerEvents="none">
                        {/* Static Text fallback if WebView is too heavy? No, stick to WebView for Latex */}
                        <MathWebView
                            content={item.options[index] || ''}
                            style={{ minHeight: 40 }}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
        prevProps.isSelectedOption === nextProps.isSelectedOption &&
        prevProps.quizMode === nextProps.quizMode &&
        prevProps.index === nextProps.index &&
        prevProps.item.id === nextProps.item.id
    );
});



export default function NativeExamScreen() {
    const { id, courseId, quizMode: quizModeParam } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();

    // Data State
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [user, setUser] = useState(null);
    const [memberData, setMemberData] = useState(null);

    // Exam State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
    const [marked, setMarked] = useState(new Set()); // Set of question INDICES
    const [timeLeft, setTimeLeft] = useState(0);
    const [showPalette, setShowPalette] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [quizMode, setQuizMode] = useState(quizModeParam === 'true'); // Initialize from param
    const [showModeSelect, setShowModeSelect] = useState(false);

    // Result Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [examStartTime, setExamStartTime] = useState(null); // Track when exam actually started

    // Confirmation Modal State
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning'
    });

    // Prevent Back Button - Ask to Pause
    useEffect(() => {
        const backAction = () => {
            Alert.alert(
                "Are you sure?",
                "Want to Pause the exam & resume later before the end date.",
                [
                    {
                        text: "CANCEL",
                        onPress: () => null,
                        style: "cancel"
                    },
                    {
                        text: "YES, PAUSE!",
                        onPress: async () => {
                            // Save session before exiting
                            setIsPaused(true);
                            await saveSession();
                            router.back();
                        }
                    }
                ]
            );
            return true;
        };

        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        checkExistingSession();
    }, [id]);

    // Timer Logic with Pause Support
    useEffect(() => {
        if (!exam || timeLeft <= 0 || isPaused) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true); // Auto submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [exam, timeLeft, isPaused]);

    // ===== SESSION PERSISTENCE FUNCTIONS =====

    const checkExistingSession = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
                fetchExamData();
                return;
            }
            setUser(currentUser);

            // Get member_id
            const { data: member } = await supabase
                .from('members')
                .select('id')
                .eq('auth_user_id', currentUser.id)
                .maybeSingle();

            if (!member) {
                fetchExamData();
                return;
            }
            setMemberData(member);

            // Check for existing session
            const { data: session, error } = await supabase
                .from('exam_sessions')
                .select('*')
                .eq('exam_id', id)
                .eq('member_id', member.id)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (error) {
                console.error('Session check error:', error);
                fetchExamData();
                return;
            }

            if (session) {
                // Show resume dialog
                const answeredCount = Object.keys(session.answers || {}).length;
                const startedDate = new Date(session.started_at).toLocaleString();

                Alert.alert(
                    '📝 Resume Exam?',
                    `You have an exam in progress.\n\n` +
                    `Started: ${startedDate}\n` +
                    `Answered: ${answeredCount} questions\n` +
                    `Time Left: ${formatTime(session.time_left)}`,
                    [
                        {
                            text: 'Start Fresh',
                            onPress: async () => {
                                await deleteSession(member.id);
                                const shouldSkip = quizModeParam !== undefined;
                                fetchExamData(shouldSkip);
                            },
                            style: 'destructive'
                        },
                        {
                            text: 'Resume',
                            onPress: () => restoreSession(session)
                        }
                    ],
                    { cancelable: false }
                );
            } else {
                const shouldSkip = quizModeParam !== undefined;
                fetchExamData(shouldSkip);
            }
        } catch (error) {
            console.error('Error checking session:', error);
            const shouldSkip = quizModeParam !== undefined;
            fetchExamData(shouldSkip);
        }
    };

    const saveSession = async () => {
        if (!exam || !memberData || submitting || loading) return;

        try {
            const sessionData = {
                exam_id: parseInt(id),
                member_id: memberData.id,
                answers: answers,
                marked_questions: Array.from(marked),
                current_question_index: currentIndex,
                time_left: timeLeft,
                is_paused: isPaused,
                is_quiz_mode: quizMode,
                last_saved_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('exam_sessions')
                .upsert(sessionData, {
                    onConflict: 'exam_id,member_id'
                });

            if (error) throw error;
            console.log('✅ Session saved');
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    const restoreSession = async (session) => {
        try {
            // Restore state
            setAnswers(session.answers || {});
            setMarked(new Set(session.marked_questions || []));
            setCurrentIndex(session.current_question_index || 0);
            setTimeLeft(session.time_left);
            setIsPaused(session.is_paused);
            setQuizMode(session.is_quiz_mode || false);

            // Preserve original start time from session
            if (session.started_at) {
                setExamStartTime(session.started_at);
            }

            // Fetch exam data
            await fetchExamData(true);

            console.log('✅ Session restored');
        } catch (error) {
            console.error('Error restoring session:', error);
            Alert.alert('Error', 'Failed to restore session. Starting fresh.');
            fetchExamData();
        }
    };

    const deleteSession = async (memberId) => {
        try {
            const { error } = await supabase
                .from('exam_sessions')
                .delete()
                .eq('exam_id', id)
                .eq('member_id', memberId);

            if (error) throw error;
            console.log('🗑️ Session deleted');
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    // Auto-save on state changes (debounced)
    const saveTimeoutRef = useRef(null);
    useEffect(() => {
        if (exam && memberData && !loading) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveSession();
            }, 2000); // Save 2 seconds after last change
        }
    }, [answers, marked, currentIndex]);

    // Periodic save while exam is running
    useEffect(() => {
        if (!isPaused && exam && memberData && !loading) {
            const saveInterval = setInterval(() => {
                saveSession();
            }, 15000); // Every 15 seconds

            return () => clearInterval(saveInterval);
        }
    }, [isPaused, exam, memberData, loading, timeLeft]);

    // Save on pause
    useEffect(() => {
        if (isPaused && exam && memberData) {
            saveSession();
        }
    }, [isPaused]);

    // ===== END SESSION FUNCTIONS =====

    const fetchExamData = async (skipModeSelect = false) => {
        try {
            // 1. Get User
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("User not found");
            setUser(currentUser);

            // 2. Fetch Exam Details
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*, enable_instant_feedback, allow_mode_toggle')
                .eq('id', id)
                .single();

            if (examError) throw examError;
            setExam(examData);
            setTimeLeft(examData.duration_minutes * 60);

            // 2.5 Check Attempt Limit
            // Get student's member_id first
            let { data: memberData } = await supabase
                .from('members')
                .select('id')
                .eq('auth_user_id', currentUser.id)
                .single();

            if (!memberData) {
                // Fallback by email
                const { data: emailMember } = await supabase
                    .from('members')
                    .select('id')
                    .eq('email', currentUser.email)
                    .single();
                memberData = emailMember;
            }

            if (memberData) {
                // Count previous attempts
                const { count: previousAttempts, error: countError } = await supabase
                    .from('exam_attempts')
                    .select('*', { count: 'exact', head: true })
                    .eq('exam_id', id)
                    .eq('member_id', memberData.id)
                    .not('submitted_at', 'is', null);

                if (!countError && examData.max_attempts > 0) {
                    // Check if limit reached
                    if (previousAttempts >= examData.max_attempts) {
                        const attemptWord = examData.max_attempts === 1 ? 'attempt' : 'attempts';
                        Alert.alert(
                            '🚫 All Attempts Used',
                            `You've completed all ${examData.max_attempts} ${attemptWord} for this exam.\n\n📊 Would you like to view your previous results instead?`,
                            [
                                { text: 'View Results', onPress: () => router.push(`/exam/${id}/review`) },
                                { text: 'Go Back', onPress: () => router.back(), style: 'cancel' }
                            ],
                            { cancelable: false }
                        );
                        return;
                    }
                }
            }


            // 3. Fetch Questions (Application-side Join)
            // A. Get links
            const { data: qLinks, error: linkError } = await supabase
                .from('exam_questions')
                .select('*')
                .eq('exam_id', id)
                .order('id', { ascending: true });

            if (linkError) throw linkError;

            if (!qLinks || qLinks.length === 0) {
                setQuestions([]);
                setLoading(false);
                return;
            }

            // B. Get actual questions
            const questionIds = qLinks.map(link => link.question_id);
            const { data: questionsData, error: qError } = await supabase
                .from('questions')
                .select('id, question_text, question_type, explanation')
                .in('id', questionIds);

            if (qError) throw qError;

            // C. Fetch Options separately (to avoid relationship errors)
            const { data: optionsData, error: optError } = await supabase
                .from('question_options')
                .select('id, question_id, option_text, option_label, is_correct')
                .in('question_id', questionIds);

            if (optError) throw optError;

            // D. Map options to questions
            const optionsMap = {}; // question_id -> [options]
            (optionsData || []).forEach(opt => {
                if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
                optionsMap[opt.question_id].push(opt);
            });

            // E. Map questions back to order and attach options
            const questionMap = new Map((questionsData || []).map(q => {
                q.options = optionsMap[q.id] || [];
                return [q.id, q];
            }));

            // 5. Format & Randomize
            let formattedQuestions = (qLinks || []).map(link => {
                const q = questionMap.get(link.question_id);
                if (!q) return null;

                const sortedOptions = (q.options || []).sort((a, b) =>
                    (a.option_label || '').localeCompare(b.option_label || '')
                );

                return {
                    id: q.id,
                    question: q.question_text,
                    options: sortedOptions.map(opt => opt.option_text),
                    marks: link.marks || 1,
                    marks: link.marks || 1,
                    correctAnswerIndex: sortedOptions.findIndex(opt => opt.is_correct),
                    section_id: link.section_id,
                    is_mandatory: link.is_mandatory !== false,
                    explanation: q.explanation // Add explanation
                };
            }).filter(q => q !== null);

            // Randomize
            if (examData.randomize_questions) {
                if (examData.sections && examData.sections.length > 0) {
                    const grouped = {};
                    formattedQuestions.forEach(q => {
                        const secId = q.section_id || 'default';
                        if (!grouped[secId]) grouped[secId] = [];
                        grouped[secId].push(q);
                    });
                    formattedQuestions = [];
                    examData.sections.forEach(sec => {
                        if (grouped[sec.id]) formattedQuestions.push(...shuffleArray(grouped[sec.id]));
                    });
                    if (grouped['default']) formattedQuestions.push(...shuffleArray(grouped['default']));
                } else {
                    formattedQuestions = shuffleArray(formattedQuestions);
                }
            }

            setQuestions(formattedQuestions);

            // Determine Mode
            if (!skipModeSelect) {
                if (examData.allow_mode_toggle) {
                    setShowModeSelect(true);
                } else {
                    setQuizMode(examData.enable_instant_feedback);
                }
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load exam: " + error.message);
            router.back();
        } finally {
            setLoading(false);
            // Set exam start time when exam is first loaded
            if (!examStartTime) {
                setExamStartTime(new Date().toISOString());
            }
        }
    };

    const finalizeSubmit = async (isAuto = false) => {
        if (submitting) return;
        setSubmitting(true);
        setShowSuccessModal(false); // Ensure success modal is closed initially

        try {
            // 1. Get Member ID
            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                // Fallback by email
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) throw new Error("Student profile not found.");

            // 2. Calculate Score
            let score = 0;
            const answerRecords = questions.map(q => {
                const selectedIdx = answers[q.id];
                const isCorrect = selectedIdx !== undefined && selectedIdx === q.correctAnswerIndex;
                if (isCorrect) score += q.marks;
                else if (selectedIdx !== undefined && exam.negative_marking_enabled) {
                    score -= exam.negative_marks_per_question;
                }
                return {
                    question_id: q.id,
                    selected_option_index: selectedIdx,
                    is_correct: isCorrect
                };
            });
            score = Math.max(0, Math.round(score * 100) / 100);

            // 2.5. Count previous attempts to get correct attempt_number
            const { count: previousAttempts } = await supabase
                .from('exam_attempts')
                .select('*', { count: 'exact', head: true })
                .eq('exam_id', id)
                .eq('member_id', memberData.id)
                .not('submitted_at', 'is', null);

            const currentAttemptNumber = (previousAttempts || 0) + 1;

            // 3. Create Attempt
            const { data: attempt, error: attemptError } = await supabase
                .from('exam_attempts')
                .insert([{
                    exam_id: id,
                    member_id: memberData.id,
                    attempt_number: currentAttemptNumber,
                    score: score,
                    total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
                    status: 'completed',
                    started_at: examStartTime || new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                    answers: answers,
                    is_auto_submitted: isAuto,
                    is_quiz_mode: quizMode
                }])
                .select()
                .single();

            if (attemptError) throw attemptError;

            // 4. Insert Detailed Answers
            const answersToInsert = answerRecords.map(a => ({
                attempt_id: attempt.id,
                question_id: a.question_id,
                selected_option_index: a.selected_option_index !== undefined ? a.selected_option_index : null,
                is_correct: a.is_correct
            }));
            const { error: answersError } = await supabase.from('exam_answers').insert(answersToInsert);

            if (answersError) {
                console.error("Detailed Answers Insertion Failed:", answersError);
                // Don't throw here, attempt is already created. Just log.
            }

            // 5. Update Progress (if part of a course)
            if (courseId) {
                await supabase.from('content_progress').upsert({
                    member_id: memberData.id,
                    course_id: courseId,
                    content_id: id,
                    content_type: 'exam',
                    completed: true,
                    completion_percentage: Math.round((score / exam.total_marks) * 100) || 0,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'member_id,content_id,content_type' });
            }

            // DELETE SESSION after successful submission
            if (memberData) {
                await deleteSession(memberData.id);
            }

            // Show Custom Success Modal
            setFinalScore(score);
            setShowSuccessModal(true);

        } catch (error) {
            console.error(error);
            Alert.alert("Submission Failed", error.message);
            setSubmitting(false); // Only reset if failed
        }
    };

    const handleSubmit = async (isAuto = false) => {
        if (submitting) return;

        if (isAuto) {
            finalizeSubmit(true);
            return;
        }

        const unAnswered = questions.length - Object.keys(answers).length;

        // Show Confirmation Modal
        setConfirmConfig({
            title: "Submit Exam",
            message: `You have ${unAnswered} unanswered questions. Are you ready to submit?`,
            onConfirm: () => {
                setConfirmVisible(false);
                finalizeSubmit(false);
            },
            type: 'warning'
        });
        setConfirmVisible(true);
    };

    const flatListRef = useRef(null);

    // Sync Current Index on Scroll
    const onScrollEnd = (e) => {
        const contentOffsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    // Manual Navigation
    const scrollToQuestion = (index, animated = true) => {
        if (index < 0 || index >= questions.length) return;
        setCurrentIndex(index);
        try {
            flatListRef.current?.scrollToIndex({ index, animated });
        } catch (e) {
            flatListRef.current?.scrollToOffset({
                offset: index * width,
                animated
            });
        }
    };

    // Safe Haptics Helper - now defined outside render loop
    const triggerHaptics = async (type) => {
        try {
            if (type === 'success') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (type === 'error') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } else if (type === 'selection') {
                await Haptics.selectionAsync();
            }
        } catch (error) {
            // Haptics not supported on some devices/emulators, safe to ignore
        }
    };

    const handleOptionSelect = React.useCallback((questionId, optionIndex, correctAnswerIndex) => {
        setAnswers(prev => {
            // If Instant Feedback is enabled, prevent changing answer after selection
            if (quizMode && prev[questionId] !== undefined) {
                return prev;
            }

            // Haptic Logic
            if (quizMode) {
                const isCorrect = optionIndex === correctAnswerIndex;
                if (isCorrect) {
                    // Correct: Success Haptics
                    triggerHaptics('success');
                } else {
                    // Incorrect: Error Haptics
                    triggerHaptics('error');
                }
            } else {
                // Standard Mode: Selection Haptic
                triggerHaptics('selection');
            }

            return { ...prev, [questionId]: optionIndex };
        });
    }, [quizMode]);

    const toggleMarkReview = () => {
        setMarked(prev => {
            const next = new Set(prev);
            if (next.has(currentIndex)) next.delete(currentIndex);
            else next.add(currentIndex);
            return next;
        });
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }





    const renderQuestionItem = ({ item, index }) => {
        const isSelectedOption = answers[item.id];

        // Pass handleOptionSelect directly (it's now stable)
        // We need to wrap it to pass the correct answer index which is available here
        // Wait, NO. OptionCard maps internal options.
        // We pass the MAIN handleOptionSelect to OptionCard, and OptionCard calls it with args.

        return (
            <ScrollView
                className="flex-1 px-4 py-4"
                contentContainerStyle={{ paddingBottom: 150 }} // Add extra padding for Bottom Bar
                style={{ width: width }}
            >
                {/* Question metadata */}
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-xs font-bold">Question {index + 1} of {questions.length}</Text>
                    <Text className="text-green-600 text-xs font-bold">+{item.marks} Marks</Text>
                </View>

                {/* Question Card */}
                <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
                    <MathWebView
                        content={item.question}
                        style={{ minHeight: 100 }}
                    />
                </View>

                {/* Options */}
                <View className="space-y-3">
                    {item.options.map((opt, idx) => (
                        <OptionCard
                            key={idx}
                            item={item}
                            index={idx}
                            isSelectedOption={isSelectedOption}
                            handleOptionSelect={handleOptionSelect}
                            quizMode={quizMode}
                        />
                    ))}
                </View>

                {/* Explanation Box (Quiz Mode Only) */}
                {quizMode && isSelectedOption !== undefined && item.explanation && (
                    <View className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="information-circle" size={20} color="#2563EB" />
                            <Text className="text-blue-700 font-bold ml-2">Explanation</Text>
                        </View>
                        <MathWebView
                            content={item.explanation}
                            style={{ minHeight: 60, backgroundColor: 'transparent' }}
                        />
                    </View>
                )}
            </ScrollView>
        );
    };


    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <Stack.Screen options={{ headerShown: false }} />



            {/* Custom Header (Replaces Stack Header for better control/Palette) */}
            <View className="bg-slate-800 pt-12 pb-4 px-4 flex-row justify-between items-center shadow-md">
                <TouchableOpacity onPress={() => setShowPalette(true)} className="p-2">
                    <Ionicons name="grid-outline" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg" numberOfLines={1} style={{ maxWidth: '50%' }}>
                    {exam?.title}
                </Text>
                <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => setIsPaused(!isPaused)} className="p-1">
                        <Ionicons name={isPaused ? "play" : "pause"} size={22} color="white" />
                    </TouchableOpacity>
                    <View className="bg-slate-700 px-2 py-1 rounded border border-slate-600">
                        <Text className="text-white font-mono font-bold">{formatTime(timeLeft)}</Text>
                    </View>
                </View>
            </View>

            {/* Sub-Header: Submit */}
            <View className="flex-row justify-between items-center px-4 py-2 bg-blue-50 border-b border-blue-100">
                <Text className="text-blue-800 text-xs font-semibold">
                    Attempted: {Object.keys(answers).length} / {questions.length}
                </Text>
                <TouchableOpacity
                    onPress={() => handleSubmit(false)}
                    disabled={submitting}
                    className="bg-blue-600 px-4 py-1.5 rounded-full"
                >
                    {submitting ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text className="text-white font-bold text-xs">SUBMIT EXAM</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Pause Overlay */}
            {isPaused && (
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/95 z-50 items-center justify-center">
                    <View className="items-center px-8">
                        <Ionicons name="pause-circle" size={80} color="#94a3b8" />
                        <Text className="text-white text-2xl font-bold mt-6 mb-2">Exam Paused</Text>
                        <Text className="text-slate-400 text-center text-sm mb-8 leading-6">
                            Your timer is paused. Your answers have been saved.{"\n"}
                            Tap "Resume" when ready to continue.
                        </Text>
                        <TouchableOpacity
                            onPress={() => setIsPaused(false)}
                            className="bg-green-600 px-8 py-4 rounded-xl flex-row items-center gap-3"
                            style={{ shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                        >
                            <Ionicons name="play" size={20} color="white" />
                            <Text className="text-white font-bold text-lg">Resume Exam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Main Content: FlatList for Paging */}
            <FlatList
                ref={flatListRef}
                data={questions}
                renderItem={renderQuestionItem}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={7}
                onMomentumScrollEnd={onScrollEnd}
                getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
                removeClippedSubviews={false}
                onScrollToIndexFailed={(info) => {
                    const offset = info.index * width;
                    flatListRef.current?.scrollToOffset({ offset, animated: false });
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    }, 50);
                }}
            />

            {/* Bottom Bar: Navigation Palette */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-6 flex-row justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
                <TouchableOpacity
                    disabled={currentIndex === 0}
                    onPress={() => scrollToQuestion(currentIndex - 1)}
                    className={`flex-row items-center px-4 py-3 rounded-xl border ${currentIndex === 0 ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}
                >
                    <Ionicons name="arrow-back" size={20} color={currentIndex === 0 ? "#cbd5e1" : "#2563EB"} />
                    <Text className={`font-semibold ml-2 ${currentIndex === 0 ? 'text-gray-400' : 'text-blue-600'}`}>Prev</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={toggleMarkReview}
                    className="flex-row items-center justify-center mx-2"
                >
                    <View className={`px-4 py-3 rounded-xl border flex-row items-center gap-2 ${marked.has(currentIndex) ? 'bg-purple-100 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                        <Ionicons
                            name={marked.has(currentIndex) ? "bookmark" : "bookmark-outline"}
                            size={18}
                            color={marked.has(currentIndex) ? "#9333ea" : "#64748b"}
                        />
                        <Text className={`font-semibold text-sm ${marked.has(currentIndex) ? 'text-purple-700' : 'text-slate-500'}`}>
                            {marked.has(currentIndex) ? "Reviewing" : "Review"}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        if (currentIndex < questions.length - 1) {
                            scrollToQuestion(currentIndex + 1);
                        } else {
                            handleSubmit();
                        }
                    }}
                    className={`flex-row items-center px-4 py-3 rounded-xl ${currentIndex === questions.length - 1 ? 'bg-green-600 shadow-md shadow-green-300' : 'bg-blue-600 shadow-md shadow-blue-300'}`}
                >
                    <Text className="font-bold text-white mr-2">
                        {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
                    </Text>
                    <Ionicons
                        name={currentIndex === questions.length - 1 ? "checkmark-circle" : "arrow-forward"}
                        size={20}
                        color="white"
                    />
                </TouchableOpacity>
            </View>

            {/* Mode Selection Modal */}
            <Modal
                visible={showModeSelect}
                transparent={true}
                animationType="fade"
                onRequestClose={() => { }} // Force selection
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <Text className="text-xl font-bold text-slate-800 mb-2 text-center">Choose Exam Mode</Text>
                        <Text className="text-slate-500 text-center mb-6">
                            How would you like to take this exam?
                        </Text>

                        <TouchableOpacity
                            onPress={() => {
                                setQuizMode(false);
                                setShowModeSelect(false);
                            }}
                            className="bg-blue-600 p-4 rounded-xl mb-3 flex-row items-center"
                        >
                            <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-4">
                                <Ionicons name="document-text" size={20} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-lg">Exam Mode</Text>
                                <Text className="text-blue-100 text-xs">Standard format. Submit at the end to see results.</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setQuizMode(true);
                                setShowModeSelect(false);
                            }}
                            className="bg-purple-600 p-4 rounded-xl flex-row items-center"
                        >
                            <View className="w-10 h-10 rounded-full bg-purple-500 items-center justify-center mr-4">
                                <Ionicons name="flash" size={20} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-lg">Quiz Mode</Text>
                                <Text className="text-purple-100 text-xs">Immediate feedback. Answers are locked once selected.</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Question Palette Modal */}
            <Modal
                visible={showPalette}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPalette(false)}
            >
                <View className="flex-1 bg-white">
                    <View className="px-4 pb-4 pt-12 border-b border-gray-200 flex-row justify-between items-center bg-gray-50">
                        <Text className="font-bold text-lg text-slate-800">Question Palette</Text>
                        <TouchableOpacity onPress={() => setShowPalette(false)} className="p-2 bg-gray-200 rounded-full">
                            <Ionicons name="close" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Legend */}
                    <View className="flex-row flex-wrap gap-4 p-4 border-b border-gray-100">
                        <View className="flex-row items-center gap-2"><View className="w-3 h-3 rounded-full bg-green-500" /><Text className="text-xs">Answered</Text></View>
                        <View className="flex-row items-center gap-2"><View className="w-3 h-3 rounded-full bg-purple-500" /><Text className="text-xs">Review</Text></View>
                        <View className="flex-row items-center gap-2"><View className="w-3 h-3 rounded-full bg-gray-200" /><Text className="text-xs">Skipped</Text></View>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <View className="flex-row flex-wrap gap-3 justify-center">
                            {questions.map((_, idx) => {
                                const isAnswered = answers[questions[idx].id] !== undefined;
                                const isReview = marked.has(idx);
                                const isCurrent = currentIndex === idx;

                                let bgColor = 'bg-gray-100';
                                let textColor = 'text-gray-600';
                                let borderColor = 'border-transparent';

                                if (isReview) { bgColor = 'bg-purple-100'; textColor = 'text-purple-700'; borderColor = 'border-purple-300'; }
                                else if (isAnswered) { bgColor = 'bg-green-100'; textColor = 'text-green-700'; borderColor = 'border-green-300'; }

                                if (isCurrent) { borderColor = 'border-blue-600'; }

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => {
                                            setShowPalette(false);
                                            setTimeout(() => {
                                                scrollToQuestion(idx, false);
                                            }, 50);
                                        }}
                                        className={`w-12 h-12 rounded-xl items-center justify-center border-2 ${bgColor} ${borderColor} ${isCurrent ? 'border-blue-600' : 'border-transparent'}`}
                                    >
                                        <Text className={`font-bold ${textColor}`}>{idx + 1}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
            {/* Confirmation Modal */}
            <ConfirmationModal
                visible={confirmVisible}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmVisible(false)}
                type={confirmConfig.type}
            />
            {/* Success Modal */}
            <SubmissionModal
                visible={showSuccessModal}
                score={finalScore}
                totalMarks={questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                onReview={() => {
                    setShowSuccessModal(false);
                    router.replace({ pathname: `/exam/${id}/review`, params: { id: id } });
                }}
                onGoBack={() => {
                    setShowSuccessModal(false);
                    router.back();
                }}
            />
        </SafeAreaView>
    );
}
