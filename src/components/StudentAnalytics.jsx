import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { BarChart2, TrendingUp, Award, Clock } from 'lucide-react';

const StudentAnalytics = () => {
    const { user } = useAuth();
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        totalTime: 0
    });

    useEffect(() => {
        if (user) {
            fetchAnalytics();
        }
    }, [user]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Fetch student member ID
            let memberId = null;
            if (user?.email) {
                const { data: member } = await supabase
                    .from('members')
                    .select('id')
                    .eq('email', user.email)
                    .maybeSingle();
                if (member) memberId = member.id;
            }

            if (!memberId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('exam_attempts')
                .select(`
                    *,
                    exam:exams (
                        title,
                        total_marks
                    )
                `)
                .eq('member_id', memberId)
                .in('status', ['completed', 'submitted'])
                .order('submitted_at', { ascending: true });

            if (error) throw error;

            if (data) {
                setAttempts(data);

                // Fetch exam answers for detailed stats
                const { data: answersData } = await supabase
                    .from('exam_answers')
                    .select('is_correct, selected_option_index')
                    .in('attempt_id', data.map(a => a.id));

                calculateStats(data, answersData || []);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data, answers) => {
        if (data.length === 0) return;

        const totalExams = data.length;
        const totalScore = data.reduce((sum, item) => sum + (item.score || 0), 0);

        // Use total_marks from attempt, fallback to exam.total_marks
        const totalMaxScore = data.reduce((sum, item) => {
            const max = item.total_marks || item.exam?.total_marks || 0;
            return sum + max;
        }, 0);

        // Calculate average percentage
        const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

        const highest = data.reduce((max, item) => {
            const maxScore = item.total_marks || item.exam?.total_marks || 0;
            const percentage = maxScore > 0 ? (item.score / maxScore) * 100 : 0;
            return Math.max(max, percentage);
        }, 0);

        // Only count answers where an option was actually selected (not null)
        const totalQuestionsAnswered = answers.filter(a => a.selected_option_index !== null).length;
        const totalCorrectAnswers = answers.filter(a => a.is_correct).length;

        setStats({
            totalExams,
            totalScore,
            averageScore: Math.round(averagePercentage),
            highestScore: Math.round(highest),
            totalQuestionsAnswered,
            totalCorrectAnswers,
            totalTime: 0
        });
    };

    if (loading) return <div className="p-8 text-center">Loading analytics...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <BarChart2 size={32} color="#2563eb" />
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Analytics & Insights</h1>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                marginBottom: '48px'
            }}>
                <div style={cardStyle}>
                    <div style={{ ...iconBoxStyle, backgroundColor: '#eff6ff', color: '#2563eb' }}>
                        <Award size={24} />
                    </div>
                    <div>
                        <p style={labelStyle}>Average Score</p>
                        <p style={valueStyle}>{stats.averageScore}%</p>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ ...iconBoxStyle, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={labelStyle}>Highest Score</p>
                        <p style={valueStyle}>{stats.highestScore}%</p>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ ...iconBoxStyle, backgroundColor: '#fff7ed', color: '#ea580c' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={labelStyle}>Exams Completed</p>
                        <p style={valueStyle}>{stats.totalExams}</p>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ ...iconBoxStyle, backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                        <Award size={24} />
                    </div>
                    <div>
                        <p style={labelStyle}>Total Score</p>
                        <p style={valueStyle}>{Number(stats.totalScore || 0).toFixed(1)}</p>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ ...iconBoxStyle, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <p style={labelStyle}>Questions Answered</p>
                        <p style={valueStyle}>{stats.totalQuestionsAnswered}</p>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ ...iconBoxStyle, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={labelStyle}>Correct Answers</p>
                        <p style={valueStyle}>{stats.totalCorrectAnswers}</p>
                    </div>
                </div>
            </div>

            {/* Performance Chart */}
            <div style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Performance History</h3>

                {attempts.length > 0 ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        height: '300px',
                        gap: '20px',
                        paddingTop: '20px',
                        borderBottom: '1px solid #e5e7eb'
                    }}>
                        {attempts.slice(-10).map((attempt, index) => {
                            const percentage = attempt.total_marks > 0
                                ? Math.round((attempt.score / attempt.total_marks) * 100)
                                : 0;

                            return (
                                <div key={attempt.id} style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div
                                        style={{
                                            width: '100%',
                                            maxWidth: '60px',
                                            height: `${percentage}%`,
                                            backgroundColor: percentage >= 70 ? '#22c55e' : percentage >= 40 ? '#f59e0b' : '#ef4444',
                                            borderRadius: '8px 8px 0 0',
                                            transition: 'height 0.5s ease',
                                            position: 'relative',
                                            minHeight: '4px'
                                        }}
                                        title={`${attempt.exam?.title}: ${percentage}%`}
                                    >
                                        <span style={{
                                            position: 'absolute',
                                            top: '-25px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: '#374151'
                                        }}>
                                            {percentage}%
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '100%'
                                    }}>
                                        {new Date(attempt.submitted_at || attempt.started_at || attempt.completed_at || attempt.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                        No exam data available yet.
                    </div>
                )}
            </div>
        </div>
    );
};

const cardStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
};

const iconBoxStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const labelStyle = {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
    fontWeight: '500'
};

const valueStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0
};

export default StudentAnalytics;
