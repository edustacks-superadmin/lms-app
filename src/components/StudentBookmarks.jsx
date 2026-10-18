import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Bookmark, Trash2, Check, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import MathText from './MathText';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import { SkeletonList } from './SkeletonLoader';

const StudentBookmarks = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ open: false, questionId: null });

    // Filters
    const [filters, setFilters] = useState({
        examTitle: '',
        subjectName: '',
        date: ''
    });

    useEffect(() => {
        if (user) {
            fetchBookmarks();
        }
    }, [user]);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('question_bookmarks')
                .select(`
                    created_at,
                    question_id,
                    question:questions (
                        id,
                        question_text,
                        question_type,
                        marks,
                        explanation,
                        difficulty,
                        subject_id,
                        question_options (
                            id,
                            option_label,
                            option_text,
                            is_correct
                        ),
                        subjects (
                            name
                        ),
                        exam_questions (
                            exam_id,
                            exams (
                                title
                            )
                        )
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to flatten the nested structure
            const transformedData = (data || [])
                .filter(item => item.question) // Filter out invalid bookmarks
                .map(item => {
                    const q = item.question;
                    const examInfo = q.exam_questions?.[0]?.exams;

                    return {
                        created_at: item.created_at,
                        question_id: item.question_id,
                        question: q,
                        exam_title: examInfo?.title || 'Unknown Exam',
                        subject_name: q.subjects?.name || 'Uncategorized',
                        explanation: q.explanation
                    };
                });

            setBookmarks(transformedData);
        } catch (err) {
            console.error('Error fetching bookmarks:', err);
            showToast('Failed to load bookmarks', 'error');
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (questionId) => {
        try {
            const { error } = await supabase
                .from('question_bookmarks')
                .delete()
                .eq('user_id', user.id)
                .eq('question_id', questionId);

            if (error) throw error;

            setBookmarks(prev => prev.filter(b => b.question_id !== questionId));
            showToast('Bookmark removed successfully', 'success');
        } catch (err) {
            console.error('Error removing bookmark:', err);
            showToast('Failed to remove bookmark', 'error');
        }
    };

    const handleRemoveClick = (questionId) => {
        setConfirmModal({ open: true, questionId });
    };

    const handleConfirmRemove = () => {
        if (confirmModal.questionId) {
            removeBookmark(confirmModal.questionId);
        }
        setConfirmModal({ open: false, questionId: null });
    };

    // Derived state for filters
    const filterOptions = useMemo(() => {
        const uniqueExams = new Set(bookmarks.map(b => b.exam_title));
        const uniqueSubjects = new Set(bookmarks.map(b => b.subject_name));

        return {
            exams: Array.from(uniqueExams).sort(),
            subjects: Array.from(uniqueSubjects).sort()
        };
    }, [bookmarks]);

    const filteredBookmarks = useMemo(() => {
        return bookmarks.filter(item => {
            const matchesExam = filters.examTitle ? item.exam_title === filters.examTitle : true;
            const matchesSubject = filters.subjectName ? item.subject_name === filters.subjectName : true;
            const matchesDate = filters.date ? new Date(item.created_at).toLocaleDateString() === new Date(filters.date).toLocaleDateString() : true;
            return matchesExam && matchesSubject && matchesDate;
        });
    }, [bookmarks, filters]);

    const clearFilters = () => {
        setFilters({ examTitle: '', subjectName: '', date: '' });
    };

    if (loading) return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <Bookmark size={32} color="#2563eb" />
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>My Bookmarks</h1>
            </div>
            <SkeletonList count={3} />
        </div>
    );

    return (
        <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bookmark size={32} color="#2563eb" />
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>My Bookmarks</h1>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Exam Filter */}
                    <div style={{ position: 'relative' }}>
                        <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <select
                            value={filters.examTitle}
                            onChange={(e) => setFilters(prev => ({ ...prev, examTitle: e.target.value }))}
                            style={{
                                padding: '8px 12px 8px 32px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                minWidth: '150px'
                            }}
                        >
                            <option value="">All Exams</option>
                            {filterOptions.exams.map(exam => (
                                <option key={exam} value={exam}>{exam}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subject Filter */}
                    <div style={{ position: 'relative' }}>
                        <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <select
                            value={filters.subjectName}
                            onChange={(e) => setFilters(prev => ({ ...prev, subjectName: e.target.value }))}
                            style={{
                                padding: '8px 12px 8px 32px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                minWidth: '150px'
                            }}
                        >
                            <option value="">All Subjects</option>
                            {filterOptions.subjects.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <CalendarIcon size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                            style={{
                                padding: '8px 12px 8px 32px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        />
                    </div>

                    {(filters.examTitle || filters.subjectName || filters.date) && (
                        <button
                            onClick={clearFilters}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {bookmarks.length === 0 ? (
                <EmptyState
                    icon={Bookmark}
                    title="No bookmarks yet"
                    description="Questions you bookmark during exams will appear here for review. Use the bookmark button while taking exams to save important questions."
                />
            ) : filteredBookmarks.length === 0 ? (
                <EmptyState
                    icon={Filter}
                    title="No matching bookmarks"
                    description="Try adjusting your filters to see more results."
                />
            ) : (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {filteredBookmarks.map((item, index) => (
                        <div key={item.question_id || index} style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {/* Header with metadata and remove button */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#e0e7ff',
                                        color: '#4338ca',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}>
                                        {item.exam_title}
                                    </span>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#eff6ff',
                                        color: '#2563eb',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase'
                                    }}>
                                        {item.question?.question_type || 'N/A'}
                                    </span>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#f3f4f6',
                                        color: '#4b5563',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}>
                                        {item.subject_name}
                                    </span>
                                    {item.question?.difficulty && (
                                        <span style={{
                                            padding: '4px 12px',
                                            backgroundColor: '#fef3c7',
                                            color: '#92400e',
                                            borderRadius: '16px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            textTransform: 'capitalize'
                                        }}>
                                            {item.question.difficulty}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                        Saved on {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveClick(item.question_id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#ef4444',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            fontWeight: '500'
                                        }}
                                        title="Remove Bookmark"
                                    >
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div style={{ fontSize: '15px', color: '#1f2937', lineHeight: '1.5', fontWeight: '500' }}>
                                {/* Debug: Render raw text */}

                                <MathText>{item.question?.question_text || 'Question text not available'}</MathText>
                            </div>

                            {/* Options (for MCQ) */}
                            {item.question?.question_options && item.question.question_options.length > 0 && (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {item.question.question_options
                                        .sort((a, b) => (a.option_label || '').localeCompare(b.option_label || ''))
                                        .map((option) => (
                                            <div
                                                key={option.id}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '6px',
                                                    border: option.is_correct ? '2px solid #10b981' : '1px solid #e5e7eb',
                                                    backgroundColor: option.is_correct ? '#ecfdf5' : '#f9fafb',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px'
                                                }}
                                            >
                                                <div style={{
                                                    minWidth: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: option.is_correct ? '#10b981' : 'white',
                                                    border: option.is_correct ? 'none' : '2px solid #d1d5db',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: option.is_correct ? 'white' : '#6b7280',
                                                    flexShrink: 0
                                                }}>
                                                    {option.is_correct ? <Check size={14} /> : option.option_label}
                                                </div>
                                                <div style={{ flex: 1, fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>
                                                    {/* Debug: Render raw text to check if data exists */}

                                                    <MathText>{option.option_text}</MathText>
                                                    {option.is_correct && (
                                                        <span style={{
                                                            marginLeft: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            color: '#10b981'
                                                        }}>
                                                            (Correct Answer)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                            )}

                            {/* Explanation */}
                            {item.explanation && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    backgroundColor: '#f8f9fa',
                                    borderLeft: '4px solid #2563eb',
                                    borderRadius: '4px'
                                }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginBottom: '4px' }}>
                                        Explanation:
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                                        <MathText>{item.explanation}</MathText>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, questionId: null })}
                onConfirm={handleConfirmRemove}
                title="Remove Bookmark?"
                message="Are you sure you want to remove this bookmark? You can always bookmark it again later."
                confirmText="Remove"
                cancelText="Cancel"
                type="danger"
            />
        </div >
    );
};

export default StudentBookmarks;
