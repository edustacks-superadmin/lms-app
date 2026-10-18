'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, Search, FileDown, Edit2, Trash2, CheckCircle, Info, FileUp, FileQuestion } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useQuestions } from '../context/QuestionContext';
import { useSubjects } from '../context/SubjectContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import MathText from './MathText';
import QuestionUsages from './QuestionUsages';
import AdvancedPagination from './AdvancedPagination';
import * as XLSX from 'xlsx';

const QuestionList = () => {
    const router = useRouter();
    const { institute } = useInstitute();
    const { questions, totalCount, fetchQuestions, deleteQuestion, loading } = useQuestions();
    const { subjects, fetchSubjects } = useSubjects();
    const { getQuestionsUsage, fetchFolders } = useQuestionFolders();
    const [questionUsage, setQuestionUsage] = useState({});

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Init page from URL
    useEffect(() => {
        const pageParam = searchParams.get('page');
        if (pageParam) {
            setCurrentPage(parseInt(pageParam));
        }
    }, []);

    const [filters, setFilters] = useState({
        subjectId: null,
        questionType: null,
        difficultyLevel: null,
        folderId: null,
        tags: null,
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    // Sync filters with URL
    useEffect(() => {
        setFilters({
            subjectId: searchParams.get('subjectId'),
            questionType: searchParams.get('type'),
            difficultyLevel: searchParams.get('difficulty'),
            folderId: searchParams.get('folderId'),
            tags: searchParams.get('tags')
        });
    }, [searchParams]);

    useEffect(() => {
        if (institute?.id) {
            fetchQuestions({
                page: currentPage,
                perPage,
                search: searchTerm,
                ...filters
            });
            fetchFolders();
        }
    }, [currentPage, perPage, filters, institute?.id]);

    useEffect(() => {
        const fetchUsage = async () => {
            if (questions.length > 0) {
                const questionIds = questions.map(q => q.id);
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
            const options = q.options || [];
            const optionA = options.find(opt => opt.option_label === 'A')?.option_text || '';
            const optionB = options.find(opt => opt.option_label === 'B')?.option_text || '';
            const optionC = options.find(opt => opt.option_label === 'C')?.option_text || '';
            const optionD = options.find(opt => opt.option_label === 'D')?.option_text || '';
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
        const columnWidths = [{ wch: 10 }, { wch: 50 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 50 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 15 }];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Questions_Export_${today}.xlsx`);
    };

    const totalPages = Math.ceil(totalCount / perPage);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Questions</h1>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {totalCount} Total
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                            size={16}
                            onClick={() => fetchQuestions({ page: 1, perPage, search: searchTerm, ...filters })}
                        />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setCurrentPage(1);
                                    fetchQuestions({ page: 1, perPage, search: searchTerm, ...filters });
                                }
                            }}
                            className="pl-9 pr-4 py-2 w-64 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => router.push('/questions/bulk-upload')}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors shadow-sm text-sm"
                    >
                        <FileUp size={16} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => router.push('/questions/create')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                    >
                        <Plus size={16} />
                        Add Question
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm"
                    >
                        <FileDown size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Questions List Container */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading questions...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((question, index) => (
                        <div
                            key={question.id}
                            className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden"
                        >
                            <div className="p-6">
                                {/* Header Row */}
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md min-w-[36px] text-center border border-slate-200">
                                        {index + 1 + (currentPage - 1) * perPage}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                        {question.question_type?.split(',')[0]}
                                    </span>
                                    {(question.subjects?.name || question.subject) && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            {question.subjects?.name || question.subject?.name}
                                        </span>
                                    )}
                                </div>

                                {/* Question Text */}
                                <div className="text-base font-medium text-slate-800 leading-relaxed mb-5">
                                    <MathText>{question.question_text}</MathText>
                                </div>

                                {/* Options Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                                    {question.options?.map((option) => (
                                        <div
                                            key={option.id}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-lg border text-sm
                                                ${option.is_correct
                                                    ? 'bg-emerald-50 border-emerald-200'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'}
                                            `}
                                        >
                                            <span className={`
                                                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                                ${option.is_correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {option.option_label}
                                            </span>
                                            <span className={`flex-1 ${option.is_correct ? 'text-emerald-800 font-medium' : 'text-slate-600'}`}>
                                                <MathText>{option.option_text}</MathText>
                                            </span>
                                            {option.is_correct && <CheckCircle size={16} className="text-emerald-600 shrink-0" />}
                                        </div>
                                    ))}
                                </div>

                                {/* Explanation Section */}
                                {question.explanation && (
                                    <div className="mb-5 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                            <div className="text-sm text-slate-700 leading-relaxed">
                                                <span className="font-semibold text-slate-900 block mb-1">Explanation:</span>
                                                <MathText>{question.explanation}</MathText>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-600">Marks:</span>
                                            <span>{question.marks || '1.00'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-600">Diff:</span>
                                            <span>{question.difficulty_level || 'Medium'}</span>
                                        </div>
                                        {question.percentage_correct !== null && question.percentage_correct !== undefined && (
                                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                                                <CheckCircle size={14} />
                                                {question.percentage_correct}% Accuracy
                                            </div>
                                        )}
                                        <QuestionUsages usages={questionUsage[question.id] || []} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => router.push(`/questions/edit/${question.id}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(question.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {questions.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                <FileQuestion size={32} />
                            </div>
                            <p className="text-lg text-slate-500 font-medium">No questions found matching your criteria.</p>
                            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalCount > 0 && (
                <AdvancedPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    itemsPerPage={perPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={(newPerPage) => {
                        setPerPage(newPerPage);
                        setCurrentPage(1);
                    }}
                    pageSizeOptions={[50, 100, 200]}
                />
            )}
        </div>
    );
};

export default QuestionList;
