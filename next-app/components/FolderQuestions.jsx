'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, Trash2, Plus, X, Edit, Upload, Info, CheckCircle, FileQuestion, Filter } from 'lucide-react';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import { useQuestions } from '../context/QuestionContext';
import MathText from './MathText';
import AdvancedPagination from './AdvancedPagination';
import QuestionUsages from './QuestionUsages';

const FolderQuestions = () => {
    const { id } = useParams();
    const router = useRouter();
    const { folders, getFolderDetails, getFolderQuestions, removeQuestionFromFolder, addQuestionToFolder, reorderFolderQuestions, bulkRemoveQuestionsFromFolder, getQuestionsUsage } = useQuestionFolders();
    const { questions: allQuestions, fetchQuestions } = useQuestions();

    // Optimistically initialize from context if available
    const [folder, setFolder] = useState(() => folders.find(f => f.id === id) || null);
    const [folderQuestions, setFolderQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [expandedQuestionIds, setExpandedQuestionIds] = useState(new Set());
    const [questionUsage, setQuestionUsage] = useState({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [totalQuestions, setTotalQuestions] = useState(0);

    // Fetch specific folder details on mount to ensure fresh data
    useEffect(() => {
        const fetchDetails = async () => {
            const result = await getFolderDetails(id);
            if (result.success) {
                setFolder(result.data);
            }
        };
        fetchDetails();
    }, [id]);

    useEffect(() => {
        loadFolderQuestions();
    }, [id, currentPage, perPage, searchTerm]);

    const loadFolderQuestions = async () => {
        setLoading(true);
        const result = await getFolderQuestions(id, {
            page: currentPage,
            limit: perPage,
            search: searchTerm
        });
        if (result.success) {
            setFolderQuestions(result.data);
            setTotalQuestions(result.count || 0);
            setSelectedQuestionIds(new Set());

            if (result.data && result.data.length > 0) {
                const questionIds = result.data.map(q => q.question_id);
                const usageResult = await getQuestionsUsage(questionIds);

                if (usageResult.success && usageResult.data) {
                    const usageMap = {};
                    usageResult.data.forEach(item => {
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
        }
        setLoading(false);
    };

    const handleRemoveQuestion = async (questionId) => {
        if (window.confirm('Remove this question from the folder?')) {
            const result = await removeQuestionFromFolder(questionId, id);
            if (result.success) {
                loadFolderQuestions();
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestionIds.size === 0) return;

        if (window.confirm(`Are you sure you want to remove ${selectedQuestionIds.size} questions from this folder?`)) {
            const result = await bulkRemoveQuestionsFromFolder(Array.from(selectedQuestionIds), id);
            if (result.success) {
                loadFolderQuestions();
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedQuestionIds.size === folderQuestions.length) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(new Set(folderQuestions.map(q => q.question_id)));
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

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const reordered = [...folderQuestions];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(dragOverIndex, 0, removed);

        setFolderQuestions(reordered);
        setDraggedIndex(null);
        setDragOverIndex(null);

        await reorderFolderQuestions(id, reordered, (currentPage - 1) * perPage);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/questions/folders')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            {folder ? folder.name : 'Loading...'}
                            {!loading && totalQuestions > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                    {totalQuestions} Qns
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Manage questions within this folder</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {selectedQuestionIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                        >
                            <Trash2 size={16} />
                            Delete Selected ({selectedQuestionIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => router.push(`/questions/folders/${id}/bulk-upload`)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                    >
                        <Upload size={16} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Add Existing
                    </button>
                    <button
                        onClick={() => router.push(`/questions/create?folderId=${id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Create New
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search questions in this folder..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-600 placeholder:text-slate-400 transition-all"
                    />
                </div>

                {folderQuestions.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            checked={selectedQuestionIds.size === folderQuestions.length && folderQuestions.length > 0}
                            onChange={toggleSelectAll}
                            id="select-all"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                            Select All Questions
                        </label>
                    </div>
                )}
            </div>

            {/* Questions List */}
            {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading questions...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {folderQuestions.map((item, index) => {
                        const question = item.questions;
                        const isSelected = selectedQuestionIds.has(item.question_id);
                        const isDragging = draggedIndex === index;

                        return (
                            <div
                                key={item.question_id}
                                draggable={!searchTerm}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`
                                    bg-white rounded-xl shadow-sm border transition-all duration-200 relative overflow-hidden group
                                    ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}
                                    ${isDragging ? 'opacity-50 scale-[0.99]' : 'opacity-100'}
                                `}
                            >
                                {/* Drag Handle */}
                                {!searchTerm && (
                                    <div
                                        className="h-1.5 bg-slate-100 w-full cursor-move hover:bg-blue-100 transition-colors border-b border-slate-100"
                                        title="Drag to reorder"
                                    />
                                )}

                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectQuestion(item.question_id)}
                                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600 mt-0.5"
                                                />
                                                <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md min-w-[32px] text-center">
                                                    {index + 1 + (currentPage - 1) * perPage}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                                    {question?.question_type?.split(',')[0] || 'MCQ'}
                                                </span>
                                                {(question?.subjects || question?.subject) && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                        {question.subjects?.name || question.subject}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => router.push(`/questions/edit/${item.question_id}`)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Question"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveQuestion(item.question_id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove from Folder"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-base font-medium text-slate-800 mb-6 leading-relaxed">
                                        <MathText>{question?.question_text}</MathText>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        {question?.options?.map((option) => (
                                            <div
                                                key={option.id}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg border transition-colors
                                                    ${option.is_correct
                                                        ? 'bg-green-50/50 border-green-200 hover:bg-green-50'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50'}
                                                `}
                                            >
                                                <div className={`
                                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                                    ${option.is_correct ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}
                                                `}>
                                                    {option.option_label}
                                                </div>
                                                <div className="flex-1 text-sm text-slate-700">
                                                    <MathText>{option.option_text}</MathText>
                                                </div>
                                                {option.is_correct && <CheckCircle size={18} className="text-green-600 shrink-0" />}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Explanation Section */}
                                    {question?.explanation && (
                                        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                                <div className="text-sm text-slate-700 leading-relaxed">
                                                    <span className="font-semibold text-slate-900 block mb-1">Explanation:</span>
                                                    <MathText>{question.explanation}</MathText>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                                                <span className="text-slate-400">Marks:</span>
                                                <span className="text-slate-700">{question.marks || '1.00'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                                                <span className="text-slate-400">Diff:</span>
                                                <span className="text-slate-700">{question.difficulty_level || 'Medium'}</span>
                                            </div>
                                            {question?.percentage_correct !== null && (
                                                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded">
                                                    <CheckCircle size={12} />
                                                    {question.percentage_correct}% Accuracy
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs">
                                            <QuestionUsages usages={questionUsage[item.question_id] || []} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {folderQuestions.length === 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileQuestion size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No questions found</h3>
                            <p className="text-slate-500">
                                {searchTerm ? 'Try adjusting your search terms.' : 'This folder is empty. Add questions to get started.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalQuestions > 0 && (
                <div className="py-4">
                    <AdvancedPagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalQuestions / perPage)}
                        totalItems={totalQuestions}
                        itemsPerPage={perPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(newPerPage) => {
                            setPerPage(newPerPage);
                            setCurrentPage(1);
                        }}
                        pageSizeOptions={[50, 100, 200, 500]}
                    />
                </div>
            )}

            {/* Add Questions Modal */}
            {showAddModal && (
                <AddQuestionsModal
                    folderId={id}
                    existingQuestionIds={folderQuestions.map(q => q.question_id)}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadFolderQuestions();
                    }}
                />
            )}
        </div>
    );
};

const AddQuestionsModal = ({ folderId, existingQuestionIds, onClose, onSuccess }) => {
    const { questions, fetchQuestions, totalCount } = useQuestions();
    const { addQuestionToFolder } = useQuestionFolders();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [adding, setAdding] = useState(false);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchQuestions({ page, perPage: 50, search: searchTerm });
            setLoading(false);
        }
        load();
    }, [page, searchTerm]);

    const handleAdd = async () => {
        setAdding(true);
        for (const qId of selectedIds) {
            await addQuestionToFolder(qId, folderId);
        }
        setAdding(false);
        onSuccess();
    };

    const availableQuestions = questions.filter(q => !existingQuestionIds.includes(q.id));

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Add Questions to Folder</h2>
                        <p className="text-sm text-slate-500">Select questions from the bank to add</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search available questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                        />
                    </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p className="text-sm font-medium">Loading questions...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {availableQuestions.map(question => {
                                const isSelected = selectedIds.includes(question.id);
                                return (
                                    <label
                                        key={question.id}
                                        className={`
                                            flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all
                                            ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds([...selectedIds, question.id]);
                                                } else {
                                                    setSelectedIds(selectedIds.filter(id => id !== question.id));
                                                }
                                            }}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600 mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm text-slate-800 font-medium mb-1 line-clamp-2">
                                                {question.question_text || "No text content"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide border border-slate-200">
                                                    {question.question_type}
                                                </span>
                                                {question.marks && (
                                                    <span className="text-xs text-slate-500">
                                                        {question.marks} Marks
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                            {availableQuestions.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                    <Filter size={24} className="mb-2 opacity-50" />
                                    <p>No matching questions found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-4">
                    {totalCount > 50 && (
                        <div className="flex justify-center">
                            <AdvancedPagination currentPage={page} totalPages={Math.ceil(totalCount / 50)} totalItems={totalCount} itemsPerPage={50} onPageChange={setPage} size="sm" />
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <div className="text-sm font-medium text-slate-600">
                            <span className="text-blue-600 font-bold">{selectedIds.length}</span> question{selectedIds.length !== 1 && 's'} selected
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={selectedIds.length === 0 || adding}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                            >
                                {adding ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        Add Selected
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FolderQuestions;
