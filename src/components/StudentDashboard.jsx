import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { BookOpen, CheckCircle, Clock, Award, PlayCircle, Trophy, ShoppingCart, MessageSquare, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        activeCourses: 0,
        completedExams: 0,
        averageScore: 0
    });
    const [resumeCourse, setResumeCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');
    const [topStudents, setTopStudents] = useState([]);
    const [products, setProducts] = useState([]);
    const [recentPosts, setRecentPosts] = useState([]);
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
                .rpc('get_leaderboard', { time_filter: 'month' });

            if (!leaderboardError && leaderboardData) {
                setTopStudents(leaderboardData.slice(0, 5));
            }

            // Fetch Products (Courses) - Limit 4
            const { data: productsData } = await supabase
                .from('courses')
                .select('*')
                .eq('status', 'published')
                .limit(4);

            if (productsData) setProducts(productsData);

            // Fetch Recent Posts - Limit 3
            const { data: postsData } = await supabase
                .from('posts')
                .select('*, categories(name)')
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .limit(3);

            if (postsData) setRecentPosts(postsData);

        } catch (error) {
            console.error('Error fetching dashboard content:', error);
        }
    };

    const fetchStudentData = async () => {
        try {
            // Get student ID
            const { data: member } = await supabase
                .from('members')
                .select('id, name')
                .eq('email', user.email)
                .single();

            if (member) {
                setStudentName(member.display_name);

                // Get active courses count
                const { count: activeCount } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('member_id', member.id)
                    .eq('status', 'active');

                // Get completed exams and score from exam_attempts for consistency with Analytics
                const { data: attempts } = await supabase
                    .from('exam_attempts')
                    .select(`
                        score,
                        total_marks,
                        exam:exams (
                            total_marks
                        )
                    `)
                    .eq('member_id', member.id)
                    .in('status', ['completed', 'submitted']);

                let examCount = 0;
                let avgScore = 0;

                if (attempts && attempts.length > 0) {
                    examCount = attempts.length;

                    const totalScore = attempts.reduce((sum, item) => sum + (item.score || 0), 0);

                    // Use total_marks from attempt, fallback to exam.total_marks
                    const totalMaxScore = attempts.reduce((sum, item) => {
                        const max = item.total_marks || item.exam?.total_marks || 0;
                        return sum + max;
                    }, 0);

                    // Calculate average percentage
                    if (totalMaxScore > 0) {
                        avgScore = ((totalScore / totalMaxScore) * 100).toFixed(1);
                    }
                }

                setStats({
                    activeCourses: activeCount || 0,
                    completedExams: examCount || 0,
                    averageScore: avgScore
                });

                // Get last accessed course for Resume Learning
                const { data: lastEnrollment } = await supabase
                    .from('enrollments')
                    .select(`
                        *,
                        course:courses(id, title, image)
                    `)
                    .eq('member_id', member.id)
                    .not('last_accessed_at', 'is', null)
                    .order('last_accessed_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

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
            navigate(`/student/course/${resumeCourse.course.id}`);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading dashboard...</div>;

    const currentBanner = banners[currentBannerIndex] || banners[0];

    return (
        <div className="dashboard-container">

            {/* Header Section */}
            <div style={{ marginBottom: '10px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>
                    Welcome back, {studentName || 'Student'}! 👋
                </h2>
                {quote ? (
                    <p style={{ color: '#666', fontSize: '16px', fontStyle: 'italic' }}>
                        "{quote.text}" {quote.author && <span style={{ fontSize: '14px', fontStyle: 'normal', color: '#94a3b8' }}>— {quote.author}</span>}
                    </p>
                ) : (
                    <p style={{ color: '#666', fontSize: '16px' }}>Here's what's happening with your learning today.</p>
                )}
            </div>

            <div className="dashboard-main-grid">

                {/* Left Column: Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Banner Carousel */}
                    <div className="banner-container">
                        <img
                            src={currentBanner.image}
                            alt="Banner"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.5s ease-in-out' }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            padding: '24px'
                        }}>
                            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '4px', maxWidth: '600px' }}>
                                {currentBanner.title}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', marginBottom: '12px', maxWidth: '500px' }}>
                                {currentBanner.subtitle}
                            </p>
                            <button style={{
                                backgroundColor: 'white',
                                color: currentBanner.color,
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                width: 'fit-content',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                                onClick={() => currentBanner.link && window.open(currentBanner.link, '_blank')}
                            >
                                Explore Now
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f0f0f0' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Active Courses</p>
                                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{stats.activeCourses}</p>
                            </div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f0f0f0' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Completed Exams</p>
                                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{stats.completedExams}</p>
                            </div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f0f0f0' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                                <Award size={24} />
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Average Score</p>
                                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{stats.averageScore}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Resume Learning Widget */}
                    {resumeCourse && (
                        <div className="resume-course-card">
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '6px',
                                backgroundColor: '#2563eb'
                            }} />

                            <div className="resume-course-image">
                                {resumeCourse.course?.image_url ? (
                                    <img
                                        src={resumeCourse.course.image_url}
                                        alt={resumeCourse.course.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                        <BookOpen size={32} />
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#2563eb',
                                        backgroundColor: '#eff6ff',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        letterSpacing: '0.5px'
                                    }}>
                                        RESUME LEARNING
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} />
                                        Last accessed {new Date(resumeCourse.last_accessed_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>
                                    {resumeCourse.course?.title}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: '500' }}>{resumeCourse.chapter?.title || 'Course Start'}</span>
                                    {resumeCourse.content?.title && (
                                        <>
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <span>{resumeCourse.content.title}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <button
                                onClick={handleResume}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '14px 28px',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}
                            >
                                <PlayCircle size={20} />
                                Continue
                            </button>
                        </div>
                    )}

                    {/* All Products (Courses) Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Featured Courses</h3>
                            <button
                                onClick={() => navigate('/student/courses')}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                View All <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="products-grid">
                            {products.map(product => (
                                <div key={product.id} style={{
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                    border: '1px solid #f0f0f0',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                    onClick={() => navigate(`/student/store/product/${product.id}`)}
                                >
                                    <div style={{ height: '160px', backgroundColor: '#f1f5f9', position: 'relative' }}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                <BookOpen size={40} />
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>
                                            ${product.price || 'Free'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b', lineHeight: '1.4' }}>{product.title}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '13px', marginBottom: '12px' }}>
                                            <Star size={14} fill="#f59e0b" />
                                            <span style={{ fontWeight: '600' }}>4.8</span>
                                            <span style={{ color: '#94a3b8' }}>(120 reviews)</span>
                                        </div>
                                        <button style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            color: '#475569',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                            <ShoppingCart size={16} /> View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Posts Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Latest Updates</h3>
                            <button
                                onClick={() => navigate('/student/posts')}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                View All <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="recent-posts-list">
                            {recentPosts.map(post => (
                                <div key={post.id} className="recent-post-card" onClick={() => navigate(`/student/posts/${post.id}`)}>
                                    <div className="recent-post-image">
                                        {post.image_url ? (
                                            <img src={post.image_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                <MessageSquare size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                                                {post.categories?.name || 'General'}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {new Date(post.published_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>{post.title}</h4>
                                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {post.content ? post.content.replace(/<[^>]*>?/gm, '') : 'No description available.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Sidebar Widgets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Monthly Leaderboard Widget */}
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', height: 'fit-content' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ padding: '8px', backgroundColor: '#fff7ed', borderRadius: '8px', color: '#ea580c' }}>
                                <Trophy size={20} />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Top Students</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {topStudents.length > 0 ? topStudents.map((student, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: index !== topStudents.length - 1 ? '16px' : 0, borderBottom: index !== topStudents.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#f1f5f9',
                                        color: index < 3 ? 'white' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '12px',
                                        flexShrink: 0
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0 }}>
                                        {student.photo_url ? (
                                            <img src={student.photo_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#94a3b8', fontSize: '14px' }}>
                                                {student.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0 0 2px 0' }}>{student.name}</p>
                                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{student.total_score} pts</p>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>No data available</div>
                            )}
                        </div>

                        <button
                            onClick={() => navigate('/student/ranking')}
                            style={{
                                width: '100%',
                                marginTop: '20px',
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                color: '#475569',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            View Full Leaderboard
                        </button>
                    </div>

                    {/* Quick Actions / Promo (Optional) */}
                    <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '20px', color: 'white', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Join Premium</h3>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>Get access to all courses and exclusive content.</p>
                            <button
                                onClick={() => navigate('/student/store')}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}>
                                Upgrade Now
                            </button>
                        </div>
                        {/* Decorative circles */}
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
