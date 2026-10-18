'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstitute } from '../../context/InstituteContext';
import { Search, Calendar, ChevronRight, BarChart2, Clock } from 'lucide-react';
import Link from 'next/link';

const PublicResultsPage = () => {
    const { institute } = useInstitute();
    const [exams, setExams] = useState([]);
    const [filteredExams, setFilteredExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPublicExams = async () => {
            if (!institute?.id) return;

            try {
                const now = new Date().toISOString();

                // Fetch public exams that are published for this institute
                const { data, error } = await supabase
                    .from('exams')
                    .select('id, title, start_date, duration_minutes, result_publish_date, total_marks')
                    .eq('is_public_result', true)
                    .eq('institute_id', institute.id)
                    .lte('result_publish_date', now)
                    .order('result_publish_date', { ascending: false });

                if (error) throw error;
                setExams(data || []);
                setFilteredExams(data || []);
            } catch (error) {
                console.error('Error fetching results:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicExams();
    }, [institute?.id]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredExams(exams);
        } else {
            const lowerSearch = searchTerm.toLowerCase();
            setFilteredExams(exams.filter(e => e.title.toLowerCase().includes(lowerSearch)));
        }
    }, [searchTerm, exams]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <BarChart2 className="text-blue-600" /> Exam Results
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">View leaderboards and statistics for conducted exams.</p>
                    </div>

                    <div className="relative w-full sm:w-80">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search exams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredExams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No results found</h3>
                        <p className="text-slate-500 mt-2">Try adjusting your search or check back later.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredExams.map((exam) => (
                            <Link
                                href={`/results/${exam.id}`}
                                key={exam.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                            <BarChart2 size={24} />
                                        </div>
                                        <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                            Completed
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                                        {exam.title}
                                    </h3>

                                    <div className="space-y-2 text-sm text-slate-500 mb-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-slate-400" />
                                            <span>Conducted: {formatDate(exam.start_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-slate-400" />
                                            <span>Results Published: {formatDate(exam.result_publish_date)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
                                        View Leaderboard <ChevronRight size={16} className="ml-1" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicResultsPage;
