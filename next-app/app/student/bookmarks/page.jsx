'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Bookmark, Flag, Trash2, ChevronDown, ChevronUp, Check, AlertCircle, X, Search, Filter } from 'lucide-react';
import MathText from '../../../components/MathText';
import { getQuestionOptionsByIds, submitQuestionReport } from '../../actions/questions';

export default function BookmarksPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [expandedQuestions, setExpandedQuestions] = useState(new Set());

    // Search, Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const questionsPerPage = 10;

    // Report Modal State
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportText, setReportText] = useState('');
    const [reportQuestionId, setReportQuestionId] = useState(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportType, setReportType] = useState('Flag Content (Inappropriate/Irrelevant)');

    // Delete Confirmation Modal State
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteQuestionId, setDeleteQuestionId] = useState(null);

    const reportOptions = [
        "Flag Content (Inappropriate/Irrelevant)",
        "Question Error (Wrong answer/Typo)",
        "General Feedback"
    ];

    useEffect(() => {
        if (user) {
            fetchBookmarks();
        }
    }, [user]);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);

            // Get Member ID
            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) throw new Error("Member not found");

            // Fetch Bookmarks
            const { data: bookmarkData, error: bmError } = await supabase
                .from('bookmarks')
                .select('question_id')
                .eq('member_id', memberData.id)
                .order('created_at', { ascending: false });

            if (bmError) throw bmError;

            if (!bookmarkData || bookmarkData.length === 0) {
                setQuestions([]);
                setLoading(false);
                return;
            }

            const questionIds = bookmarkData.map(b => b.question_id);

            // Fetch Questions
            const { data: questionsData, error: qError } = await supabase
                .from('questions')
                .select('id, question_text, explanation, subject_id')
                .in('id', questionIds);

            if (qError) throw qError;

            // Fetch Options using Prisma server action (bypasses RLS)
            const optionsData = await getQuestionOptionsByIds(questionIds);
            console.log('Fetched options via Prisma:', optionsData?.length);

            // Map Options to Questions
            const optionsMap = {};
            optionsData.forEach(opt => {
                if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
                optionsMap[opt.question_id].push(opt);
            });

            // Fetch Subjects
            const subjectIds = [...new Set(questionsData.map(q => q.subject_id).filter(Boolean))];
            let subjectMap = {};
            if (subjectIds.length > 0) {
                const { data: subjectsData } = await supabase
                    .from('subjects')
                    .select('id, name, parent_id')
                    .in('id', subjectIds);

                if (subjectsData) {
                    const parentIds = [...new Set(subjectsData.map(s => s.parent_id).filter(Boolean))];
                    let parentMap = {};
                    if (parentIds.length > 0) {
                        const { data: parentsData } = await supabase.from('subjects').select('id, name').in('id', parentIds);
                        (parentsData || []).forEach(p => parentMap[p.id] = p.name);
                    }

                    subjectsData.forEach(s => {
                        subjectMap[s.id] = {
                            name: s.name,
                            parentName: s.parent_id ? parentMap[s.parent_id] : null
                        };
                    });
                }
            }

            const formattedQuestions = questionsData.map(q => {
                const opts = optionsMap[q.id] || [];
                opts.sort((a, b) => (a.option_label || '').localeCompare(b.option_label || ''));

                return {
                    ...q,
                    options: opts,
                    subjectInfo: q.subject_id ? subjectMap[q.subject_id] : null
                };
            });

            // Maintain bookmark order
            const orderedQuestions = questionIds.map(id => formattedQuestions.find(q => q.id === id)).filter(Boolean);

            setQuestions(orderedQuestions);

        } catch (error) {
            console.error("Error fetching bookmarks:", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteQuestionId) return;

        try {
            const questionId = deleteQuestionId;
            setQuestions(prev => prev.filter(q => q.id !== questionId));
            setDeleteModalVisible(false);

            let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) return;

            const { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('member_id', memberData.id)
                .eq('question_id', questionId);

            if (error) throw error;

        } catch (error) {
            console.error("Error removing bookmark:", error);
            fetchBookmarks();
        } finally {
            setDeleteQuestionId(null);
        }
    };

    const openDeleteModal = (questionId) => {
        setDeleteQuestionId(questionId);
        setDeleteModalVisible(true);
    };

    const reportQuestion = (questionId) => {
        setReportQuestionId(questionId);
        setReportText('');
        setReportType(reportOptions[0]);
        setReportModalVisible(true);
    };

    const submitReport = async () => {
        try {
            setSubmittingReport(true);

            // Get member info for the report
            let { data: memberData } = await supabase.from('members').select('id, institute_id').eq('auth_user_id', user.id).single();
            if (!memberData) {
                const { data: emailMember } = await supabase.from('members').select('id, institute_id').eq('email', user.email).single();
                memberData = emailMember;
            }
            if (!memberData) throw new Error("Member not found");

            // Use Prisma server action to bypass RLS
            const result = await submitQuestionReport({
                userId: memberData.id,
                questionId: reportQuestionId,
                reportType: reportType,
                comment: reportText,
                instituteId: memberData.institute_id
            });

            if (!result.success) throw new Error(result.error);

            alert("Report submitted successfully!");
            setReportModalVisible(false);

        } catch (error) {
            console.error("Report Error:", error);
            alert("Failed to submit report.");
        } finally {
            setSubmittingReport(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Filter Logic
    const availableSubjects = [...new Set(questions.map(q => q.subjectInfo?.name).filter(Boolean))];

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = selectedSubject === 'All' || q.subjectInfo?.name === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
    const paginatedQuestions = filteredQuestions.slice(
        (currentPage - 1) * questionsPerPage,
        currentPage * questionsPerPage
    );

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Bookmark className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>
                        <p className="text-sm text-gray-500">{questions.length} saved questions</p>
                    </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full sm:w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedSubject}
                            onChange={(e) => { setSelectedSubject(e.target.value); setCurrentPage(1); }}
                            className="w-full sm:w-48 pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="All">All Subjects</option>
                            {availableSubjects.map((subject, idx) => (
                                <option key={idx} value={subject}>{subject}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {filteredQuestions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No bookmarks found.</p>
                    <p className="text-gray-400 text-sm mt-1">
                        {questions.length > 0 ? "Try adjusting your search or filters." : "Save questions during review to see them here."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedQuestions.map((item, index) => (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-50 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-400">
                                        Question {(currentPage - 1) * questionsPerPage + index + 1}
                                    </span>
                                    {item.subjectInfo && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                                            {item.subjectInfo.parentName && (
                                                <span className="opacity-75 mr-1">{item.subjectInfo.parentName} ›</span>
                                            )}
                                            {item.subjectInfo.name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => reportQuestion(item.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Report">
                                        <Flag className="w-4 h-4 text-red-500" />
                                    </button>
                                    <button onClick={() => openDeleteModal(item.id)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Remove Bookmark">
                                        <Trash2 className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Question */}
                            <div className="px-4 pb-3">
                                <div className="text-sm text-gray-800 mb-3">
                                    <MathText>{item.question_text}</MathText>
                                </div>

                                {/* Options */}
                                <div className="space-y-1">
                                    {item.options.map((opt, idx) => (
                                        <div key={idx} className={`flex items-start gap-2 py-2 px-3 rounded-lg border ${opt.is_correct ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                            <span className="text-xs font-bold text-gray-400 mt-0.5">{opt.option_label}.</span>
                                            <div className="flex-1 text-sm">
                                                <MathText>{opt.option_text}</MathText>
                                            </div>
                                            {opt.is_correct && <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                                        </div>
                                    ))}
                                </div>

                                {/* Explanation Toggle */}
                                {item.explanation && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => toggleExpand(item.id)}
                                            className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700"
                                        >
                                            {expandedQuestions.has(item.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            {expandedQuestions.has(item.id) ? 'Hide Explanation' : 'Show Explanation'}
                                        </button>
                                        {expandedQuestions.has(item.id) && (
                                            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                <p className="text-xs font-bold text-blue-600 mb-1">Explanation</p>
                                                <div className="text-sm text-gray-700">
                                                    <MathText>{item.explanation}</MathText>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {item.subjectInfo && (
                                    // Subject info moved to header
                                    null
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <p className="text-sms text-gray-500">
                                Showing <span className="font-medium">{(currentPage - 1) * questionsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * questionsPerPage, filteredQuestions.length)}</span> of <span className="font-medium">{filteredQuestions.length}</span> questions
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalVisible && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Bookmark?</h3>
                            <p className="text-gray-500">Are you sure you want to remove this question from your bookmarks?</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModalVisible(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportModalVisible && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Report Issue</h3>
                            <button onClick={() => setReportModalVisible(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <label className="block text-sm font-bold text-gray-700 mb-2">Issue Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {reportOptions.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            ))}
                        </select>

                        <label className="block text-sm font-bold text-gray-700 mb-2">Details</label>
                        <textarea
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="Describe the issue..."
                            rows={4}
                            className="w-full p-3 border border-gray-200 rounded-lg mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setReportModalVisible(false)}
                                disabled={submittingReport}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitReport}
                                disabled={submittingReport}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
                            >
                                {submittingReport ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
