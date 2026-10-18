'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useExams } from '../context/ExamContext';
import { FileText, Clock, Award, CheckCircle, ChevronRight, Search, Filter, ArrowRight, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const ExamPortal = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchExamsForMember = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!user) {
                    setError('User not authenticated');
                    return;
                }

                const { data: member, error: memberError } = await supabase
                    .from('members')
                    .select('id')
                    .eq('email', user.email)
                    .single();

                if (memberError) throw memberError;
                if (!member) {
                    console.log('No member record found for this user');
                    setExams([]);
                    return;
                }

                const { data: batchMemberships, error: batchError } = await supabase
                    .from('batch_members')
                    .select('batch_id')
                    .eq('member_id', member.id);

                if (batchError) throw batchError;

                if (!batchMemberships || batchMemberships.length === 0) {
                    console.log('Member not assigned to any batches');
                    setExams([]);
                    return;
                }

                const memberBatchIds = batchMemberships.map(bm => bm.batch_id);

                const { data: courses, error: coursesError } = await supabase
                    .from('courses')
                    .select('id, title, allowed_batches');

                if (coursesError) throw coursesError;

                const allowedCourses = courses.filter(course => {
                    if (!course.allowed_batches || course.allowed_batches.length === 0) {
                        return false;
                    }
                    return memberBatchIds.some(batchId =>
                        course.allowed_batches.includes(batchId)
                    );
                });

                if (allowedCourses.length === 0) {
                    console.log('No courses available for member batches');
                    setExams([]);
                    return;
                }

                const allowedCourseIds = allowedCourses.map(c => c.id);

                const { data: examsData, error: examsError } = await supabase
                    .from('exams')
                    .select(`
                        *,
                        courses (
                            id,
                            title
                        )
                    `)
                    .in('course_id', allowedCourseIds)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (examsError) throw examsError;

                setExams(examsData || []);

            } catch (err) {
                console.error('Error fetching exams:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchExamsForMember();
    }, [user]);

    if (loading) {
        return (
            <div className="p-10 text-center">
                <div className="text-base text-gray-500">Loading exams...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <div className="text-base text-red-500">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="p-5">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
                Available Exams
            </h2>
            <p className="text-sm text-gray-500 mb-5">
                Exams from courses available to your batch
            </p>

            {exams.length === 0 ? (
                <div className="text-center py-16 px-5 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-base text-gray-500 mb-2">
                        No exams available
                    </p>
                    <p className="text-sm text-gray-400">
                        You don't have any active exams from your batch's courses.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
                    {exams.map(exam => (
                        <div
                            key={exam.id}
                            className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <FileText size={24} />
                                </div>
                                <span className="text-xs py-1 px-2 rounded-full bg-green-100 text-green-700 font-bold">
                                    Active
                                </span>
                            </div>

                            <h3 className="text-lg font-bold mb-2 text-gray-900">
                                {exam.title}
                            </h3>

                            {exam.courses && (
                                <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
                                    <BookOpen size={14} />
                                    <span>{exam.courses.title}</span>
                                </div>
                            )}

                            <p className="text-sm text-gray-500 mb-4 flex-1">
                                {exam.description || 'No description available.'}
                            </p>

                            <div className="flex items-center gap-4 mb-5 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Clock size={14} /> {exam.duration_minutes || 0} mins
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>•</span> {exam.total_marks || 0} Marks
                                </div>
                            </div>

                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={() => router.push(`/student/exam/${exam.id}/take`)}
                                    className="flex-1 py-2.5 bg-blue-600 text-white border-none rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors hover:bg-blue-700"
                                >
                                    Start <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => router.push(`/student/exam/${exam.id}/results`)}
                                    className="flex-1 py-2.5 bg-gray-500 text-white border-none rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors hover:bg-gray-600"
                                >
                                    Review <FileText size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExamPortal;
