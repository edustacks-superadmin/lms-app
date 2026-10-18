'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../supabaseClient';
import { Clock, HelpCircle, AlertCircle, ArrowRight, ArrowLeft, History, Eye } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

const ExamInstructionsPage = () => {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = searchParams?.get('courseId');
    const { id } = params;

    const { user } = useAuth();

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attempts, setAttempts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !user) return;
            try {
                // 1. Fetch Exam
                const { data: examData, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (examError) throw examError;
                setExam(examData);

                // 2. Fetch Member ID
                const { data: memberData } = await supabase
                    .from('members')
                    .select('id')
                    .eq('auth_user_id', user.id)
                    .single();

                if (memberData) {
                    // 3. Fetch Attempts
                    const { data: attemptsData } = await supabase
                        .from('exam_attempts')
                        .select('*')
                        .eq('exam_id', id)
                        .eq('member_id', memberData.id)
                        .order('attempt_number', { ascending: false });

                    if (attemptsData) setAttempts(attemptsData);
                }

            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, user]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!exam) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium">Exam not found</p>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 md:p-8">
            <button
                onClick={() => {
                    if (courseId) {
                        router.push(`/student/course/${courseId}`);
                    } else {
                        router.back();
                    }
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium text-sm"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-4">{exam.title}</h1>
                <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                    {exam.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-blue-100/50 rounded-lg text-blue-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-blue-600/80 mb-0.5">Duration</p>
                            <p className="text-2xl font-bold text-blue-900">{exam.duration_minutes} <span className="text-base font-medium opacity-70">Mins</span></p>
                        </div>
                    </div>
                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-emerald-100/50 rounded-lg text-emerald-600">
                            <HelpCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-emerald-600/80 mb-0.5">Total Marks</p>
                            <p className="text-2xl font-bold text-emerald-900">{exam.total_marks || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-slate-400" />
                        Instructions
                    </h3>
                    <ul className="space-y-3 list-disc list-inside text-slate-600 leading-relaxed">
                        <li>The exam will auto-submit when the timer runs out.</li>
                        <li>Don't switch tabs if tab monitoring is enabled.</li>
                        <li>Review your answers before submitting.</li>
                        {exam.negative_marking_enabled && (
                            <li className="text-rose-600 font-medium list-none flex items-start gap-2 pt-1">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                Negative marking is enabled ({exam.negative_marks_per_question} marks per wrong answer).
                            </li>
                        )}
                    </ul>
                </div>

                {/* Previous Attempts Section */}
                {attempts.length > 0 && (
                    <div className="mb-8 border-t border-gray-100 pt-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <History size={20} className="text-slate-400" /> Your Previous Attempts
                        </h3>
                        <div className="space-y-3">
                            {attempts.map((attempt) => (
                                <div key={attempt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 gap-4 hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-slate-500 text-sm">
                                            #{attempt.attempt_number}
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-slate-500 mb-0.5 uppercase tracking-wide">Submitted on</div>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {new Date(attempt.submitted_at || attempt.started_at).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                        {attempt.status === 'completed' ? (
                                            <>
                                                <div className="text-right">
                                                    <div className="font-bold text-slate-900 text-lg leading-tight">
                                                        {attempt.score}<span className="text-slate-400 text-sm font-normal">/{attempt.total_marks}</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                        {Math.round((attempt.score / attempt.total_marks) * 100)}% Score
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/student/exam/${id}/results?courseId=${courseId || ''}&attemptId=${attempt.id}`)}
                                                    className="px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow"
                                                >
                                                    <Eye size={16} /> View
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                In Progress
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={() => router.push(`/student/exam/${exam.id}/take?courseId=${courseId || ''}`)}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                >
                    Start Exam <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default ExamInstructionsPage;
