import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Search, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const StudentRanking = () => {
    const { user } = useAuth();
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRank, setUserRank] = useState(null);
    const [timeFilter, setTimeFilter] = useState('all'); // all, month, week

    useEffect(() => {
        fetchRankings();
    }, [timeFilter, user]);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('get_leaderboard', { time_filter: timeFilter });

            if (error) throw error;

            const enrichedRankings = data.map((rank, index) => {
                const isCurrentUser = user && rank.user_id === user.id;
                return {
                    ...rank,
                    rank: index + 1,
                    name: isCurrentUser ? (user.user_metadata?.full_name || 'You') : rank.name,
                    photo_url: rank.photo_url,
                    isCurrentUser,
                    totalScore: rank.total_score,
                    examsTaken: rank.exams_taken,
                    lastActive: new Date().toISOString() // RPC doesn't return this, using current time as placeholder or could be added to RPC
                };
            });

            setRankings(enrichedRankings);

            if (user) {
                const myRank = enrichedRankings.find(r => r.user_id === user.id);
                setUserRank(myRank);
            }

        } catch (error) {
            console.error('Error fetching rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy size={24} color="#FFD700" fill="#FFD700" />;
        if (rank === 2) return <Medal size={24} color="#C0C0C0" fill="#C0C0C0" />;
        if (rank === 3) return <Medal size={24} color="#CD7F32" fill="#CD7F32" />;
        return <span style={{ fontWeight: 'bold', color: '#666', width: '24px', textAlign: 'center' }}>{rank}</span>;
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h1 className="leaderboard-title">Leaderboard</h1>
                <p className="leaderboard-subtitle">See how you stack up against other students based on exam performance.</p>
            </div>

            {/* Stats Cards */}
            <div className="leaderboard-stats-grid">
                <div className="leaderboard-stat-card">
                    <div className="leaderboard-stat-label">Your Rank</div>
                    <div className="leaderboard-stat-value" style={{ color: 'var(--primary-color)' }}>
                        {userRank ? `#${userRank.rank}` : '-'}
                    </div>
                </div>
                <div className="leaderboard-stat-card">
                    <div className="leaderboard-stat-label">Total Score</div>
                    <div className="leaderboard-stat-value" style={{ color: '#10b981' }}>
                        {userRank ? userRank.totalScore : 0}
                    </div>
                </div>
                <div className="leaderboard-stat-card">
                    <div className="leaderboard-stat-label">Exams Taken</div>
                    <div className="leaderboard-stat-value" style={{ color: '#6366f1' }}>
                        {userRank ? userRank.examsTaken : 0}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="leaderboard-filters">
                <button
                    onClick={() => setTimeFilter('all')}
                    className={`leaderboard-filter-btn ${timeFilter === 'all' ? 'active' : 'inactive'}`}
                >
                    All Time
                </button>
                <button
                    onClick={() => setTimeFilter('month')}
                    className={`leaderboard-filter-btn ${timeFilter === 'month' ? 'active' : 'inactive'}`}
                >
                    This Month
                </button>
                <button
                    onClick={() => setTimeFilter('week')}
                    className={`leaderboard-filter-btn ${timeFilter === 'week' ? 'active' : 'inactive'}`}
                >
                    This Week
                </button>
            </div>

            {/* Ranking Table */}
            <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Rank</th>
                            <th>Student</th>
                            <th style={{ textAlign: 'center' }}>Exams</th>
                            <th style={{ textAlign: 'center' }}>Total Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="leaderboard-empty-cell">Loading rankings...</td>
                            </tr>
                        ) : rankings.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="leaderboard-empty-cell">No rankings available yet.</td>
                            </tr>
                        ) : (
                            rankings.map((rank) => (
                                <tr
                                    key={rank.user_id}
                                    style={{
                                        backgroundColor: rank.isCurrentUser ? '#f0f9ff' : 'white'
                                    }}
                                >
                                    <td>
                                        <div className="leaderboard-rank-cell">
                                            {getRankIcon(rank.rank)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="leaderboard-student-cell">
                                            {rank.photo_url ? (
                                                <img
                                                    src={rank.photo_url}
                                                    alt={rank.name}
                                                    className="leaderboard-avatar"
                                                    style={{
                                                        border: rank.isCurrentUser ? '2px solid var(--primary-color)' : 'none'
                                                    }}
                                                />
                                            ) : (
                                                <div className="leaderboard-avatar-placeholder" style={{
                                                    backgroundColor: rank.isCurrentUser ? 'var(--primary-color)' : '#e5e7eb',
                                                    color: rank.isCurrentUser ? 'white' : '#6b7280',
                                                }}>
                                                    {rank.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                                    {rank.name} {rank.isCurrentUser && <span style={{ fontSize: '12px', color: 'var(--primary-color)', marginLeft: '4px' }}>(You)</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#4b5563', fontWeight: '500' }}>
                                        {rank.examsTaken}
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: '700' }}>
                                        {rank.totalScore}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentRanking;
