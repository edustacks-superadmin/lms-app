'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useFeatureFlags } from '../../../context/FeatureFlagsContext';
import { Trophy, User } from 'lucide-react';

export default function Ranking() {
    const { isFeatureEnabled } = useFeatureFlags();
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Check if names should be hidden (feature flag)
    const hideNames = isFeatureEnabled('hideLeaderboardNames');

    useEffect(() => {
        fetchLeaders();
    }, []);

    const fetchLeaders = async () => {
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                p_time_filter: 'all_time',
                p_limit: 100
            });
            if (!error && data) setLeaders(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Get display name based on setting
    const getDisplayName = (student, index) => {
        if (hideNames) {
            return `Student ${student.member_id || index + 1}`;
        }
        return student.name || 'Unknown User';
    };

    // Get initials for avatar
    const getInitials = (student, index) => {
        if (hideNames) {
            const id = student.member_id || index + 1;
            return `#${id}`;
        }
        return student.name ? student.name.charAt(0).toUpperCase() : 'U';
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading leaderboard...</div>;

    return (
        <div className="max-w-[900px] mx-auto p-6 pb-24">

            {/* Header - Mobile Style */}
            <div className="bg-white p-4 px-5 border-b border-slate-100 mb-0">
                <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mr-3 border border-amber-200">
                        <Trophy size={24} className="text-yellow-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 m-0">Overall Ranking</h1>
                        <p className="text-sm text-blue-600 mt-0.5 m-0">Top 100 students all-time</p>
                    </div>
                </div>

                {/* Table Header */}
                <div className="flex py-2 border-b-2 border-slate-100">
                    <span className="w-14 text-center text-xs font-bold text-slate-500 uppercase">Rank</span>
                    <span className="flex-1 px-3 text-xs font-bold text-slate-500 uppercase">Student</span>
                    <span className="w-20 text-center text-xs font-bold text-slate-500 uppercase">Points</span>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="bg-white">
                {leaders.length > 0 ? (
                    leaders.map((student, index) => (
                        <div
                            key={index}
                            className={`flex items-center py-3 border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        >
                            {/* Rank */}
                            <span className={`w-14 text-center font-bold ${index < 3 ? 'text-lg text-yellow-600' : 'text-sm text-slate-500'}`}>
                                #{index + 1}
                            </span>

                            {/* Student */}
                            <div className="flex-1 px-3 flex items-center">
                                {student.photo_url ? (
                                    <img
                                        src={student.photo_url}
                                        alt={getDisplayName(student, index)}
                                        className="w-8 h-8 rounded-full object-cover mr-3 bg-gray-200"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                        <span className="text-blue-600 font-bold text-xs">
                                            {getInitials(student, index)}
                                        </span>
                                    </div>
                                )}
                                <span className="text-sm font-semibold text-slate-700 truncate">
                                    {getDisplayName(student, index)}
                                </span>
                            </div>

                            {/* Points */}
                            <span className="w-20 text-center font-bold text-sm text-blue-600">
                                {student.total_score}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="py-20 px-8 text-center flex flex-col items-center">
                        <Trophy size={64} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium m-0">No rankings available yet.</p>
                        <p className="text-slate-400 text-xs mt-1">Complete courses and exams to earn points!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
