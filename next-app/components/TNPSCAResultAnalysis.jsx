'use client';

import React from 'react';
import { Trophy, TrendingUp, Users, Info, ArrowLeft, Download, Share2 } from 'lucide-react';

const TNPSCAResultAnalysis = ({ submission, onBack }) => {
    // Placeholder Vacancy Data (Based on common TNPSC patterns)
    const VACANCIES = {
        Civil: { total: 200, GT: 60, BC: 54, MBC: 40, SC: 30, BCM: 7, SCA: 6, ST: 3 },
        Mechanical: { total: 50, GT: 15, BC: 13, MBC: 10, SC: 8, BCM: 2, SCA: 1, ST: 1 },
        Electrical: { total: 30, GT: 9, BC: 8, MBC: 6, SC: 4, BCM: 1, SCA: 1, ST: 1 },
    };

    const deptVacancies = VACANCIES[submission.department] || { total: 100, [submission.community]: 30 };
    const categoryVacancy = deptVacancies[submission.community] || 0;

    // Calculate Probability (Simple Logic)
    let probability = "Medium";
    let colorClass = "text-amber-500 bg-amber-50 border-amber-200";

    if (submission.communal_rank <= categoryVacancy) {
        probability = "High";
        colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
    } else if (submission.communal_rank > categoryVacancy * 2) {
        probability = "Low";
        colorClass = "text-rose-600 bg-rose-50 border-rose-200";
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
                >
                    <ArrowLeft size={18} /> Back to Form
                </button>
                <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Share2 size={20} /></button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={20} /></button>
                </div>
            </div>

            {/* Main Analysis Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-8 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">Analysis Report</span>
                            <h1 className="text-3xl font-bold mt-2">{submission.full_name}</h1>
                            <p className="text-slate-400 mt-1">Registration: {submission.registration_number}</p>
                        </div>
                        <div className={`px-6 py-4 rounded-2xl border ${colorClass.split(' ')[2]} flex flex-col items-center shadow-lg bg-white/5 backdrop-blur-sm`}>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-300 opacity-80">Selection Probability</span>
                            <span className={`text-4xl font-black mt-1 ${colorClass.split(' ')[0]}`}>{probability}</span>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <Trophy size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider">Overall Rank</span>
                            </div>
                            <div className="text-4xl font-black text-slate-900">{submission.overall_rank}</div>
                        </div>

                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-3 text-blue-600 mb-2">
                                <Users size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider">Communal Rank</span>
                            </div>
                            <div className="text-4xl font-black text-blue-700">{submission.communal_rank}</div>
                            <div className="text-xs font-medium text-blue-500 mt-1">Category: {submission.community}</div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <TrendingUp size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Vacancies</span>
                            </div>
                            <div className="text-4xl font-black text-slate-900">{deptVacancies.total}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">{submission.department} Dept</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Info size={20} className="text-blue-500" /> Detailed Insight
                        </h3>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-slate-600 font-medium">Vacancies in your Community ({submission.community})</span>
                                <span className="font-bold text-slate-900">{categoryVacancy}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-slate-600 font-medium">Rank Difference (Communal)</span>
                                <span className={`font-bold ${submission.communal_rank <= categoryVacancy ? 'text-emerald-500' : 'text-slate-900'}`}>
                                    {submission.communal_rank <= categoryVacancy ? 'Inside ' : ''}{Math.abs(submission.communal_rank - categoryVacancy)} {submission.communal_rank <= categoryVacancy ? 'of ' : 'away from '} vacancies
                                </span>
                            </div>
                        </div>

                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4">
                            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl h-fit">
                                <Info size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm">Note regarding PSTM & Gender</h4>
                                <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                                    The above analysis is a preliminary projection. Your selection might also be influenced by the horizontal reservation for
                                    {submission.pstm_status ? ' PSTM (Tamil Medium)' : ' Non-PSTM'} candidates and {submission.gender === 'Female' ? ' Woman' : ' General'} category vacancies
                                    within your community.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center p-8 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                <p className="text-slate-500 text-sm">
                    This analysis tool is for educational purposes for Mahesh IES Academy students.
                    Official selection results are subject to TNPSC verification.
                </p>
            </div>
        </div>
    );
};

export default TNPSCAResultAnalysis;
