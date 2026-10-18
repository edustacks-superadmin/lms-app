'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExams } from '../context/ExamContext';
import { Plus, Trash2, ArrowLeft, X, Layers, AlertCircle, FileQuestion, FolderOpen } from 'lucide-react';
import MathText from './MathText';
import QuestionSelector from './QuestionSelector';
import FolderQuestionSelector from './FolderQuestionSelector';

const SectionQuestions = () => {
    const { id, sectionId } = useParams();
    const router = useRouter();
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
    }, [id, sectionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Exam
            const examData = await getExamById(id);
            setExam(examData);

            // Fetch Section
            const sections = await getExamSections(id);
            const currentSection = sections.find(s => s.id === sectionId);
            setSection(currentSection);

            // Fetch Questions
            const questions = await fetchExamQuestionsWithSections(id);
            setAllExamQuestions(questions || []);

            // Filter for this section
            const filtered = (questions || []).filter(q => q.section_id === sectionId);
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

                await addQuestionToExam(id, qId, 1, allExamQuestions.length + 1, sectionId);
            }
            loadData();
            setShowQuestionSelector(false);
            setShowFolderSelector(false);
        } catch (error) {
            console.error('Error adding questions:', error);
            // Consider adding a toast notification here
        }
    };

    const handleRemoveQuestion = async (questionId) => {
        if (!window.confirm('Are you sure you want to remove this question from the exam?')) return;
        try {
            await removeQuestionFromExam(id, questionId);
            loadData();
        } catch (error) {
            console.error('Error removing question:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestionIds.size === 0) return;

        if (window.confirm(`Are you sure you want to remove ${selectedQuestionIds.size} questions from this exam?`)) {
            try {
                await bulkRemoveQuestionsFromExam(id, Array.from(selectedQuestionIds));
                loadData();
            } catch (error) {
                console.error('Error bulk removing questions:', error);
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading section data...</p>
            </div>
        );
    }

    if (!section) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Section not found</h2>
                <p className="text-slate-500 mb-6">The requested section could not be found.</p>
                <button
                    onClick={() => router.push(`/exams/${id}/questions`)}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                    Back to Exam Questions
                </button>
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
                            onClick={() => router.push(`/exams/${id}/questions`)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                <Layers size={14} />
                                <span>{exam?.title}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {section.section_name}
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions Management Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            Questions
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {sectionQuestions.length}
                            </span>
                        </h3>
                        {sectionQuestions.length > 0 && (
                            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                        )}
                        {sectionQuestions.length > 0 && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.size === sectionQuestions.length && sectionQuestions.length > 0}
                                    onChange={toggleSelectAll}
                                    id="select-all-section"
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                                <label htmlFor="select-all-section" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
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
                            Add Questions
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
                                    Add Questions to {section.section_name}
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
                                    selectedQuestionIds={allExamQuestions.map(q => q.question_id)}
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
                    <div className="space-y-3">
                        {sectionQuestions.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                <div className="w-12 h-12 bg-white text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                                    <FileQuestion size={24} />
                                </div>
                                <h3 className="text-sm font-medium text-slate-900 mb-1">No questions yet</h3>
                                <p className="text-sm text-slate-500">
                                    This section is empty. Click "Add Questions" to get started.
                                </p>
                            </div>
                        ) : (
                            sectionQuestions.map((eq, index) => (
                                <div
                                    key={eq.id || index}
                                    className={`
                                        group relative bg-white border rounded-lg p-4 transition-all duration-200
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
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    {eq.questions?.question_type || 'MCQ'}
                                                </span>
                                                <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                    {eq.marks} Marks
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-800 leading-relaxed font-medium">
                                                <MathText>{eq.questions?.question_text || 'Question text missing'}</MathText>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveQuestion(eq.question_id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove from Section"
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
        </div>
    );
};

export default SectionQuestions;
