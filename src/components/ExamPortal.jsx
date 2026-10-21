import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import {
    Search,
    Filter,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Trophy,
    TrendingUp,
    FileCheck2,
    Clock,
    AlertCircle,
    SlidersHorizontal,
    CheckCircle,
    Play,
    Eye
} from 'lucide-react';

const ExamPortal = () => {
    const { user } = useAuth();
    const { institute } = useInstitute();
    const navigate = useNavigate();

    const [exams, setExams] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Search
    const [activeTab, setActiveTab] = useState('all'); // all, not_attempted, in_progress, upcoming, completed, missed
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // all, this_week, this_month, past_30_days
    const [showDateDropdown, setShowDateDropdown] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState('start_date');
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        if (user?.email) {
            fetchExamsAndAttempts();
        }
    }, [user, institute?.id]);

    const resolveInstituteId = async () => {
        if (institute?.id) return institute.id;
        try {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            const slug = parts.length > 2 ? parts[0].toLowerCase() : 'maheshiesacademy';
            const { data } = await supabase
                .from('institute_settings')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();
            if (data?.id) return data.id;
        } catch (e) {
            console.warn('Error resolving institute id:', e);
        }
        return 10;
    };

    const fetchExamsAndAttempts = async () => {
        try {
            setLoading(true);
            setError(null);

            const instId = await resolveInstituteId();

            // 1. Get member record
            let member = null;
            if (user?.email) {
                const { data: memberData, error: memberError } = await supabase
                    .from('members')
                    .select('id')
                    .ilike('email', user.email)
                    .maybeSingle();

                if (memberError) {
                    console.warn('Member fetch error (non-fatal):', memberError);
                } else {
                    member = memberData;
                }
            }

            let memberAttempts = [];
            if (member) {
                // 2. Get member's attempts
                const { data: attData } = await supabase
                    .from('exam_attempts')
                    .select('id, exam_id, score, total_marks, started_at, submitted_at, status')
                    .eq('member_id', member.id)
                    .order('created_at', { ascending: false });

                memberAttempts = attData || [];
                setAttempts(memberAttempts);
            }

            // 3. Resolve student's activated/enrolled courses (identical to MyCourses logic)
            const enrolledCourseIds = new Set();

            if (member?.id) {
                // 3a. Manual enrollments
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

                // 3b. Batch assignments
                try {
                    const { data: batchMemberships } = await supabase
                        .from('batch_members')
                        .select('batch_id')
                        .eq('member_id', member.id);

                    const studentBatches = (batchMemberships || []).map(bm => bm.batch_id).filter(Boolean);

                    if (studentBatches.length > 0) {
                        // Direct batch_courses junction
                        const { data: batchCourseLinks } = await supabase
                            .from('batch_courses')
                            .select('course_id')
                            .in('batch_id', studentBatches);

                        (batchCourseLinks || []).forEach(bc => {
                            if (bc.course_id) enrolledCourseIds.add(bc.course_id);
                        });

                        // Courses where allowed_batches contains student's batch
                        const { data: privateCourses } = await supabase
                            .from('courses')
                            .select('id, allowed_batches')
                            .eq('is_public', false);

                        (privateCourses || []).forEach(c => {
                            if (Array.isArray(c.allowed_batches)) {
                                if (c.allowed_batches.some(b => studentBatches.includes(b))) {
                                    enrolledCourseIds.add(c.id);
                                }
                            }
                        });
                    }
                } catch (batchErr) {
                    console.warn('Error fetching batch courses:', batchErr);
                }
            }

            // 3c. Public courses for the institute
            try {
                let pubQuery = supabase
                    .from('courses')
                    .select('id')
                    .eq('is_public', true);

                if (instId) {
                    pubQuery = pubQuery.eq('institute_id', instId);
                }

                const { data: publicCourseData } = await pubQuery;
                (publicCourseData || []).forEach(c => {
                    if (c.id) enrolledCourseIds.add(c.id);
                });
            } catch (pubErr) {
                console.warn('Error fetching public courses:', pubErr);
            }

            const activeCourseIds = Array.from(enrolledCourseIds);
            console.log('Student activated course IDs:', activeCourseIds);

            // 4. Find all exams that belong to the student's activated courses
            const linkedExamIds = new Set();

            // Also include any exam the student has previously attempted
            memberAttempts.forEach(att => {
                if (att.exam_id) linkedExamIds.add(att.exam_id);
            });

            if (activeCourseIds.length > 0) {
                // 4a. Direct exams with course_id matching active courses
                try {
                    const { data: directExams } = await supabase
                        .from('exams')
                        .select('id')
                        .in('course_id', activeCourseIds)
                        .eq('is_active', true);

                    (directExams || []).forEach(e => {
                        if (e.id) linkedExamIds.add(e.id);
                    });
                } catch (dirErr) {
                    console.warn('Error fetching direct exams:', dirErr);
                }

                // 4b. Exams in course_exams junction table
                try {
                    const { data: ceExams } = await supabase
                        .from('course_exams')
                        .select('exam_id')
                        .in('course_id', activeCourseIds);

                    (ceExams || []).forEach(ce => {
                        if (ce.exam_id) linkedExamIds.add(ce.exam_id);
                    });
                } catch (ceErr) {
                    console.warn('Error fetching course_exams:', ceErr);
                }

                // 4c. Exams added inside course chapters (chapter_contents)
                try {
                    const { data: chapters } = await supabase
                        .from('chapters')
                        .select('id')
                        .in('course_id', activeCourseIds);

                    const chapterIds = (chapters || []).map(c => c.id).filter(Boolean);
                    if (chapterIds.length > 0) {
                        const chunkSize = 100;
                        for (let i = 0; i < chapterIds.length; i += chunkSize) {
                            const chunk = chapterIds.slice(i, i + chunkSize);
                            const { data: ccExams } = await supabase
                                .from('chapter_contents')
                                .select('exam_id')
                                .in('chapter_id', chunk)
                                .not('exam_id', 'is', null);

                            (ccExams || []).forEach(cc => {
                                if (cc.exam_id) linkedExamIds.add(cc.exam_id);
                            });
                        }
                    }
                } catch (ccErr) {
                    console.warn('Error fetching chapter contents exams:', ccErr);
                }
            }

            const targetExamIds = Array.from(linkedExamIds);
            console.log('Target exam IDs for student courses:', targetExamIds.length);

            let examsData = [];
            if (targetExamIds.length > 0) {
                // Fetch full details of these exams in batches of 100
                const batchSize = 100;
                for (let i = 0; i < targetExamIds.length; i += batchSize) {
                    const batch = targetExamIds.slice(i, i + batchSize);
                    let q = supabase
                        .from('exams')
                        .select(`
                            id,
                            title,
                            description,
                            duration_minutes,
                            total_marks,
                            number_of_questions,
                            start_date,
                            end_date,
                            is_active,
                            created_at,
                            course_id,
                            course_exams (
                                courses (
                                    id,
                                    title
                                )
                            )
                        `)
                        .in('id', batch)
                        .eq('is_active', true);

                    const { data: chunk, error: chunkErr } = await q;
                    if (chunkErr) {
                        console.error('Error fetching exam chunk:', chunkErr);
                    } else if (chunk) {
                        examsData.push(...chunk);
                    }
                }

                // Sort by start_date / created_at descending
                examsData.sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0));
            }

            // Combine exams with student attempt info
            const now = new Date();
            const processedExams = (examsData || []).map(exam => {
                const examAttempts = memberAttempts.filter(a => a.exam_id === exam.id);
                const completedAttempt = examAttempts.find(a => a.status === 'completed' || a.status === 'submitted');
                const inProgressAttempt = examAttempts.find(a => a.status === 'in_progress');

                let status = 'not_attempted';
                if (completedAttempt) {
                    status = 'completed';
                } else if (inProgressAttempt) {
                    status = 'in_progress';
                } else if (exam.end_date && new Date(exam.end_date) < now) {
                    status = 'missed';
                } else if (exam.start_date && new Date(exam.start_date) > now) {
                    status = 'upcoming';
                }

                return {
                    ...exam,
                    status,
                    attempts: examAttempts,
                    latestAttempt: completedAttempt || inProgressAttempt || examAttempts[0] || null
                };
            });

            setExams(processedExams);
        } catch (err) {
            console.error('Error fetching exams:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Top Summary Metrics
    const metrics = useMemo(() => {
        const totalAssigned = exams.length;
        const attemptedExams = exams.filter(e => e.status === 'completed').length;

        // Exams today
        const today = new Date().toISOString().split('T')[0];
        const examsToday = attempts.filter(a => {
            const dateStr = a.submitted_at || a.started_at;
            return dateStr && dateStr.startsWith(today);
        }).length;

        // Completed attempts percentages for last 10 attempts
        const completedAttempts = attempts
            .filter(a => a.status === 'completed' || a.status === 'submitted')
            .slice(0, 10);

        let topScorePercent = 0;
        let avgScorePercent = 0;

        if (completedAttempts.length > 0) {
            const percentages = completedAttempts.map(a => {
                const total = a.total_marks || 100;
                return total > 0 ? (a.score / total) * 100 : 0;
            });

            topScorePercent = Math.max(...percentages);
            const sum = percentages.reduce((acc, p) => acc + p, 0);
            avgScorePercent = sum / percentages.length;
        }

        return {
            attemptedRatio: `${attemptedExams} / ${totalAssigned}`,
            examsToday,
            topScore: `${topScorePercent.toFixed(2)}%`,
            averageScore: `${avgScorePercent.toFixed(2)}%`,
            totalCompleted: completedAttempts.length
        };
    }, [exams, attempts]);

    // Format Duration into H:MM:SS or MM:SS
    const formatDuration = (minutes) => {
        if (!minutes || isNaN(minutes)) return '0:00:00';
        const totalSeconds = Math.round(minutes * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        const pad = (n) => String(n).padStart(2, '0');
        return `${hours}:${pad(mins)}:${pad(secs)}`;
    };

    // Format Date string to matching UI format: Oct 11, 2026, 7:56 AM
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'N/A';
        }
    };

    // Filter & Sort Logic
    const filteredExams = useMemo(() => {
        return exams.filter(exam => {
            // 1. Tab Status Filter
            if (activeTab !== 'all' && exam.status !== activeTab) {
                return false;
            }

            // 2. Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = exam.title?.toLowerCase().includes(q);
                const descMatch = exam.description?.toLowerCase().includes(q);
                if (!titleMatch && !descMatch) return false;
            }

            // 3. Date Filter
            if (dateFilter !== 'all' && exam.start_date) {
                const examDate = new Date(exam.start_date);
                const now = new Date();
                if (dateFilter === 'this_week') {
                    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (examDate < oneWeekAgo || examDate > now) return false;
                } else if (dateFilter === 'this_month') {
                    if (examDate.getMonth() !== now.getMonth() || examDate.getFullYear() !== now.getFullYear()) {
                        return false;
                    }
                } else if (dateFilter === 'past_30_days') {
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (examDate < thirtyDaysAgo || examDate > now) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Normalize values for comparison
            if (sortField === 'start_date' || sortField === 'end_date') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else if (sortField === 'number_of_questions' || sortField === 'duration_minutes' || sortField === 'total_marks') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [exams, activeTab, searchQuery, dateFilter, sortField, sortDirection]);

    // Pagination slice
    const totalPages = Math.ceil(filteredExams.length / itemsPerPage) || 1;
    const paginatedExams = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredExams.slice(start, start + itemsPerPage);
    }, [filteredExams, currentPage]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const handleActionClick = (exam) => {
        if (exam.status === 'completed') {
            navigate(`/student/exam/${exam.id}/results`);
        } else if (exam.status === 'in_progress' || exam.status === 'not_attempted') {
            navigate(`/student/exam/${exam.id}/take`);
        }
    };

    // Tab Counts
    const tabCounts = useMemo(() => {
        return {
            all: exams.length,
            not_attempted: exams.filter(e => e.status === 'not_attempted').length,
            in_progress: exams.filter(e => e.status === 'in_progress').length,
            upcoming: exams.filter(e => e.status === 'upcoming').length,
            completed: exams.filter(e => e.status === 'completed').length,
            missed: exams.filter(e => e.status === 'missed').length
        };
    }, [exams]);

    if (loading) {
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '16px', fontSize: '15px' }}>Loading your exams...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#ef4444' }}>
                <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Error Loading Exams</h3>
                <p style={{ fontSize: '14px', color: '#64748b' }}>{error}</p>
                <button
                    onClick={fetchExamsAndAttempts}
                    style={{ marginTop: '16px', padding: '8px 20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 32px 60px', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Page Header */}
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 24px 0', letterSpacing: '-0.5px' }}>
                Exams
            </h1>

            {/* Top 3 Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                {/* 1. Exams Attempted (Pastel Blue) */}
                <div style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #e0f2fe',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '16px', backgroundColor: '#0284c7', borderRadius: '2px' }} />
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
                                Exams Attempted
                            </span>
                        </div>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                            <FileCheck2 size={20} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0c4a6e', lineHeight: '1.2', marginBottom: '4px' }}>
                            {metrics.attemptedRatio}
                        </div>
                        <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: '500' }}>
                            {metrics.examsToday} exams today
                        </div>
                    </div>
                </div>

                {/* 2. Top Score (Pastel Green) */}
                <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '16px', backgroundColor: '#16a34a', borderRadius: '2px' }} />
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#15803d' }}>
                                Top Score
                            </span>
                        </div>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                            <Trophy size={20} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#14532d', lineHeight: '1.2', marginBottom: '4px' }}>
                            {metrics.topScore}
                        </div>
                        <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                            Last 10 exams
                        </div>
                    </div>
                </div>

                {/* 3. Average Score (Pastel Purple/Indigo) */}
                <div style={{
                    backgroundColor: '#faf5ff',
                    border: '1px solid #f3e8ff',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(168, 85, 247, 0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '16px', backgroundColor: '#7c3aed', borderRadius: '2px' }} />
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#6d28d9' }}>
                                Average Score
                            </span>
                        </div>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#4c1d95', lineHeight: '1.2', marginBottom: '4px' }}>
                            {metrics.averageScore}
                        </div>
                        <div style={{ fontSize: '13px', color: '#7c3aed', fontWeight: '500' }}>
                            Last 10 exams
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card: Tabs + Search + Table */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                overflow: 'hidden'
            }}>
                {/* Horizontal Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '0 20px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap'
                }}>
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'not_attempted', label: 'Not Attempted' },
                        { id: 'in_progress', label: 'In Progress' },
                        { id: 'upcoming', label: 'Upcoming' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'missed', label: 'Missed' }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '16px 18px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '14px',
                                    fontWeight: isActive ? '700' : '500',
                                    color: isActive ? '#059669' : '#64748b',
                                    cursor: 'pointer',
                                    borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search & Action Controls Bar */}
                <div style={{
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap'
                }}>
                    {/* Search Input Box */}
                    <div style={{
                        position: 'relative',
                        flex: '1',
                        minWidth: '240px',
                        maxWidth: '480px'
                    }}>
                        <Search
                            size={18}
                            color="#94a3b8"
                            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                            type="text"
                            placeholder="Search exam"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 14px 10px 42px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '14px',
                                color: '#1e293b',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Filter Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                        {/* Date Filter Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowDateDropdown(!showDateDropdown)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 14px',
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Filter by date <ChevronDown size={14} />
                            </button>

                            {showDateDropdown && (
                                <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '110%',
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                    zIndex: 50,
                                    minWidth: '160px',
                                    overflow: 'hidden'
                                }}>
                                    {[
                                        { id: 'all', label: 'All Dates' },
                                        { id: 'this_week', label: 'This Week' },
                                        { id: 'this_month', label: 'This Month' },
                                        { id: 'past_30_days', label: 'Past 30 Days' }
                                    ].map(opt => (
                                        <div
                                            key={opt.id}
                                            onClick={() => {
                                                setDateFilter(opt.id);
                                                setShowDateDropdown(false);
                                                setCurrentPage(1);
                                            }}
                                            style={{
                                                padding: '10px 16px',
                                                fontSize: '13px',
                                                fontWeight: dateFilter === opt.id ? '700' : '400',
                                                color: dateFilter === opt.id ? '#059669' : '#334155',
                                                backgroundColor: dateFilter === opt.id ? '#f0fdf4' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reset Filter Button */}
                        {(searchQuery || dateFilter !== 'all' || activeTab !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setDateFilter('all');
                                    setActiveTab('all');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 14px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                <SlidersHorizontal size={14} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Responsive Wrapper */}
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'left',
                        minWidth: '950px'
                    }}>
                        <thead>
                            <tr style={{
                                borderTop: '1px solid #f1f5f9',
                                borderBottom: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff'
                            }}>
                                <th
                                    onClick={() => handleSort('title')}
                                    style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer', width: '32%' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Title <ArrowUpDown size={13} color="#94a3b8" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('number_of_questions')}
                                    style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Total Questions <ArrowUpDown size={13} color="#94a3b8" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('duration_minutes')}
                                    style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Duration <ArrowUpDown size={13} color="#94a3b8" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('total_marks')}
                                    style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Max Marks <ArrowUpDown size={13} color="#94a3b8" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('start_date')}
                                    style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Start Time <ArrowUpDown size={13} color="#94a3b8" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('end_date')}
                                    style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        End Time <ArrowUpDown size={13} color="#94a3b8" />
                                    </div>
                                </th>
                                <th style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>
                                    {/* Action button header */}
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedExams.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                                            No exams found
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                            Try adjusting your search query or tab filter.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedExams.map((exam, idx) => {
                                    const numQuestions = exam.number_of_questions || '-';
                                    const durationStr = formatDuration(exam.duration_minutes);
                                    const maxMarksStr = exam.total_marks ? Number(exam.total_marks).toFixed(2) : '0.00';
                                    const startTimeStr = formatDateTime(exam.start_date);
                                    const endTimeStr = formatDateTime(exam.end_date);

                                    // Display status label underneath title
                                    let statusSubtext = 'Not Attempted';
                                    if (exam.status === 'completed') statusSubtext = 'Completed';
                                    else if (exam.status === 'in_progress') statusSubtext = 'In Progress';
                                    else if (exam.status === 'missed') statusSubtext = 'Missed';
                                    else if (exam.status === 'upcoming') statusSubtext = 'Upcoming';

                                    return (
                                        <tr
                                            key={exam.id}
                                            style={{
                                                borderBottom: idx === paginatedExams.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {/* Title Column with Sub-status */}
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '3px', lineHeight: '1.4' }}>
                                                    {exam.title}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                                                    {statusSubtext}
                                                </div>
                                            </td>

                                            {/* Total Questions */}
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#475569', verticalAlign: 'middle' }}>
                                                {numQuestions}
                                            </td>

                                            {/* Duration */}
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#475569', verticalAlign: 'middle' }}>
                                                {durationStr}
                                            </td>

                                            {/* Max Marks */}
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#475569', verticalAlign: 'middle' }}>
                                                {maxMarksStr}
                                            </td>

                                            {/* Start Time */}
                                            <td style={{ padding: '16px', fontSize: '13px', color: '#475569', verticalAlign: 'middle' }}>
                                                {startTimeStr}
                                            </td>

                                            {/* End Time */}
                                            <td style={{ padding: '16px', fontSize: '13px', color: '#475569', verticalAlign: 'middle' }}>
                                                {endTimeStr}
                                            </td>

                                            {/* Action Button */}
                                            <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                {exam.status === 'completed' ? (
                                                    <button
                                                        onClick={() => handleActionClick(exam)}
                                                        style={{
                                                            padding: '8px 18px',
                                                            backgroundColor: 'white',
                                                            color: '#2563eb',
                                                            border: '1px solid #3b82f6',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                    >
                                                        View Result
                                                    </button>
                                                ) : exam.status === 'in_progress' ? (
                                                    <button
                                                        onClick={() => handleActionClick(exam)}
                                                        style={{
                                                            padding: '8px 18px',
                                                            backgroundColor: '#2563eb',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                                                        }}
                                                    >
                                                        Resume
                                                    </button>
                                                ) : exam.status === 'missed' ? (
                                                    <button
                                                        disabled
                                                        style={{
                                                            padding: '8px 18px',
                                                            backgroundColor: '#f1f5f9',
                                                            color: '#94a3b8',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'not-allowed'
                                                        }}
                                                    >
                                                        Missed
                                                    </button>
                                                ) : exam.status === 'upcoming' ? (
                                                    <button
                                                        disabled
                                                        style={{
                                                            padding: '8px 18px',
                                                            backgroundColor: '#f8fafc',
                                                            color: '#64748b',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'default'
                                                        }}
                                                    >
                                                        Upcoming
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActionClick(exam)}
                                                        style={{
                                                            padding: '8px 18px',
                                                            backgroundColor: 'white',
                                                            color: '#059669',
                                                            border: '1px solid #10b981',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#ecfdf5';
                                                            e.currentTarget.style.borderColor = '#059669';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                            e.currentTarget.style.borderColor = '#10b981';
                                                        }}
                                                    >
                                                        Start Now
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls Footer */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredExams.length)} of {filteredExams.length} exams
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>

                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '600', padding: '0 8px' }}>
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamPortal;
