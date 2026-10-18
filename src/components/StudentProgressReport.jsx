import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, BookOpen, PlayCircle, FileText, Calendar, TrendingUp, Download, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';

const StudentProgressReport = () => {
    const { id: studentId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [courses, setCourses] = useState([]);
    const [examAttempts, setExamAttempts] = useState([]);
    const [videoProgress, setVideoProgress] = useState([]);
    const [stats, setStats] = useState({
        totalCourses: 0,
        completedCourses: 0,
        totalExams: 0,
        averageExamScore: 0,
        totalVideos: 0,
        completedVideos: 0
    });
    const [filterCourse, setFilterCourse] = useState('all');

    useEffect(() => {
        fetchStudentProgress();
    }, [studentId]);

    const fetchStudentProgress = async () => {
        try {
            setLoading(true);

            // Fetch student details
            const { data: studentData, error: studentError } = await supabase
                .from('members')
                .select('*')
                .eq('id', studentId)
                .single();

            if (studentError) throw studentError;
            setStudent(studentData);

            // Fetch student's batch memberships
            const { data: batchMemberships } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('member_id', studentId);

            const studentBatches = (batchMemberships || []).map(bm => bm.batch_id);

            // 1. Fetch manually enrolled courses
            const { data: manualEnrollments, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    courses:course_id (
                        id,
                        title
                    )
                `)
                .eq('member_id', studentId);

            if (enrollmentsError) {
                console.warn('Manual enrollments notice:', enrollmentsError);
            }

            // 2. Fetch courses from student's batches
            let batchCourses = [];
            if (studentBatches.length > 0) {
                const { data: batchCourseLinks } = await supabase
                    .from('batch_courses')
                    .select('course_id')
                    .in('batch_id', studentBatches);

                if (batchCourseLinks && batchCourseLinks.length > 0) {
                    const courseIds = batchCourseLinks.map(bc => bc.course_id);

                    const { data: courseData } = await supabase
                        .from('courses')
                        .select('id, title')
                        .in('id', courseIds);

                    batchCourses = (courseData || []).map(course => ({
                        courses: course,
                        course_id: course.id,
                        created_at: null,
                        source: 'batch'
                    }));
                }
            }

            // 3. Fetch courses from product purchases
            const { data: purchases } = await supabase
                .from('purchases')
                .select(`
                    *,
                    products:product_id (
                        course_id,
                        courses:course_id (
                            id,
                            title
                        )
                    )
                `)
                .eq('student_id', studentId)
                .eq('payment_status', 'paid');

            const productCourses = (purchases || [])
                .filter(p => p.products?.courses)
                .map(p => ({
                    courses: p.products.courses,
                    course_id: p.products.course_id,
                    created_at: p.created_at,
                    source: 'product'
                }));

            // Combine and deduplicate courses
            const allEnrollments = [...(manualEnrollments || []), ...batchCourses, ...productCourses];
            const uniqueCourses = new Map();

            allEnrollments.forEach(enrollment => {
                const courseId = enrollment.courses?.id;
                if (courseId && !uniqueCourses.has(courseId)) {
                    uniqueCourses.set(courseId, enrollment);
                }
            });

            const enrollmentsData = Array.from(uniqueCourses.values());

            // Fetch course progress for each enrollment
            const coursesWithProgress = await Promise.all(
                enrollmentsData.map(async (enrollment) => {
                    const { data: progressData } = await supabase
                        .rpc('calculate_course_progress', {
                            p_student_id: studentId,
                            p_course_id: enrollment.course_id
                        });

                    return {
                        ...enrollment.courses,
                        enrollment_date: enrollment.created_at,
                        last_accessed: enrollment.last_accessed_at,
                        progress: progressData || 0
                    };
                })
            );

            setCourses(coursesWithProgress);

            // Fetch all exam attempts
            const { data: attemptsData, error: attemptsError } = await supabase
                .from('exam_attempts')
                .select(`
                    *,
                    exams (
                        id,
                        title,
                        total_marks,
                        course_id,
                        courses (
                            title
                        )
                    )
                `)
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });

            if (attemptsError) throw attemptsError;

            // Calculate scores for each attempt
            const attemptsWithScores = await Promise.all(
                attemptsData.map(async (attempt) => {
                    const { data: answers } = await supabase
                        .from('exam_answers')
                        .select('is_correct')
                        .eq('attempt_id', attempt.id);

                    const totalQuestions = answers?.length || 0;
                    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
                    const score = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

                    return {
                        ...attempt,
                        score: parseFloat(score),
                        totalQuestions,
                        correctAnswers
                    };
                })
            );

            setExamAttempts(attemptsWithScores);

            // Fetch video progress
            const { data: videoData, error: videoError } = await supabase
                .from('content_progress')
                .select(`
                    *,
                    chapter_contents:content_id (
                        id,
                        title,
                        type,
                        chapters (
                            title,
                            course_id,
                            courses (
                                title
                            )
                        )
                    )
                `)
                .eq('student_id', studentId)
                .eq('content_type', 'video')
                .order('updated_at', { ascending: false });

            if (videoError) console.error('Error fetching videos:', videoError);
            setVideoProgress(videoData || []);

            // Calculate statistics
            const totalCourses = coursesWithProgress.length;
            const completedCourses = coursesWithProgress.filter(c => c.progress >= 100).length;
            const totalExams = attemptsWithScores.length;
            const averageExamScore = totalExams > 0
                ? (attemptsWithScores.reduce((sum, a) => sum + a.score, 0) / totalExams).toFixed(1)
                : 0;
            const totalVideos = videoData?.length || 0;
            const completedVideos = videoData?.filter(v => v.completed).length || 0;

            setStats({
                totalCourses,
                completedCourses,
                totalExams,
                averageExamScore: parseFloat(averageExamScore),
                totalVideos,
                completedVideos
            });

        } catch (error) {
            console.error('Error fetching student progress:', error);
            alert('Error loading student progress: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Type', 'Title', 'Course', 'Score/Progress', 'Date', 'Status'];

        const examRows = examAttempts.map(attempt => [
            'Exam',
            attempt.exams?.title || 'N/A',
            attempt.exams?.courses?.title || 'N/A',
            `${attempt.score}%`,
            new Date(attempt.created_at).toLocaleDateString(),
            attempt.score >= 50 ? 'Passed' : 'Failed'
        ]);

        const videoRows = videoProgress.map(video => [
            'Video',
            video.content_title || 'N/A',
            video.chapter_contents?.chapters?.courses?.title || 'N/A',
            `${video.completion_percentage}%`,
            new Date(video.updated_at).toLocaleDateString(),
            video.completed ? 'Completed' : 'In Progress'
        ]);

        const rows = [...examRows, ...videoRows];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${student?.name || 'student'}-progress-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getFilteredData = (data, courseKey) => {
        if (filterCourse === 'all') return data;
        return data.filter(item => {
            if (courseKey === 'exam') {
                return item.exams?.course_id === filterCourse;
            } else if (courseKey === 'video') {
                return item.chapter_contents?.chapters?.course_id === filterCourse;
            }
            return true;
        });
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading student progress...</p>
            </div>
        );
    }

    const filteredExamAttempts = getFilteredData(examAttempts, 'exam');
    const filteredVideoProgress = getFilteredData(videoProgress, 'video');

    return (
        <div style={{ flex: 1, padding: '20px', fontFamily: "'Inter', sans-serif" }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <button
                    onClick={() => navigate('/users')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#666' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <span style={{ color: '#666' }}>Members</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#111', fontWeight: '600' }}>Progress Report</span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <User size={32} color="#2563eb" />
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{student?.name || 'Student'}</h1>
                    </div>
                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>{student?.email}</p>
                    <p style={{ color: '#888', fontSize: '12px', margin: '4px 0 0 0' }}>Role: {student?.role}</p>
                </div>
                <button
                    onClick={exportToCSV}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <BookOpen size={24} color="#2563eb" />
                        <div style={{ fontSize: '13px', color: '#666' }}>Enrolled Courses</div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>{stats.totalCourses}</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                        {stats.completedCourses} completed
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <FileText size={24} color="#8b5cf6" />
                        <div style={{ fontSize: '13px', color: '#666' }}>Exam Attempts</div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.totalExams}</div>
                    <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                        Avg: {stats.averageExamScore}%
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <PlayCircle size={24} color="#10b981" />
                        <div style={{ fontSize: '13px', color: '#666' }}>Videos Watched</div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{stats.totalVideos}</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                        {stats.completedVideos} completed
                    </div>
                </div>
            </div>

            {/* Course Filter */}
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Filter size={18} color="#666" />
                    <select
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Courses</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Course Progress */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={20} />
                    Course Progress
                </h2>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {courses.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            No courses enrolled
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Course</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Enrolled</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Progress</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => (
                                    <tr key={course.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#111' }}>{course.title}</div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {new Date(course.enrollment_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    flex: 1,
                                                    height: '8px',
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    maxWidth: '120px'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        backgroundColor: course.progress >= 100 ? '#10b981' : '#3b82f6',
                                                        width: `${Math.min(course.progress, 100)}%`
                                                    }}></div>
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', minWidth: '45px' }}>
                                                    {course.progress}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                backgroundColor: course.progress >= 100 ? '#d1fae5' : '#dbeafe',
                                                color: course.progress >= 100 ? '#065f46' : '#1e40af'
                                            }}>
                                                {course.progress >= 100 ? 'Completed' : 'In Progress'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Exam Attempts */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} />
                    Exam Attempts {filterCourse !== 'all' && `(${filteredExamAttempts.length})`}
                </h2>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {filteredExamAttempts.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            No exam attempts found
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Exam</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Course</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Score</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Date</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExamAttempts.map((attempt) => (
                                    <tr key={attempt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#111' }}>
                                            {attempt.exams?.title || 'N/A'}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {attempt.exams?.courses?.title || 'N/A'}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '16px', fontWeight: '600', color: attempt.score >= 50 ? '#10b981' : '#ef4444' }}>
                                                {attempt.score}%
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>
                                                {attempt.correctAnswers}/{attempt.totalQuestions} correct
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {new Date(attempt.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                backgroundColor: attempt.score >= 50 ? '#d1fae5' : '#fee2e2',
                                                color: attempt.score >= 50 ? '#065f46' : '#991b1b'
                                            }}>
                                                {attempt.score >= 50 ? 'Passed' : 'Failed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Video Progress */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlayCircle size={20} />
                    Video Progress {filterCourse !== 'all' && `(${filteredVideoProgress.length})`}
                </h2>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {filteredVideoProgress.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            No videos watched
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Video</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Course</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Progress</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Last Watched</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVideoProgress.map((video) => (
                                    <tr key={video.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#111' }}>
                                            {video.content_title || 'N/A'}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {video.chapter_contents?.chapters?.courses?.title || 'N/A'}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    flex: 1,
                                                    height: '8px',
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    maxWidth: '100px'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        backgroundColor: video.completed ? '#10b981' : '#3b82f6',
                                                        width: `${video.completion_percentage || 0}%`
                                                    }}></div>
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', minWidth: '45px' }}>
                                                    {video.completion_percentage || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {new Date(video.updated_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                backgroundColor: video.completed ? '#d1fae5' : '#fef3c7',
                                                color: video.completed ? '#065f46' : '#92400e'
                                            }}>
                                                {video.completed ? 'Completed' : 'In Progress'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProgressReport;
