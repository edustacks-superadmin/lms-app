import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, Linking, Platform, FlatList } from 'react-native';
import PdfViewer from '../../components/PdfViewer';
import ExamViewer from '../../components/ExamViewer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, measure, runOnUI, useDerivedValue, useAnimatedRef } from 'react-native-reanimated';

// Helper component for Accordion Section
const ChapterAccordion = ({ chapter, index, isExpanded, onToggle, onContentPress, currentContentId }) => {
    const listRef = useAnimatedRef();
    const heightValue = useSharedValue(0);
    const opacityValue = useSharedValue(0);

    const open = isExpanded;

    // Derived value ensuring UI updates happen on UI thread 
    const progress = useDerivedValue(() =>
        open ? withTiming(1) : withTiming(0)
    );

    useEffect(() => {
        if (open) {
            heightValue.value = withTiming(chapter.contents?.length * 56 + 20 || 100); // Approximate height or measure
            opacityValue.value = withTiming(1);
        } else {
            heightValue.value = withTiming(0);
            opacityValue.value = withTiming(0);
        }
    }, [open]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: heightValue.value,
        opacity: opacityValue.value,
        overflow: 'hidden',
    }));

    return (
        <View className="mb-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onToggle}
                className={`p-4 flex-row items-center justify-between ${isExpanded ? 'bg-blue-50/50' : 'bg-white'}`}
            >
                <View className="flex-row items-center flex-1 pr-4">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${isExpanded ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Text className={`font-bold ${isExpanded ? 'text-blue-600' : 'text-gray-500'}`}>{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className={`font-semibold text-[15px] ${isExpanded ? 'text-blue-800' : 'text-slate-800'}`}>
                            {chapter.name}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                            {chapter.contents?.length || 0} Contents
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={isExpanded ? "#2563EB" : "#94a3b8"}
                />
            </TouchableOpacity>

            <Animated.View style={animatedStyle}>
                <View className="pb-2">
                    {chapter.contents?.length > 0 ? (
                        chapter.contents.map((content, idx) => {
                            const isSelected = currentContentId === content.id;
                            let iconName = 'document-text-outline';
                            let iconColor = '#64748b';

                            if (content.type === 'video') {
                                iconName = 'play-circle-outline';
                                iconColor = '#4f46e5';
                            } else if (content.type === 'pdf') {
                                iconName = 'document-text-outline';
                                iconColor = '#ef4444';
                            } else if (content.type === 'exam') {
                                iconName = 'clipboard-outline';
                                iconColor = '#f59e0b';
                            }

                            return (
                                <TouchableOpacity
                                    key={content.id}
                                    onPress={() => onContentPress(content)}
                                    className={`flex-row items-center py-3 px-4 ml-4 border-l-2 ${isSelected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}
                                >
                                    <Ionicons name={iconName} size={18} color={iconColor} style={{ marginRight: 12 }} />
                                    <Text className={`text-sm flex-1 ${isSelected ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                                        {content.title}
                                    </Text>
                                    {content.type === 'video' && (
                                        <Text className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            Video
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View className="p-4 items-center">
                            <Text className="text-slate-400 text-sm italic">No content in this chapter</Text>
                        </View>
                    )}
                </View>
            </Animated.View>
        </View>
    );
};

// Tab definitions
const TABS = [
    { id: 'learn', label: 'Learn', icon: 'book-outline' },
    { id: 'running', label: 'Running', icon: 'play-circle-outline' },
    { id: 'upcoming', label: 'Upcoming', icon: 'time-outline' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy-outline' },
];

export default function CoursePlayer() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [course, setCourse] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [activeTab, setActiveTab] = useState('learn');

    // Exams data
    const [allExams, setAllExams] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    useEffect(() => {
        fetchCourseDetails();
    }, [id]);

    const fetchCourseDetails = async () => {
        try {
            // 1. Fetch Course Info
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;

            // Check Platform restriction
            if (courseData.allowed_platforms && !courseData.allowed_platforms.includes('mobile')) {
                alert('This content is not available on the mobile app. Please access it via the web browser.');
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(drawer)/(tabs)/mylearning');
                }
                return;
            }

            setCourse(courseData);

            // 2. Fetch Chapters
            const { data: chaptersData, error: chaptersError } = await supabase
                .from('chapters')
                .select('id, name, order')
                .eq('course_id', id)
                .order('order', { ascending: true });

            if (chaptersError) throw chaptersError;

            // 3. Fetch Contents for ALL chapters
            if (chaptersData?.length > 0) {
                const chapterIds = chaptersData.map(c => c.id);
                const { data: contentsData, error: contentsError } = await supabase
                    .from('chapter_contents')
                    .select('*, exams(*)')
                    .in('chapter_id', chapterIds)
                    .order('order', { ascending: true });

                if (!contentsError) {
                    const chaptersWithContents = chaptersData.map(chapter => ({
                        ...chapter,
                        contents: contentsData.filter(c => c.chapter_id === chapter.id)
                    }));
                    setChapters(chaptersWithContents);

                    // Extract exams from contents
                    const exams = contentsData
                        .filter(c => c.type === 'exam' && c.exams)
                        .map(c => ({ ...c.exams, content_id: c.id, content_title: c.title }));
                    setAllExams(exams);

                    // Auto-expand first chapter
                    if (chaptersWithContents.length > 0) {
                        setActiveChapterId(chaptersWithContents[0].id);
                    }
                } else {
                    setChapters(chaptersData);
                }
            } else {
                setChapters([]);
            }

        } catch (error) {
            console.error('Error fetching course:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        if (leaderboard.length > 0) return; // Already fetched
        setLeaderboardLoading(true);

        try {
            // Get exam IDs for this course
            const examIds = allExams.map(e => e.id);
            if (examIds.length === 0) {
                setLeaderboard([]);
                return;
            }

            // Get all attempts for these exams, grouped by member with best scores
            const { data: attempts, error } = await supabase
                .from('exam_attempts')
                .select('member_id, score, exam_id, members!exam_attempts_member_id_fkey(id, display_name, first_name, last_name, photo_url)')
                .in('exam_id', examIds)
                .not('submitted_at', 'is', null);

            if (error) throw error;

            // Aggregate: for each member, sum their best score per exam
            const memberScores = {};
            attempts.forEach(att => {
                const memberId = att.member_id;
                if (!memberScores[memberId]) {
                    memberScores[memberId] = {
                        member_id: memberId,
                        name: att.members?.display_name || `${att.members?.first_name || ''} ${att.members?.last_name || ''}`.trim() || 'Unknown',
                        photo_url: att.members?.photo_url,
                        scores: {}, // exam_id -> best score
                        total: 0
                    };
                }
                const currentBest = memberScores[memberId].scores[att.exam_id] || 0;
                if (att.score > currentBest) {
                    memberScores[memberId].scores[att.exam_id] = att.score;
                }
            });

            // Calculate totals
            Object.values(memberScores).forEach(m => {
                m.total = Object.values(m.scores).reduce((sum, s) => sum + s, 0);
            });

            // Sort by total descending
            const ranked = Object.values(memberScores)
                .sort((a, b) => b.total - a.total)
                .map((m, idx) => ({ ...m, rank: idx + 1 }));

            setLeaderboard(ranked);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [activeTab, allExams]);

    const handleContentPress = (content) => {
        router.push(`/course/content/${content.id}`);
    };

    const handleExamPress = (exam) => {
        router.push(`/exam/${exam.id}/take?courseId=${id}`);
    };

    // Filter exams by status
    const now = new Date();
    const runningExams = allExams.filter(exam => {
        const start = exam.start_date ? new Date(exam.start_date) : new Date(0);
        const end = exam.end_date ? new Date(exam.end_date) : new Date('2099-12-31');
        return start <= now && now <= end;
    });

    const upcomingExams = allExams.filter(exam => {
        const start = exam.start_date ? new Date(exam.start_date) : null;
        return start && start > now;
    });

    if (loading) {
        return (
            <View className="flex-1 bg-slate-50 justify-center items-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const renderExamCard = (exam, status, index) => (
        <TouchableOpacity
            key={`${exam.id}-${exam.content_id || index}`}
            onPress={() => handleExamPress(exam)}
            className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <Text className="font-semibold text-slate-800 text-base">{exam.title}</Text>
                    <View className="flex-row items-center mt-2 gap-3">
                        <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={14} color="#64748b" />
                            <Text className="text-xs text-slate-500 ml-1">{exam.duration_minutes} min</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="help-circle-outline" size={14} color="#64748b" />
                            <Text className="text-xs text-slate-500 ml-1">{exam.number_of_questions || '?'} Q</Text>
                        </View>
                    </View>
                    {exam.start_date && (
                        <Text className="text-xs text-slate-400 mt-1">
                            {status === 'upcoming' ? 'Starts: ' : 'Started: '}
                            {new Date(exam.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
                <View className={`px-3 py-1.5 rounded-full ${status === 'running' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <Text className={`text-xs font-medium ${status === 'running' ? 'text-green-700' : 'text-blue-700'}`}>
                        {status === 'running' ? 'Take Now' : 'Upcoming'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderLeaderboardItem = (item) => (
        <View key={item.member_id} className="bg-white rounded-xl p-4 mb-2 flex-row items-center border border-gray-100">
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${item.rank <= 3 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <Text className={`font-bold text-sm ${item.rank <= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>#{item.rank}</Text>
            </View>
            {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} className="w-10 h-10 rounded-full mr-3" />
            ) : (
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Text className="text-blue-600 font-bold">{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
            )}
            <View className="flex-1">
                <Text className="font-medium text-slate-800">{item.name}</Text>
            </View>
            <View className="items-end">
                <Text className="font-bold text-blue-600">{item.total}</Text>
                <Text className="text-xs text-slate-400">points</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            <StatusBar style="dark" backgroundColor="#f8fafc" />

            {/* Header */}
            <View className="px-4 py-3 flex-row items-center border-b border-gray-100 bg-white">
                <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-900 flex-1" numberOfLines={1}>
                    {course?.title || 'Course Content'}
                </Text>
            </View>

            {/* Tab Bar */}
            <View className="bg-white border-b border-gray-100">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id)}
                            className={`flex-row items-center px-4 py-3 mr-1 border-b-2 ${activeTab === tab.id ? 'border-blue-600' : 'border-transparent'}`}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={18}
                                color={activeTab === tab.id ? '#2563EB' : '#94a3b8'}
                            />
                            <Text className={`ml-2 font-medium text-sm ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-500'}`}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Tab Content */}
            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {activeTab === 'learn' && (
                    <>
                        {/* Course Metadata */}
                        <View className="mb-6">
                            <Text className="text-sm text-slate-500 mb-2">
                                {course?.instructor_name || 'Instructor'} • {chapters.reduce((acc, ch) => acc + (ch.contents?.length || 0), 0)} Lessons
                            </Text>

                            {/* Progress Bar */}
                            <View className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <View className="h-full bg-green-500 w-[15%]" />
                            </View>
                            <Text className="text-xs text-slate-400 mt-1">15% Completed</Text>
                        </View>

                        {/* Chapters List */}
                        <View className="pb-8">
                            {chapters.map((chapter, index) => (
                                <ChapterAccordion
                                    key={chapter.id}
                                    index={index}
                                    chapter={chapter}
                                    isExpanded={activeChapterId === chapter.id}
                                    onToggle={() => setActiveChapterId(activeChapterId === chapter.id ? null : chapter.id)}
                                    onContentPress={handleContentPress}
                                    currentContentId={null}
                                />
                            ))}
                        </View>
                    </>
                )}

                {activeTab === 'running' && (
                    <View>
                        <Text className="text-lg font-bold text-slate-800 mb-4">Running Exams</Text>
                        {runningExams.length > 0 ? (
                            runningExams.map((exam, index) => renderExamCard(exam, 'running', index))
                        ) : (
                            <View className="items-center py-12">
                                <Ionicons name="play-circle-outline" size={48} color="#cbd5e1" />
                                <Text className="text-slate-400 mt-3">No running exams</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'upcoming' && (
                    <View>
                        <Text className="text-lg font-bold text-slate-800 mb-4">Upcoming Exams</Text>
                        {upcomingExams.length > 0 ? (
                            upcomingExams.map((exam, index) => renderExamCard(exam, 'upcoming', index))
                        ) : (
                            <View className="items-center py-12">
                                <Ionicons name="time-outline" size={48} color="#cbd5e1" />
                                <Text className="text-slate-400 mt-3">No upcoming exams</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'leaderboard' && (
                    <View>
                        <Text className="text-lg font-bold text-slate-800 mb-4">Course Leaderboard</Text>
                        {leaderboardLoading ? (
                            <ActivityIndicator size="large" color="#2563EB" />
                        ) : leaderboard.length > 0 ? (
                            leaderboard.slice(0, 50).map(item => renderLeaderboardItem(item))
                        ) : (
                            <View className="items-center py-12">
                                <Ionicons name="trophy-outline" size={48} color="#cbd5e1" />
                                <Text className="text-slate-400 mt-3">No rankings yet</Text>
                                <Text className="text-xs text-slate-300 mt-1">Complete exams to appear on the leaderboard</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
