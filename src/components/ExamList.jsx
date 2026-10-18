import React, { useState, useMemo } from 'react';
import { Search, Clock, Info, Edit, Trash2, BarChart3, FileQuestion } from 'lucide-react';
import { useExams } from '../context/ExamContext';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ExamList = ({ activeTab = 'running', selectedCourses = [], selectedTags = [] }) => {
    const { exams, loading, deleteExam } = useExams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, exam: null });

    const handleDeleteClick = (exam) => {
        setDeleteModal({ isOpen: true, exam });
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.exam) {
            await deleteExam(deleteModal.exam.id);
        }
    };

    // Get exam status based on dates
    const getExamStatus = (exam) => {
        const now = new Date();
        const startDate = exam.start_date ? new Date(exam.start_date) : null;
        const endDate = exam.end_date ? new Date(exam.end_date) : null;

        if (!startDate) return 'running'; // No start date, consider as running

        if (endDate && now > endDate) {
            return 'completed';
        } else if (now < startDate) {
            return 'upcoming';
        } else {
            return 'running';
        }
    };

    // Filter and categorize exams
    const categorizedExams = useMemo(() => {
        let filtered = exams;

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(exam =>
                exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exam.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by selected courses
        if (selectedCourses.length > 0) {
            filtered = filtered.filter(exam =>
                exam.course_exams && exam.course_exams.some(ce =>
                    selectedCourses.includes(ce.courses?.id)
                )
            );
        }

        // Filter by selected tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter(exam =>
                exam.tags && exam.tags.some(tag => selectedTags.includes(tag))
            );
        }

        // Categorize by status
        const running = [];
        const upcoming = [];
        const completed = [];

        filtered.forEach(exam => {
            const status = getExamStatus(exam);
            if (status === 'running') running.push(exam);
            else if (status === 'upcoming') upcoming.push(exam);
            else completed.push(exam);
        });

        return { running, upcoming, completed };
    }, [exams, searchQuery, selectedCourses, selectedTags]);

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading exams...</div>;
    }

    const currentExams = categorizedExams[activeTab] || [];

    return (
        <div style={{ flex: 1 }}>
            {/* Top Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '400' }}>
                    {activeTab === 'running' ? 'Running Tests' : activeTab === 'upcoming' ? 'Upcoming Tests' : 'Completed Tests'}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ width: '250px', maxWidth: '100%' }}>
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button><Search size={18} /></button>
                    </div>
                </div>
            </div>

            {/* Exam Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {currentExams.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        {searchQuery || selectedCourses.length > 0 || selectedTags.length > 0
                            ? 'No exams match your filters.'
                            : `No ${activeTab} exams found.`}
                    </div>
                ) : (
                    currentExams.map((exam) => (
                        <div key={exam.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', borderTop: '1px solid var(--border-color)' }}>

                            <div style={{ flex: 1 }}>
                                <h3
                                    style={{ fontSize: '16px', fontWeight: '500', color: 'var(--primary-color)', marginBottom: '4px', textDecoration: 'underline', cursor: 'pointer' }}
                                    onClick={() => navigate(`/exams/edit/${exam.id}`)}
                                >
                                    {exam.title}
                                </h3>

                                <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>
                                    Course: {exam.course_exams && exam.course_exams.length > 0
                                        ? exam.course_exams.map((ce, idx) => (
                                            <span key={ce.courses?.id || idx}>
                                                {idx > 0 && ', '}
                                                <span
                                                    style={{ fontWeight: '500', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/courses/${ce.courses?.id}/chapters`);
                                                    }}
                                                >
                                                    {ce.courses?.title}
                                                </span>
                                            </span>
                                        ))
                                        : <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>Not assigned to any course</span>}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '40px', fontSize: '13px', color: 'var(--primary-color)', marginTop: '8px' }}>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ color: 'var(--text-color)' }}>
                                            Start: {exam.start_date ? new Date(exam.start_date).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            }) : 'N/A'}
                                        </span>
                                    </span>
                                    <span>{exam.description || 'No description'}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--text-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} /> <span>{exam.duration_minutes} mins</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Info size={16} /> <span>{exam.total_marks} marks</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '8px', color: '#2196f3', borderColor: '#e3f2fd', background: '#f5f9ff' }}
                                        onClick={() => navigate(`/exams/${exam.id}/statistics`)}
                                        title="Statistics"
                                    >
                                        <BarChart3 size={16} />
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '8px', color: '#00bfa5', borderColor: '#e0f2f1', background: '#f1f8f6' }}
                                        onClick={() => navigate(`/exams/${exam.id}/questions`)}
                                        title="Manage Questions"
                                    >
                                        <FileQuestion size={16} />
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '8px', color: '#666' }}
                                        onClick={() => navigate(`/exams/edit/${exam.id}`)}
                                        title="Edit"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(exam)}
                                        className="btn btn-sm"
                                        style={{ background: '#ffebee', color: '#d32f2f', border: 'none' }}
                                        title="Delete Exam"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, exam: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Exam"
                message="Deleting this exam will remove all associated questions and student results. This action cannot be undone."
                itemName={deleteModal.exam?.title}
                confirmText="Delete Exam"
            />
        </div>
    );
};

export default ExamList;
