'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { Trophy, Clock, Calendar, ArrowLeft, Medal, User } from 'lucide-react';

const ExamResultPage = () => {
    const { id } = useParams();
    const router = useRouter();
    const [exam, setExam] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // 1. Fetch Exam Details
                const { data: examData, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (examError) throw examError;

                // Check if public and published
                if (!examData.is_public_result) {
                    setError("This exam's results are not public.");
                    setLoading(false);
                    return;
                }

                if (new Date(examData.result_publish_date) > new Date()) {
                    setError(`Results will be published on ${new Date(examData.result_publish_date).toLocaleString()}`);
                    setLoading(false);
                    return;
                }

                setExam(examData);

                // 2. Fetch Leaderboard via RPC
                const { data: leaderboardData, error: leaderboardError } = await supabase
                    .rpc('get_exam_leaderboard', { _exam_id: id });

                if (leaderboardError) throw leaderboardError;

                setResults(leaderboardData || []);

            } catch (err) {
                console.error("Error loading results:", err);
                setError(err.message || "Failed to load results");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchResults();
    }, [id]);

    const getMedalColor = (index) => {
        switch (index) {
            case 0: return 'text-amber-400'; // Gold
            case 1: return 'text-slate-400'; // Silver
            case 2: return 'text-amber-700'; // Bronze
            default: return 'text-slate-300';
        }
    };

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) return '-';
        if (seconds === 0) return '< 1s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m === 0) return `${s}s`;
        return `${m}m ${s}s`;
    };



    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md">
                <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
                <p className="text-slate-600 mb-6">{error}</p>
                <button
                    onClick={() => router.push('/results')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Back to Results
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <button
                        onClick={() => router.push('/results')}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-2 text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> Back to All Results
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">{exam?.title} Result</h1>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(exam?.start_date).toDateString()}</span>
                        <span className="flex items-center gap-1"><User size={12} /> {results.length} Participants</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">

                {/* Exam Details Cards */}
                {exam && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Questions</div>
                            <div className="text-xl font-bold text-slate-900">{exam.number_of_questions || 0}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Duration</div>
                            <div className="text-xl font-bold text-slate-900">{exam.duration_minutes || 0} mins</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Exam Date</div>
                            <div className="text-lg font-bold text-slate-900">
                                {exam.start_date ? new Date(exam.start_date).toLocaleDateString() : '-'}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Mark / Question</div>
                            <div className="text-xl font-bold text-slate-900">
                                {exam.marks_per_question
                                    ? Number(exam.marks_per_question)
                                    : (exam.total_marks && exam.number_of_questions
                                        ? (Number(exam.total_marks) / Number(exam.number_of_questions)).toFixed(2).replace(/\.00$/, '')
                                        : '-')}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Marks</div>
                            <div className="text-xl font-bold text-slate-900 text-blue-600">{exam.total_marks || 0}</div>
                        </div>
                    </div>
                )}

                {/* Top 3 Podium */}
                {results.length > 0 && (
                    <div className="flex justify-center items-end gap-4 mb-12 min-h-[200px]">
                        {/* 2nd Place */}
                        {results[1] && (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full border-4 border-slate-200 overflow-hidden mb-3 relative">
                                    {results[1].member_photo ? (
                                        <img src={results[1].member_photo} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 text-xl font-bold">
                                            {results[1].member_name[0]}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/10" />
                                </div>
                                <div className="bg-white border border-slate-200 shadow-sm rounded-t-lg p-4 w-32 md:w-40 text-center h-32 flex flex-col justify-end relative">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs font-bold border-2 border-white">2</div>
                                    <div className="font-bold text-slate-900 truncate w-full text-sm">{results[1].member_name}</div>
                                    <div className="text-blue-600 font-bold">{results[1].score}/{exam.total_marks}</div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {results[0] && (
                            <div className="flex flex-col items-center">
                                <div className="relative mb-3">
                                    <div className="w-20 h-20 rounded-full border-4 border-amber-100 overflow-hidden relative z-10">
                                        {results[0].member_photo ? (
                                            <img src={results[0].member_photo} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-300 text-2xl font-bold">
                                                {results[0].member_name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <Trophy size={24} className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-500 z-20 drop-shadow-sm" />
                                </div>
                                <div className="bg-gradient-to-b from-amber-50 to-white border border-amber-100 shadow-md rounded-t-xl p-4 w-36 md:w-48 text-center h-40 flex flex-col justify-end relative z-10">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center text-sm font-bold border-2 border-white">1</div>
                                    <div className="font-bold text-slate-900 truncate w-full">{results[0].member_name}</div>
                                    <div className="text-amber-600 font-bold text-lg">{results[0].score}/{exam.total_marks}</div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {results[2] && (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full border-4 border-amber-900/10 overflow-hidden mb-3 relative">
                                    {results[2].member_photo ? (
                                        <img src={results[2].member_photo} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-amber-900/5 flex items-center justify-center text-amber-900/30 text-xl font-bold">
                                            {results[2].member_name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white border border-slate-200 shadow-sm rounded-t-lg p-4 w-32 md:w-40 text-center h-24 flex flex-col justify-end relative">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold border-2 border-white">3</div>
                                    <div className="font-bold text-slate-900 truncate w-full text-sm">{results[2].member_name}</div>
                                    <div className="text-blue-600 font-bold">{results[2].score}/{exam.total_marks}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">Rank</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Answered</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-green-600 text-center">Correct</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-red-600 text-center">Incorrect</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Score</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Percent</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map((result, index) => {
                                    const getRemarks = (percentage) => {
                                        const p = Number(percentage || 0);
                                        if (p >= 90) return { text: 'Excellent', color: 'text-emerald-600' };
                                        if (p >= 80) return { text: 'Very Good', color: 'text-green-600' };
                                        if (p >= 70) return { text: 'Good', color: 'text-blue-600' };
                                        if (p >= 50) return { text: 'Fair', color: 'text-amber-600' };
                                        return { text: 'Needs Improvement', color: 'text-red-500' };
                                    };
                                    const remark = getRemarks(result.percentage);

                                    return (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-center">
                                                {index < 3 ? (
                                                    <Medal size={20} className={`mx-auto ${getMedalColor(index)}`} />
                                                ) : (
                                                    <span className="text-slate-500 font-medium">{index + 1}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-slate-900">{result.member_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-slate-600">
                                                {result.answered_count || 0}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-green-600 font-semibold">
                                                {result.correct_count || 0}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-red-500 font-semibold">
                                                {result.incorrect_count || 0}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-slate-900">{result.score}</div>
                                                <div className="text-xs text-slate-400">/ {exam.total_marks}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-blue-600">
                                                {result.percentage ? Number(result.percentage).toFixed(1) : '0.0'}%
                                            </td>
                                            <td className={`px-6 py-4 text-right font-medium text-sm ${remark.color}`}>
                                                {remark.text}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Grading Criteria Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                        <span className="font-medium">90% - 100%: Excellent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-600"></span>
                        <span className="font-medium">80% - 89%: Very Good</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                        <span className="font-medium">70% - 79%: Good</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="font-medium">50% - 69%: Fair</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="font-medium">Below 50%: Needs Improvement</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamResultPage;
