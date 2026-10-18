import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const ExamPortal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
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

                // Step 1: Get member record by email
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

                console.log('Member ID:', member.id);

                // Step 2: Get batches this member belongs to
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
                console.log('Member batch IDs:', memberBatchIds);

                // Step 3: Get courses that allow these batches
                const { data: courses, error: coursesError } = await supabase
                    .from('courses')
                    .select('id, title, allowed_batches');

                if (coursesError) throw coursesError;

                // Filter courses where member's batch is in allowed_batches
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
                console.log('Allowed course IDs:', allowedCourseIds);

                // Step 4: Fetch exams from these courses
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

                console.log('Fetched exams:', examsData);
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
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading exams...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', color: '#ef4444' }}>Error: {error}</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                Available Exams
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                Exams from courses available to your batch
            </p>

            {exams.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db'
                }}>
                    <FileText size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
                        No exams available
                    </p>
                    <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                        You don't have any active exams from your batch's courses.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {exams.map(exam => (
                        <div key={exam.id} style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            border: '1px solid #eee',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'box-shadow 0.2s, transform 0.2s'
                        }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '8px', color: '#1976d2' }}>
                                    <FileText size={24} />
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: '#e8f5e9',
                                    color: '#2e7d32',
                                    fontWeight: 'bold'
                                }}>
                                    Active
                                </span>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
                                {exam.title}
                            </h3>

                            {exam.courses && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '12px',
                                    fontSize: '12px',
                                    color: '#6b7280'
                                }}>
                                    <BookOpen size={14} />
                                    <span>{exam.courses.title}</span>
                                </div>
                            )}

                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', flex: 1 }}>
                                {exam.description || 'No description available.'}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', fontSize: '13px', color: '#4b5563' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={14} /> {exam.duration_minutes || 0} mins
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>•</span> {exam.total_marks || 0} Marks
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <button
                                    onClick={() => navigate(`/student/exam/${exam.id}/take`)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                >
                                    Start <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => navigate(`/student/exam/${exam.id}/results`)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
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
