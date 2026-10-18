import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Search, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const StudentRanking = () => {
    const { user } = useAuth();
    const { isFeatureEnabled } = useFeatureFlags();
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRank, setUserRank] = useState(null);
    const [timeFilter, setTimeFilter] = useState('all');

    // Check if names should be hidden (feature flag)
    const hideNames = isFeatureEnabled('hideLeaderboardNames');

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
                // Build masked or real name
                let displayName;
                if (isCurrentUser) {
                    displayName = user.user_metadata?.full_name || 'You';
                } else if (hideNames) {
                    displayName = `Student ${rank.member_id || index + 1}`;
                } else {
                    displayName = rank.name;
                }
                return {
                    ...rank,
                    rank: index + 1,
                    name: displayName,
                    showPhoto: !hideNames || isCurrentUser,
                    photo_url: rank.photo_url,
                    isCurrentUser,
                    totalScore: rank.total_score,
                    examsTaken: rank.exams_taken,
                    lastActive: new Date().toISOString()
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
        if (rank === 1) return <Trophy size={24} className="text-yellow-500 fill-yellow-500" />;
        if (rank === 2) return <Medal size={24} className="text-gray-400 fill-gray-400" />;
        if (rank === 3) return <Medal size={24} className="text-orange-400 fill-orange-400" />;
        return <span className="font-bold text-gray-500 w-6 text-center">{rank}</span>;
    };

    return (
        <div className="leaderboard-container">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Leaderboard</h1>
                <p className="text-gray-500">See how you stack up against other students based on exam performance.</p>
            </div>

            {/* Stats Cards */}
            <div className="leaderboard-stats-grid grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-2">Your Rank</div>
                    <div className="text-2xl font-bold text-[var(--primary-color)]">
                        {userRank ? `#${userRank.rank}` : '-'}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-2">Total Score</div>
                    <div className="text-2xl font-bold text-emerald-500">
                        {userRank ? userRank.totalScore : 0}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm mb-2">Exams Taken</div>
                    <div className="text-2xl font-bold text-indigo-500">
                        {userRank ? userRank.examsTaken : 0}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="leaderboard-filters flex gap-2 mb-6">
                <button
                    onClick={() => setTimeFilter('all')}
                    className={`leaderboard-filter-btn px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${timeFilter === 'all' ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    All Time
                </button>
                <button
                    onClick={() => setTimeFilter('month')}
                    className={`leaderboard-filter-btn px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${timeFilter === 'month' ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    This Month
                </button>
                <button
                    onClick={() => setTimeFilter('week')}
                    className={`leaderboard-filter-btn px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${timeFilter === 'week' ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    This Week
                </button>
            </div>

            {/* Ranking Table */}
            <div className="leaderboard-table-container bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="leaderboard-table w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="w-[60px] py-3 px-4 text-left text-sm font-semibold text-gray-700">Rank</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Student</th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Exams</th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Total Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="p-10 text-center text-gray-500">Loading rankings...</td>
                            </tr>
                        ) : rankings.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-10 text-center text-gray-500">No rankings available yet.</td>
                            </tr>
                        ) : (
                            rankings.map((rank) => (
                                <tr
                                    key={rank.user_id}
                                    className={`border-b border-gray-100 ${rank.isCurrentUser ? 'bg-blue-50' : 'bg-white'}`}
                                >
                                    <td className="py-3 px-4">
                                        <div className="leaderboard-rank-cell flex items-center justify-center">
                                            {getRankIcon(rank.rank)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="leaderboard-student-cell flex items-center gap-3">
                                            {rank.photo_url ? (
                                                <img
                                                    src={rank.photo_url}
                                                    alt={rank.name}
                                                    className={`leaderboard-avatar w-10 h-10 rounded-full object-cover ${rank.isCurrentUser ? 'border-2 border-[var(--primary-color)]' : ''}`}
                                                />
                                            ) : (
                                                <div className={`leaderboard-avatar-placeholder w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${rank.isCurrentUser ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                    {rank.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {rank.name} {rank.isCurrentUser && <span className="text-xs text-[var(--primary-color)] ml-1">(You)</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center text-gray-600 font-medium">
                                        {rank.examsTaken}
                                    </td>
                                    <td className="py-3 px-4 text-center text-emerald-500 font-bold">
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
