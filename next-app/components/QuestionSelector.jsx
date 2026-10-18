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
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-center mb-4">
                <h3 className="m-0 text-lg font-semibold">Select Questions</h3>
                <div className="flex gap-3">
                    <div className="input-group w-[250px] flex">
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 py-2 px-3 border border-gray-300 rounded-l-md text-sm outline-none focus:border-blue-500"
                        />
                        <button className="py-2 px-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md cursor-pointer hover:bg-gray-200">
                            <Search size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-md">
                {loading ? (
                    <div className="p-5 text-center text-gray-500">Loading questions...</div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-gray-50 z-[1]">
                            <tr>
                                <th className="p-3 text-left border-b border-gray-300 w-10">
                                    <input type="checkbox" onChange={handleSelectAll} className="cursor-pointer" />
                                </th>
                                <th className="p-3 text-left border-b border-gray-300 text-sm font-semibold text-gray-700">Question</th>
                                <th className="p-3 text-left border-b border-gray-300 w-[100px] text-sm font-semibold text-gray-700">Type</th>
                                <th className="p-3 text-left border-b border-gray-300 w-[100px] text-sm font-semibold text-gray-700">Difficulty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => (
                                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(q.id)}
                                            onChange={() => handleToggle(q)}
                                            className="cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="font-medium mb-1">
                                            <MathText>{q.question_text}</MathText>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {q.tags?.map(t => t.tag_name).join(', ')}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className="py-1 px-2 rounded bg-sky-100 text-sky-700 text-xs font-medium">
                                            {q.question_type}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`py-1 px-2 rounded text-xs font-medium ${q.difficulty_level === 'Easy' ? 'bg-green-100 text-green-700' :
                                                q.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {q.difficulty_level}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                <div>Showing {questions.length} of {totalCount} questions</div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-outline py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <button
                        className="btn btn-outline py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
