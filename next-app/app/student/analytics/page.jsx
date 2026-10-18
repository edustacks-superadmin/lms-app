'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { useFeatureFlags } from '../../../context/FeatureFlagsContext';
import { getUserPerformanceData } from '../../../lib/analyticsService';
import { BarChart2, List, ChevronDown, ChevronUp, RefreshCw, AlertCircle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export default function AnalyticsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { isFeatureEnabled } = useFeatureFlags();
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overall');
    const [expandedSubjects, setExpandedSubjects] = useState(new Set());

    // Redirect if analytics is disabled via feature flag
    useEffect(() => {
        if (!isFeatureEnabled('studentAnalytics')) {
            router.replace('/student/dashboard');
        }
    }, [isFeatureEnabled, router]);

    useEffect(() => {
        if (user) {
            loadPerformanceData();
        }
    }, [user]);

    const loadPerformanceData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get member ID
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('id')
                .eq('email', user.email)
                .single();

            if (memberError || !member) {
                setError('Member not found');
                return;
            }

            const data = await getUserPerformanceData(member.id);
            setPerformanceData(data);
        } catch (err) {
            console.error('Error loading performance data:', err);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (id) => {
        setExpandedSubjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const hasData = performanceData && performanceData.overall.totalTests > 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-slate-500 mt-4 font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <p className="text-slate-800 font-semibold mb-2">{error}</p>
                    <button
                        onClick={loadPerformanceData}
                        className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm border border-blue-100">
                        <BarChart2 className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Performance Analytics</h1>
                        {hasData && (
                            <p className="text-sm text-slate-500 font-medium">{performanceData.overall.totalTests} test{performanceData.overall.totalTests !== 1 ? 's' : ''} analyzed</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={loadPerformanceData}
                    className="p-2.5 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all duration-200"
                    title="Refresh Data"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            {hasData && (
                <div className="flex gap-1 p-1 bg-slate-100/50 rounded-xl w-fit mb-8 border border-gray-200">
                    <button
                        onClick={() => setActiveTab('overall')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'overall'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <BarChart2 className="w-4 h-4" />
                        Overall View
                    </button>
                    <button
                        onClick={() => setActiveTab('subjects')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'subjects'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <List className="w-4 h-4" />
                        Subject Analysis
                    </button>
                </div>
            )}

            {!hasData ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BarChart2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Exam Data Available</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Take some exams to verify your knowledge and see comprehensive performance insights here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Overall Tab */}
                    {activeTab === 'overall' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-500">Correct</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900 mb-1">{performanceData.overall.correct}</p>
                                    <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block">
                                        {performanceData.overall.totalQuestions > 0
                                            ? Math.round((performanceData.overall.correct / performanceData.overall.totalQuestions) * 100)
                                            : 0}% Accuracy
                                    </p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <XCircle className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-500">Incorrect</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900 mb-1">{performanceData.overall.incorrect}</p>
                                    <p className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md inline-block">
                                        {performanceData.overall.totalQuestions > 0
                                            ? Math.round((performanceData.overall.incorrect / performanceData.overall.totalQuestions) * 100)
                                            : 0}% Rate
                                    </p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <HelpCircle className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-500">Unanswered</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900 mb-1">{performanceData.overall.unanswered}</p>
                                    <p className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-block">
                                        {performanceData.overall.totalQuestions > 0
                                            ? Math.round((performanceData.overall.unanswered / performanceData.overall.totalQuestions) * 100)
                                            : 0}% Skipped
                                    </p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <BarChart2 className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-500">Total Questions</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900 mb-1">{performanceData.overall.totalQuestions}</p>
                                    <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block">
                                        Across {performanceData.overall.totalTests} tests
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    Performance Distribution
                                </h3>
                                <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                    <div
                                        className="bg-emerald-500 transition-all duration-1000 ease-out hover:bg-emerald-400"
                                        style={{ width: `${performanceData.overall.totalQuestions > 0 ? (performanceData.overall.correct / performanceData.overall.totalQuestions) * 100 : 0}%` }}
                                        title="Correct"
                                    />
                                    <div
                                        className="bg-rose-500 transition-all duration-1000 ease-out hover:bg-rose-400"
                                        style={{ width: `${performanceData.overall.totalQuestions > 0 ? (performanceData.overall.incorrect / performanceData.overall.totalQuestions) * 100 : 0}%` }}
                                        title="Incorrect"
                                    />
                                    <div
                                        className="bg-slate-300 transition-all duration-1000 ease-out hover:bg-slate-400"
                                        style={{ width: `${performanceData.overall.totalQuestions > 0 ? (performanceData.overall.unanswered / performanceData.overall.totalQuestions) * 100 : 0}%` }}
                                        title="Unanswered"
                                    />
                                </div>
                                <div className="flex flex-wrap justify-center gap-6 mt-6">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm ring-2 ring-emerald-100"></span>
                                        <span className="text-sm font-semibold text-slate-600">Correct Answers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-rose-500 rounded-full shadow-sm ring-2 ring-rose-100"></span>
                                        <span className="text-sm font-semibold text-slate-600">Incorrect Answers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-slate-300 rounded-full shadow-sm ring-2 ring-slate-100"></span>
                                        <span className="text-sm font-semibold text-slate-600">Unanswered</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 md:p-8 rounded-3xl border border-blue-100/50">
                                <h4 className="flex items-center gap-3 font-bold text-indigo-900 text-lg mb-4">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                        <HelpCircle className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    Improvement Insights
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-white/50">
                                        <p className="text-indigo-900 text-sm font-medium flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Track your progress over time
                                        </p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-white/50">
                                        <p className="text-indigo-900 text-sm font-medium flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Focus on improving weak areas
                                        </p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-white/50">
                                        <p className="text-indigo-900 text-sm font-medium flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Review unanswered questions
                                        </p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-white/50">
                                        <p className="text-indigo-900 text-sm font-medium flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Check Subject Analysis tab
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Subjects Tab */}
                    {activeTab === 'subjects' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {performanceData.subjects && performanceData.subjects.length > 0 ? (
                                <>
                                    <p className="text-sm font-medium text-slate-500 mb-6 flex items-center gap-2">
                                        <List className="w-4 h-4" />
                                        Subjects sorted by improvement potential (lowest score first)
                                    </p>
                                    {performanceData.subjects.map((subject) => (
                                        <div
                                            key={subject.id}
                                            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300"
                                        >
                                            <button
                                                onClick={() => toggleSubject(subject.id)}
                                                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {subject.tag && (
                                                        <span
                                                            className="px-3 py-1 rounded-lg text-xs font-bold tracking-wide shadow-sm"
                                                            style={{ backgroundColor: subject.tag.bgColor, color: subject.tag.color }}
                                                        >
                                                            {subject.tag.label}
                                                        </span>
                                                    )}
                                                    <span className="font-bold text-slate-800 text-lg">{subject.name}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <span className="block text-2xl font-bold text-slate-900">{subject.overallScore}%</span>
                                                        <span className="text-xs text-slate-400 font-medium">Average Score</span>
                                                    </div>
                                                    <div className={`p-2 rounded-full transition-transform duration-300 ${expandedSubjects.has(subject.id) ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-gray-100 text-gray-500'}`}>
                                                        <ChevronDown className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </button>

                                            {expandedSubjects.has(subject.id) && subject.children.length > 0 && (
                                                <div className="border-t border-gray-100 bg-slate-50/50 p-5 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                        Subject Topics
                                                    </div>
                                                    <div className="space-y-3">
                                                        {subject.children.map((child) => (
                                                            <div key={child.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-100 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    {child.tag && (
                                                                        <span
                                                                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide opacity-80"
                                                                            style={{ backgroundColor: child.tag.bgColor, color: child.tag.color }}
                                                                        >
                                                                            {child.tag.label}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-semibold text-slate-700">{child.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                                                        <div
                                                                            className={`h-full rounded-full ${child.accuracy >= 70 ? 'bg-emerald-500' : child.accuracy >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                            style={{ width: `${child.accuracy}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className={`text-sm font-bold w-12 text-right ${child.accuracy >= 70 ? 'text-emerald-600' : child.accuracy >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                        {child.accuracy}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
                                    <List className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700">No Subject Data</h3>
                                    <p className="text-slate-500 text-sm">Detailed subject breakdowns will appear here after you complete exams.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
