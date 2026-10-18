'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, BarChart3, Download, Eye, ArrowUpDown, ArrowUp, ArrowDown, Trash2, RotateCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ExamStatistics = ({ examId }) => {
    const params = useParams();
    const id = examId || params?.id;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [stats, setStats] = useState({
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0
    });

    useEffect(() => {
        fetchExamStatistics();
    }, [id]);

    const fetchExamStatistics = async () => {
        try {
            // Fetch exam details
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .single();

            if (examError) throw examError;
            setExam(examData);

            // Fetch all attempts for this exam
            const { data: attemptsData, error: attemptsError } = await supabase
                .from('exam_attempts')
                .select('*')
                .eq('exam_id', id)

                .order('started_at', { ascending: false });

            if (attemptsError) {
                console.error('Error fetching attempts:', attemptsError);
                throw attemptsError;
            }
            console.log('Fetched attempts:', attemptsData);

            // Fetch member details for these attempts
            let attemptsWithMembers = [];
            if (attemptsData && attemptsData.length > 0) {
                const memberIds = [...new Set(attemptsData.map(a => a.member_id))];

                const { data: membersData, error: membersError } = await supabase
                    .from('members')
                    .select('id, display_name, email')
                    .in('id', memberIds);

                if (membersError) {
                    console.error('Error fetching members:', membersError);
                }

                attemptsWithMembers = attemptsData.map(attempt => {
                    const member = membersData?.find(m => m.id === attempt.member_id);
                    return {
                        ...attempt,
                        members: member ? {
                            ...member,
                            full_name: member.display_name, // Map display_name to full_name for UI compatibility
                            username: member.email // Use email as fallback for username
                        } : { full_name: 'Unknown', email: 'N/A', username: 'N/A' }
                    };
                });
            }

            // For each attempt, fetch answer statistics
            const attemptsWithStats = await Promise.all(
                attemptsWithMembers.map(async (attempt) => {
                    const { data: answers } = await supabase
                        .from('exam_answers')
                        .select('is_correct')
                        .eq('attempt_id', attempt.id);

                    const totalQuestions = answers?.length || 0;
                    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
                    const incorrectAnswers = totalQuestions - correctAnswers;
                    const percentage = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : 0;

                    return {
                        ...attempt,
                        totalQuestions,
                        correctAnswers,
                        incorrectAnswers,
                        percentage
                    };
                })
            );

            setAttempts(attemptsWithStats);
            calculateStats(attemptsWithStats, examData);

        } catch (error) {
            console.error('Error fetching exam statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (currentAttempts, currentExam) => {
        if (currentAttempts.length > 0) {
            const scores = currentAttempts.map(a => parseFloat(a.percentage));
            const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
            const passRate = ((currentAttempts.filter(a => parseFloat(a.percentage) >= (currentExam.passing_marks / currentExam.total_marks * 100)).length / currentAttempts.length) * 100).toFixed(2);

            setStats({
                totalAttempts: currentAttempts.length,
                averageScore: avgScore,
                passRate: passRate,
                highestScore: Math.max(...scores).toFixed(2),
                lowestScore: Math.min(...scores).toFixed(2)
            });
        } else {
            setStats({
                totalAttempts: 0,
                averageScore: 0,
                passRate: 0,
                highestScore: 0,
                lowestScore: 0
            });
        }
    };

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [attemptToDelete, setAttemptToDelete] = useState(null);

    const handleDeleteClick = (attempt) => {
        setAttemptToDelete(attempt);
        setDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!attemptToDelete) return;

        try {
            const { error } = await supabase
                .from('exam_attempts')
                .delete()
                .eq('id', attemptToDelete.id);

            if (error) throw error;

            // Update local state
            const updatedAttempts = attempts.filter(a => a.id !== attemptToDelete.id);
            setAttempts(updatedAttempts);
            calculateStats(updatedAttempts, exam);

            // Re-fetch to ensure sync
            fetchExamStatistics();

            // Close modal
            setDeleteModalOpen(false);
            setAttemptToDelete(null);

        } catch (error) {
            console.error("Error deleting attempt:", error);
            alert("Failed to delete attempt.");
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    const filteredAttempts = attempts.filter(attempt => {
        const searchLower = searchQuery.toLowerCase();
        return (
            attempt.members?.full_name?.toLowerCase().includes(searchLower) ||
            attempt.members?.email?.toLowerCase().includes(searchLower) ||
            attempt.members?.username?.toLowerCase().includes(searchLower)
        );
    });

    // Sort filtered attempts
    const sortedAttempts = [...filteredAttempts].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue, bValue;

        switch (sortConfig.key) {
            case 'name':
                aValue = a.members?.full_name || '';
                bValue = b.members?.full_name || '';
                break;
            case 'username':
                aValue = a.members?.username || a.members?.email || '';
                bValue = b.members?.username || b.members?.email || '';
                break;
            case 'answered':
                aValue = a.totalQuestions;
                bValue = b.totalQuestions;
                break;
            case 'correct':
                aValue = a.correctAnswers;
                bValue = b.correctAnswers;
                break;
            case 'incorrect':
                aValue = a.incorrectAnswers;
                bValue = b.incorrectAnswers;
                break;
            case 'score':
                aValue = a.score || 0;
                bValue = b.score || 0;
                break;
            case 'percentage':
                aValue = parseFloat(a.percentage);
                bValue = parseFloat(b.percentage);
                break;
            case 'startDate':
                aValue = new Date(a.started_at);
                bValue = new Date(b.started_at);
                break;
            case 'endDate':
                aValue = a.completed_at ? new Date(a.completed_at) : new Date(0);
                bValue = b.completed_at ? new Date(b.completed_at) : new Date(0);
                break;
            default:
                return 0;
        }

        if (typeof aValue === 'string') {
            return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        return sortConfig.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue;
    });

    const handleExportCSV = () => {
        if (sortedAttempts.length === 0) {
            alert('No data to export');
            return;
        }

        // Define headers
        const headers = [
            'Rank',
            'Name',
            'Username/Email',
            'Answered',
            'Correct',
            'Incorrect',
            'Score',
            'Percentage',
            'Duration'
        ];

        // Helper to calculate duration in milliseconds
        const getDurationMs = (startTime, endTime) => {
            if (!startTime || !endTime) return Infinity; // N/A goes last
            const start = new Date(startTime);
            const end = new Date(endTime);
            const diffMs = end - start;
            return diffMs < 0 ? Infinity : diffMs;
        };

        // Helper to format duration
        const formatDuration = (startTime, endTime) => {
            if (!startTime || !endTime) return 'N/A';
            const start = new Date(startTime);
            const end = new Date(endTime);
            const diffMs = end - start;
            if (diffMs < 0) return 'N/A';

            const diffSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const seconds = diffSeconds % 60;

            if (hours > 0) {
                return `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            } else {
                return `${seconds}s`;
            }
        };

        // Sort by score (highest first), then by duration (shortest first for same score)
        const rankedAttempts = [...sortedAttempts].sort((a, b) => {
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;

            // Primary sort: Higher score first
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }

            // Secondary sort: Shorter duration first (tiebreaker)
            const durationA = getDurationMs(a.started_at, a.submitted_at);
            const durationB = getDurationMs(b.started_at, b.submitted_at);
            return durationA - durationB;
        });

        // Format data rows with rank
        const rows = rankedAttempts.map((attempt, index) => {
            const name = attempt.members?.full_name || 'N/A';
            const username = attempt.members?.username || attempt.members?.email || 'N/A';
            const duration = formatDuration(attempt.started_at, attempt.submitted_at);

            // Escape quotes and wrap in quotes to handle commas in data
            const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;

            return [
                index + 1, // Rank
                escape(name),
                escape(username),
                attempt.totalQuestions,
                attempt.correctAnswers,
                attempt.incorrectAnswers,
                attempt.score?.toFixed(2) || '0.00',
                `${attempt.percentage}%`,
                escape(duration)
            ].join(',');
        });

        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Create blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${exam?.title || 'Exam'}_Statistics.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading statistics...</div>;
    }

    if (!exam) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Exam not found.</div>;
    }

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={24} color="#333" />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>
                        {exam.title} - Statistics
                    </h1>
                    <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
                        View all student attempts and results
                    </p>
                </div>
            </div>

            {/* Summary Statistics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Total Attempts</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#00bfa5' }}>{stats.totalAttempts}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Average Score</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#2196f3' }}>{stats.averageScore}%</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Pass Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#4caf50' }}>{stats.passRate}%</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Highest Score</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#ff9800' }}>{stats.highestScore}%</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Lowest Score</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#f44336' }}>{stats.lowestScore}%</div>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="input-group" style={{ width: '400px' }}>
                    <input
                        type="text"
                        placeholder="Search by name, email, or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button><Search size={18} /></button>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={fetchExamStatistics}
                        disabled={loading}
                    >
                        <RotateCw size={16} className={loading && "animate-spin"} /> Refresh
                    </button>
                    <button
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={handleExportCSV}
                    >
                        <Download size={16} /> Export to CSV
                    </button>
                </div>
            </div>

            {/* Attempts Table */}
            <div style={{
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                overflowX: 'auto',
                width: '100%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333' }}>S.no</th>
                            <th
                                onClick={() => handleSort('name')}
                                style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Name {getSortIcon('name')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('username')}
                                style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Username {getSortIcon('username')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('answered')}
                                style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    Answered {getSortIcon('answered')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('correct')}
                                style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    Correct {getSortIcon('correct')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('incorrect')}
                                style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    Incorrect {getSortIcon('incorrect')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('score')}
                                style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    Score {getSortIcon('score')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('percentage')}
                                style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    Percentage {getSortIcon('percentage')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('startDate')}
                                style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Start Date {getSortIcon('startDate')}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('endDate')}
                                style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    End Date {getSortIcon('endDate')}
                                </div>
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAttempts.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                                    {searchQuery ? 'No attempts match your search.' : 'No attempts yet.'}
                                </td>
                            </tr>
                        ) : (
                            sortedAttempts.map((attempt, index) => (
                                <tr key={attempt.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333' }}>{index + 1}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#007bff', fontWeight: '500' }}>
                                        {attempt.members?.full_name || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>
                                        {attempt.members?.username || attempt.members?.email || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333', textAlign: 'center' }}>
                                        {attempt.totalQuestions}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4caf50', textAlign: 'center', fontWeight: '500' }}>
                                        {attempt.correctAnswers}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#f44336', textAlign: 'center', fontWeight: '500' }}>
                                        {attempt.incorrectAnswers}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333', textAlign: 'center' }}>
                                        {attempt.score?.toFixed(2) || '0.00'}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            background: parseFloat(attempt.percentage) >= 50 ? '#e8f5e9' : '#ffebee',
                                            color: parseFloat(attempt.percentage) >= 50 ? '#4caf50' : '#f44336'
                                        }}>
                                            {attempt.percentage}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                                        {new Date(attempt.started_at).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                                        {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : 'In Progress'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', minWidth: '150px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                title="View Details"
                                                onClick={() => router.push(`/exams/result/${attempt.id}`)}
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#f44336', borderColor: '#f44336' }}
                                                title="Delete Attempt"
                                                onClick={() => handleDeleteClick(attempt)}
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>


            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setAttemptToDelete(null);
                }}
                onConfirm={executeDelete}
                title="Delete Attempt"
                message="Are you sure you want to delete this student's attempt? This will permanently remove their score and answers. This action cannot be undone."
                itemName={attemptToDelete?.members?.full_name ? `${attemptToDelete.members.full_name}'s Attempt` : 'Selected Attempt'}
                confirmText="Delete Attempt"
                cancelText="Keep Attempt"
            />
        </div >
    );
};

export default ExamStatistics;
