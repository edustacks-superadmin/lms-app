import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Search, X, Filter, ArrowUpDown, Book, FileText, ChevronRight } from 'lucide-react';

const CourseThumbnail = ({ src, alt, isCompleted }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            {src && !imgError ? (
                <img
                    src={src}
                    alt={alt}
                    className="course-list-thumbnail"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="course-list-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Book size={20} color="#999" />
                </div>
            )}
            {isCompleted && (
                <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    padding: '2px',
                    border: '2px solid white'
                }}>
                    <Award size={12} color="white" />
                </div>
            )}
        </div>
    );
};

const MyCourses = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [debugInfo, setDebugInfo] = useState({ studentBatches: [], allCourses: [] });
    const navigate = useNavigate();

    useEffect(() => {
        fetchEnrolledCourses();
        if (user?.email) {
            fetchDebugInfo();
        }
    }, [user]);

    const fetchDebugInfo = async () => {
        if (!user?.email) return;
        const { data: member } = await supabase.from('members').select('id').eq('email', user.email).maybeSingle();
        if (member) {
            const { data: batches } = await supabase.from('batch_members').select('batch_id').eq('member_id', member.id);
            const batchIds = batches?.map(b => b.batch_id) || [];

            // Fetch ALL courses to check visibility and data
            const { data: allCourses } = await supabase.from('courses').select('*');

            setDebugInfo({
                studentBatches: batchIds,
                allCourses: allCourses || []
            });
        }
    };

    const fetchEnrolledCourses = async () => {
        try {
            console.log('Fetching courses for student:', user?.email);

            let member = null;
            if (user?.email) {
                // Get student member data (id, email) safely
                const { data: memberData, error: memberError } = await supabase
                    .from('members')
                    .select('id, email')
                    .eq('email', user.email)
                    .maybeSingle();

                if (memberError) {
                    console.warn('Member lookup notice:', memberError);
                } else {
                    member = memberData;
                }
            }

            console.log('Member data:', member);

            // Get student's batch memberships
            let studentBatches = [];
            if (member?.id) {
                const { data: batchMemberships, error: batchMemberError } = await supabase
                    .from('batch_members')
                    .select('batch_id')
                    .eq('member_id', member.id);

                if (batchMemberError) {
                    console.error('Error fetching batch memberships:', batchMemberError);
                } else {
                    studentBatches = (batchMemberships || []).map(bm => bm.batch_id);
                }
            }
            console.log('Student batches:', studentBatches);

            // 1. Fetch manually enrolled courses (uses member_id column)
            let manualEnrollments = [];
            if (member?.id) {
                const { data: enrollmentsData, error: enrollError } = await supabase
                    .from('enrollments')
                    .select(`
                        *,
                        courses:course_id (*)
                    `)
                    .eq('member_id', member.id)
                    .in('status', ['active', 'completed']);

                if (enrollError) {
                    console.error('Error fetching manual enrollments:', enrollError);
                } else {
                    manualEnrollments = enrollmentsData || [];
                }
            }
            console.log('Manual enrollments:', manualEnrollments.length);

            // 2. Fetch courses assigned to student's batches
            let batchCourses = [];
            if (studentBatches.length > 0) {
                const { data: batchCourseLinks, error: batchError } = await supabase
                    .from('batch_courses')
                    .select('course_id')
                    .in('batch_id', studentBatches);

                if (batchError) {
                    console.error('Error fetching batch courses:', batchError);
                } else {
                    console.log('Batch course links found:', batchCourseLinks?.length || 0);

                    if (batchCourseLinks && batchCourseLinks.length > 0) {
                        const courseIds = batchCourseLinks.map(bc => bc.course_id);
                        console.log('Course IDs from batches:', courseIds);

                        const { data: courseData, error: courseError } = await supabase
                            .from('courses')
                            .select('*')
                            .in('id', courseIds);

                        if (courseError) {
                            console.error('Error fetching batch courses data:', courseError);
                        } else {
                            const linkedCourses = (courseData || []).map(course => ({
                                id: `batch-${course.id}`,
                                course_id: course.id,
                                progress: 0,
                                status: 'active',
                                enrolled_at: new Date().toISOString(),
                                source: 'batch',
                                courses: course
                            }));
                            batchCourses = [...batchCourses, ...linkedCourses];
                        }
                    }
                }

                // ALSO fetch courses where allowed_batches column contains student's batch
                // This handles the case where courses are assigned via the allowed_batches array column
                // Fetch all private courses and filter in JS to avoid JSONB/Array type issues with .overlaps()
                const { data: privateCourses, error: privateError } = await supabase
                    .from('courses')
                    .select('*')
                    .eq('is_public', false);

                if (privateError) {
                    console.error('Error fetching private courses:', privateError);
                } else if (privateCourses && privateCourses.length > 0) {
                    // Filter courses that have at least one of the student's batches
                    const allowedBatchCourses = privateCourses.filter(course => {
                        if (!course.allowed_batches || !Array.isArray(course.allowed_batches)) return false;
                        return course.allowed_batches.some(batchId => studentBatches.includes(batchId));
                    });

                    console.log('Found courses via allowed_batches (JS filter):', allowedBatchCourses.length);

                    const mappedAllowedCourses = allowedBatchCourses.map(course => ({
                        id: `batch-allowed-${course.id}`,
                        course_id: course.id,
                        progress: 0,
                        status: 'active',
                        enrolled_at: new Date().toISOString(),
                        source: 'batch',
                        courses: course
                    }));

                    // Avoid duplicates if course was already found via batch_courses table
                    const existingIds = new Set(batchCourses.map(bc => bc.course_id));
                    const newCourses = mappedAllowedCourses.filter(c => !existingIds.has(c.course_id));

                    batchCourses = [...batchCourses, ...newCourses];
                }

                console.log('Total batch courses found:', batchCourses.length);
            } else {
                console.log('Student has no batches assigned');
            }

            // 3. Fetch public courses (is_public: true)
            const { data: publicCourseData, error: publicError } = await supabase
                .from('courses')
                .select('*')
                .eq('is_public', true);

            if (publicError) {
                console.error('Error fetching public courses:', publicError);
            }

            const publicCourses = (publicCourseData || []).map(course => ({
                id: `public-${course.id}`,
                course_id: course.id,
                progress: 0,
                status: 'active',
                enrolled_at: new Date().toISOString(),
                source: 'public',
                courses: course
            }));
            console.log('Public courses:', publicCourses.length);

            // 4. Merge all courses and remove duplicates
            const allCourses = [
                ...(manualEnrollments || []),
                ...batchCourses,
                ...publicCourses
            ];

            console.log('Total courses before deduplication:', allCourses.length);

            // Deduplicate by course_id (prefer manual enrollments for progress data)
            const courseMap = new Map();
            allCourses.forEach(enrollment => {
                const courseId = enrollment.course_id;
                if (!courseMap.has(courseId)) {
                    courseMap.set(courseId, enrollment);
                } else {
                    // Prefer manual enrollments (they have real progress data)
                    const existing = courseMap.get(courseId);
                    if (enrollment.source !== 'batch' && enrollment.source !== 'public') {
                        courseMap.set(courseId, enrollment);
                    }
                }
            });

            const uniqueCourses = Array.from(courseMap.values());
            console.log('Unique courses after deduplication:', uniqueCourses.length);

            // 5. Fetch chapter counts and content counts safely for each course
            const coursesWithChapters = await Promise.all(
                uniqueCourses.map(async (enrollment) => {
                    try {
                        // Get chapters to count them and get their IDs
                        const { data: chapters, count: chapterCount } = await supabase
                            .from('chapters')
                            .select('id', { count: 'exact' })
                            .eq('course_id', enrollment.course_id);

                        let contentCount = 0;
                        if (chapters && chapters.length > 0) {
                            const chapterIds = chapters.map(c => c.id);
                            const { count } = await supabase
                                .from('chapter_contents')
                                .select('*', { count: 'exact', head: true })
                                .in('chapter_id', chapterIds);
                            contentCount = count || 0;
                        }

                        return {
                            ...enrollment,
                            totalChapters: chapterCount || 0,
                            totalContents: contentCount
                        };
                    } catch (chapErr) {
                        console.warn('Error fetching chapters/contents for course:', enrollment.course_id, chapErr);
                        return {
                            ...enrollment,
                            totalChapters: 0,
                            totalContents: 0
                        };
                    }
                })
            );

            // MOCK DATA FOR DEMO STUDENT IF EMPTY (keep for backward compatibility)
            if (coursesWithChapters.length === 0 && user.email === 'student@demo.com') {
                const mockCourses = [
                    {
                        id: 'mock-1',
                        course_id: 'c1',
                        progress: 45,
                        status: 'active',
                        enrolled_at: new Date().toISOString(),
                        totalChapters: 12,
                        courses: {
                            id: 'c1',
                            title: 'Complete React Developer Course 2024',
                            thumbnail_url: 'https://img.youtube.com/vi/bMknfKXIFA8/maxresdefault.jpg',
                            description: 'Master React from scratch',
                            instructor_name: 'Sarah Smith',
                            duration: '12h 30m'
                        }
                    },
                    {
                        id: 'mock-2',
                        course_id: 'c2',
                        progress: 100,
                        status: 'completed',
                        enrolled_at: new Date(Date.now() - 86400000 * 10).toISOString(),
                        totalChapters: 8,
                        courses: {
                            id: 'c2',
                            title: 'Advanced JavaScript Concepts',
                            thumbnail_url: 'https://img.youtube.com/vi/2pL28CcEijU/maxresdefault.jpg',
                            description: 'Deep dive into JS',
                            instructor_name: 'John Doe',
                            duration: '8h 15m'
                        }
                    },
                    {
                        id: 'mock-3',
                        course_id: 'c3',
                        progress: 0,
                        status: 'active',
                        enrolled_at: new Date(Date.now() - 86400000).toISOString(),
                        totalChapters: 20,
                        courses: {
                            id: 'c3',
                            title: 'Python for Data Science',
                            thumbnail_url: 'https://img.youtube.com/vi/rfscVS0vtbw/maxresdefault.jpg',
                            description: 'Learn Python for AI',
                            instructor_name: 'Alice Johnson',
                            duration: '15h 45m'
                        }
                    }
                ];
                setCourses(mockCourses);
            } else {
                setCourses(coursesWithChapters);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProgressStatus = (progress) => {
        if (progress === 0) return { text: 'Not Started', color: '#999' };
        if (progress === 100) return { text: 'Completed', color: '#10b981' };
        return { text: 'In Progress', color: '#0088cc' };
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredCourses = courses
        .filter(enrollment => {
            const searchLower = searchTerm.toLowerCase();
            const title = enrollment.courses?.title?.toLowerCase() || '';
            const instructor = enrollment.courses?.instructor_name?.toLowerCase() || '';
            const matchesSearch = title.includes(searchLower) || instructor.includes(searchLower);

            let matchesStatus = true;
            if (filterStatus === 'in_progress') {
                matchesStatus = enrollment.progress > 0 && enrollment.progress < 100;
            } else if (filterStatus === 'completed') {
                matchesStatus = enrollment.progress === 100;
            } else if (filterStatus === 'not_started') {
                matchesStatus = enrollment.progress === 0;
            }

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.enrolled_at || 0) - new Date(a.enrolled_at || 0);
            } else if (sortBy === 'oldest') {
                return new Date(a.enrolled_at || 0) - new Date(b.enrolled_at || 0);
            } else if (sortBy === 'alphabetical') {
                return (a.courses?.title || '').localeCompare(b.courses?.title || '');
            } else if (sortBy === 'progress_high') {
                return (b.progress || 0) - (a.progress || 0);
            } else if (sortBy === 'progress_low') {
                return (a.progress || 0) - (b.progress || 0);
            }
            return 0;
        });

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                fontSize: '16px',
                color: '#666'
            }}>
                Loading courses...
            </div>
        );
    }

    return (
        <div className="my-courses-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="my-courses-header" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '2px', color: '#1a1a1a' }}>
                            My Courses
                        </h2>
                        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                            {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} enrolled
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="my-courses-search-wrap" style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '100%' }}>
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 34px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                backgroundColor: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                        <div style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af'
                        }}>
                            <Search size={15} />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters and Sort Toolbar - Compact Single Row */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', width: '100%' }}>
                    {/* Status Filter */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <Filter size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '7px 8px 7px 28px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '12px',
                                color: '#374151',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                outline: 'none',
                                appearance: 'none',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden'
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="in_progress">In Progress</option>
                            <option value="not_started">Not Started</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Sort By */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <ArrowUpDown size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '7px 8px 7px 28px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '12px',
                                color: '#374151',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                outline: 'none',
                                appearance: 'none',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden'
                            }}
                        >
                            <option value="newest">Newest Enrolled</option>
                            <option value="oldest">Oldest Enrolled</option>
                            <option value="alphabetical">Alphabetical (A-Z)</option>
                            <option value="progress_high">Progress (High to Low)</option>
                            <option value="progress_low">Progress (Low to High)</option>
                        </select>
                    </div>
                </div>
            </div>

            {courses.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db'
                }}>
                    <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        No courses yet
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        You haven't enrolled in any courses yet. Start learning today!
                    </p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db'
                }}>
                    <div style={{ marginBottom: '16px', color: '#cbd5e1', display: 'flex', justifyContent: 'center' }}>
                        <Search size={48} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        No matches found
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        We couldn't find any courses matching "{searchTerm}".
                    </p>
                    <button
                        onClick={() => setSearchTerm('')}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            color: '#4b5563',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        Clear Search
                    </button>
                </div>
            ) : (
                <div className="course-list-container">
                    <table className="course-list-table">
                        <tbody>
                            {filteredCourses.map((enrollment) => {
                                const progress = enrollment.progress || 0;
                                const isCompleted = progress === 100;
                                const isFree = Boolean(
                                    enrollment.courses?.is_public === true &&
                                    (!enrollment.courses?.allowed_products || enrollment.courses.allowed_products.length === 0)
                                );

                                return (
                                    <tr
                                        key={enrollment.id}
                                        onClick={() => navigate(`/student/course/${enrollment.course_id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <div className="course-info-cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                                    <CourseThumbnail
                                                        src={enrollment.courses?.image}
                                                        alt={enrollment.courses?.title}
                                                        isCompleted={isCompleted}
                                                    />
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                                            <div className="course-list-title" style={{ margin: 0, fontSize: '14px', lineHeight: 1.3 }}>{enrollment.courses?.title}</div>
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: '700',
                                                                padding: '1px 6px',
                                                                borderRadius: '10px',
                                                                backgroundColor: isFree ? '#ecfdf5' : '#eff6ff',
                                                                color: isFree ? '#059669' : '#2563eb',
                                                                border: `1px solid ${isFree ? '#a7f3d0' : '#bfdbfe'}`,
                                                                letterSpacing: '0.03em',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                {isFree ? 'FREE' : 'PAID'}
                                                            </span>
                                                        </div>
                                                        <div className="course-list-meta" style={{ marginTop: '2px', fontSize: '11px', gap: '10px' }}>
                                                            <span>
                                                                <Book size={11} /> {enrollment.totalChapters || 0} Chapters
                                                            </span>
                                                            <span>
                                                                <FileText size={11} /> {enrollment.totalContents || 0} Lessons
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: '8px' }}>
                                                    <ChevronRight size={18} color="#94a3b8" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyCourses;
