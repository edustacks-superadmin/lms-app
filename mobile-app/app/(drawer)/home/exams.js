import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { ORG_CONFIG } from '../../../config/organization';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Exams() {
    const router = useRouter();
    const navigation = useNavigation();

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'available' | 'upcoming' | 'completed'
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchStudentExams(exams.length > 0);
        }, [exams.length])
    );

    const fetchStudentExams = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // 1. Get Member ID
            const { data: member } = await supabase
                .from('members')
                .select('id, email')
                .eq('email', user.email)
                .eq('institute_id', ORG_CONFIG.id)
                .maybeSingle();

            if (!member) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const memberId = member.id;
            const instituteId = ORG_CONFIG.id;

            // 2. Fetch Enrollments
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id, enrolled_at, expires_at')
                .eq('member_id', memberId)
                .in('status', ['active', 'completed']);

            const now = new Date();
            const courseCycleMap = {};
            const validEnrollments = (enrollments || []).filter(e => {
                if (e.expires_at && new Date(e.expires_at) < now) return false;
                if (e.course_id) {
                    courseCycleMap[e.course_id] = e.enrolled_at;
                }
                return true;
            });
            const enrolledCourseIds = validEnrollments.map(e => e.course_id);

            // 3. Fetch Batches & Valid Subscriptions
            const { data: batchMembers } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('member_id', memberId);
            const batchIds = (batchMembers || []).map(b => b.batch_id);

            let batchCourseIds = [];
            if (batchIds.length > 0) {
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('batch_id, status, expires_on')
                    .eq('member_id', memberId)
                    .in('batch_id', batchIds);

                const today = new Date().toISOString().split('T')[0];
                const validBatches = (subscriptions || [])
                    .filter(sub => {
                        if (sub.status !== 'Active') return false;
                        if (sub.expires_on && sub.expires_on < today) return false;
                        return true;
                    })
                    .map(sub => sub.batch_id);

                if (validBatches.length > 0) {
                    const { data: batchCourses } = await supabase
                        .from('batch_courses')
                        .select('course_id')
                        .in('batch_id', validBatches);
                    batchCourseIds = (batchCourses || []).map(b => b.course_id);
                }
            }

            // 4. Product / Order Based Courses
            let productCourseIds = [];
            const { data: orders } = await supabase
                .from('orders')
                .select('product_id')
                .or(`member_id.eq.${memberId},user_id.eq.${memberId},user_email.ilike.${member.email}`)
                .eq('status', 'completed');

            const pids = (orders || []).map(o => o.product_id).filter(Boolean);
            if (pids.length > 0) {
                const { data: pCourses } = await supabase
                    .from('courses')
                    .select('id')
                    .overlaps('allowed_products', pids);
                productCourseIds = (pCourses || []).map(c => c.id);
            }

            // 5. Public Courses
            const { data: publicCourses } = await supabase
                .from('courses')
                .select('id')
                .eq('is_public', true)
                .eq('institute_id', instituteId);
            const publicCourseIds = (publicCourses || []).map(c => c.id);

            const allCourseIds = [...new Set([
                ...enrolledCourseIds,
                ...batchCourseIds,
                ...productCourseIds,
                ...publicCourseIds
            ])];

            const examMap = new Map();

            // 6. Fetch Chapter Contents Exams
            if (allCourseIds.length > 0) {
                const { data: chapters } = await supabase
                    .from('chapters')
                    .select('id, course_id, courses(id, title)')
                    .in('course_id', allCourseIds);

                const chapterMap = {};
                const chapterCourseMap = {};
                (chapters || []).forEach(ch => {
                    chapterMap[ch.id] = ch.courses?.title;
                    chapterCourseMap[ch.id] = ch.course_id;
                });

                const chapterIds = (chapters || []).map(c => c.id);
                if (chapterIds.length > 0) {
                    const { data: ccList } = await supabase
                        .from('chapter_contents')
                        .select('id, title, exam_id, chapter_id, exams(*)')
                        .in('chapter_id', chapterIds)
                        .eq('type', 'exam');

                    (ccList || []).forEach(cc => {
                        if (cc.exams && cc.exams.id) {
                            examMap.set(cc.exams.id, {
                                ...cc.exams,
                                course_id: chapterCourseMap[cc.chapter_id] || cc.exams.course_id,
                                course_title: chapterMap[cc.chapter_id] || null,
                                content_id: cc.id
                            });
                        }
                    });
                }

                // Direct course exams
                const { data: directExams } = await supabase
                    .from('exams')
                    .select('*, courses(id, title)')
                    .in('course_id', allCourseIds)
                    .eq('is_active', true);

                (directExams || []).forEach(dex => {
                    if (!examMap.has(dex.id)) {
                        examMap.set(dex.id, {
                            ...dex,
                            course_id: dex.course_id,
                            course_title: dex.courses?.title || null
                        });
                    }
                });
            }

            // 7. Student Attempts (fetch all attempts by student to attach score/status & include any attempted exam)
            const { data: attempts } = await supabase
                .from('exam_attempts')
                .select('id, exam_id, score, total_marks, started_at, submitted_at, exams(*)')
                .eq('member_id', memberId)
                .order('started_at', { ascending: false });

            const attemptsByExam = {};
            (attempts || []).forEach(att => {
                if (!attemptsByExam[att.exam_id]) {
                    attemptsByExam[att.exam_id] = [];
                }
                attemptsByExam[att.exam_id].push(att);

                // If this attempted exam is not in examMap, add it!
                if (att.exams && att.exams.id && !examMap.has(att.exams.id)) {
                    examMap.set(att.exams.id, {
                        ...att.exams,
                        course_title: null
                    });
                }
            });

            // 8. Assemble Exams with computed metadata
            const examList = Array.from(examMap.values()).map(exam => {
                const userAttempts = attemptsByExam[exam.id] || [];
                const submittedAttempts = userAttempts.filter(a => a.submitted_at);

                const cycleStartDate = (exam.course_id && courseCycleMap[exam.course_id])
                    ? new Date(courseCycleMap[exam.course_id])
                    : null;

                const cycleSubmittedAttempts = cycleStartDate
                    ? submittedAttempts.filter(a => new Date(a.started_at) >= cycleStartDate)
                    : submittedAttempts;

                const hasCompleted = cycleSubmittedAttempts.length > 0;

                let bestScore = null;
                let latestScore = null;
                let latestAttemptId = null;

                if (cycleSubmittedAttempts.length > 0) {
                    bestScore = Math.max(...cycleSubmittedAttempts.map(a => a.score ?? 0));
                    latestScore = cycleSubmittedAttempts[0].score ?? 0;
                    latestAttemptId = cycleSubmittedAttempts[0].id;
                } else if (submittedAttempts.length > 0) {
                    // Fallback to historical latest attempt for reviewing prior answers if desired
                    latestAttemptId = submittedAttempts[0].id;
                }

                const startDate = exam.start_date ? new Date(exam.start_date) : null;
                const endDate = exam.end_date ? new Date(exam.end_date) : null;

                let status = 'available';
                if (hasCompleted) {
                    status = 'completed';
                } else if (startDate && startDate > now) {
                    status = 'upcoming';
                } else if (endDate && endDate < now) {
                    status = 'ended';
                } else {
                    status = 'available';
                }

                const maxAttempts = exam.max_attempts || 0;
                const canRetake = maxAttempts === 0 || cycleSubmittedAttempts.length < maxAttempts;

                return {
                    ...exam,
                    status,
                    hasCompleted,
                    attemptsCount: cycleSubmittedAttempts.length,
                    bestScore: bestScore !== null ? parseFloat(Number(bestScore).toFixed(2)) : null,
                    latestScore: latestScore !== null ? parseFloat(Number(latestScore).toFixed(2)) : null,
                    latestAttemptId,
                    canRetake
                };
            });

            // Sort: Running/Available first, then Completed, then Upcoming, then Ended
            const statusOrder = { available: 1, completed: 2, upcoming: 3, ended: 4 };
            examList.sort((a, b) => {
                const orderDiff = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
                if (orderDiff !== 0) return orderDiff;
                return (b.id || 0) - (a.id || 0);
            });

            setExams(examList);
        } catch (error) {
            console.error('Error fetching exams for tab:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStudentExams(false);
    };

    const filteredExams = useMemo(() => {
        return exams.filter(exam => {
            // Tab filter
            if (activeFilter === 'available' && exam.status !== 'available') return false;
            if (activeFilter === 'upcoming' && exam.status !== 'upcoming') return false;
            if (activeFilter === 'completed' && exam.status !== 'completed') return false;

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const titleMatch = exam.title?.toLowerCase().includes(query);
                const courseMatch = exam.course_title?.toLowerCase().includes(query);
                return titleMatch || courseMatch;
            }
            return true;
        });
    }, [exams, activeFilter, searchQuery]);

    const counts = useMemo(() => {
        return {
            all: exams.length,
            available: exams.filter(e => e.status === 'available').length,
            upcoming: exams.filter(e => e.status === 'upcoming').length,
            completed: exams.filter(e => e.status === 'completed').length,
        };
    }, [exams]);

    const handleTakeExam = (exam) => {
        router.push(`/exam/${exam.id}/take?courseId=${exam.course_id || ''}`);
    };

    const handleReviewExam = (exam) => {
        if (exam.latestAttemptId) {
            router.push(`/exam/${exam.id}/review?attemptId=${exam.latestAttemptId}`);
        } else {
            router.push(`/exam/${exam.id}/review`);
        }
    };

    const renderExamCard = ({ item }) => {
        const isCompleted = item.status === 'completed';
        const isUpcoming = item.status === 'upcoming';
        const isEnded = item.status === 'ended';
        const isAvailable = item.status === 'available';

        return (
            <View className="bg-white px-4 py-3.5 border-b border-slate-200">
                {/* Header Row: Course Tag & Status / Score Badge */}
                <View className="flex-row items-center justify-between mb-1.5">
                    {item.course_title ? (
                        <Text className="text-[11px] font-semibold text-blue-600 flex-1 mr-2" numberOfLines={1}>
                            {item.course_title}
                        </Text>
                    ) : (
                        <Text className="text-[11px] font-semibold text-slate-500 flex-1 mr-2">
                            Practice Exam
                        </Text>
                    )}

                    {isCompleted && (
                        <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Ionicons name="trophy" size={11} color="#059669" />
                            <Text className="text-[11px] font-bold text-emerald-700 ml-1">
                                Score: {item.bestScore ?? 0}/{item.total_marks || item.number_of_questions || '?'}
                            </Text>
                        </View>
                    )}

                    {isAvailable && (
                        <View className="flex-row items-center bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1" />
                            <Text className="text-[11px] font-semibold text-blue-700">Available</Text>
                        </View>
                    )}

                    {isUpcoming && (
                        <View className="flex-row items-center bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Ionicons name="time" size={11} color="#7c3aed" />
                            <Text className="text-[11px] font-semibold text-purple-700 ml-1">Upcoming</Text>
                        </View>
                    )}

                    {isEnded && (
                        <View className="flex-row items-center bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <Ionicons name="lock-closed" size={11} color="#64748b" />
                            <Text className="text-[11px] font-semibold text-slate-600 ml-1">Ended</Text>
                        </View>
                    )}
                </View>

                {/* Exam Title */}
                <Text className="text-[15px] font-bold text-slate-800 leading-snug mb-1">
                    {item.title}
                </Text>

                {/* Single-line Metadata row */}
                <View className="flex-row items-center flex-wrap mb-2.5">
                    <Text className="text-xs text-slate-500">
                        {item.duration_minutes ? `${item.duration_minutes}m` : ''}
                        {item.duration_minutes && item.number_of_questions ? '  •  ' : ''}
                        {item.number_of_questions ? `${item.number_of_questions} Qs` : ''}
                        {(item.duration_minutes || item.number_of_questions) && item.total_marks ? '  •  ' : ''}
                        {item.total_marks ? `${item.total_marks} Marks` : ''}
                    </Text>
                    {Boolean(item.negative_marking_enabled) && (
                        <Text className="text-xs text-rose-600 font-medium ml-1.5">
                            •  -{item.negative_marks_per_question ?? 0.33} Neg
                        </Text>
                    )}
                </View>

                {/* Upcoming Schedule Info (if applicable) */}
                {isUpcoming && item.start_date && (
                    <View className="flex-row items-center bg-purple-50 px-2.5 py-1.5 rounded-lg mb-2.5 border border-purple-100">
                        <Ionicons name="calendar-outline" size={13} color="#7c3aed" />
                        <Text className="text-xs font-medium text-purple-800 ml-1.5">
                            Starts {new Date(item.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                )}

                {/* Action Buttons Row */}
                <View className="flex-row items-center gap-2 pt-0.5">
                    {isCompleted ? (
                        <>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleReviewExam(item)}
                                className="flex-1 flex-row items-center justify-center py-2 px-3 rounded-lg bg-blue-600"
                            >
                                <Ionicons name="eye-outline" size={14} color="#ffffff" />
                                <Text className="text-white text-xs font-bold ml-1.5">Review Answers</Text>
                            </TouchableOpacity>

                            {item.canRetake && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => handleTakeExam(item)}
                                    className="flex-row items-center justify-center py-2 px-3 rounded-lg bg-slate-100 border border-slate-200"
                                >
                                    <Ionicons name="refresh-outline" size={13} color="#334155" />
                                    <Text className="text-slate-700 text-xs font-bold ml-1">Retake</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : isAvailable ? (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleTakeExam(item)}
                            className="flex-1 flex-row items-center justify-center py-2 px-4 rounded-lg bg-blue-600"
                        >
                            <Ionicons name="play" size={13} color="#ffffff" />
                            <Text className="text-white text-xs font-bold ml-1.5">Start Exam</Text>
                        </TouchableOpacity>
                    ) : isUpcoming ? (
                        <View className="flex-1 py-1.5 rounded-lg bg-slate-100 items-center justify-center">
                            <Text className="text-slate-500 text-xs font-semibold">Test Not Started Yet</Text>
                        </View>
                    ) : (
                        <View className="flex-1 py-1.5 rounded-lg bg-slate-100 items-center justify-center">
                            <Text className="text-slate-400 text-xs font-semibold">Exam Ended</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white px-4 pt-2.5 pb-2.5 border-b border-slate-100">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                            className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center mr-2.5"
                        >
                            <Ionicons name="menu" size={20} color="#1e293b" />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-slate-900 leading-tight">Exams</Text>
                            <Text className="text-[11px] text-blue-600 font-medium">Tests, quizzes & assessments</Text>
                        </View>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-1.5 mb-2">
                    <Ionicons name="search" size={16} color="#94a3b8" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search tests and exams..."
                        placeholderTextColor="#94a3b8"
                        className="flex-1 text-xs text-slate-800 ml-2 py-0"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Tabs */}
                <View className="flex-row items-center gap-1.5 pt-0.5">
                    {[
                        { key: 'all', label: 'All', count: counts.all },
                        { key: 'available', label: 'Available', count: counts.available },
                        { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                        { key: 'completed', label: 'Completed', count: counts.completed },
                    ].map(tab => {
                        const isActive = activeFilter === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                activeOpacity={0.8}
                                onPress={() => setActiveFilter(tab.key)}
                                className={`flex-row items-center py-1.5 px-3 rounded-full ${
                                    isActive ? 'bg-blue-600' : 'bg-slate-100'
                                }`}
                            >
                                <Text
                                    className={`text-xs font-semibold ${
                                        isActive ? 'text-white' : 'text-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                </Text>
                                {tab.count > 0 && (
                                    <View
                                        className={`ml-1 px-1.5 py-0.2 rounded-full ${
                                            isActive ? 'bg-blue-500' : 'bg-slate-200'
                                        }`}
                                    >
                                        <Text
                                            className={`text-[10px] font-bold ${
                                                isActive ? 'text-white' : 'text-slate-600'
                                            }`}
                                        >
                                            {tab.count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Exam List */}
            {loading && exams.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text className="text-slate-400 text-xs mt-3 font-medium">Loading exams...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredExams}
                    renderItem={renderExamCard}
                    keyExtractor={item => item.id.toString()}
                    className="bg-white"
                    contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20 px-8">
                            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                                <Ionicons name="document-text-outline" size={32} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-700 font-bold text-base text-center">
                                {searchQuery ? 'No matching exams found' : 'No exams in this category'}
                            </Text>
                            <Text className="text-slate-400 text-xs text-center mt-1">
                                {searchQuery
                                    ? 'Try searching with a different term'
                                    : 'Exams assigned to your courses will appear here.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
