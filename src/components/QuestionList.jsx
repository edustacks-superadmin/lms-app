import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileDown, Edit2, Trash2, Tag } from 'lucide-react';
import { useQuestions } from '../context/QuestionContext';
import { useSubjects } from '../context/SubjectContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import { Folder } from 'lucide-react';
import MathText from './MathText';
import * as XLSX from 'xlsx';

const QuestionList = () => {
    const navigate = useNavigate();
    const { questions, totalCount, fetchQuestions, deleteQuestion, loading } = useQuestions();
    const { subjects, fetchSubjects } = useSubjects();
    const { getQuestionsUsage } = useQuestionFolders();
    const [questionUsage, setQuestionUsage] = useState({});

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(200);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        subjectId: null,
        questionType: null,
        difficultyLevel: null
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        fetchQuestions({
            page: currentPage,
            perPage,
            search: searchTerm,
            ...filters
        });
    }, [currentPage, perPage, searchTerm, filters]);

    // Fetch usage when questions change
    useEffect(() => {
        const fetchUsage = async () => {
            if (questions.length > 0) {
                const questionIds = questions.map(q => q.id);
                const result = await getQuestionsUsage(questionIds);

                if (result.success && result.data) {
                    // Group by question_id
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

        fetchUsage();
    }, [questions]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            await deleteQuestion(id);
            fetchQuestions({ page: currentPage, perPage, search: searchTerm, ...filters });
        }
    };

    const handleExport = () => {
        const dataToExport = questions.map(q => {
            // Extract options if they exist
            const options = q.options || [];
            const optionA = options.find(opt => opt.option_label === 'A')?.option_text || '';
            const optionB = options.find(opt => opt.option_label === 'B')?.option_text || '';
            const optionC = options.find(opt => opt.option_label === 'C')?.option_text || '';
            const optionD = options.find(opt => opt.option_label === 'D')?.option_text || '';

            // Find the correct answer
            const correctOption = options.find(opt => opt.is_correct);
            const correctAnswer = correctOption ? `${correctOption.option_label}) ${correctOption.option_text}` : '';

            return {
                'Question #': q.id,
                'Question Text': q.question_text || '',
                'Question Type': q.question_type || '',
                'Option A': optionA,
                'Option B': optionB,
                'Option C': optionC,
                'Option D': optionD,
                'Correct Answer': correctAnswer,
                'Explanation': q.explanation || '',
                'Subject': q.subject?.name || q.subjects?.name || '',
                'Difficulty': q.difficulty_level || '',
                'Tags': q.tags?.map(t => t.tag_name).join(', ') || '',
                'Created At': new Date(q.created_at).toLocaleDateString()
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 10 },  // Question #
            { wch: 50 },  // Question Text
            { wch: 12 },  // Question Type
            { wch: 40 },  // Option A
            { wch: 40 },  // Option B
            { wch: 40 },  // Option C
            { wch: 40 },  // Option D
            { wch: 40 },  // Correct Answer
            { wch: 50 },  // Explanation
            { wch: 20 },  // Subject
            { wch: 12 },  // Difficulty
            { wch: 30 },  // Tags
            { wch: 15 }   // Created At
        ];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Questions_Export_${today}.xlsx`);
    };

    const totalPages = Math.ceil(totalCount / perPage);

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>
                        Questions
                    </h1>
                    <div style={{
                        padding: '6px 16px',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {totalCount} Total
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '8px 12px 8px 40px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                width: '250px'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => navigate('/questions/bulk-upload')}
                        className="btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        <FileDown size={18} style={{ transform: 'rotate(180deg)' }} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => navigate('/questions/create')}
                        className="btn btn-success"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <Plus size={18} />
                        Add Question
                    </button>
                    <button
                        onClick={handleExport}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <FileDown size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Questions List */}
            {loading && <p>Loading questions...</p>}

            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                {questions.map((question, index) => (
                    <div
                        key={question.id}
                        style={{
                            padding: '20px 24px',
                            borderBottom: index < questions.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                    >
                        {/* Question Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                                        {index + 1 + (currentPage - 1) * perPage}.
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
                                        {question.question_type || 'MCQ, Single Correct Question'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
                                    <MathText>{question.question_text}</MathText>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => navigate(`/questions/edit/${question.id}`)}
                                    style={{
                                        padding: '6px 12px',
                                        border: '1px solid #ddd',
                                        background: 'white',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Edit2 size={14} />
                                    Edit Question
                                </button>
                                <button
                                    style={{
                                        padding: '6px 12px',
                                        border: '1px solid #ddd',
                                        background: 'white',
                                        borderRadius: '4px',
                                        cursor: 'not-allowed',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Tag size={14} />
                                    Tags
                                    <span style={{
                                        fontSize: '9px',
                                        backgroundColor: '#ffa726',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        marginLeft: '4px'
                                    }}>SOON</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(question.id)}
                                    style={{
                                        padding: '6px 12px',
                                        border: '1px solid #f44336',
                                        background: 'white',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        color: '#f44336',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Delete Question
                                </button>
                            </div>
                        </div>

                        {/* Options */}
                        <div style={{ marginTop: '12px' }}>
                            {question.options && question.options.map((option) => (
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

                        {/* Subject Info */}
                        {question.subjects && (
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                                <strong>Subject:</strong> {question.subjects.name}
                            </div>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f9ff', borderLeft: '3px solid #2196f3', borderRadius: '4px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1976d2', marginBottom: '4px' }}>
                                    Explanation:
                                </div>
                                <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
                                    <MathText>{question.explanation}</MathText>
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {question.tags && question.tags.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {question.tags.map(tag => (
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
                            <span>Created on {new Date(question.created_at).toLocaleDateString()}</span>
                            {question.updated_at && question.updated_at !== question.created_at && (
                                <span>Last modified: {new Date(question.updated_at).toLocaleDateString()}</span>
                            )}
                            {question.percentage_correct !== null && question.percentage_correct !== undefined && <span>Percentage correct: {question.percentage_correct}%</span>}
                        </div>

                        {/* List Usage */}
                        {questionUsage[question.id] && questionUsage[question.id].length > 0 && (
                            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Folder size={12} />
                                    Used in:
                                </span>
                                {questionUsage[question.id].map((item, idx) => (
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
                ))}

                {!loading && questions.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        No questions found. Add your first question!
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                        Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalCount)} of {totalCount} questions
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #ddd',
                                background: currentPage === 1 ? '#f5f5f5' : 'white',
                                borderRadius: '4px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '14px' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #ddd',
                                background: currentPage === totalPages ? '#f5f5f5' : 'white',
                                borderRadius: '4px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next
                        </button>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                marginLeft: '16px'
                            }}
                        >
                            <option value="50">50 per page</option>
                            <option value="100">100 per page</option>
                            <option value="200">200 per page</option>
                            <option value="500">500 per page</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionList;
