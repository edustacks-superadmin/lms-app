import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X, Layers, Tag } from 'lucide-react';
import { useExams } from '../context/ExamContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import { Folder } from 'lucide-react';
import MathText from './MathText';
import QuestionSelector from './QuestionSelector';
import FolderQuestionSelector from './FolderQuestionSelector';
import SectionManager from './SectionManager';

const ExamQuestions = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getExamById, fetchExamQuestions, addQuestionToExam, removeQuestionFromExam, bulkRemoveQuestionsFromExam, getExamSections, updateQuestionSection } = useExams();
    const { getQuestionsUsage } = useQuestionFolders();
    const [exam, setExam] = useState(null);
    const [examQuestions, setExamQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showQuestionSelector, setShowQuestionSelector] = useState(false);
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
    const [sections, setSections] = useState([]);
    const [showSectionManager, setShowSectionManager] = useState(false);
    const [questionUsage, setQuestionUsage] = useState({});

    useEffect(() => {
        loadExamData();
    }, [id]);

    const loadExamData = async () => {
        setLoading(true);
        const examData = await getExamById(id);
        if (examData) {
            setExam(examData);
            loadQuestions();
        }
        setLoading(false);
    };

    const loadQuestions = async () => {
        if (!id) return;
        const questions = await fetchExamQuestions(id);
        setExamQuestions(questions || []);
        setSelectedQuestionIds(new Set()); // Reset selection on load

        // Load sections
        const sectionsData = await getExamSections(id);
        setSections(sectionsData || []);

        // Fetch usage
        if (questions && questions.length > 0) {
            const questionIds = questions.map(q => q.question_id);
            const result = await getQuestionsUsage(questionIds);

            if (result.success && result.data) {
                const usageMap = {};
                result.data.forEach(item => {
                    if (!usageMap[item.question_id]) {
                        usageMap[item.question_id] = [];
                    }
                    usageMap[item.question_id].push(item);
                });
                setQuestionUsage(usageMap);
            }
        } else {
            setQuestionUsage({});
        }
    };

    const handleAddQuestions = async (selectedQuestions) => {
        let questionIds = [];
        if (selectedQuestions.length > 0) {
            if (typeof selectedQuestions[0] === 'object') {
                questionIds = selectedQuestions.map(q => q.id);
            } else {
                questionIds = selectedQuestions;
            }
        }

        try {
            for (const qId of questionIds) {
                if (!examQuestions.find(eq => eq.question_id === qId)) {
                    await addQuestionToExam(id, qId, exam.marks_per_question || 1, examQuestions.length + 1);
                }
            }
            loadQuestions();
            setShowQuestionSelector(false);
            setShowFolderSelector(false);
        } catch (error) {
            console.error('Error adding questions:', error);
            alert('Failed to add questions');
        }
    };

    const handleRemoveQuestion = async (questionId) => {
        if (!window.confirm('Are you sure you want to remove this question?')) return;
        try {
            await removeQuestionFromExam(id, questionId);
            loadQuestions();
        } catch (error) {
            console.error('Error removing question:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestionIds.size === 0) return;

        if (window.confirm(`Are you sure you want to remove ${selectedQuestionIds.size} questions from this exam?`)) {
            try {
                await bulkRemoveQuestionsFromExam(id, Array.from(selectedQuestionIds));
                loadQuestions();
            } catch (error) {
                console.error('Error bulk removing questions:', error);
                alert('Failed to remove questions');
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedQuestionIds.size === examQuestions.length) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(new Set(examQuestions.map(q => q.question_id)));
        }
    };

    const toggleSelectQuestion = (qId) => {
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(qId)) {
                newSet.delete(qId);
            } else {
                newSet.add(qId);
            }
            return newSet;
        });
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate(`/exams/edit/${id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                    <ArrowLeft size={20} /> Back to Exam Details
                </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}>
                    {exam?.title} - Questions
                </h1>
                <p style={{ color: '#666', margin: 0 }}>
                    Manage questions for this exam
                </p>
            </div>

            {/* Sections List */}
            {sections.length > 0 && (
                <div style={{ marginBottom: '24px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {sections.map(section => (
                        <div key={section.id} style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{section.section_name}</h3>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {section.total_marks ? `${section.total_marks} marks` : 'No marks set'} • {examQuestions.filter(q => q.section_id === section.id).length} questions
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/exams/${id}/sections/${section.id}`)}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                            >
                                Manage Questions
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ fontSize: '18px', margin: 0 }}>Questions ({examQuestions.length})</h2>
                        {examQuestions.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.size === examQuestions.length && examQuestions.length > 0}
                                    onChange={toggleSelectAll}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    id="select-all-exam"
                                />
                                <label htmlFor="select-all-exam" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '14px', fontWeight: '500' }}>
                                    Select All
                                </label>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {selectedQuestionIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '14px'
                                }}
                            >
                                <Trash2 size={16} />
                                Delete Selected ({selectedQuestionIds.size})
                            </button>
                        )}
                        <button
                            onClick={() => setShowSectionManager(true)}
                            className="btn btn-outline"
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Layers size={16} />
                            Manage Sections
                        </button>
                        <button
                            onClick={() => setShowFolderSelector(true)}
                            className="btn btn-outline"
                            style={{ padding: '8px 16px', fontSize: '14px' }}
                        >
                            From Folder
                        </button>
                        <button
                            onClick={() => setShowQuestionSelector(true)}
                            className="btn btn-primary"
                            style={{ padding: '8px 16px', fontSize: '14px' }}
                        >
                            Browse All
                        </button>
                    </div>
                </div>

                {showQuestionSelector && (
                    <div style={{ marginBottom: '20px', border: '1px solid #2196f3', borderRadius: '8px', padding: '16px', background: '#f8f9fa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#2196f3' }}>Select Questions</h3>
                            <button onClick={() => setShowQuestionSelector(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <QuestionSelector
                            onSelect={handleAddQuestions}
                            selectedQuestionIds={examQuestions.map(q => q.question_id)}
                        />
                    </div>
                )}

                {showFolderSelector && (
                    <FolderQuestionSelector
                        onQuestionsSelected={handleAddQuestions}
                        onClose={() => setShowFolderSelector(false)}
                    />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {examQuestions.length === 0 ? (
                        <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '8px' }}>
                            No questions added yet. Click "Browse All" or "From Folder" to add questions.
                        </div>
                    ) : (
                        examQuestions.map((eq, index) => (
                            <div key={eq.id || index} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedQuestionIds.has(eq.question_id)}
                                            onChange={() => toggleSelectQuestion(eq.question_id)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '500' }}>
                                                {index + 1}.
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    backgroundColor: '#e3f2fd',
                                                    color: '#1976d2',
                                                    borderRadius: '4px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {eq.questions?.question_type || 'MCQ, Single Correct Question'}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                                                Marks: <strong>{eq.marks}</strong>
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
                                            <MathText>{eq.questions?.question_text}</MathText>
                                        </div>

                                        {/* Options */}
                                        <div style={{ marginTop: '12px' }}>
                                            {eq.questions?.options && eq.questions.options.map((option) => (
                                                <div
                                                    key={option.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '8px',
                                                        padding: '8px 0',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: '500', minWidth: '20px' }}>
                                                        {option.option_label})
                                                    </span>
                                                    <span style={{ color: option.is_correct ? '#4caf50' : '#333' }}>
                                                        <MathText>{option.option_text}</MathText>
                                                    </span>
                                                    {option.is_correct && (
                                                        <div
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                backgroundColor: '#4caf50',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '12px',
                                                                color: 'white',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Explanation */}
                                        {eq.questions?.explanation && (
                                            <div className="explanation-container" style={{ marginTop: '12px', padding: '14px 20px', backgroundColor: '#f5f9ff', borderLeft: '4px solid #2196f3', borderRadius: '4px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1976d2', marginBottom: '6px' }}>
                                                    Explanation:
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }} className="explanation-content">
                                                    <MathText>{eq.questions.explanation}</MathText>
                                                </div>
                                            </div>
                                        )}

                                        {/* Subject Info */}
                                        {(eq.questions?.subject || eq.questions?.subjects) && (
                                            <div style={{ marginTop: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <strong style={{ color: '#475569' }}>Subject:</strong>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '2px 8px',
                                                    backgroundColor: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '12px',
                                                    color: '#1d4ed8',
                                                    fontSize: '12px',
                                                    fontWeight: '500'
                                                }}>
                                                    {eq.questions.subject || eq.questions.subjects?.name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {eq.questions?.tags && eq.questions.tags.length > 0 && (
                                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {eq.questions.tags.map(tag => (
                                                    <span
                                                        key={tag.id}
                                                        style={{
                                                            fontSize: '12px',
                                                            padding: '3px 10px',
                                                            backgroundColor: '#f5f5f5',
                                                            borderRadius: '12px',
                                                            color: '#666'
                                                        }}
                                                    >
                                                        {tag.tag_name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Metadata */}
                                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#999', display: 'flex', gap: '16px' }}>
                                            {eq.questions?.created_at && <span>Created on {new Date(eq.questions.created_at).toLocaleDateString()}</span>}
                                            {eq.questions?.percentage_correct !== null && eq.questions?.percentage_correct !== undefined && <span>Percentage correct: {eq.questions.percentage_correct}%</span>}
                                        </div>

                                        {/* List Usage */}
                                        {questionUsage[eq.question_id] && questionUsage[eq.question_id].length > 0 && (
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Folder size={12} />
                                                    Used in:
                                                </span>
                                                {questionUsage[eq.question_id].map((item, idx) => (
                                                    <span
                                                        key={idx}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '2px 8px',
                                                            backgroundColor: item.type === 'exam' ? '#e3f2fd' : '#fff3e0',
                                                            color: item.type === 'exam' ? '#1565c0' : '#e65100',
                                                            border: `1px solid ${item.type === 'exam' ? '#bbdefb' : '#ffe0b2'}`,
                                                            borderRadius: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {item.type === 'exam' ? 'Exam: ' : 'Folder: '}
                                                        {item.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveQuestion(eq.question_id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                        title="Remove"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Section Manager Modal */}
            <SectionManager
                examId={id}
                isOpen={showSectionManager}
                onClose={() => setShowSectionManager(false)}
                onSectionsUpdated={loadQuestions}
            />
        </div>
    );
};

export default ExamQuestions;
