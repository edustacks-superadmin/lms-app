'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, X, Layers, AlertCircle, FileQuestion, FolderOpen, CheckCircle, Tag } from 'lucide-react';
import { useExams } from '../context/ExamContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import MathText from './MathText';
import QuestionSelector from './QuestionSelector';
import FolderQuestionSelector from './FolderQuestionSelector';
import SectionManager from './SectionManager';
import QuestionUsages from './QuestionUsages';

const ExamQuestions = ({ examId }) => {
    const params = useParams();
    const id = examId || params?.id;
    const router = useRouter();
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
            // Consider toast notification
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading exam data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/exams/${id}`)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                <FileQuestion size={14} />
                                <span>Exam Questions</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {exam?.title}
                            </h1>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSectionManager(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm"
                    >
                        <Layers size={16} />
                        Manage Sections
                    </button>
                </div>
            </div>

            {/* Sections Overview - Grid Layout */}
            {sections.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sections.map(section => (
                        <div key={section.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Layers size={20} />
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                                    {examQuestions.filter(q => q.section_id === section.id).length} Qs
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 mb-1">{section.section_name}</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                {section.total_marks ? `${section.total_marks} marks total` : 'No total marks set'}
                            </p>
                            <button
                                onClick={() => router.push(`/exams/${id}/sections/${section.id}`)} // Updated route to correct generic route
                                className="w-full py-2 px-3 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2"
                            >
                                Manage Questions <ArrowLeft size={14} className="rotate-180" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* All Questions Management Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            All Questions
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {examQuestions.length}
                            </span>
                        </h3>
                        {examQuestions.length > 0 && (
                            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                        )}
                        {examQuestions.length > 0 && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.size === examQuestions.length && examQuestions.length > 0}
                                    onChange={toggleSelectAll}
                                    id="select-all-exam"
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                                <label htmlFor="select-all-exam" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                                    Select All
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedQuestionIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <Trash2 size={16} />
                                Delete ({selectedQuestionIds.size})
                            </button>
                        )}
                        <button
                            onClick={() => setShowFolderSelector(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <FolderOpen size={16} />
                            From Folder
                        </button>
                        <button
                            onClick={() => setShowQuestionSelector(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Browse All
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Selectors Area */}
                    {showQuestionSelector && (
                        <div className="mb-6 border border-blue-200 rounded-xl overflow-hidden bg-blue-50/30">
                            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                    <Plus size={16} />
                                    Add Questions to Exam
                                </h3>
                                <button
                                    onClick={() => setShowQuestionSelector(false)}
                                    className="p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 bg-white">
                                <QuestionSelector
                                    onSelect={handleAddQuestions}
                                    selectedQuestionIds={examQuestions.map(q => q.question_id)}
                                />
                            </div>
                        </div>
                    )}

                    {showFolderSelector && (
                        <div className="mb-6">
                            <FolderQuestionSelector
                                onQuestionsSelected={handleAddQuestions}
                                onClose={() => setShowFolderSelector(false)}
                            />
                        </div>
                    )}

                    {/* Questions List */}
                    <div className="space-y-4">
                        {examQuestions.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                <div className="w-16 h-16 bg-white text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                    <FileQuestion size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-1">No questions added yet</h3>
                                <p className="text-slate-500 mb-6">
                                    Start building your exam by adding questions from the bank or folders.
                                </p>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => setShowFolderSelector(true)}
                                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        Add from Folder
                                    </button>
                                    <button
                                        onClick={() => setShowQuestionSelector(true)}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Browse Question Bank
                                    </button>
                                </div>
                            </div>
                        ) : (
                            examQuestions.map((eq, index) => (
                                <div
                                    key={eq.id || index}
                                    className={`
                                        group relative bg-white border rounded-xl p-5 transition-all duration-200
                                        ${selectedQuestionIds.has(eq.question_id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-slate-200 hover:border-blue-300'}
                                    `}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestionIds.has(eq.question_id)}
                                                onChange={() => toggleSelectQuestion(eq.question_id)}
                                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* Header Row */}
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md min-w-[32px] text-center border border-slate-200">
                                                    {index + 1}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    {eq.questions?.question_type || 'MCQ'}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    Mark: {eq.marks || 0}
                                                </span>
                                                {(eq.questions?.subjects || eq.questions?.subject) && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        {eq.questions.subjects?.name || eq.questions.subject}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Question Text */}
                                            <div className="text-base font-medium text-slate-800 mb-4 leading-relaxed">
                                                <MathText>{eq.questions?.question_text}</MathText>
                                            </div>

                                            {/* Options */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                {eq.questions?.options && eq.questions.options.map((option) => (
                                                    <div
                                                        key={option.id}
                                                        className={`
                                                            flex items-center gap-3 p-2.5 rounded-lg border text-sm
                                                            ${option.is_correct
                                                                ? 'bg-green-50 border-green-200'
                                                                : 'bg-white border-slate-200'}
                                                        `}
                                                    >
                                                        <span className={`
                                                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                                            ${option.is_correct ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}
                                                        `}>
                                                            {option.option_label}
                                                        </span>
                                                        <span className={`flex-1 ${option.is_correct ? 'text-green-800 font-medium' : 'text-slate-600'}`}>
                                                            <MathText>{option.option_text}</MathText>
                                                        </span>
                                                        {option.is_correct && <CheckCircle size={16} className="text-green-600 shrink-0" />}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Explanation */}
                                            {eq.questions?.explanation && (
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                                                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1 flex items-center gap-2">
                                                        <AlertCircle size={12} /> Explanation
                                                    </h4>
                                                    <div className="text-sm text-slate-700 leading-relaxed">
                                                        <MathText>{eq.questions.explanation}</MathText>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Footer with Tags and Metadata */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    <QuestionUsages usages={questionUsage[eq.question_id] || []} />

                                                    {eq.questions?.percentage_correct !== null && eq.questions?.percentage_correct !== undefined && (
                                                        <div className="flex items-center gap-1.5 text-slate-600">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                            Accuracy: {eq.questions.percentage_correct}%
                                                        </div>
                                                    )}
                                                </div>

                                                {eq.questions?.tags && eq.questions.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {eq.questions.tags.map(tag => (
                                                            <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                                                                <Tag size={10} /> {tag.tag_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveQuestion(eq.question_id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Question from Exam"
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
