'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, BookOpen, PlayCircle, FileText, Calendar, TrendingUp, Download, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';

const StudentProgressReport = ({ studentId }) => {
    const router = useRouter();
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

            if (enrollmentsError) throw enrollmentsError;

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
                            p_member_id: studentId,
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
                .eq('member_id', studentId)
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
                .eq('member_id', studentId)
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
            <div className="p-10 text-center">
                <p>Loading student progress...</p>
            </div>
        );
    }

    const filteredExamAttempts = getFilteredData(examAttempts, 'exam');
    const filteredVideoProgress = getFilteredData(videoProgress, 'video');

    return (
        <div className="flex-1 p-5 font-sans">
            {/* Breadcrumb */}
            <div className="mb-6 flex items-center gap-2 text-sm">
                <button
                    onClick={() => router.push('/users')}
                    className="flex items-center p-0 text-slate-500 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                >
                    <ArrowLeft size={18} />
                </button>
                <span className="text-slate-500">Members</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-semibold">Progress Report</span>
            </div>

            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <User size={32} className="text-blue-600" />
                        <h1 className="text-2xl font-bold m-0">{student?.name || 'Student'}</h1>
                    </div>
                    <p className="text-slate-500 text-sm m-0">{student?.email}</p>
                    <p className="text-slate-400 text-xs mt-1">Role: {student?.role}</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
                >
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                        <BookOpen size={24} className="text-blue-600" />
                        <div className="text-xs text-slate-500">Enrolled Courses</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalCourses}</div>
                    <div className="text-xs text-emerald-500 mt-1">
                        {stats.completedCourses} completed
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                        <FileText size={24} className="text-violet-500" />
                        <div className="text-xs text-slate-500">Exam Attempts</div>
                    </div>
                    <div className="text-2xl font-bold text-violet-500">{stats.totalExams}</div>
                    <div className="text-xs text-amber-500 mt-1">
                        Avg: {stats.averageExamScore}%
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                        <PlayCircle size={24} className="text-emerald-500" />
                        <div className="text-xs text-slate-500">Videos Watched</div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-500">{stats.totalVideos}</div>
                    <div className="text-xs text-emerald-500 mt-1">
                        {stats.completedVideos} completed
                    </div>
                </div>
            </div>

            {/* Course Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
                <div className="flex items-center gap-3">
                    <Filter size={18} className="text-slate-500" />
                    <select
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                        className="p-2 px-3 rounded-md border border-slate-200 text-sm outline-none cursor-pointer focus:border-blue-500 transition-colors"
                    >
                        <option value="all">All Courses</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Course Progress */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BookOpen size={20} />
                    Course Progress
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {courses.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            No courses enrolled
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Course</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Enrolled</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Progress</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => (
                                    <tr key={course.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-slate-900">{course.title}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(course.enrollment_date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${course.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(course.progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 min-w-[45px]">
                                                    {course.progress}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${course.progress >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
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
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText size={20} />
                    Exam Attempts {filterCourse !== 'all' && `(${filteredExamAttempts.length})`}
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {filteredExamAttempts.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            No exam attempts found
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Exam</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Course</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Score</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Date</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExamAttempts.map((attempt) => (
                                    <tr key={attempt.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-medium text-slate-900">
                                            {attempt.exams?.title || 'N/A'}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {attempt.exams?.courses?.title || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <div className={`text-base font-semibold ${attempt.score >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {attempt.score}%
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {attempt.correctAnswers}/{attempt.totalQuestions} correct
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(attempt.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${attempt.score >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                }`}>
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
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <PlayCircle size={20} />
                    Video Progress {filterCourse !== 'all' && `(${filteredVideoProgress.length})`}
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {filteredVideoProgress.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            No videos watched
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Video</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Course</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Progress</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Last Watched</th>
                                    <th className="p-3 px-4 text-left text-xs font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVideoProgress.map((video) => (
                                    <tr key={video.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-medium text-slate-900">
                                            {video.content_title || 'N/A'}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {video.chapter_contents?.chapters?.courses?.title || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${video.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${video.completion_percentage || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 min-w-[45px]">
                                                    {video.completion_percentage || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(video.updated_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${video.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
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
