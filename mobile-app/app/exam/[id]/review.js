
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, useWindowDimensions, Modal, BackHandler, FlatList, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import MathWebView from '../../../components/MathWebView';

const { width } = Dimensions.get('window');

export default function ExamReviewScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { width: contentWidth } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attempt, setAttempt] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // { questionId: { optionIndex, isCorrect } }

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const [showPalette, setShowPalette] = useState(false);

    const { attemptId } = useLocalSearchParams();

    // Reporting State
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportText, setReportText] = useState('');
    const [reportQuestionId, setReportQuestionId] = useState(null);

    const [submittingReport, setSubmittingReport] = useState(false);

    // Report Type State
    const [reportType, setReportType] = useState('Flag Content (Inappropriate/Irrelevant)');
    const [showReportTypeDropdown, setShowReportTypeDropdown] = useState(false);
    const reportOptions = [
        "Flag Content (Inappropriate/Irrelevant)",
        "Question Error (Wrong answer/Typo)",
        "General Feedback"
    ];

    useEffect(() => {
        if (id) {
            fetchReviewData();
        }
    }, [id, attemptId]);

    const fetchReviewData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            // 1. Fetch Member Data (Needed for everything)
            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = emailMember;
            }

            // 2. Fetch Exam Details
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .single();
            if (examError) throw examError;
            setExam(examData);

            // 3. Fetch Attempt
            let attemptData;

            if (attemptId) {
                // Fetch specific attempt
                const { data, error } = await supabase
                    .from('exam_attempts')
                    .select('*')
                    .eq('id', attemptId)
                    .single();

                if (error) throw error;
                attemptData = data;
            } else {
                // Fetch Latest Attempt (Default)
                if (memberData) {
                    const { data, error } = await supabase
                        .from('exam_attempts')
                        .select('*')
                        .eq('exam_id', id)
                        .eq('member_id', memberData.id)
                        .order('submitted_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (!error && data) {
                        attemptData = data;
                    }
                }
            }

            if (!attemptData) {
                console.warn("Review: No attempt data found for exam_id:", id, "member_id:", memberData?.id, "attemptId:", attemptId);
                throw new Error("No attempt found. Please take the exam first.");
            }

            setAttempt(attemptData);

            // 3. Fetch Detailed Answers
            const { data: answerData, error: ansError } = await supabase
                .from('exam_answers')
                .select('*')
                .eq('attempt_id', attemptData.id);

            if (ansError) throw ansError;

            // Map answers for easy lookup
            const answerMap = {};
            answerData.forEach(ans => {
                answerMap[ans.question_id] = {
                    selected_option_index: ans.selected_option_index, // Note: DB uses 0-index from our logic
                    is_correct: ans.is_correct
                };
            });
            setUserAnswers(answerMap);

            // 4. Fetch Questions (Same logic as take.js to get texts)
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
                .select('id, question_text, question_type, explanation, subject_id')
                .in('id', questionIds);

            if (qError) throw qError;

            // C. Fetch Options
            const { data: optionsData, error: optError } = await supabase
                .from('question_options')
                .select('id, question_id, option_text, option_label, is_correct')
                .in('question_id', questionIds);

            if (optError) throw optError;

            // D. Fetch Bookmarks
            const { data: bookmarkData } = await supabase
                .from('bookmarks')
                .select('question_id')
                .eq('member_id', memberData.id)
                .in('question_id', questionIds);

            if (bookmarkData) {
                setBookmarks(new Set(bookmarkData.map(b => b.question_id)));
            }

            // D. Map options
            const optionsMap = {};
            (optionsData || []).forEach(opt => {
                if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
                optionsMap[opt.question_id].push(opt);
            });

            // D.1 Fetch Subjects
            const subjectIds = [...new Set(questionsData.map(q => q.subject_id).filter(Boolean))];
            let subjectMap = {};
            if (subjectIds.length > 0) {
                const { data: subjectsData } = await supabase
                    .from('subjects')
                    .select('id, name, parent_id')
                    .in('id', subjectIds);

                if (subjectsData) {
                    // Get Parent Ids
                    const parentIds = [...new Set(subjectsData.map(s => s.parent_id).filter(Boolean))];
                    let parentMap = {};
                    if (parentIds.length > 0) {
                        const { data: parentsData } = await supabase.from('subjects').select('id, name').in('id', parentIds);
                        (parentsData || []).forEach(p => parentMap[p.id] = p.name);
                    }

                    subjectsData.forEach(s => {
                        subjectMap[s.id] = {
                            name: s.name,
                            parentName: s.parent_id ? parentMap[s.parent_id] : null
                        };
                    });
                }
            }

            // E. Build Question Objects
            const questionMap = new Map((questionsData || []).map(q => {
                q.options = optionsMap[q.id] || [];
                q.subjectInfo = q.subject_id ? subjectMap[q.subject_id] : null;
                return [q.id, q];
            }));

            // F. Reconstruct Order (using answers order if available, else standard)
            // Actually, review should probably follow the same order as the user took it.
            // But 'randomize' makes that hard unless we stored the order.
            // For now, we will use the default exam_questions order or shuffle if randomized.
            // *Correction*: Ideally we stored the Question Order in the attempt.
            // If we didn't store simple order, we'll just show them in default order.
            // Given the user wants to "review", default order is acceptable if we can't reproduce exact shuffle.

            let formattedQuestions = (qLinks || []).map(link => {
                const q = questionMap.get(link.question_id);
                if (!q) return null;

                const sortedOptions = (q.options || []).sort((a, b) =>
                    (a.option_label || '').localeCompare(b.option_label || '')
                );

                return {
                    id: q.id,
                    question: q.question_text,
                    options: sortedOptions.map(opt => ({
                        text: opt.option_text,
                        isCorrect: opt.is_correct
                    })),
                    marks: link.marks || 1,
                    correctAnswerIndex: sortedOptions.findIndex(opt => opt.is_correct),
                    explanation: q.explanation,
                    subjectInfo: q.subjectInfo
                };
            }).filter(q => q !== null);

            setQuestions(formattedQuestions);

        } catch (error) {
            console.error('Review Fetch Error FULL:', JSON.stringify(error, null, 2)); // Detailed Log
            console.error('Review Fetch Error Message:', error.message);
            Alert.alert("Error", `Failed to load review details: ${error.message || 'Unknown error'}`);
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const onScrollEnd = (e) => {
        const contentOffsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    const scrollToQuestion = (index) => {
        if (index < 0 || index >= questions.length) return;
        flatListRef.current?.scrollToIndex({ index, animated: true });
        setCurrentIndex(index);
    };

    const [bookmarks, setBookmarks] = useState(new Set());

    const toggleBookmark = async (questionId) => {
        // Optimistic Update
        setBookmarks(prev => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let { data: memberData } = await supabase.from('members').select('id, institute_id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id, institute_id').eq('email', user.email).single();
                memberData = emailMember;
            }

            if (!memberData) return;

            // Check if we were adding or removing based on the *previous* state used for optimistic update
            // Since we already flipped the state, we can check if the NEW state has it.
            // Wait, accessing state inside async might be stale, but 'bookmarks' is from closure? 
            // Better to rely on the fact that if we just added it, we want to insert.

            // Re-check intended action:
            // If it WAS in the set (before our optimistic flip), we removed it.
            // To do this robustly without relying on potentially stale `bookmarks` closure:
            // We can check the DB or just trust the UI state flow.

            // Simpler: Just check if the record exists and flip it? No, that's two calls.
            // Let's rely on the optimistic logic:

            // We need to know if we are INSERTING or DELETING.
            // We can check if the row exists in DB? No too slow.

            // Let's use the 'bookmarks' state from the closure *at the time of function call*.
            const isBookmarked = bookmarks.has(questionId);

            if (isBookmarked) {
                // If it WAS bookmarked, we are removing it.
                const { error } = await supabase
                    .from('bookmarks')
                    .delete()
                    .eq('member_id', memberData.id)
                    .eq('question_id', questionId);
                if (error) throw error;
            } else {
                // If it was NOT bookmarked, we are adding it.
                const { error } = await supabase
                    .from('bookmarks')
                    .insert({
                        member_id: memberData.id,
                        question_id: questionId,
                        institute_id: memberData.institute_id
                    });
                if (error) throw error;
            }

        } catch (error) {
            console.error("Bookmark Error", error);
            Alert.alert("Error", "Failed to save bookmark.");
            // Revert state
            setBookmarks(prev => {
                const next = new Set(prev);
                if (next.has(questionId)) next.delete(questionId);
                else next.add(questionId);
                return next;
            });
        }
    };

    const reportQuestion = (questionId) => {
        setReportQuestionId(questionId);
        setReportText('');
        setReportType(reportOptions[0]);
        setShowReportTypeDropdown(false);
        setReportModalVisible(true);
    };

    const submitReport = async () => {


        try {
            setSubmittingReport(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let { data: memberData } = await supabase.from('members').select('id, institute_id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id, institute_id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) throw new Error("Member not found");

            const { error } = await supabase.from('question_reports').insert({
                user_id: memberData.id,
                question_id: reportQuestionId,
                report_type: reportType,
                comment: reportText,
                status: 'pending',
                institute_id: memberData.institute_id
            });

            if (error) throw error;

            Alert.alert("Success", "Report submitted successfully. We will review it shortly.");
            setReportModalVisible(false);

        } catch (error) {
            console.error("Report Error:", error);
            Alert.alert("Error", "Failed to submit report.");
        } finally {
            setSubmittingReport(false);
        }
    };

    const renderQuestionItem = ({ item, index }) => {
        const userAnswer = userAnswers[item.id];
        const selectedIndex = userAnswer?.selected_option_index;
        const isCorrect = userAnswer?.is_correct;
        const isBookmarked = bookmarks.has(item.id);

        let statusColor = 'text-gray-500';
        let statusText = 'Not Attempted';
        if (selectedIndex !== undefined && selectedIndex !== null) {
            statusText = isCorrect ? 'Correct' : 'Incorrect';
            statusColor = isCorrect ? 'text-green-600' : 'text-red-600';
        }

        return (
            <ScrollView
                className="flex-1 px-4 py-4"
                contentContainerStyle={{ paddingBottom: 100 }}
                style={{ width: width }}
            >


                {/* Metadata & Actions */}
                <View className="flex-row justify-between items-center mb-2">
                    <View>
                        <Text className="text-gray-500 text-xs font-bold">Q {index + 1}</Text>
                        <Text className={`text-xs font-bold ${statusColor}`}>{statusText}</Text>
                    </View>

                    <View className="flex-row gap-4">
                        <TouchableOpacity onPress={() => reportQuestion(item.id)} className="flex-row items-center gap-1">
                            <Ionicons name="flag-outline" size={16} color="#ef4444" />
                            <Text className="text-xs text-red-500">Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => toggleBookmark(item.id)} className="flex-row items-center gap-1">
                            <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={16} color={isBookmarked ? "#2563EB" : "#64748b"} />
                            <Text className={`text-xs ${isBookmarked ? 'text-blue-600' : 'text-slate-500'}`}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Question */}
                <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
                    <MathWebView
                        content={item.question}
                        style={{ minHeight: 100 }}
                    />
                </View>

                {/* Options */}
                <View className="space-y-3">
                    {item.options.map((opt, idx) => {
                        // Determine Style
                        // 1. Is this the CORRECT answer?
                        const isTheCorrectAnswer = opt.isCorrect;
                        // 2. Did the user SELECT this?
                        const isSelectedByUser = selectedIndex === idx;

                        let borderClass = 'border-gray-200';
                        let bgClass = 'bg-white';
                        let icon = null;

                        if (isTheCorrectAnswer) {
                            borderClass = 'border-green-500';
                            bgClass = 'bg-green-50';
                            icon = <Ionicons name="checkmark-circle" size={20} color="#16a34a" />;
                        }

                        if (isSelectedByUser) {
                            if (isTheCorrectAnswer) {
                                // Correctly selected
                                borderClass = 'border-green-600';
                                bgClass = 'bg-green-100';
                            } else {
                                // Wrongly selected
                                borderClass = 'border-red-500';
                                bgClass = 'bg-red-50';
                                icon = <Ionicons name="close-circle" size={20} color="#dc2626" />;
                            }
                        }

                        return (
                            <View
                                key={idx}
                                className={`flex-row items-center p-4 rounded-xl border-2 ${borderClass} ${bgClass}`}
                            >
                                <View className="flex-1">
                                    <View pointerEvents="none">
                                        <MathWebView
                                            content={opt.text}
                                            style={{ minHeight: 40 }}
                                        />
                                    </View>
                                </View>
                                {icon && <View className="ml-2">{icon}</View>}
                            </View>
                        );
                    })}
                </View>

                {/* Explanation */}
                {item.explanation && (
                    <View className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Text className="font-bold text-blue-800 mb-2">Explanation:</Text>
                        <MathWebView content={item.explanation} />
                    </View>
                )}
                {/* Subject Info */}
                {item.subjectInfo && (
                    <View className="mt-4 pt-4 border-t border-gray-200">
                        <Text className="text-gray-500 text-xs font-medium">Subject:</Text>
                        <Text className="text-slate-700 text-sm font-medium mt-1">
                            {item.subjectInfo.parentName ? `${item.subjectInfo.parentName} > ` : ''}
                            <Text className="text-blue-600">{item.subjectInfo.name}</Text>
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-4 flex-row justify-between items-center shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View>
                    <Text className="font-bold text-lg text-center" numberOfLines={1} style={{ maxWidth: 200 }}>Review Result</Text>
                    {attempt && (
                        <Text className="text-xs text-center text-gray-500">
                            Score: {attempt.score} / {attempt.total_marks}
                        </Text>
                    )}
                </View>
                <TouchableOpacity onPress={() => setShowPalette(true)} className="p-2">
                    <Ionicons name="grid-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                ref={flatListRef}
                data={questions}
                renderItem={renderQuestionItem}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                onMomentumScrollEnd={onScrollEnd}
                getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
            />

            {/* Footer Navigation */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4 flex-row justify-between items-center shadow-lg">
                <TouchableOpacity
                    disabled={currentIndex === 0}
                    onPress={() => scrollToQuestion(currentIndex - 1)}
                    className={`w-12 h-12 items-center justify-center rounded-full border ${currentIndex === 0 ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}
                >
                    <Ionicons name="arrow-back" size={24} color={currentIndex === 0 ? "#cbd5e1" : "#2563EB"} />
                </TouchableOpacity>

                <Text className="font-semibold text-gray-600">
                    {currentIndex + 1} / {questions.length}
                </Text>

                <TouchableOpacity
                    disabled={currentIndex === questions.length - 1}
                    onPress={() => scrollToQuestion(currentIndex + 1)}
                    className={`w-12 h-12 items-center justify-center rounded-full ${currentIndex === questions.length - 1 ? 'bg-gray-100' : 'bg-blue-600 shadow-md shadow-blue-300'}`}
                >
                    <Ionicons name="arrow-forward" size={24} color={currentIndex === questions.length - 1 ? "#cbd5e1" : "white"} />
                </TouchableOpacity>
            </View>

            {/* Palette */}
            <Modal
                visible={showPalette}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPalette(false)}
            >
                <View className="flex-1 bg-white">
                    <View className="px-4 pb-4 pt-12 border-b border-gray-200 flex-row justify-between items-center bg-gray-50">
                        <Text className="font-bold text-lg text-slate-800">Review Key</Text>
                        <TouchableOpacity onPress={() => setShowPalette(false)} className="p-2 bg-gray-200 rounded-full">
                            <Ionicons name="close" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row gap-4 p-4 border-b border-gray-100 justify-center">
                        <View className="flex-row items-center gap-2"><View className="w-3 h-3 rounded-full bg-green-500" /><Text className="text-xs">Correct</Text></View>
                        <View className="flex-row items-center gap-2"><View className="w-3 h-3 rounded-full bg-red-500" /><Text className="text-xs">Incorrect</Text></View>
                        <View className="flex-row items-center gap-2"><View className="w-3 h-3 rounded-full bg-gray-300" /><Text className="text-xs">Unattempted</Text></View>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <View className="flex-row flex-wrap gap-3 justify-center">
                            {questions.map((q, idx) => {
                                const ans = userAnswers[q.id];
                                const isAttempted = ans?.selected_option_index !== undefined && ans?.selected_option_index !== null;
                                const isCorrect = ans?.is_correct;
                                const isCurrent = currentIndex === idx;

                                let bgColor = 'bg-gray-100';
                                let textColor = 'text-gray-600';

                                if (isAttempted) {
                                    if (isCorrect) {
                                        bgColor = 'bg-green-100'; textColor = 'text-green-700';
                                    } else {
                                        bgColor = 'bg-red-100'; textColor = 'text-red-700';
                                    }
                                }

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => {
                                            scrollToQuestion(idx);
                                            setShowPalette(false);
                                        }}
                                        className={`w-12 h-12 rounded-xl items-center justify-center border-2 ${isCurrent ? 'border-blue-600' : 'border-transparent'} ${bgColor}`}
                                    >
                                        <Text className={`font-bold ${textColor}`}>{idx + 1}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
            {/* Report Modal */}
            <Modal
                visible={reportModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 px-4">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-bold text-slate-800">Report Issue</Text>
                            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* Issue Type Selector */}
                        <Text className="text-sm font-bold text-slate-800 mb-2">Issue Type</Text>
                        <View className="relative z-10 mb-4">
                            <TouchableOpacity
                                onPress={() => setShowReportTypeDropdown(!showReportTypeDropdown)}
                                className="flex-row justify-between items-center border border-gray-300 rounded-lg p-3 bg-white"
                            >
                                <Text className="text-slate-700 text-sm" numberOfLines={1}>{reportType}</Text>
                                <Ionicons name={showReportTypeDropdown ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                            </TouchableOpacity>

                            {showReportTypeDropdown && (
                                <View className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg overflow-hidden">
                                    {reportOptions.map((option, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => {
                                                setReportType(option);
                                                setShowReportTypeDropdown(false);
                                            }}
                                            className={`p-3 border-b border-gray-100 ${option === reportType ? 'bg-blue-50' : 'bg-white'}`}
                                        >
                                            <Text className={`text-sm ${option === reportType ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <Text className="text-sm font-bold text-slate-800 mb-2">Details</Text>
                        <TextInput
                            className="bg-white border border-gray-300 rounded-lg p-3 h-24 text-start mb-6"
                            multiline
                            textAlignVertical="top"
                            placeholder="Describe the issue..."
                            value={reportText}
                            onChangeText={setReportText}
                        />

                        <View className="flex-row justify-end gap-3">
                            <TouchableOpacity
                                disabled={submittingReport}
                                onPress={() => setReportModalVisible(false)}
                                className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white"
                            >
                                <Text className="text-slate-700 font-medium">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={submittingReport}
                                onPress={submitReport}
                                className="px-5 py-2.5 rounded-lg bg-red-500"
                            >
                                {submittingReport ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold">Submit Report</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
