'use client';

import React, { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, Eye, Trash2, AlertTriangle, Search, Filter, X, MessageSquare, User, Calendar, ExternalLink, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import MathText from './MathText';
import { fetchQuestionReports, updateQuestionReportStatus, deleteQuestionReport, bulkResolveReports, bulkDeleteReports } from '../app/actions/questions';
import Link from 'next/link';

const ReportedQuestions = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter State
    const [filter, setFilter] = useState('all'); // all, open, resolved, rejected
    const [issueTypeFilter, setIssueTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);

    const [selectedReport, setSelectedReport] = useState(null); // For modal
    const [actionLoading, setActionLoading] = useState(false);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        loadReports();
    }, [page, filter, issueTypeFilter]); // Auto reload on filter/page change

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset to page 1 on search
            loadReports();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadReports = async () => {
        setLoading(true);
        setError(null);
        try {
            // Updated to pass arguments
            const data = await fetchQuestionReports({
                page,
                limit,
                status: filter,
                issueType: issueTypeFilter,
                search: searchQuery
            });

            // Backend now returns { reports, total, page, totalPages }
            // Handle both old (array) and new (object) formats gracefully during migration if needed,
            // but we expect object now.
            if (Array.isArray(data)) {
                // Fallback if backend wasn't updated yet (unlikely given previous steps)
                setReports(data);
                setTotalPages(1);
                setTotalRecords(data.length);
            } else {
                setReports(data.reports || []);
                setTotalPages(data.totalPages || 0);
                setTotalRecords(data.total || 0);
            }

            setSelectedIds([]); // Clear selection on reload
        } catch (error) {
            console.error('Error fetching reports:', error);
            setError('Failed to load reported questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
        if (!confirm(`Are you sure you want to mark this report as ${newStatus}?`)) return;

        setActionLoading(true);
        try {
            const result = await updateQuestionReportStatus(reportId, newStatus);
            if (!result.success) throw new Error(result.error);

            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: newStatus } : r
            ));

            if (selectedReport?.id === reportId) {
                setSelectedReport(prev => ({ ...prev, status: newStatus }));
            }

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;

        setActionLoading(true);
        try {
            const result = await deleteQuestionReport(reportId);
            if (!result.success) throw new Error(result.error);

            setReports(prev => prev.filter(r => r.id !== reportId));
            if (selectedReport?.id === reportId) setSelectedReport(null);

        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Bulk Actions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(reports.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkResolve = async () => {
        if (!confirm(`Are you sure you want to resolve ${selectedIds.length} reports?`)) return;
        setActionLoading(true);
        try {
            await bulkResolveReports(selectedIds);
            loadReports(); // Reload to reflect changes
            setSelectedIds([]);
        } catch (error) {
            alert('Bulk resolve failed: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to DELETE ${selectedIds.length} reports? This cannot be undone.`)) return;
        setActionLoading(true);
        try {
            await bulkDeleteReports(selectedIds);
            loadReports(); // Reload to reflect changes
            setSelectedIds([]);
        } catch (error) {
            alert('Bulk delete failed: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'open': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Flag className="text-red-600" size={24} />
                        Reported Questions
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Review and manage issues reported by students. Total: {totalRecords}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search in comments..."
                            className="pl-9 pr-4 py-2 w-full sm:w-60 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            className="pl-3 pr-8 py-2 w-full sm:w-40 appearance-none border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            className="pl-3 pr-8 py-2 w-full sm:w-48 appearance-none border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                            value={issueTypeFilter}
                            onChange={(e) => setIssueTypeFilter(e.target.value)}
                        >
                            <option value="all">All Issues</option>
                            <option value="Question Error">Question Error</option>
                            <option value="Translation Error">Translation Error</option>
                            <option value="Technical Issue">Technical Issue</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-blue-800 font-medium">
                        <CheckCircle size={18} />
                        {selectedIds.length} items selected
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkResolve}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Mark Resolved
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Delete Selected
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto">
                    <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-red-800 mb-2">Error Loading Reports</h3>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button
                        onClick={loadReports}
                        className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading reports...</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                                    <th className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={reports.length > 0 && selectedIds.length === reports.length}
                                            onChange={handleSelectAll}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reporter</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">Question Preview</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Comment</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                                                    <CheckCircle size={24} />
                                                </div>
                                                <p className="font-medium">No reports found matching your criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    reports.map((report) => (
                                        <tr key={report.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(report.id) ? 'bg-blue-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(report.id)}
                                                    onChange={() => handleSelectRow(report.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                                                        {report.reporter.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <Link href={`/members/${report.reporter.member_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                                            {report.reporter.full_name}
                                                        </Link>
                                                        <div className="text-xs text-slate-500">{report.reporter.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 capitalize truncate max-w-[150px]" title={report.report_type}>
                                                    {report.report_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 line-clamp-2 max-w-xs">
                                                    {report.exam_questions?.questions?.question_text ? (
                                                        <MathText>{report.exam_questions.questions.question_text}</MathText>
                                                    ) : (
                                                        <span className="text-red-500 italic flex items-center gap-1">
                                                            <AlertTriangle size={12} /> Question deleted or hidden
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 truncate max-w-[200px]" title={report.comment}>
                                                    {report.comment}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(report.status)} uppercase tracking-wide`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {report.status === 'open' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                                                                title="Mark as Resolved"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(report.id, 'rejected')}
                                                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                                                                title="Reject Report"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => handleDelete(report.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                        title="Delete Report"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                                Page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                            <h2 className="text-lg font-bold text-slate-800">Report Details</h2>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* Actions Bar */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-6 justify-between items-start sm:items-center">
                                {/* Edit Question Button */}
                                <Link
                                    href={`/questions/edit/${selectedReport.question_id}`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                >
                                    <Edit size={16} />
                                    Edit Question
                                    <ExternalLink size={14} className="opacity-50" />
                                </Link>

                                <div className="flex gap-2">
                                    {selectedReport.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedReport.id, 'resolved')}
                                            disabled={actionLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70"
                                        >
                                            <CheckCircle size={16} />
                                            Resolve
                                        </button>
                                    )}
                                    {selectedReport.status !== 'rejected' && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedReport.id, 'rejected')}
                                            disabled={actionLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-70"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Reporter Info Card */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <Link href={`/members/${selectedReport.reporter.member_id}`} className="font-bold text-blue-900 hover:underline flex items-center gap-2 group">
                                                {selectedReport.reporter.full_name}
                                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </Link>
                                            <span className="text-xs font-medium text-blue-600 flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
                                                <Calendar size={12} />
                                                {new Date(selectedReport.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-blue-700 mb-4">{selectedReport.reporter.email}</p>

                                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                                            <div className="text-xs font-bold text-blue-500 uppercase mb-1 flex items-center gap-1">
                                                <MessageSquare size={12} /> User Comment
                                            </div>
                                            <p className="text-sm text-slate-700">"{selectedReport.comment}"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Question Content */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Reported Question Content
                                </h3>
                                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                    {selectedReport.exam_questions?.questions ? (
                                        <>
                                            <div className="text-base text-slate-800 leading-relaxed mb-4">
                                                <MathText>{selectedReport.exam_questions.questions.question_text}</MathText>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 flex gap-6 text-sm text-slate-500">
                                                <span><span className="font-medium text-slate-700">Question ID:</span> {selectedReport.question_id}</span>
                                                <span><span className="font-medium text-slate-700">Type:</span> {selectedReport.exam_questions.questions.question_type}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
                                            <AlertTriangle size={20} />
                                            Original question data is missing or has been deleted.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportedQuestions;
