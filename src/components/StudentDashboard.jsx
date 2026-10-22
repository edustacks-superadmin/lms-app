import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { supabase } from '../supabaseClient';
import { BookOpen, CheckCircle, Clock, Award, PlayCircle, Trophy, ShoppingCart, MessageSquare, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { institute } = useInstitute();
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
            let bannerQuery = supabase
                .from('banner_ads')
                .select('*')
                .eq('status', 'Active')
                .order('created_at', { ascending: false });

            if (institute?.id) {
                bannerQuery = bannerQuery.eq('institute_id', institute.id);
            }

            const { data: bannerData } = await bannerQuery;

            if (bannerData && bannerData.length > 0) {
                setBanners(bannerData.map(b => ({
                    id: b.id,
                    title: b.title,
                    subtitle: b.link_url ? "Click to learn more" : "",
                    image: b.image_url,
                    color: "#4f46e5",
                    link: b.link_url,
                    hide_title: Boolean(b.hide_title)
                })));
            }

            // Fetch Leaderboard (Top 5)
            const { data: leaderboardData, error: leaderboardError } = await supabase
                .rpc('get_leaderboard', { p_limit: 5, p_time_filter: 'all' });

            if (!leaderboardError && leaderboardData) {
                setTopStudents(leaderboardData.slice(0, 5));
            }

            // Fetch Active Products (Courses) - Limit 3
            let productsQuery = supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .limit(3);

            if (institute?.id) {
                productsQuery = productsQuery.eq('institute_id', institute.id);
            }

            const { data: productsData } = await productsQuery;
            if (productsData) setProducts(productsData);

            // Fetch Recent Posts - Limit 3
            let postsQuery = supabase
                .from('posts')
                .select('id, title, summary, description, content, cover_image, icon, created_at, publication_date, categories(name)')
                .eq('is_deleted', false)
                .eq('access_control', 'Public')
                .order('created_at', { ascending: false })
                .limit(3);

            if (institute?.id) {
                postsQuery = postsQuery.eq('institute_id', institute.id);
            }

            const { data: postsData } = await postsQuery;

            if (postsData) setRecentPosts(postsData);

        } catch (error) {
            console.error('Error fetching dashboard content:', error);
        }
    };

    const fetchStudentData = async () => {
        try {
            // Get student ID safely
            let member = null;
            if (user?.email) {
                const { data: memberData, error: memberError } = await supabase
                    .from('members')
                    .select('id, display_name, first_name, last_name, email')
                    .ilike('email', user.email)
                    .maybeSingle();

                if (memberError) {
                    console.warn('Error fetching member:', memberError);
                } else {
                    member = memberData;
                }
            }

            if (member) {
                const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ');
                const displayName = member.display_name || fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
                setStudentName(displayName);

                // Count active courses using comprehensive student enrollment logic
                const enrolledCourseIds = new Set();

                // 1. Manual enrollments
                try {
                    const { data: enrollmentsData } = await supabase
                        .from('enrollments')
                        .select('course_id')
                        .eq('member_id', member.id)
                        .in('status', ['active', 'completed']);

                    (enrollmentsData || []).forEach(e => {
                        if (e.course_id) enrolledCourseIds.add(e.course_id);
                    });
                } catch (enrErr) {
                    console.warn('Error fetching enrollments:', enrErr);
                }

                // 2. Batch assignments
                try {
                    const { data: batchMemberships } = await supabase
                        .from('batch_members')
                        .select('batch_id')
                        .eq('member_id', member.id);

                    const studentBatches = (batchMemberships || []).map(bm => bm.batch_id).filter(Boolean);

                    if (studentBatches.length > 0) {
                        const { data: batchCourseLinks } = await supabase
                            .from('batch_courses')
                            .select('course_id')
                            .in('batch_id', studentBatches);

                        (batchCourseLinks || []).forEach(bc => {
                            if (bc.course_id) enrolledCourseIds.add(bc.course_id);
                        });

                        const { data: privateCourses } = await supabase
                            .from('courses')
                            .select('id, allowed_batches')
                            .eq('is_public', false);

                        (privateCourses || []).forEach(c => {
                            if (Array.isArray(c.allowed_batches) && c.allowed_batches.some(b => studentBatches.includes(b))) {
                                enrolledCourseIds.add(c.id);
                            }
                        });
                    }
                } catch (batchErr) {
                    console.warn('Error fetching batch courses:', batchErr);
                }

                // 3. Public courses (matching MyCourses.jsx 1:1)
                try {
                    const { data: publicCourseData } = await supabase
                        .from('courses')
                        .select('id')
                        .eq('is_public', true);

                    (publicCourseData || []).forEach(c => {
                        if (c.id) enrolledCourseIds.add(c.id);
                    });
                } catch (pubErr) {
                    console.warn('Error fetching public courses:', pubErr);
                }

                const activeCount = enrolledCourseIds.size;

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
                        avgScore = Math.round((totalScore / totalMaxScore) * 100);
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
                    <div
                        className="banner-container"
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: currentBanner.hide_title && currentBanner.link ? 'pointer' : 'default'
                        }}
                        onClick={() => currentBanner.hide_title && currentBanner.link && window.open(currentBanner.link, '_blank')}
                    >
                        <img
                            src={currentBanner.image}
                            alt="Banner"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', transition: 'opacity 0.5s ease-in-out' }}
                        />
                        {!currentBanner.hide_title && (
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
                        )}
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
                        <div
                            className="resume-course-card"
                            onClick={handleResume}
                        >
                            <div className="resume-course-accent-bar" style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '5px',
                                backgroundColor: '#2563eb'
                            }} />

                            <div className="resume-course-image">
                                {resumeCourse.course?.image_url ? (
                                    <img
                                        src={resumeCourse.course.image_url}
                                        alt={resumeCourse.course.title}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                        <BookOpen size={32} />
                                    </div>
                                )}
                            </div>

                            <div className="resume-course-body">
                                <div className="resume-course-meta">
                                    <span className="resume-course-badge">
                                        RESUME LEARNING
                                    </span>
                                    <span className="resume-course-date">
                                        <Clock size={12} />
                                        Last accessed {new Date(resumeCourse.last_accessed_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="resume-course-title">
                                    {resumeCourse.course?.title}
                                </h3>
                                <div className="resume-course-footer">
                                    <p className="resume-course-subtitle">
                                        <span style={{ fontWeight: '500' }}>{resumeCourse.chapter?.title || 'Course Start'}</span>
                                        {resumeCourse.content?.title && (
                                            <>
                                                <span style={{ color: '#cbd5e1' }}>•</span>
                                                <span className="resume-course-content-title">{resumeCourse.content.title}</span>
                                            </>
                                        )}
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResume();
                                        }}
                                        className="resume-course-btn"
                                    >
                                        <PlayCircle size={16} />
                                        <span>Continue</span>
                                    </button>
                                </div>
                            </div>
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
                            {products.slice(0, 3).map(product => {
                                const prodImg = product.image || product.image_url;
                                const prodLink = `/student/store/product/${product.id}`;
                                const isFree = !product.price || Number(product.price) === 0;
                                const priceDisplay = isFree ? 'Free' : `₹${product.price}`;
                                const hasDiscount = Boolean(product.strikethrough_price && Number(product.strikethrough_price) > Number(product.price));

                                return (
                                    <div
                                        key={product.id}
                                        className="dashboard-product-card"
                                        onClick={() => navigate(prodLink)}
                                    >
                                        <div className="dashboard-product-thumb">
                                            {prodImg ? (
                                                <img src={prodImg} alt={product.title} />
                                            ) : (
                                                <div className="dashboard-product-placeholder">
                                                    <BookOpen size={36} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="dashboard-product-body">
                                            <h4 className="dashboard-product-title">{product.title}</h4>
                                            
                                            <div className="dashboard-product-meta">
                                                <div className="dashboard-product-rating">
                                                    <Star size={13} fill="#f59e0b" />
                                                    <span style={{ fontWeight: '600' }}>4.8</span>
                                                    <span className="dashboard-product-reviews">(120 reviews)</span>
                                                </div>
                                            </div>

                                            <div className="dashboard-product-footer">
                                                <div className="dashboard-product-price-box">
                                                    <span className="dashboard-product-price">
                                                        {priceDisplay}
                                                    </span>
                                                    {hasDiscount && (
                                                        <span className="dashboard-product-strike">
                                                            ₹{product.strikethrough_price}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    className="dashboard-product-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(prodLink);
                                                    }}
                                                >
                                                    <ShoppingCart size={14} />
                                                    <span>View Details</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                            {recentPosts.map(post => {
                                const postDate = post.publication_date || post.created_at;
                                const formattedDate = postDate
                                    ? new Date(postDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                    : 'Recent';

                                const snippet = (post.summary || post.description || post.content || '')
                                    .replace(/<[^>]*>?/gm, '')
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/\u00a0/g, ' ')
                                    .trim();

                                const postImg = post.cover_image || post.image_url;

                                return (
                                    <div
                                        key={post.id}
                                        className="recent-post-card"
                                        onClick={() => navigate(`/student/posts/${post.id}`)}
                                    >
                                        <div className="recent-post-image">
                                            {postImg ? (
                                                <img src={postImg} alt={post.title} />
                                            ) : post.icon ? (
                                                <span style={{ fontSize: '26px' }}>{post.icon}</span>
                                            ) : (
                                                <MessageSquare size={22} color="#94a3b8" />
                                            )}
                                        </div>
                                        <div className="recent-post-body">
                                            <div className="recent-post-meta">
                                                <span className="recent-post-category">
                                                    {post.categories?.name || 'General'}
                                                </span>
                                                <span className="recent-post-date">
                                                    {formattedDate}
                                                </span>
                                            </div>
                                            <h4 className="recent-post-title">
                                                {post.icon && !postImg && <span style={{ marginRight: '6px' }}>{post.icon}</span>}
                                                {post.title}
                                            </h4>
                                            <p className="recent-post-snippet">
                                                {snippet || 'Click to read full post...'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
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
