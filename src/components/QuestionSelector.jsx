import React, { useState, useEffect } from 'react';
import { useQuestions } from '../context/QuestionContext';
import { Search } from 'lucide-react';
import MathText from './MathText';

const QuestionSelector = ({ onSelect, selectedQuestionIds = [] }) => {
    const { questions, fetchQuestions, totalCount, loading } = useQuestions();
    const [selectedIds, setSelectedIds] = useState(new Set(selectedQuestionIds));
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    useEffect(() => {
        fetchQuestions({ page, perPage: limit, search: searchTerm });
    }, [page, searchTerm]);

    useEffect(() => {
        setSelectedIds(new Set(selectedQuestionIds));
    }, [selectedQuestionIds]);

    const handleToggle = (question) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(question.id)) {
            newSelected.delete(question.id);
        } else {
            newSelected.add(question.id);
        }
        setSelectedIds(newSelected);
        onSelect(Array.from(newSelected));
    };

    const handleSelectAll = () => {
        const newSelected = new Set(selectedIds);
        questions.forEach(q => newSelected.add(q.id));
        setSelectedIds(newSelected);
        onSelect(Array.from(newSelected));
    };

    return (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Select Questions</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="input-group" style={{ width: '250px' }}>
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button><Search size={16} /></button>
                    </div>
                </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading questions...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f9f9f9', zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '40px' }}>
                                    <input type="checkbox" onChange={handleSelectAll} />
                                </th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Question</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '100px' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '100px' }}>Difficulty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => (
                                <tr key={q.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(q.id)}
                                            onChange={() => handleToggle(q)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                            <MathText>{q.question_text}</MathText>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            {q.tags?.map(t => t.tag_name).join(', ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            background: '#e0f2fe',
                                            color: '#0369a1',
                                            fontSize: '12px'
                                        }}>
                                            {q.question_type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            background: q.difficulty_level === 'Easy' ? '#dcfce7' : q.difficulty_level === 'Medium' ? '#fef9c3' : '#fee2e2',
                                            color: q.difficulty_level === 'Easy' ? '#15803d' : q.difficulty_level === 'Medium' ? '#a16207' : '#b91c1c',
                                            fontSize: '12px'
                                        }}>
                                            {q.difficulty_level}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#666' }}>
                <div>Showing {questions.length} of {totalCount} questions</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn-outline"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <button
                        className="btn btn-outline"
                        disabled={questions.length < limit}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestionSelector;
