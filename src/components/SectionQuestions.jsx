import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { useExams } from '../context/ExamContext';
import MathText from './MathText';
import QuestionSelector from './QuestionSelector';
import FolderQuestionSelector from './FolderQuestionSelector';

const SectionQuestions = () => {
    const { examId, sectionId } = useParams();
    const navigate = useNavigate();
    const { getExamById, fetchExamQuestionsWithSections, addQuestionToExam, removeQuestionFromExam, bulkRemoveQuestionsFromExam, getExamSections } = useExams();
    const [exam, setExam] = useState(null);
    const [section, setSection] = useState(null);
    const [sectionQuestions, setSectionQuestions] = useState([]);
    const [allExamQuestions, setAllExamQuestions] = useState([]); // To avoid duplicates
    const [loading, setLoading] = useState(true);
    const [showQuestionSelector, setShowQuestionSelector] = useState(false);
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

    useEffect(() => {
        loadData();
    }, [examId, sectionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            console.log('Loading data for exam:', examId, 'section:', sectionId);
            // Fetch Exam
            const examData = await getExamById(examId);
            console.log('Exam data:', examData);
            setExam(examData);

            // Fetch Section
            const sections = await getExamSections(examId);
            console.log('Sections:', sections);
            const currentSection = sections.find(s => s.id === sectionId);
            console.log('Current section:', currentSection);
            setSection(currentSection);

            // Fetch Questions
            const questions = await fetchExamQuestionsWithSections(examId);
            console.log('All questions:', questions);
            setAllExamQuestions(questions || []);

            // Filter for this section
            const filtered = (questions || []).filter(q => q.section_id === sectionId);
            console.log('Filtered questions:', filtered);
            setSectionQuestions(filtered);

            setSelectedQuestionIds(new Set());
        } catch (error) {
            console.error('Error loading section data:', error);
        } finally {
            setLoading(false);
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
                // Check if already in exam (any section)
                const existing = allExamQuestions.find(eq => eq.question_id === qId);
                if (existing) {
                    console.warn(`Question ${qId} already in exam. Skipping.`);
                    continue;
                }

                await addQuestionToExam(examId, qId, 1, allExamQuestions.length + 1, sectionId);
            }
            loadData();
            setShowQuestionSelector(false);
            setShowFolderSelector(false);
        } catch (error) {
            console.error('Error adding questions:', error);
            alert('Failed to add questions');
        }
    };

    const handleRemoveQuestion = async (questionId) => {
        if (!window.confirm('Are you sure you want to remove this question from the exam?')) return;
        try {
            await removeQuestionFromExam(examId, questionId);
            loadData();
        } catch (error) {
            console.error('Error removing question:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestionIds.size === 0) return;

        if (window.confirm(`Are you sure you want to remove ${selectedQuestionIds.size} questions from this exam?`)) {
            try {
                await bulkRemoveQuestionsFromExam(examId, Array.from(selectedQuestionIds));
                loadData();
            } catch (error) {
                console.error('Error bulk removing questions:', error);
                alert('Failed to remove questions');
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedQuestionIds.size === sectionQuestions.length) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(new Set(sectionQuestions.map(q => q.question_id)));
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
    if (!section) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Section not found</h2>
            <p>The section with ID {sectionId} could not be found.</p>
            <button onClick={() => navigate(`/exams/${examId}/questions`)}>Back to Exam</button>
        </div>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate(`/exams/${examId}/questions`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                    <ArrowLeft size={20} /> Back to All Questions
                </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}>
                    {section.section_name} - Questions
                </h1>
                <p style={{ color: '#666', margin: 0 }}>
                    Manage questions for <strong>{section.section_name}</strong> in {exam?.title}
                </p>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ fontSize: '18px', margin: 0 }}>Questions ({sectionQuestions.length})</h2>
                        {sectionQuestions.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.size === sectionQuestions.length && sectionQuestions.length > 0}
                                    onChange={toggleSelectAll}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    id="select-all-section"
                                />
                                <label htmlFor="select-all-section" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '14px', fontWeight: '500' }}>
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
                            <Plus size={16} /> Add Questions
                        </button>
                    </div>
                </div>

                {showQuestionSelector && (
                    <div style={{ marginBottom: '20px', border: '1px solid #2196f3', borderRadius: '8px', padding: '16px', background: '#f8f9fa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#2196f3' }}>Select Questions to Add to {section.section_name}</h3>
                            <button onClick={() => setShowQuestionSelector(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <QuestionSelector
                            onSelect={handleAddQuestions}
                            selectedQuestionIds={allExamQuestions.map(q => q.question_id)} // Exclude ALL exam questions
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
                    {sectionQuestions.length === 0 ? (
                        <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '8px' }}>
                            No questions in this section. Click "Add Questions" to add some.
                        </div>
                    ) : (
                        sectionQuestions.map((eq, index) => (
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
                                        <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '15px' }}>
                                            {index + 1}. <MathText>{eq.questions?.question_text || 'Question text missing'}</MathText>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '16px' }}>
                                            <span>Type: <strong>{eq.questions?.question_type || 'N/A'}</strong></span>
                                            <span>Marks: <strong>{eq.marks}</strong></span>
                                        </div>
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
        </div>
    );
};

export default SectionQuestions;
