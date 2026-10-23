import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, RefreshControl, NativeModules } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import HorizontalScrollSection from '../../../components/HorizontalScrollSection';
import ContentCard from '../../../components/ContentCard';
import BannerCard from '../../../components/BannerCard';
import { ORG_CONFIG, getApiUrl } from '../../../config/organization';
import Constants from 'expo-constants';

export default function Dashboard() {
    const router = useRouter();
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState({ activeCourses: 0, completedExams: 0, avgScore: 0 });
    const [quote, setQuote] = useState(null);
    const [resumeCourse, setResumeCourse] = useState(null);
    const [recentContent, setRecentContent] = useState([]);

    // New state for enhanced sections
    const [resumeContent, setResumeContent] = useState([]);
    const [newCourses, setNewCourses] = useState([]);
    const [recentPosts, setRecentPosts] = useState([]);
    const [bannerAds, setBannerAds] = useState([]);
    const [monthlyLeaders, setMonthlyLeaders] = useState([]);
    const [pausedExams, setPausedExams] = useState([]);

    const [loadingStep, setLoadingStep] = useState('Checking session...');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        try {
            setLoading(true);
            setLoadingStep('Verifying user...');
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.log('Auth check failed or no user:', authError);
                router.replace('/');
                return;
            }

            setLoadingStep('Loading profile...');
            // 1. Fetch Profile (Essential for memberId)
            let member = null;
            let memberId = null;
            try {
                const { data: memberData, error: memberError } = await supabase
                    .from('members')
                    .select('id, first_name, last_name')
                    .eq('email', user.email)
                    .single();

                if (memberError) throw memberError;
                member = memberData;
            } catch (e) {
                console.log('Error fetching member:', e);
            }

            if (member) {
                memberId = member.id;
                const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ');
                setUserName(fullName);
            }

            setLoadingStep('Fetching dashboard items...');

            // Prepare all non-blocking fetches
            const dashboardFetches = [
                // Stats Fetch (Updated: Count courses from ALL sources like mylearning.js)
                (async () => {
                    if (!memberId) return;
                    try {
                        let totalActiveCourses = 0;
                        const countedCourseIds = new Set();

                        // 1. Manual Enrollments
                        const { data: manualEnrollments } = await supabase
                            .from('enrollments')
                            .select('course_id')
                            .eq('member_id', memberId)
                            .in('status', ['active', 'completed']);

                        (manualEnrollments || []).forEach(e => countedCourseIds.add(e.course_id));

                        // 2. Batch Courses (via subscriptions)
                        const { data: batchMemberships } = await supabase
                            .from('batch_members')
                            .select('batch_id')
                            .eq('member_id', memberId);

                        const studentBatches = (batchMemberships || []).map(bm => bm.batch_id);
                        if (studentBatches.length > 0) {
                            const { data: subscriptions } = await supabase
                                .from('subscriptions')
                                .select('batch_id, status, expires_on')
                                .eq('member_id', memberId)
                                .in('batch_id', studentBatches);

                            const today = new Date().toISOString().split('T')[0];
                            const validBatches = (subscriptions || [])
                                .filter(sub => sub.status === 'Active' && (!sub.expires_on || sub.expires_on >= today))
                                .map(sub => sub.batch_id);

                            if (validBatches.length > 0) {
                                const { data: batchCourseLinks } = await supabase
                                    .from('batch_courses')
                                    .select('course_id')
                                    .in('batch_id', validBatches);
                                (batchCourseLinks || []).forEach(bc => countedCourseIds.add(bc.course_id));
                            }
                        }

                        // 3. Product/Order Based Courses
                        const { data: orders } = await supabase
                            .from('orders')
                            .select('product_id')
                            .eq('member_id', memberId)
                            .eq('status', 'completed');

                        if (orders && orders.length > 0) {
                            const purchasedProductIds = orders.map(o => o.product_id).filter(Boolean);
                            if (purchasedProductIds.length > 0) {
                                const { data: allowedProductCourses } = await supabase
                                    .from('courses')
                                    .select('id')
                                    .overlaps('allowed_products', purchasedProductIds);
                                (allowedProductCourses || []).forEach(c => countedCourseIds.add(c.id));
                            }
                        }

                        // 4. Public Courses (Free courses are also "active")
                        const { data: publicCourses } = await supabase
                            .from('courses')
                            .select('id')
                            .eq('is_public', true)
                            .eq('institute_id', ORG_CONFIG.id);
                        (publicCourses || []).forEach(c => countedCourseIds.add(c.id));

                        totalActiveCourses = countedCourseIds.size;

                        // Exam Stats
                        const { data: examAttempts } = await supabase
                            .from('exam_attempts')
                            .select('score, submitted_at')
                            .eq('member_id', memberId)
                            .not('submitted_at', 'is', null);

                        let completedExams = 0;
                        let avgScore = 0;

                        if (examAttempts && examAttempts.length > 0) {
                            completedExams = examAttempts.length;
                            const totalScore = examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                            avgScore = Math.round(totalScore / completedExams);
                        }

                        setStats({
                            activeCourses: totalActiveCourses,
                            completedExams: completedExams,
                            avgScore: avgScore,
                            myRank: '-',
                        });

                        // Auto-Fix Account Linkage (silent)
                        fetch(getApiUrl('/api/debug/fix-member'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, auth_uid: user.id })
                        }).catch(() => { });

                    } catch (e) { console.log('Stats fetch error:', e); }
                })(),

                // Resume Content Fetch
                (async () => {
                    if (!memberId) {
                        console.log('[Dashboard] Skipping Resume Fetch (No Member ID)');
                        return;
                    }
                    try {
                        const resumeItems = [];
                        // Clear old state potentially (though variable is local here)
                        const { data: pausedSessions } = await supabase
                            .from('exam_sessions')
                            .select('*, exams(id, title)')
                            .eq('member_id', memberId)
                            .gt('expires_at', new Date().toISOString())
                            .order('last_saved_at', { ascending: false })
                            .limit(5);

                        if (pausedSessions) {
                            pausedSessions.forEach(session => {
                                resumeItems.push({
                                    type: 'exam',
                                    id: session.id,
                                    contentId: session.exam_id,
                                    title: session.exams?.title || 'Untitled Exam',
                                    lastAccessedAt: session.last_saved_at
                                });
                            });
                        }

                        // 1. Get IDs from History (content_progress)
                        const { data: progressHistory, error: historyError } = await supabase
                            .from('content_progress')
                            .select('content_id, updated_at')
                            .eq('member_id', memberId)
                            .order('updated_at', { ascending: false })
                            .limit(20); // Get more candidate items

                        if (progressHistory && progressHistory.length > 0) {
                            // Extract just the IDs
                            const contentIds = [...new Set(progressHistory.map(p => p.content_id))];

                            // 2. Fetch VALID content details from Source of Truth (chapter_contents)
                            const { data: validContent, error: contentError } = await supabase
                                .from('chapter_contents')
                                .select(`
                                    id, 
                                    title, 
                                    type, 
                                    chapters (
                                        courses (
                                            title, 
                                            image
                                        )
                                    )
                                `)
                                .in('id', contentIds);

                            if (validContent) {
                                // 3. Merge: Map UNIQUE valid content back to the history (taking the latest timestamp)
                                validContent.forEach(content => {
                                    // Find the latest timestamp for this content
                                    const latestEntry = progressHistory.find(ph => ph.content_id === content.id);

                                    if (content && (content.type === 'video' || content.type === 'pdf')) {
                                        resumeItems.push({
                                            type: content.type,
                                            id: content.id,
                                            contentId: content.id,
                                            title: content.title,
                                            courseTitle: content.chapters?.courses?.title,
                                            courseImage: content.chapters?.courses?.image,
                                            lastAccessedAt: latestEntry?.updated_at
                                        });
                                    }
                                });
                            }
                        }

                        // Strict Filter: Ensure we only keep items with valid IDs (and ignore "undefined" strings)
                        const validItems = resumeItems.filter(item =>
                            item.id &&
                            item.contentId &&
                            String(item.id) !== 'undefined' &&
                            String(item.contentId) !== 'undefined'
                        );
                        validItems.sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt));

                        validItems.sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt));

                        setPausedExams(validItems.slice(0, 10));
                    } catch (e) { console.log('Resume fetch error:', e); }
                })(),

                // Store/Products Fetch
                (async () => {
                    try {
                        const { data: allProducts } = await supabase
                            .from('products')
                            .select('id, title, image, price, strikethrough_price, created_at')
                            .order('created_at', { ascending: false })
                            .limit(20);
                        if (allProducts) setNewCourses(allProducts);
                    } catch (e) { console.log('Products fetch error:', e); }
                })(),

                // Posts Fetch
                (async () => {
                    try {
                        const { data: posts } = await supabase
                            .from('posts')
                            .select('id, title, description, icon, cover_image, created_at, category_id, publication_date, is_featured')
                            .eq('is_deleted', false)
                            .lte('publication_date', new Date().toISOString())
                            .order('is_featured', { ascending: false })
                            .order('created_at', { ascending: false })
                            .limit(10);

                        if (posts) {
                            const categoryIds = [...new Set(posts.map(p => p.category_id).filter(id => id != null))];
                            let categoriesMap = {};
                            if (categoryIds.length > 0) {
                                const { data: categoriesData } = await supabase.from('categories').select('id, name, color').in('id', categoryIds);
                                if (categoriesData) categoriesData.forEach(cat => categoriesMap[cat.id] = cat);
                            }
                            setRecentPosts(posts.map(post => ({ ...post, category: categoriesMap[post.category_id] })));
                        }
                    } catch (e) { console.log('Posts fetch error:', e); }
                })(),

                // Banner Fetch
                (async () => {
                    try {
                        const { data: banners } = await supabase.from('banner_ads').select('*').eq('status', 'Active').limit(5);
                        if (banners) setBannerAds(banners);
                    } catch (e) { console.log('Banners fetch error:', e); }
                })(),

                // Leaderboard Fetch
                (async () => {
                    try {
                        const { data: leaders } = await supabase.rpc('get_leaderboard', { p_time_filter: 'month', p_limit: 10 });
                        if (leaders) setMonthlyLeaders(leaders);

                        if (memberId) {
                            const { data: fullLeaderboard, error: lbError } = await supabase.rpc('get_leaderboard', { p_time_filter: 'all_time', p_limit: 1000 });

                            if (lbError) {
                                console.log('[Dashboard] Leaderboard RPC error:', lbError);
                            } else if (fullLeaderboard && fullLeaderboard.length > 0) {
                                // Use loose comparison (==) to handle type differences (bigint vs number/string)
                                const userRankData = fullLeaderboard.find(item => String(item.member_id) === String(memberId));
                                console.log('[Dashboard] Member ID:', memberId, 'Found rank:', userRankData?.rank);

                                if (userRankData && userRankData.rank) {
                                    setStats(prev => ({ ...prev, myRank: userRankData.rank }));
                                }
                            }
                        }
                    } catch (e) { console.log('Leaderboard fetch error:', e); }
                })(),

                // Quote Fetch
                (async () => {
                    try {
                        const { data: quoteData } = await supabase.from('quotes').select('text, author').eq('status', 'Active');
                        if (quoteData?.length > 0) setQuote(quoteData[Math.floor(Math.random() * quoteData.length)]);
                        else setQuote({ text: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese Proverb" });
                    } catch (e) { console.log('Quote fetch error:', e); }
                })(),

                // API Content (Recent Content) - ADD TIMEOUT
                (async () => {
                    try {
                        let apiUrl = getApiUrl('/api/mobile/recent-content');
                        if (__DEV__) {
                            const scriptURL = NativeModules.SourceCode?.scriptURL;
                            if (scriptURL) {
                                const address = scriptURL.split('://')[1].split('/')[0];
                                const hostname = address.split(':')[0];
                                if (hostname) apiUrl = `http://${hostname}:3000/api/mobile/recent-content`;
                            }
                        }

                        // Use a shorter timeout for this non-essential API call
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), 8000);
                        const contentResponse = await fetch(apiUrl, { signal: controller.signal });
                        clearTimeout(id);

                        const contentResult = await contentResponse.json();
                        if (contentResult.data) setRecentContent(contentResult.data);
                    } catch (e) { console.log('Recent content API error:', e); }
                })()
            ];

            // Wait for all to settle (don't block the whole screen if one fails)
            await Promise.allSettled(dashboardFetches);
            console.log('[Dashboard] All fetches settled.');
        } catch (error) {
            console.error('Final Dashboard Error:', error);
        } finally {
            console.log('[Dashboard] Loading complete.');
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    const StatsCard = ({ icon, label, value, color, bg }) => (
        <View className="bg-white p-2.5 rounded-xl shadow-sm flex-1 mr-3 border border-gray-100 items-center">
            <View className={`w-8 h-8 rounded-lg items-center justify-center mb-1.5 ${bg}`}>
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <Text className="text-gray-500 text-[10px] font-medium mb-0.5 text-center">{label}</Text>
            <Text className="text-base font-bold text-slate-800">{value}</Text>
        </View>
    );

    const renderHeader = () => (
        <View className="pt-4">

            {/* Welcome Greeting */}
            {userName && (
                <View className="mb-4 px-6">
                    <Text className="text-xl font-bold text-slate-900">Welcome back, {userName}! 👋</Text>
                </View>
            )}

            {/* Quote Widget */}
            {quote && (
                <View className="px-6 mb-6">
                    <View className="flex-row items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <View className="w-1 h-8 bg-blue-500 rounded-full mr-3" />
                        <View className="flex-1">
                            <Text className="text-slate-600 italic text-sm">"{quote.text}"</Text>
                            <Text className="text-slate-400 text-xs mt-1 font-medium">— {quote.author}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between px-6 mb-4">
                <View className="w-[48%] mb-2.5">
                    <StatsCard icon="book" label="Active Courses" value={stats.activeCourses} color="#06b6d4" bg="bg-cyan-50" />
                </View>
                <View className="w-[48%] mb-2.5">
                    <StatsCard icon="checkmark-circle" label="Completed" value={stats.completedExams} color="#22c55e" bg="bg-green-50" />
                </View>
                <View className="w-[48%]">
                    <StatsCard icon="trophy" label="Avg Score" value={`${stats.avgScore}%`} color="#f59e0b" bg="bg-amber-50" />
                </View>
                <View className="w-[48%]">
                    <StatsCard icon="medal" label="My Ranking" value={stats.myRank} color="#8b5cf6" bg="bg-purple-50" />
                </View>
            </View>

            {/* Separator Line */}
            <View style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 24, marginBottom: 16 }} />



            {/* Resume Your Study - Unified Section */}
            {pausedExams.length > 0 && (
                <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
                    {/* Section Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View className="w-8 h-8 bg-indigo-50 rounded-lg items-center justify-center" style={{ marginRight: 12 }}>
                            <Ionicons name="play-circle" size={18} color="#6366f1" />
                        </View>
                        <Text className="text-sm font-bold text-slate-900">Resume Your Study</Text>
                    </View>

                    {/* Content */}
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={pausedExams}
                        keyExtractor={(item) => `${item.type}-${item.id}`}
                        contentContainerStyle={{ gap: 12 }}
                        renderItem={({ item }) => {
                            const courseImage = item.courseImage;
                            const targetId = item.contentId || item.id;

                            // Defensive: Don't render broken items
                            if (!targetId || String(targetId) === 'undefined') {
                                console.warn('[Dashboard v4] Skipped invalid item:', JSON.stringify(item));
                                return null;
                            }

                            return (
                                <TouchableOpacity
                                    className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex-row items-center"
                                    style={{ width: 240 }}
                                    onPress={() => {
                                        console.log('[Dashboard v4] Navigating to:', item.type, targetId);

                                        if (!targetId) {
                                            Alert.alert('Error', 'Content ID is missing\n' + JSON.stringify(item));
                                            return;
                                        }

                                        if (item.type === 'exam') {
                                            router.push(`/exam/${targetId}/take`);
                                        } else {
                                            router.push(`/course/content/${targetId}`);
                                        }
                                    }}
                                >
                                    {/* Thumbnail */}
                                    <View className="w-12 h-12 rounded-full bg-gray-100 mr-3 overflow-hidden" style={{ borderRadius: 24 }}>
                                        {courseImage ? (
                                            <Image
                                                source={{ uri: courseImage }}
                                                className="w-full h-full"
                                                style={{ borderRadius: 24, width: '100%', height: '100%' }}
                                                contentFit="cover"
                                                transition={200}
                                            />
                                        ) : (
                                            <View className={`w-full h-full items-center justify-center ${item.type === 'exam' ? 'bg-red-50' :
                                                item.type === 'video' ? 'bg-blue-50' : 'bg-amber-50'
                                                }`}>
                                                <Ionicons
                                                    name={
                                                        item.type === 'exam' ? 'school' :
                                                            item.type === 'video' ? 'play-circle' : 'document-text'
                                                    }
                                                    size={20}
                                                    color={
                                                        item.type === 'exam' ? '#ef4444' :
                                                            item.type === 'video' ? '#3b82f6' : '#f59e0b'
                                                    }
                                                />
                                            </View>
                                        )}
                                    </View>

                                    {/* Details */}
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-slate-900 mb-0.5 leading-4" numberOfLines={1}>{item.title} ({item.contentId})</Text>
                                        <Text className="text-[10px] text-slate-500 mb-1" numberOfLines={1}>
                                            {item.type === 'exam'
                                                ? `${item.answeredCount || 0} answered • ${Math.floor((item.timeLeft || 0) / 60)}:${((item.timeLeft || 0) % 60).toString().padStart(2, '0')} left`
                                                : item.courseTitle || 'Course Content'
                                            }
                                        </Text>

                                        {/* Tag */}
                                        <View className="flex-row items-center">
                                            <View className={`px-1.5 py-0.5 rounded flex-row items-center ${item.type === 'exam' ? 'bg-red-50' :
                                                item.type === 'video' ? 'bg-blue-50' : 'bg-amber-50'
                                                }`}>
                                                <Ionicons
                                                    name={
                                                        item.type === 'exam' ? 'school' :
                                                            item.type === 'video' ? 'play' : 'document'
                                                    }
                                                    size={8}
                                                    color={
                                                        item.type === 'exam' ? '#ef4444' :
                                                            item.type === 'video' ? '#3b82f6' : '#f59e0b'
                                                    }
                                                    style={{ marginRight: 2 }}
                                                />
                                                <Text className={`text-[8px] font-bold ${item.type === 'exam' ? 'text-red-700' :
                                                    item.type === 'video' ? 'text-blue-700' : 'text-amber-700'
                                                    }`}>
                                                    {item.type?.toUpperCase() || 'CONTENT'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            )}

            {/* Resume Learning */}
            {resumeCourse && resumeCourse.products && (
                <View className="mb-0 px-6">
                    <Text className="text-xl font-bold text-slate-800 mb-4">Continue Learning</Text>
                    <TouchableOpacity
                        className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 overflow-hidden relative"
                        onPress={() => router.push(`/course/${resumeCourse.products.id}`)}
                    >
                        <View className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
                        <View className="flex-row">
                            <Image
                                source={{ uri: resumeCourse.products.thumbnail_url }}
                                className="w-24 h-24 rounded-2xl bg-gray-200 mr-4"
                                contentFit="cover"
                                transition={200}
                            />
                            <View className="flex-1 justify-center">
                                <View className="flex-row items-center mb-2">
                                    <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 self-start">
                                        <Text className="text-blue-700 text-[10px] font-bold uppercase tracking-wide">Continue</Text>
                                    </View>
                                </View>
                                <Text className="text-lg font-bold text-slate-800 mb-1 leading-6">{resumeCourse.products.title}</Text>
                                <Text className="text-slate-500 text-xs mb-3 font-medium">
                                    {resumeCourse.chapters?.title || 'Course Start'} • {resumeCourse.chapter_contents?.title || 'Overview'}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-white font-bold text-sm">Resume Lesson</Text>
                    </TouchableOpacity>
                </View >
            )
            }

            {/* Recently Added Section */}
            {
                recentContent.length > 0 && (
                    <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
                        <View className="flex-row items-center mb-3 gap-2">
                            <View className="w-8 h-8 bg-indigo-50 rounded-lg items-center justify-center">
                                <Ionicons name="sparkles" size={16} color="#4f46e5" />
                            </View>
                            <Text className="text-sm font-bold text-slate-800">Recently Added</Text>
                        </View>

                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={recentContent}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={{ gap: 12 }}
                            renderItem={({ item }) => {
                                const courseImage = item.chapters?.courses?.image;

                                return (
                                    <TouchableOpacity
                                        className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex-row items-center"
                                        style={{ width: 240 }}
                                        onPress={() => {
                                            if (item.id) {
                                                router.push({
                                                    pathname: '/course/content/[id]',
                                                    params: { id: item.id }
                                                });
                                            }
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        <View className="w-12 h-12 rounded-full bg-gray-100 mr-3 overflow-hidden" style={{ borderRadius: 24 }}>
                                            {courseImage ? (
                                                <Image
                                                    source={{ uri: courseImage }}
                                                    className="w-full h-full"
                                                    style={{ borderRadius: 24, width: '100%', height: '100%' }}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                            ) : (
                                                <View className="w-full h-full items-center justify-center bg-indigo-50">
                                                    <Ionicons
                                                        name={
                                                            item.type === 'video' ? 'play-circle' :
                                                                item.type === 'pdf' ? 'document-text' :
                                                                    'clipboard'
                                                        }
                                                        size={20}
                                                        color="#4f46e5"
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        {/* Details */}
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-slate-900 mb-0.5 leading-4" numberOfLines={1}>{item.title}</Text>
                                            <Text className="text-[10px] text-slate-500 mb-1" numberOfLines={1}>
                                                {item.chapters?.courses?.title || 'Course Content'}
                                            </Text>

                                            {/* Tag */}
                                            <View className="flex-row items-center">
                                                <View className={`px-1.5 py-0.5 rounded flex-row items-center ${item.type === 'video' ? 'bg-red-50' :
                                                    item.type === 'pdf' ? 'bg-amber-50' :
                                                        'bg-blue-50'
                                                    }`}>
                                                    <Ionicons
                                                        name={
                                                            item.type === 'video' ? 'play' :
                                                                item.type === 'pdf' ? 'document' :
                                                                    'help-circle'
                                                        }
                                                        size={8}
                                                        color={
                                                            item.type === 'video' ? '#ef4444' :
                                                                item.type === 'pdf' ? '#f59e0b' :
                                                                    '#3b82f6'
                                                        }
                                                        style={{ marginRight: 2 }}
                                                    />
                                                    <Text className={`text-[8px] font-bold ${item.type === 'video' ? 'text-red-700' :
                                                        item.type === 'pdf' ? 'text-amber-700' :
                                                            'text-blue-700'
                                                        }`}>
                                                        {item.type?.toUpperCase() || 'CONTENT'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )
            }

            {/* Separator Line */}
            {
                resumeCourse && resumeCourse.products && (
                    <View style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 24, marginTop: 32, marginBottom: 24 }} />
                )
            }

            {/* All Courses Section */}
            {newCourses.length > 0 && (
                <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center">
                                <Ionicons name="book" size={16} color="#2563eb" />
                            </View>
                            <Text className="text-sm font-bold text-slate-800">All Courses</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('Store')} className="flex-row items-center">
                            <Text className="text-blue-600 font-semibold text-xs">See All</Text>
                            <Ionicons name="chevron-forward" size={14} color="#2563eb" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={newCourses}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ gap: 12 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="bg-white rounded-b-2xl overflow-hidden shadow-sm border border-gray-100"
                                style={{ width: 160 }}
                                onPress={() => {
                                    if (item.id) {
                                        router.push({
                                            pathname: '/product/[id]',
                                            params: { id: item.id }
                                        });
                                    }
                                }}
                            >
                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={{ width: '100%', height: 90 }} contentFit="cover" transition={200} />
                                ) : (
                                    <View className="w-full h-[90px] bg-blue-50 items-center justify-center">
                                        <Ionicons name="image-outline" size={32} color="#93c5fd" />
                                    </View>
                                )}
                                <View className="p-3">
                                    <View className="mb-2">
                                        <Text className="text-sm font-bold text-slate-900 leading-5" numberOfLines={2}>{item.title}</Text>
                                    </View>
                                    <View className="flex-row items-center flex-wrap">
                                        <Text className="text-sm text-blue-600 font-extrabold mr-2">
                                            {item.price > 0 ? `₹${item.price}` : 'Free'}
                                        </Text>
                                        {item.strikethrough_price > item.price && (
                                            <Text className="text-[10px] text-slate-400 line-through mr-2">
                                                ₹{item.strikethrough_price}
                                            </Text>
                                        )}
                                    </View>
                                    {item.strikethrough_price > item.price && (
                                        <View className="mt-1 self-start bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                            <Text className="text-[9px] font-bold text-green-600">
                                                {Math.round(((item.strikethrough_price - item.price) / item.strikethrough_price) * 100)}% OFF
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Recent Posts Section */}
            {recentPosts.length > 0 && (
                <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-8 h-8 bg-purple-50 rounded-lg items-center justify-center">
                                <Ionicons name="newspaper" size={16} color="#7c3aed" />
                            </View>
                            <Text className="text-sm font-bold text-slate-800">Recent Posts</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/(drawer)/posts')} className="flex-row items-center">
                            <Text className="text-purple-600 font-semibold text-xs">See All</Text>
                            <Ionicons name="chevron-forward" size={14} color="#7c3aed" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={recentPosts}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ gap: 12 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="bg-white rounded-b-2xl overflow-hidden shadow-sm border border-gray-100"
                                style={{ width: 160 }}
                                onPress={() => {
                                    if (!item.id) {
                                        console.warn('Missing product ID');
                                        return;
                                    }
                                    router.push({
                                        pathname: '/posts/[id]',
                                        params: { id: item.id }
                                    });
                                }}
                            >
                                <View style={{ width: '100%', height: 90 }}>
                                    {item.cover_image || (item.icon && item.icon.startsWith('http')) ? (
                                        <Image
                                            source={{ uri: item.cover_image || item.icon }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    ) : (
                                        <View className="w-full h-full bg-purple-50 items-center justify-center">
                                            {item.icon && !item.icon.startsWith('http') ? (
                                                <Text style={{ fontSize: 32 }}>{item.icon}</Text>
                                            ) : (
                                                <Ionicons name="newspaper-outline" size={32} color="#c4b5fd" />
                                            )}
                                        </View>
                                    )}
                                </View>

                                <View className="p-3">
                                    <View className="flex-row items-baseline gap-1" style={{ flexWrap: 'wrap' }}>
                                        {item.is_featured && (
                                            <Text style={{ fontSize: 10 }}>📌</Text>
                                        )}
                                        <Text className="text-sm font-bold text-slate-900 mb-1" style={{ flex: 1 }} numberOfLines={2}>{item.title}</Text>
                                    </View>

                                    {/* Category Badge - Below Title */}
                                    {item.category && (
                                        <View
                                            className="px-2 py-0.5 rounded self-start mt-1"
                                            style={{ backgroundColor: item.category.color || '#2563EB' }}
                                        >
                                            <Text className="text-[8px] font-bold text-white uppercase tracking-wider">
                                                {item.category.name}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Announcements Section */}
            {bannerAds.length > 0 && (
                <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
                    <View className="flex-row items-center mb-3 gap-2">
                        <View className="w-8 h-8 bg-amber-50 rounded-lg items-center justify-center">
                            <Ionicons name="megaphone" size={16} color="#f59e0b" />
                        </View>
                        <Text className="text-sm font-bold text-slate-800">Announcements</Text>
                    </View>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={bannerAds}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        contentContainerStyle={{ gap: 12 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="bg-white rounded-b-2xl overflow-hidden shadow-sm border border-gray-100"
                                style={{ width: 160 }}
                                onPress={() => {
                                    if (item.link_url) {
                                        Alert.alert('Banner', `Navigate to: ${item.link_url}`);
                                    }
                                }}
                            >
                                {(item.image_url || item.banner_url) ? (
                                    <Image source={{ uri: item.image_url || item.banner_url }} style={{ width: '100%', height: 90 }} contentFit="cover" transition={200} />
                                ) : (
                                    <View className="w-full h-[90px] bg-amber-50 items-center justify-center">
                                        <Ionicons name="image-outline" size={32} color="#fcd34d" />
                                    </View>
                                )}
                                {!item.hide_title && (
                                    <View className="p-3">
                                        <Text className="text-sm font-bold text-slate-900" numberOfLines={2}>{item.title || 'Announcement'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}


            {/* My Courses - Only show if there are courses */}


            {/* Monthly Leaderboard Preview - Top Students */}
            <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
                <View className="flex-row justify-between items-end mb-3">
                    <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 bg-yellow-50 rounded-lg items-center justify-center">
                            <Ionicons name="trophy" size={16} color="#ca8a04" />
                        </View>
                        <View>
                            <Text className="text-sm font-bold text-slate-800">Top Students</Text>
                            <Text className="text-[10px] text-slate-500">This Month</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Ranking')}>
                        <Text className="text-blue-600 text-xs font-bold">View Ranking</Text>
                    </TouchableOpacity>
                </View>

                {monthlyLeaders.length > 0 ? (
                    <View className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                        {/* Header */}
                        <View className="flex-row py-2 px-3 bg-blue-50 border-b border-gray-200">
                            <Text className="w-8 text-center text-[10px] font-bold text-gray-500 uppercase">#</Text>
                            <Text className="flex-1 px-2 text-[10px] font-bold text-gray-500 uppercase">Student</Text>
                            <Text className="w-16 text-center text-[10px] font-bold text-gray-500 uppercase">Pts</Text>
                        </View>
                        {/* Rows */}
                        {monthlyLeaders.slice(0, 5).map((item, index) => (
                            <View key={index} className="flex-row items-center py-2.5 px-3 border-b border-gray-100 bg-white">
                                <Text className={`w-8 text-center font-bold ${index < 3 ? 'text-yellow-600' : 'text-slate-500'}`}>
                                    {index + 1}
                                </Text>
                                <View className="flex-1 px-2 flex-row items-center">
                                    {item.photo_url ? (
                                        <Image
                                            source={{ uri: item.photo_url }}
                                            style={{ width: 24, height: 24, borderRadius: 12 }}
                                            contentFit="cover"
                                        />
                                    ) : (
                                        <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center mr-2">
                                            <Text className="text-blue-700 font-bold text-[10px]">
                                                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                                            </Text>
                                        </View>
                                    )}
                                    <Text className="text-slate-700 font-semibold text-xs flex-1" numberOfLines={1}>
                                        {item.name || 'Unknown'}
                                    </Text>
                                </View>
                                <Text className="w-16 text-center font-bold text-blue-600 text-xs">
                                    {parseFloat(Number(item.total_score || 0).toFixed(2))}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="bg-gray-50 rounded-xl p-4 items-center justify-center border border-gray-100 border-dashed">
                        <Text className="text-slate-400 text-xs font-medium">No top learners yet this month.</Text>
                        <Text className="text-slate-300 text-[10px] mt-0.5">Be the first to take an exam!</Text>
                    </View>
                )}
            </View>
        </View >
    );



    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="text-slate-400 mt-4 font-medium text-sm">{loadingStep}</Text>

                {/* Fallback button if stuck too long */}
                <TouchableOpacity
                    onPress={() => setLoading(false)}
                    style={{ marginTop: 40, padding: 10 }}
                >
                    <Text className="text-blue-500 text-xs">Still loading? Tap to skip</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />

            {/* Fixed Header */}
            <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 bg-white rounded-xl items-center justify-center mr-3 border border-gray-50 shadow-sm overflow-hidden">
                            {ORG_CONFIG.logoUrl ? (
                                <Image
                                    source={{ uri: ORG_CONFIG.logoUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="contain"
                                    transition={200}
                                />
                            ) : (
                                <Ionicons name="grid" size={24} color="#2563EB" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-slate-900" numberOfLines={1}>{ORG_CONFIG.name || 'Dashboard'}</Text>
                            <Text className="text-xs text-blue-600 font-medium">Student Dashboard</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            // Try to find the drawer navigator and open it
                            navigation.dispatch(DrawerActions.openDrawer());
                        }}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <Ionicons name="menu" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {renderHeader()}
            </ScrollView>
        </SafeAreaView>
    );
}
