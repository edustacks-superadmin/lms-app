'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstitute } from '../../context/InstituteContext';
import { Trophy, Medal, Star, Quote } from 'lucide-react';
import Image from 'next/image';

const AchieversPage = () => {
    const { institute } = useInstitute();
    const [achievers, setAchievers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAchievers = async () => {
            if (!institute?.id) return;

            try {
                // Fetch members marked as achievers for this institute
                const { data: members, error: membersError } = await supabase
                    .from('members')
                    .select('id, display_name, photo_url')
                    .eq('is_achiever', true)
                    .eq('institute_id', institute.id);

                if (membersError) throw membersError;

                if (members && members.length > 0) {
                    const memberIds = members.map(m => m.id);

                    // Fetch achievements for these members
                    const { data: achievements, error: achievementsError } = await supabase
                        .from('member_achievements')
                        .select('*')
                        .in('member_id', memberIds);

                    if (achievementsError) throw achievementsError;

                    // Group achievements by member
                    const combinedData = members.map(member => ({
                        ...member,
                        achievements: achievements.filter(a => a.member_id === member.id)
                    }));

                    setAchievers(combinedData);
                }
            } catch (error) {
                console.error('Error fetching achievers:', error);
                console.error('Error details:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
            } finally {
                setLoading(false);
            }
        };

        fetchAchievers();
    }, [institute?.id]);

    // Helper to get initials if no photo
    const getInitials = (name) => {
        return name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white py-16 lg:py-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/50 border border-blue-700/50 text-blue-200 text-sm font-medium mb-6">
                        <Trophy size={16} className="text-amber-400" />
                        <span>Hall of Fame</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                        Our Results Speak for <span className="text-amber-400">Themselves</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        Celebrating the hard work, dedication, and success of our students who have cleared prestigious exams.
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-[90%] mx-auto px-4 py-16 -mt-10 relative z-20">
                {achievers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No results to show yet</h3>
                        <p className="text-slate-500 mt-2">Check back later for updates!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {achievers.map((achiever) => (
                            <div key={achiever.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col h-full">
                                {/* Header with Pattern */}
                                <div className="h-24 bg-gradient-to-br from-slate-50 to-blue-50/50 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-30 pattern-grid-lg text-blue-100"></div>
                                </div>

                                {/* Profile Image & Info */}
                                <div className="px-6 pb-6 pt-0 flex-1 flex flex-col items-center -mt-12 text-center relative">
                                    <div className="relative mb-4">
                                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white overflow-hidden relative z-10">
                                            {achiever.photo_url ? (
                                                <img
                                                    src={achiever.photo_url}
                                                    alt={achiever.display_name}
                                                    className="w-full h-full object-cover object-top"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl">
                                                    {getInitials(achiever.display_name)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 z-20 bg-amber-100 text-amber-600 rounded-full p-1.5 shadow-sm border border-white">
                                            <Medal size={16} />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                                        {achiever.display_name}
                                    </h3>

                                    {/* Quote Section */}
                                    {(achiever.achievements.find(a => a.quote) || {}).quote && (
                                        <div className="mt-3 relative px-4">
                                            <Quote size={16} className="absolute -top-1 left-0 text-blue-100 transform -scale-x-100" />
                                            <p className="text-sm text-slate-600 italic leading-relaxed z-10 relative">
                                                "{achiever.achievements.find(a => a.quote).quote}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Achievements List */}
                                    <div className="mt-6 w-full space-y-3">
                                        {achiever.achievements.map((achievement, idx) => (
                                            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                                                <div className="text-left">
                                                    <div className="font-semibold text-slate-800 text-sm">
                                                        {achievement.exam_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {achievement.year}
                                                    </div>
                                                </div>
                                                {achievement.rank && (
                                                    <div className="px-2.5 py-1 bg-white rounded-lg shadow-sm border border-slate-100 text-xs font-bold text-blue-600 flex items-center gap-1">
                                                        <Trophy size={10} className="text-amber-500" />
                                                        {achievement.rank}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {achiever.achievements.length === 0 && (
                                            <div className="text-sm text-slate-400 italic">No specific exam details listed.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AchieversPage;
