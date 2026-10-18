import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { useExams } from '../context/ExamContext';
import { Plus, ArrowLeft, FileText, X, Save, Trash2, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CourseExams = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCourse } = useCourses();
    const { exams, fetchExams } = useExams();

    const [course, setCourse] = useState(null);
    const [courseExams, setCourseExams] = useState([]);
    const [availableExams, setAvailableExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const courseData = getCourse(id);
            if (courseData) {
                setCourse(courseData);
                await loadExams();
            }
        };
        loadData();
    }, [id]);

    const loadExams = async () => {
        try {
            setLoading(true);

            // Fetch exams linked to this course
            const { data: linkedExams, error: linkedError } = await supabase
                .from('exams')
                .select('*')
                .eq('course_id', id)
                .order('created_at', { ascending: false });

            if (linkedError) throw linkedError;
            setCourseExams(linkedExams || []);

            // Fetch all exams for dropdown (exams without course_id or from other courses)
            await fetchExams();
            const { data: allExams, error: allError } = await supabase
                .from('exams')
                .select('*')
                .order('title');

            if (allError) throw allError;

            // Filter out exams already linked to this course
            const unlinkedExams = (allExams || []).filter(
                exam => !exam.course_id || exam.course_id !== id
            );
            setAvailableExams(unlinkedExams);

        } catch (error) {
            console.error('Error loading exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExam = async (e) => {
        e.preventDefault();
        if (!selectedExamId) return;

        try {
            // Link the exam to this course
            const { error } = await supabase
                .from('exams')
                .update({ course_id: id })
                .eq('id', selectedExamId);

            if (error) throw error;

            alert('Exam added to course successfully!');
            setIsModalOpen(false);
            setSelectedExamId('');
            await loadExams();

        } catch (error) {
            console.error('Error adding exam:', error);
            alert('Failed to add exam: ' + error.message);
        }
    };

    const handleRemoveExam = async (examId) => {
        if (!window.confirm('Remove this exam from the course? This will not delete the exam, just unlink it from this course.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('exams')
                .update({ course_id: null })
                .eq('id', examId);

            if (error) throw error;

            alert('Exam removed from course');
            await loadExams();

        } catch (error) {
            console.error('Error removing exam:', error);
            alert('Failed to remove exam: ' + error.message);
        }
    };

    if (!course) return <div>Loading course...</div>;

    return (
        <div style={{ flex: 1, padding: '20px', fontFamily: "'Inter', sans-serif" }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <button
                    onClick={() => navigate('/courses')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#666' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <span style={{ color: '#666' }}>Courses</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#666' }}>{course.title}</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#111', fontWeight: '600' }}>Exams</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: 0 }}>Course Exams</h2>
                    <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>Manage exams for this course.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        backgroundColor: '#00bfa5',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={20} /> Add Exam to Course
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#666' }}>
                    Loading exams...
                </div>
            ) : courseExams.length === 0 ? (
                <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: '#666',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    border: '2px dashed #e9ecef'
                }}>
                    <FileText size={48} color="#ccc" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                        No exams added yet
                    </h3>
                    <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
                        Add existing exams to this course to make them available to enrolled students.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            color: '#00bfa5',
                            background: 'none',
                            border: '1px solid #00bfa5',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        Add Exam
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {courseExams.map(exam => (
                        <div key={exam.id} style={{
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                <div style={{
                                    padding: '8px',
                                    backgroundColor: '#e3f2fd',
                                    borderRadius: '8px',
                                    color: '#1976d2'
                                }}>
                                    <FileText size={24} />
                                </div>
                                <button
                                    onClick={() => handleRemoveExam(exam.id)}
                                    style={{
                                        background: '#ffebee',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#d32f2f',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Remove from course"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: '0 0 8px 0' }}>
                                {exam.title}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
                                {exam.description || 'No description available'}
                            </p>

                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={14} />
                                    <span>{exam.duration_minutes} mins</span>
                                </div>
                                <div>|</div>
                                <div>{exam.total_marks} marks</div>
                                <div>|</div>
                                <div style={{
                                    color: exam.is_active ? '#2e7d32' : '#666',
                                    fontWeight: '500'
                                }}>
                                    {exam.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Exam Modal */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111' }}>
                                Add Exam to Course
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={closeButtonStyle}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddExam}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Select Exam</label>
                                <select
                                    value={selectedExamId}
                                    onChange={(e) => setSelectedExamId(e.target.value)}
                                    required
                                    style={selectStyle}
                                >
                                    <option value="">Choose an exam...</option>
                                    {availableExams.map(exam => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.title} {exam.course_id && '(Linked to another course)'}
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                                    Note: Linking an exam that's already linked to another course will move it to this course.
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={cancelButtonStyle}
                                >
                                    Cancel
                                </button>
                                <button type="submit" style={saveButtonStyle}>
                                    <Save size={18} /> Add Exam
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '16px',
    width: '500px',
    maxWidth: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};

const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
};

const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#333'
};

const selectStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
};

const cancelButtonStyle = {
    background: '#f5f5f5',
    color: '#333',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
};

const saveButtonStyle = {
    background: '#00bfa5',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 191, 165, 0.3)'
};

export default CourseExams;
