'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { supabase } from '../supabaseClient';
import { BookOpen, CheckCircle, Clock, Award, PlayCircle, Trophy, ShoppingCart, MessageSquare, ArrowRight, Star, Medal, FileText, Video, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

const StudentDashboard = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { isFeatureEnabled } = useFeatureFlags();

    // Check if leaderboard names should be hidden (feature flag)
    const hideLeaderboardNames = isFeatureEnabled('hideLeaderboardNames');
    const [stats, setStats] = useState({
        activeCourses: 0,
        completedExams: 0,
        averageScore: 0,
        myRank: '-'
    });
    const [resumeCourse, setResumeCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');
    const [topStudents, setTopStudents] = useState([]);
    const [products, setProducts] = useState([]);
    const [recentPosts, setRecentPosts] = useState([]);
    const [resumeContent, setResumeContent] = useState([]);
    const [recentlyAdded, setRecentlyAdded] = useState([]);
    const [banners, setBanners] = useState([
        {
            id: 1,
            title: "Unlock Your Potential",
            subtitle: "Get 20% off on all Advanced Courses this week!",
            image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            color: "#4f46e5"
        }
    ]);

    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [examConfig, setExamConfig] = useState(null);

    const [quote, setQuote] = useState(null);

    useEffect(() => {
        if (user?.email) {
            fetchStudentData();
            fetchDashboardContent();
            fetchQuote();
        }
    }, [user]);

    const fetchQuote = async () => {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('text, author')
                .eq('status', 'Active');

            if (!error && data && data.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.length);
                setQuote(data[randomIndex]);
            }
        } catch (error) {
            console.error('Error fetching quote:', error);
        }
    };

    // Auto-rotate banners
    useEffect(() => {
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [banners]);

    const fetchDashboardContent = async () => {
        try {
            // Fetch Banners
            const { data: bannerData } = await supabase
                .from('banner_ads')
                .select('*')
                .eq('status', 'Active')
                .order('created_at', { ascending: false });

            if (bannerData && bannerData.length > 0) {
                setBanners(bannerData.map(b => ({
                    id: b.id,
                    title: b.title,
                    subtitle: b.link_url ? "Click to learn more" : "",
                    image: b.image_url,
                    color: "#4f46e5",
                    link: b.link_url
                })));
            }

            // Fetch Leaderboard (Top 5)
            const { data: leaderboardData, error: leaderboardError } = await supabase
                .rpc('get_leaderboard', {
                    p_time_filter: 'month',
                    p_limit: 5
                });

            if (!leaderboardError && leaderboardData) {
                setTopStudents(leaderboardData);
            }

            // Fetch Products (Courses) - Limit 6
            const { data: productsData } = await supabase
                .from('products')
                .select('id, title, image, price, strikethrough_price')
                .order('created_at', { ascending: false })
                .limit(6);

            if (productsData) setProducts(productsData);


            // Fetch Recent Posts - Limit 6
            const now = new Date().toISOString();
            const { data: postsData } = await supabase
                .from('posts')
                .select('id, title, icon, cover_image, created_at, category_id, publication_date, is_featured')
                .eq('is_deleted', false)
                .lte('publication_date', now)
                .order('is_featured', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(6);

            if (postsData && postsData.length > 0) {
                // Fetch categories to merge
                const { data: categoriesData } = await supabase
                    .from('categories')
                    .select('id, name, color');

                const categoryMap = {};
                if (categoriesData) {
                    categoriesData.forEach(cat => (categoryMap[cat.id] = cat));
                }

                const formattedPosts = postsData.map(post => ({
                    ...post,
                    categoryName: categoryMap[post.category_id]?.name,
                    categoryColor: categoryMap[post.category_id]?.color
                }));
                setRecentPosts(formattedPosts);
            } else if (postsData) {
                setRecentPosts([]);
            }

            // Fetch TNPSC AE Config
            const { data: configData } = await supabase
                .from('exam_configurations')
                .select('exam_name, year')
                .eq('portal_category', 'TNPSC_AE')
                .maybeSingle();

            if (configData) {
                setExamConfig(configData);
            }

        } catch (error) {
            console.error('Error fetching dashboard content:', error);
        }
    };

    const fetchStudentData = async () => {
        try {
            // Get student ID
            const { data: member } = await supabase
                .from('members')
                .select('id, first_name, last_name')
                .eq('email', user.email)
                .single();

            if (member) {
                const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ');
                setStudentName(fullName || 'Student');

                // Get active courses count
                const { count: activeCount } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('member_id', member.id)
                    .eq('status', 'active');

                // Get completed exams and score
                const { data: attempts } = await supabase
                    .from('exam_attempts')
                    .select('score, submitted_at')
                    .eq('member_id', member.id)
                    .not('submitted_at', 'is', null);

                let examCount = 0;
                let avgScore = 0;

                if (attempts && attempts.length > 0) {
                    examCount = attempts.length;
                    const totalScore = attempts.reduce((sum, item) => sum + (item.score || 0), 0);
                    avgScore = Math.round(totalScore / examCount);
                }

                // Fetch user rank from leaderboard
                let myRank = '-';
                try {
                    const { data: fullLeaderboard } = await supabase.rpc('get_leaderboard', {
                        p_time_filter: 'all_time',
                        p_limit: 1000
                    });

                    if (fullLeaderboard) {
                        const userRankData = fullLeaderboard.find(item => String(item.member_id) === String(member.id));
                        if (userRankData) {
                            myRank = userRankData.rank;
                        }
                    }
                } catch (rankErr) {
                    console.log('Error fetching rank:', rankErr);
                }

                setStats({
                    activeCourses: activeCount || 0,
                    completedExams: examCount,
                    averageScore: avgScore,
                    myRank: myRank
                });

                // Fetch Resume Content (Paused Exams + Recent Videos/PDFs)
                const resumeItems = [];

                // 1. Fetch Paused Exams
                try {
                    const { data: pausedSessions } = await supabase
                        .from('exam_sessions')
                        .select('*, exams(id, title)')
                        .eq('member_id', member.id)
                        .gt('expires_at', new Date().toISOString())
                        .order('last_saved_at', { ascending: false })
                        .limit(5);

                    if (pausedSessions && pausedSessions.length > 0) {
                        pausedSessions.forEach(session => {
                            resumeItems.push({
                                type: 'exam',
                                id: session.id,
                                contentId: session.exam_id,
                                title: session.exams?.title || 'Untitled Exam',
                                answeredCount: Object.keys(session.answers || {}).length,
                                timeLeft: session.time_left,
                                lastAccessedAt: session.last_saved_at
                            });
                        });
                    }
                } catch (e) {
                    console.log('Error fetching paused exams:', e);
                }

                // 2. Fetch Recently Viewed Content (from content_progress)
                try {
                    // A. Get IDs from History
                    const { data: progressHistory } = await supabase
                        .from('content_progress')
                        .select('content_id, updated_at')
                        .eq('member_id', member.id)
                        .order('updated_at', { ascending: false })
                        .limit(20);

                    if (progressHistory && progressHistory.length > 0) {
                        const contentIds = [...new Set(progressHistory.map(p => p.content_id))];

                        // B. Fetch Valid Content Details
                        const { data: validContent } = await supabase
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
                            // C. Merge & Deduplicate
                            validContent.forEach(content => {
                                // Find the latest timestamp for this content
                                const latestEntry = progressHistory.find(ph => ph.content_id === content.id);

                                if (content && (content.type === 'video' || content.type === 'pdf' || content.type === 'file')) {
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
                } catch (e) {
                    console.log('Error fetching recent content:', e);
                }

                // Sort by most recent and set
                resumeItems.sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt));
                setResumeContent(resumeItems.slice(0, 10));

                // 3. Fetch Recently Added Content (new content in last 7 days)
                try {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);

                    const { data: newContent } = await supabase
                        .from('chapter_contents')
                        .select('id, title, type, created_at, chapters(courses(id, title, image))')
                        .gte('created_at', weekAgo.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (newContent) {
                        setRecentlyAdded(newContent.map(item => ({
                            id: item.id,
                            title: item.title,
                            type: item.type,
                            courseTitle: item.chapters?.courses?.title,
                            courseImage: item.chapters?.courses?.image,
                            createdAt: item.created_at
                        })));
                    }
                } catch (e) {
                    console.log('Error fetching recently added:', e);
                }

                // Get last accessed course for Resume Learning
                const { data: lastEnrollment } = await supabase
                    .from('enrollments')
                    .select(`
                        *,
                        course:courses(id, title, image_url),
                        chapter:chapters(id, title),
                        content:chapter_contents(id, title, type)
                    `)
                    .eq('member_id', member.id)
                    .not('last_accessed_at', 'is', null)
                    .order('last_accessed_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lastEnrollment) {
                    setResumeCourse(lastEnrollment);
                }
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleResume = () => {
        if (resumeCourse?.course?.id) {
            router.push(`/student/course/${resumeCourse.course.id}`);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            Loading dashboard...
        </div>
    );

    const currentBanner = banners[currentBannerIndex] || banners[0];

    return (
        <div className="min-h-screen bg-transparent pb-4">
            <div className="max-w-[1100px] mx-auto p-4 lg:p-0 space-y-4">

                {/* Header Section */}
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                        Welcome back, {studentName || 'Student'}! 👋
                    </h2>
                </div>

                {/* Quote Widget */}
                {quote && (
                    <div className="flex items-start bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 shadow-sm relative overflow-hidden">
                        <div className="w-1 self-stretch bg-blue-500 rounded-full mr-4 flex-shrink-0"></div>
                        <div className="flex-1 relative z-10">
                            <p className="text-slate-600 text-sm md:text-base italic font-serif leading-relaxed">
                                "{quote.text}"
                            </p>
                            {quote.author && (
                                <p className="text-xs md:text-sm text-slate-400 mt-2 font-medium">
                                    — {quote.author}
                                </p>
                            )}
                        </div>
                        <div className="absolute top-2 right-2 opacity-5">
                            <Sparkles size={48} className="text-blue-600" />
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="space-y-4">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                        {/* Active Courses */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all duration-200">
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center mb-2">
                                <BookOpen size={20} className="text-cyan-500" />
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase tracking-wide">Active</p>
                            <p className="text-xl font-bold text-slate-800">{stats.activeCourses}</p>
                        </div>

                        {/* Completed Exams */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all duration-200">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
                                <CheckCircle size={20} className="text-emerald-500" />
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase tracking-wide">Completed</p>
                            <p className="text-xl font-bold text-slate-800">{stats.completedExams}</p>
                        </div>

                        {/* Average Score */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all duration-200">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
                                <Trophy size={20} className="text-amber-500" />
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase tracking-wide">Avg Score</p>
                            <p className="text-xl font-bold text-slate-800">{stats.averageScore}%</p>
                        </div>

                        {/* My Rank */}
                        <div
                            onClick={() => router.push('/student/ranking')}
                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all duration-200 cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <Medal size={20} className="text-violet-500" />
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase tracking-wide">My Rank</p>
                            <p className="text-xl font-bold text-slate-800">{stats.myRank}</p>
                        </div>
                    </div>

                    {/* Separator - Hidden on desktop, useful for mobile visual break */}
                    <div className="h-px bg-slate-100 md:hidden" />


                    {/* Resume Your Study Section */}
                    {resumeContent.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                                    <PlayCircle size={20} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Resume Your Study</h3>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {resumeContent.map((item) => (
                                    <div
                                        key={`${item.type}-${item.id}`}
                                        onClick={() => {
                                            if (item.type === 'exam') {
                                                router.push(`/student/exam/${item.contentId}/take`);
                                            } else {
                                                router.push(`/student/course/${item.contentId}`);
                                            }
                                        }}
                                        className="min-w-[280px] bg-slate-50 hover:bg-white hover:shadow-md transition-all duration-200 rounded-2xl p-4 border border-gray-100 cursor-pointer flex items-center gap-3.5 group"
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${item.type === 'exam' ? 'bg-red-50 text-red-500' :
                                            item.type === 'video' ? 'bg-blue-50 text-blue-500' :
                                                'bg-amber-50 text-amber-500'
                                            }`}>
                                            {item.type === 'exam' ? (
                                                <BookOpen size={22} />
                                            ) : item.type === 'video' ? (
                                                <Video size={22} />
                                            ) : (
                                                <FileText size={22} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 mb-1 truncate group-hover:text-blue-600 transition-colors">{item.title}</p>
                                            <p className="text-xs text-slate-500 truncate mb-1.5">
                                                {item.type === 'exam'
                                                    ? `${item.answeredCount} answered • ${Math.floor((item.timeLeft || 0) / 60)}m left`
                                                    : item.courseTitle || 'Course Content'}
                                            </p>
                                            <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${item.type === 'exam' ? 'bg-red-50 text-red-600' :
                                                item.type === 'video' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recently Added Content Section */}
                    {recentlyAdded.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                                    <Sparkles size={20} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Recently Added</h3>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {recentlyAdded.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => router.push(`/student/course/${item.id}`)}
                                        className="min-w-[240px] bg-slate-50 hover:bg-white hover:shadow-md transition-all duration-200 rounded-2xl p-3.5 border border-gray-100 cursor-pointer flex items-center gap-3.5 group"
                                    >
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${item.type === 'video' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {item.type === 'video' ? (
                                                <Video size={18} strokeWidth={2.5} />
                                            ) : (
                                                <BookOpen size={18} strokeWidth={2.5} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 mb-0.5 truncate group-hover:text-blue-600 transition-colors">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${item.type === 'video' ? 'text-blue-500' : 'text-amber-500'
                                                    }`}>
                                                    {item.type === 'video' ? 'Video' : 'Exam'}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resume Learning Widget */}
                    {resumeCourse && (
                        <div className="bg-white rounded-2xl p-4 flex items-center gap-6 relative overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-blue-700"></div>

                            <div className="w-40 h-[100px] rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                                {resumeCourse.course?.image_url ? (
                                    <img
                                        src={resumeCourse.course.image_url}
                                        alt={resumeCourse.course.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                                        <BookOpen size={32} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full tracking-wide uppercase border border-blue-100">
                                        Continue Learning
                                    </span>
                                    <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                        <Clock size={14} />
                                        Last accessed {new Date(resumeCourse.last_accessed_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-2 leading-tight truncate">
                                    {resumeCourse.course?.title}
                                </h3>
                                <p className="text-sm text-slate-500 flex items-center gap-2 truncate">
                                    <span className="font-semibold text-slate-700">{resumeCourse.chapter?.title || 'Course Start'}</span>
                                    {resumeCourse.content?.title && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="truncate">{resumeCourse.content.title}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <button
                                onClick={handleResume}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 w-14 h-14"
                                title="Continue Learning"
                            >
                                <PlayCircle size={28} fill="white" className="text-blue-600" />
                            </button>
                        </div>
                    )}

                    {/* TNPSC AE Analysis Promotional Card */}
                    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer" onClick={() => router.push('/student/tnpsc-ae-analysis')}>
                        <div className="flex flex-col md:flex-row">
                            <div className="md:w-1/3 bg-blue-50 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-blue-100">
                                <Trophy size={64} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="p-6 md:w-2/3 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-extrabold uppercase tracking-widest rounded-md">New Feature</span>
                                    <span className="text-xs text-slate-400 font-medium">Limited Time Analysis</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">TNPSC AE Result Analysis {examConfig?.year || new Date().getFullYear()}</h3>
                                <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-2">
                                    {examConfig?.exam_name || 'Submit your marks and rank to get a community-wise vacancy analysis.'}
                                </p>
                                <div className="flex items-center text-blue-600 font-bold text-sm gap-2">
                                    Analyze My Result <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* All Courses Section */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                                    <BookOpen size={20} className="text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">All Courses</h3>
                            </div>
                            <button
                                onClick={() => router.push('/student/store')}
                                className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:text-blue-700 transition-colors"
                            >
                                See All <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {products.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => router.push(`/student/store/product/${product.id}`)}
                                    className="w-[240px] h-[260px] flex-shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                                >
                                    <div className="w-full h-[135px] bg-blue-50 relative overflow-hidden flex-shrink-0">
                                        {product.image ? (
                                            <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-blue-300">
                                                <BookOpen size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <p className="text-sm font-bold text-slate-800 mb-2 leading-tight line-clamp-2 overflow-hidden group-hover:text-blue-600 transition-colors">
                                            {product.title}
                                        </p>
                                        <div className="mt-auto">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-extrabold text-blue-600">
                                                    {product.price > 0 ? `₹${product.price}` : 'Free'}
                                                </span>
                                                {product.strikethrough_price > product.price && (
                                                    <span className="text-[11px] text-slate-400 line-through decoration-slate-300">
                                                        ₹{product.strikethrough_price}
                                                    </span>
                                                )}
                                            </div>
                                            {product.strikethrough_price > product.price && (
                                                <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-[10px] font-bold text-green-600 border border-green-100 uppercase tracking-tight">
                                                    {Math.round(((product.strikethrough_price - product.price) / product.strikethrough_price) * 100)}% Off
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Posts Section */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                                    <MessageSquare size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Recent Posts</h3>
                            </div>
                            <button
                                onClick={() => router.push('/student/posts')}
                                className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:text-blue-700 transition-colors"
                            >
                                See All <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {recentPosts.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => router.push(`/student/posts/${post.slug || post.id}`)}
                                    className="w-[240px] h-[260px] flex-shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                                >
                                    <div className="w-full h-[135px] bg-purple-50 relative overflow-hidden flex-shrink-0">
                                        {post.cover_image ? (
                                            <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-purple-300">
                                                <MessageSquare size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2 overflow-hidden group-hover:text-purple-600 transition-colors">
                                            {post.title}
                                        </h4>
                                        <div className="mt-auto flex items-center justify-between">
                                            <p className="text-xs text-slate-500">
                                                {new Date(post.publication_date).toLocaleDateString()}
                                            </p>
                                            {post.categoryName && (
                                                <span
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white shadow-sm"
                                                    style={{ backgroundColor: post.categoryColor || '#2563eb' }}
                                                >
                                                    {post.categoryName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Announcements Section */}
                    {banners.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                                    <Sparkles size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Announcements</h3>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {banners.map(banner => (
                                    <div
                                        key={banner.id}
                                        onClick={() => banner.link && window.open(banner.link, '_blank')}
                                        className={`w-[240px] h-[135px] flex-shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 ${banner.link ? 'cursor-pointer' : 'cursor-default'} group`}
                                    >
                                        <div className="w-full h-full bg-amber-50 relative overflow-hidden flex-shrink-0">
                                            {banner.image ? (
                                                <img src={banner.image} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-amber-300">
                                                    <Sparkles size={32} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Students Leaderboard Section */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-yellow-50 rounded-xl text-yellow-600">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <span className="text-lg font-bold text-slate-800 block leading-none">Top Students</span>
                                    <span className="text-xs text-slate-400 font-medium">This Month</span>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/student/ranking')}
                                className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:text-blue-700 transition-colors"
                            >
                                View Ranking
                            </button>
                        </div>

                        {topStudents.length > 0 ? (
                            <div className="bg-slate-50/50 rounded-xl overflow-hidden border border-gray-100">
                                {/* Table Header */}
                                <div className="flex px-4 py-2.5 bg-slate-100/50 border-b border-slate-200/50">
                                    <span className="w-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</span>
                                    <span className="flex-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</span>
                                    <span className="w-16 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pts</span>
                                </div>
                                {/* Table Rows */}
                                {topStudents.slice(0, 5).map((student, index) => {
                                    // Mask name if setting enabled
                                    const displayName = hideLeaderboardNames
                                        ? `Student ${student.member_id || index + 1}`
                                        : (student.name || 'Unknown');
                                    const initials = student.name?.charAt(0).toUpperCase() || '?';

                                    return (
                                        <div key={index} className={`flex items-center px-4 py-3 bg-white ${index < 4 ? 'border-b border-gray-50' : ''} hover:bg-slate-50 transition-colors`}>
                                            <span className={`w-8 text-center font-bold text-sm ${index < 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 px-3 flex items-center gap-3 min-w-0">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center ring-2 ring-white shadow-sm">
                                                        <span className="text-blue-600 font-bold text-xs">{initials}</span>
                                                    </div>
                                                )}
                                                <span className="text-sm font-semibold text-slate-700 truncate">{displayName}</span>
                                            </div>
                                            <span className="w-16 text-center font-bold text-blue-600 text-sm">
                                                {student.total_score}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium mb-1">No top learners yet this month.</p>
                                <p className="text-slate-300 text-xs">Be the first to take an exam!</p>
                            </div>
                        )}
                    </div>

                </div>


            </div>
        </div>
    );
};

export default StudentDashboard;
