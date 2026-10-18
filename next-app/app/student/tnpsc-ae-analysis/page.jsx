'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import ExternalResultForm from '../../../components/ExternalResultForm';
import ExternalResultAnalysis from '../../../components/ExternalResultAnalysis';
import { PlusCircle, History, ChevronRight, Award, Megaphone, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';

const TNPSCAEAnalysisPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [configLoading, setConfigLoading] = useState(true);
    const [activeConfig, setActiveConfig] = useState(null);
    const { institute } = useInstitute();
    const activeInstituteId = institute?.id || 10;
    const academyName = institute?.name || 'Mahesh IES Academy';
    const [globalStats, setGlobalStats] = useState({ bestRank: '-', topScore: '-', totalReports: '-' });

    useEffect(() => {
        const resolveActiveConfig = async () => {
            const { data, error } = await supabase
                .from('exam_configurations')
                .select('exam_tag, exam_name, total_candidates, result_link, vacancies')
                .eq('institute_id', activeInstituteId)
                .eq('portal_category', 'TNPSC_AE')
                .maybeSingle();

            if (data) {
                setActiveConfig(data);
                // After resolving config, fetch submissions for this specific tag
                fetchSubmissions(data.exam_tag);
            } else {
                setConfigLoading(false);
                setLoading(false);
            }
        };

        if (!authLoading) {
            resolveActiveConfig();
        }
    }, [activeInstituteId, authLoading]);

    const fetchSubmissions = async (tag) => {
        const targetTag = tag || activeConfig?.exam_tag;
        if (!targetTag) return;

        try {
            // Fetch Global Stats
            const { data: rankData } = await supabase
                .from('external_exam_results')
                .select('overall_rank')
                .eq('exam_tag', targetTag)
                .eq('is_active', true)
                .eq('is_verified', true) // Only verified reports
                .neq('overall_rank', 0)
                .order('overall_rank', { ascending: true })
                .limit(1)
                .maybeSingle();

            const { data: scoreData } = await supabase
                .from('external_exam_results')
                .select('total_marks')
                .eq('exam_tag', targetTag)
                .eq('is_active', true)
                .eq('is_verified', true) // Only verified reports
                .order('total_marks', { ascending: false })
                .limit(1)
                .maybeSingle();

            const { count: totalReports } = await supabase
                .from('external_exam_results')
                .select('*', { count: 'exact', head: true })
                .eq('exam_tag', targetTag)
                .eq('is_active', true)
                .eq('is_verified', true); // Only verified reports

            setGlobalStats({
                bestRank: rankData?.overall_rank || '-',
                topScore: scoreData?.total_marks || '-',
                totalReports: totalReports || 0
            });

            if (user) {
                const { data: mData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).maybeSingle();
                if (mData) {
                    const { data } = await supabase
                        .from('external_exam_results')
                        .select('*')
                        .eq('exam_tag', targetTag)
                        .eq('is_active', true) // Only active reports
                        .eq('member_id', mData.id)
                        .order('created_at', { ascending: false });
                    setSubmissions(data || []);
                }
            } else {
                // For Guest Users: Check local storage for submission IDs
                const storedIds = JSON.parse(localStorage.getItem(`guest_submissions_${targetTag}`) || '[]');
                if (storedIds.length > 0) {
                    const { data } = await supabase
                        .from('external_exam_results')
                        .select('*')
                        .in('id', storedIds)
                        .eq('is_active', true) // Only active reports
                        .order('created_at', { ascending: false });
                    setSubmissions(data || []);
                }
            }
        } catch (err) {
            console.error('Error fetching submissions:', err);
        } finally {
            setConfigLoading(false);
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this analysis report? It will be hidden from your view.')) return;

        try {
            // Soft Delete: Update is_active to false
            const { error } = await supabase
                .from('external_exam_results')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            setSubmissions(submissions.filter(s => s.id !== id));
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to remove report');
        }
    };

    if (configLoading || authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Resolving Portal Config...</p>
                </div>
            </div>
        );
    }

    if (!activeConfig) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
                        <Award size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Portal Under Maintenance</h2>
                    <p className="text-slate-500 font-medium">There is no active exam featured for analysis at this moment. Please check back later or contact the administrator.</p>
                </div>
            </div>
        );
    }

    // Show Analysis View
    if (selectedSubmission) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <ExternalResultAnalysis
                    submission={selectedSubmission}
                    onBack={() => {
                        setSelectedSubmission(null);
                        fetchSubmissions();
                    }}
                />
            </div>
        );
    }

    // Show Form View
    if (showForm || (submissions.length === 0 && !loading)) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="w-full max-w-7xl mx-auto mb-8 space-y-6">
                    <button
                        onClick={() => setShowForm(false)}
                        className="text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                    >
                        {submissions.length > 0 && <><History size={14} /> Back to History</>}
                    </button>

                    {/* Notification Banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-1 shadow-xl shadow-blue-200/50 relative overflow-hidden group">
                        <div className="bg-white/10 backdrop-blur-sm rounded-[1.8rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner backdrop-blur-md shrink-0 ring-4 ring-white/10">
                                    <Megaphone size={30} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-2">TNPSC AE Results Released!</h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center md:justify-start">
                                        <span className="px-3 py-1 bg-white/20 rounded-lg text-white font-bold text-xs uppercase tracking-widest backdrop-blur-sm">Total Candidates: {activeConfig?.total_candidates?.toLocaleString() || '51,918'}</span>
                                        <span className="text-blue-100 font-medium text-sm">Check your official result now</span>
                                    </div>
                                </div>
                            </div>
                            <a
                                href={activeConfig?.result_link || "https://www.tnpsc.gov.in"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/5 flex items-center gap-2 group/btn whitespace-nowrap"
                            >
                                Visit TNPSC Website
                                <ExternalLink size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                </div>
                <ExternalResultForm
                    examTag={activeConfig.exam_tag}
                    examName={activeConfig.exam_name}
                    config={activeConfig}
                    onSuccess={(data) => {
                        const newSubmissions = Array.isArray(data) ? data : [data];

                        // If guest User (no user object), save ID to local storage for session history
                        if (!user) {
                            const storedIds = JSON.parse(localStorage.getItem(`guest_submissions_${activeConfig.exam_tag}`) || '[]');
                            let updated = false;
                            newSubmissions.forEach(sub => {
                                if (!storedIds.includes(sub.id)) {
                                    storedIds.push(sub.id);
                                    updated = true;
                                }
                            });
                            if (updated) localStorage.setItem(`guest_submissions_${activeConfig.exam_tag}`, JSON.stringify(storedIds));
                        }

                        setSubmissions(prev => [...newSubmissions, ...prev]);
                        setSelectedSubmission(data); // Can now be array or object
                        setShowForm(false);
                    }}
                />
            </div>
        );
    }

    // Show History / Landing View (Dashboard)
    const bestRank = submissions.length > 0 ? Math.min(...submissions.map(s => s.overall_rank)) : '-';
    const bestScore = submissions.length > 0 ? Math.max(...submissions.map(s => s.total_marks)) : '-';

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
            <div className="w-full max-w-7xl mx-auto space-y-8">

                {/* Notification Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-1 shadow-xl shadow-blue-200/50 relative overflow-hidden group">
                    <div className="bg-white/10 backdrop-blur-sm rounded-[1.8rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner backdrop-blur-md shrink-0 ring-4 ring-white/10">
                                <Megaphone size={30} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white mb-2">TNPSC AE Results Released!</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center md:justify-start">
                                    <span className="px-3 py-1 bg-white/20 rounded-lg text-white font-bold text-xs uppercase tracking-widest backdrop-blur-sm">Total Candidates: {activeConfig?.total_candidates?.toLocaleString() || '51,918'}</span>
                                    <span className="text-blue-100 font-medium text-sm">Check your official result now</span>
                                </div>
                            </div>
                        </div>
                        <a
                            href={activeConfig?.result_link || "https://www.tnpsc.gov.in"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/5 flex items-center gap-2 group/btn whitespace-nowrap"
                        >
                            Visit TNPSC Website
                            <ExternalLink size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </div>

                {/* Header & Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 block">{academyName}</span>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Analysis Dashboard</h1>
                            <p className="text-slate-500 font-medium text-sm">Track your performance across multiple post preferences.</p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                            <div className="px-6 py-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">My Reports</span>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-900">{submissions.length}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Total Generated: {globalStats.totalReports}</span>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100">
                                <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest block mb-1">My Best Rank</span>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-emerald-600">#{bestRank}</span>
                                    <span className="text-[9px] text-emerald-500 font-medium">Global Best: #{globalStats.bestRank}</span>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-violet-50 rounded-2xl text-center border border-violet-100">
                                <span className="text-[10px] font-black text-violet-600/60 uppercase tracking-widest block mb-1">My Top Score</span>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-violet-600">{bestScore}</span>
                                    <span className="text-[9px] text-violet-500 font-medium">Global Top: {globalStats.topScore}</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 z-0"></div>
                    </div>
                </div>

                {/* Submissions List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Recent Analyses</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {submissions.map((sub) => (
                            <div key={sub.id} className="relative group perspective-1000">
                                <button
                                    onClick={() => setSelectedSubmission(sub)}
                                    className="w-full bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group-hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner transition-colors ${(sub.overall_rank < 100) ? 'bg-emerald-100 text-emerald-600' :
                                            (sub.overall_rank < 500) ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            #{sub.overall_rank}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">{sub.post_selected}</h3>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                    Score: <span className="text-slate-700">{sub.total_marks}</span>
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                    {new Date(sub.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                {sub.is_verified ? (
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                                        <AlertCircle size={10} /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 pl-2 md:pl-0 border-l md:border-l-0 border-slate-100 md:border-none">
                                        <div className="text-right hidden md:block">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Communal Rank</span>
                                            <span className="text-sm font-black text-slate-700">#{sub.communal_rank}</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                                    className="absolute -right-3 -top-3 p-2 bg-white text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-20"
                                    title="Delete Report"
                                >
                                    <PlusCircle className="rotate-45" size={18} />
                                </button>
                            </div>
                        ))}

                        {/* New Analysis Card */}
                        <button
                            onClick={() => setShowForm(true)}
                            className="group relative overflow-hidden bg-slate-900 p-1 rounded-3xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 opacity-20 group-hover:opacity-40 transition-opacity animate-gradient-x"></div>
                            <div className="relative bg-slate-900 rounded-[22px] p-6 h-full flex items-center justify-between group-hover:bg-slate-800/80 transition-colors">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                        <PlusCircle size={28} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-black text-white">New Analysis</h3>
                                        <p className="text-slate-400 text-xs font-medium">Check probability for another post preference</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-white text-xs font-bold uppercase tracking-widest group-hover:bg-white group-hover:text-slate-900 transition-all">
                                    Start Now <ChevronRight size={14} />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="text-center pt-8 pb-12">
                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">
                        {academyName} • Exam Analytics
                    </p>
                </div>
            </div>

            {/* Mobile Floating Action Button */}
            <button
                onClick={() => setShowForm(true)}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center z-50 active:scale-90 transition-transform"
            >
                <PlusCircle size={28} />
            </button>
        </div>
    );
};

export default TNPSCAEAnalysisPage;
