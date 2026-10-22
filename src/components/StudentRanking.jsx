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
            // 1. Fetch current member record if user is logged in
            let currentMember = null;
            if (user?.email) {
                const { data: memberData } = await supabase
                    .from('members')
                    .select('id, display_name, first_name, last_name, email, photo_url')
                    .ilike('email', user.email)
                    .maybeSingle();
                currentMember = memberData;
            }

            // 2. Fetch leaderboard using correct RPC parameters (p_limit, p_time_filter)
            const { data, error } = await supabase
                .rpc('get_leaderboard', { p_limit: 100, p_time_filter: timeFilter });

            if (error) throw error;

            const rows = data || [];
            const memberIds = rows.map(r => r.member_id).filter(Boolean);

            // 3. Fetch exams count for students on the leaderboard
            let attemptCounts = {};
            if (memberIds.length > 0) {
                try {
                    const { data: attempts } = await supabase
                        .from('exam_attempts')
                        .select('member_id')
                        .in('member_id', memberIds)
                        .in('status', ['completed', 'submitted']);

                    (attempts || []).forEach(a => {
                        attemptCounts[a.member_id] = (attemptCounts[a.member_id] || 0) + 1;
                    });
                } catch (attErr) {
                    console.warn('Error fetching attempt counts:', attErr);
                }
            }

            // 4. Enrich rankings with current user match and exams count
            const enrichedRankings = rows.map((rank, index) => {
                const isCurrentUser = Boolean(currentMember && rank.member_id === currentMember.id);
                return {
                    ...rank,
                    rank: rank.rank || (index + 1),
                    name: isCurrentUser
                        ? (currentMember.display_name || currentMember.first_name || user?.user_metadata?.full_name || rank.name)
                        : rank.name,
                    photo_url: isCurrentUser ? (currentMember.photo_url || rank.photo_url) : rank.photo_url,
                    isCurrentUser,
                    totalScore: rank.total_score || 0,
                    examsTaken: attemptCounts[rank.member_id] || 1
                };
            });

            setRankings(enrichedRankings);

            // 5. Compute user's own rank stats
            if (currentMember) {
                const myRank = enrichedRankings.find(r => r.member_id === currentMember.id);

                let myExams = myRank?.examsTaken || 0;
                let myScore = myRank?.totalScore || 0;

                // If user is not yet in the returned rankings, query their attempts directly
                if (!myRank) {
                    try {
                        const { data: myAttempts } = await supabase
                            .from('exam_attempts')
                            .select('score')
                            .eq('member_id', currentMember.id)
                            .in('status', ['completed', 'submitted']);

                        if (myAttempts && myAttempts.length > 0) {
                            myExams = myAttempts.length;
                            myScore = myAttempts.reduce((sum, item) => sum + (item.score || 0), 0);
                        }
                    } catch (myErr) {
                        console.warn('Error fetching user attempts:', myErr);
                    }
                }

                setUserRank({
                    rank: myRank ? myRank.rank : null,
                    totalScore: myScore,
                    examsTaken: myExams
                });
            } else {
                setUserRank(null);
            }

        } catch (error) {
            console.error('Error fetching rankings:', error);
            setRankings([]);
            setUserRank(null);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy size={22} color="#FFD700" fill="#FFD700" />;
        if (rank === 2) return <Medal size={22} color="#C0C0C0" fill="#C0C0C0" />;
        if (rank === 3) return <Medal size={22} color="#CD7F32" fill="#CD7F32" />;
        return <span style={{ fontWeight: 'bold', color: '#666', width: '22px', textAlign: 'center' }}>{rank}</span>;
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header-section">
            <div className="leaderboard-header">
                <h1 className="leaderboard-title">Leaderboard</h1>
                <p className="leaderboard-subtitle">See how you stack up against other students based on exam performance.</p>
            </div>

            {/* Stats Cards */}
            <div className="leaderboard-stats-grid">
                <div className="leaderboard-stat-card">
                    <div className="leaderboard-stat-label">Your Rank</div>
                    <div className="leaderboard-stat-value" style={{ color: 'var(--primary-color)' }}>
                        {userRank && userRank.rank ? `#${userRank.rank}` : '-'}
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

            </div>

            {/* Ranking Table */}
            <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>Rank</th>
                            <th>Student</th>
                            <th className="leaderboard-exams-col" style={{ textAlign: 'center' }}>Exams</th>
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
                            rankings.map((rank, index) => (
                                <tr
                                    key={rank.member_id || index}
                                    style={{
                                        backgroundColor: rank.isCurrentUser ? '#eff6ff' : 'white'
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
                                                    {(rank.name || 'S').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: rank.isCurrentUser ? '700' : '600', color: '#1f2937' }}>
                                                    {rank.name} {rank.isCurrentUser && <span style={{ fontSize: '11px', color: 'var(--primary-color)', marginLeft: '4px', fontWeight: '700' }}>(You)</span>}
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
