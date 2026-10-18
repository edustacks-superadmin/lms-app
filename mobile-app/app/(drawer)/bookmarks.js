import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, SafeAreaView, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import MathWebView from '../../components/MathWebView';

const { width } = Dimensions.get('window');

export default function BookmarksScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);

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
        fetchBookmarks();
    }, []);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            // 1. Get Member ID
            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) throw new Error("Member not found");

            // 2. Fetch Bookmarks
            const { data: bookmarkData, error: bmError } = await supabase
                .from('bookmarks')
                .select('question_id')
                .eq('member_id', memberData.id)
                .order('created_at', { ascending: false }); // Latest first

            if (bmError) throw bmError;

            if (!bookmarkData || bookmarkData.length === 0) {
                setQuestions([]);
                setLoading(false);
                return;
            }

            const questionIds = bookmarkData.map(b => b.question_id);

            // 3. Fetch Questions
            const { data: questionsData, error: qError } = await supabase
                .from('questions')
                .select('id, question_text, explanation, subject_id')
                .in('id', questionIds);

            if (qError) throw qError;

            // 4. Fetch Options
            const { data: optionsData, error: optError } = await supabase
                .from('question_options')
                .select('id, question_id, option_text, is_correct, option_label')
                .in('question_id', questionIds);

            if (optError) throw optError;

            // 5. Map Options to Questions
            const optionsMap = {};
            optionsData.forEach(opt => {
                if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
                optionsMap[opt.question_id].push(opt);
            });

            // 5.1 Fetch Subjects
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

            const formattedQuestions = questionsData.map(q => {
                const opts = optionsMap[q.id] || [];
                // Sort options typically by label or id if label missing
                opts.sort((a, b) => (a.option_label || '').localeCompare(b.option_label || ''));

                return {
                    ...q,
                    options: opts,
                    subjectInfo: q.subject_id ? subjectMap[q.subject_id] : null
                };
            });

            // Maintain bookmark order (latest first)
            const orderedQuestions = questionIds.map(id => formattedQuestions.find(q => q.id === id)).filter(Boolean);

            setQuestions(orderedQuestions);

        } catch (error) {
            console.error("Error fetching bookmarks:", error);
            // alert("Failed to load bookmarks");
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (questionId) => {
        try {
            // Optimistic update
            setQuestions(prev => prev.filter(q => q.id !== questionId));

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch member id again
            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) return;

            const { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('member_id', memberData.id)
                .eq('question_id', questionId);

            if (error) throw error;

        } catch (error) {
            console.error("Error removing bookmark:", error);
            alert("Failed to remove bookmark");
            // Optionally reload to restore state
            fetchBookmarks();
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

    const renderItem = ({ item, index }) => {
        return (
            <View className="bg-white p-4 mb-4 rounded-xl shadow-sm border border-gray-100 mx-4 mt-2">
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-xs font-bold text-gray-400">Question {index + 1}</Text>
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => reportQuestion(item.id)} className="p-2">
                            <Ionicons name="flag-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeBookmark(item.id)} className="p-2 -mr-2">
                            <Ionicons name="bookmark" size={20} color="#2563EB" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Question Text */}
                <View className="mb-4">
                    <MathWebView content={item.question_text} />
                </View>

                {/* Options */}
                <View className="space-y-2">
                    {item.options.map((opt, idx) => (
                        <View key={idx} className={`flex-row p-3 rounded-lg border ${opt.is_correct ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                            <View className="flex-1">
                                <View pointerEvents="none">
                                    <MathWebView content={opt.option_text} style={{ minHeight: 20 }} />
                                </View>
                            </View>
                            {opt.is_correct && (
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ marginLeft: 8 }} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Explanation */}
                {item.explanation && (
                    <View className="mt-4 pt-4 border-t border-gray-100">
                        <Text className="text-xs font-bold text-blue-600 mb-2">Explanation</Text>
                        <MathWebView content={item.explanation} />
                    </View>
                )}

                {/* Subject Info */}
                {item.subjectInfo && (
                    <View className="mt-4 pt-4 border-t border-gray-100">
                        <Text className="text-gray-400 text-xs font-medium">Subject</Text>
                        <Text className="text-slate-600 text-sm font-medium mt-1">
                            {item.subjectInfo.parentName ? `${item.subjectInfo.parentName} > ` : ''}
                            <Text className="text-blue-600">{item.subjectInfo.name}</Text>
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-4 flex-row items-center border-b border-gray-100 shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="font-bold text-lg text-slate-800">Bookmarks</Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : questions.length === 0 ? (
                <View className="flex-1 justify-center items-center p-8">
                    <Ionicons name="bookmark-outline" size={64} color="#CBD5E1" />
                    <Text className="text-gray-400 mt-4 text-center">No bookmarks yet.</Text>
                    <Text className="text-gray-400 text-xs text-center mt-1">Save questions during review to see them here.</Text>
                </View>
            ) : (
                <FlatList
                    data={questions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
                />
            )}
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
