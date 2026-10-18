import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Flag, CheckCircle, XCircle, Eye, Trash2, AlertTriangle, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReportedQuestions = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, open, resolved, rejected
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReport, setSelectedReport] = useState(null); // For modal
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('question_reports')
                .select(`
                    *,
                    exam_questions:question_id (
                        id,
                        questions (
                            question_text,
                            question_type
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const userIds = [...new Set(data.map(r => r.user_id))];

            let membersMap = {};
            if (userIds.length > 0) {
                const { data: members, error: membersError } = await supabase
                    .from('members')
                    .select('user_id, name, email')
                    .in('user_id', userIds);

                if (!membersError && members) {
                    members.forEach(m => {
                        membersMap[m.user_id] = m;
                    });
                }
            }

            const enrichedReports = data.map(report => ({
                ...report,
                reporter: membersMap[report.user_id] ? {
                    ...membersMap[report.user_id],
                    full_name: membersMap[report.user_id].name // Map name to full_name for UI compatibility
                } : { full_name: 'Unknown User', email: 'N/A' }
            }));

            setReports(enrichedReports);

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
            const { error } = await supabase
                .from('question_reports')
                .update({ status: newStatus })
                .eq('id', reportId);

            if (error) throw error;

            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: newStatus } : r
            ));

            if (selectedReport?.id === reportId) {
                setSelectedReport(prev => ({ ...prev, status: newStatus }));
            }

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('question_reports')
                .delete()
                .eq('id', reportId);

            if (error) throw error;

            setReports(prev => prev.filter(r => r.id !== reportId));
            if (selectedReport?.id === reportId) setSelectedReport(null);

        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report.');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredReports = reports.filter(report => {
        const matchesFilter = filter === 'all' || report.status === filter;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            report.comment?.toLowerCase().includes(searchLower) ||
            report.exam_questions?.questions?.question_text?.toLowerCase().includes(searchLower) ||
            report.reporter?.full_name?.toLowerCase().includes(searchLower);

        return matchesFilter && matchesSearch;
    });

    const getStatusStyle = (status) => {
        const base = { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' };
        switch (status) {
            case 'open': return { ...base, backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' };
            case 'resolved': return { ...base, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
            case 'rejected': return { ...base, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
            default: return { ...base, backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };
        }
    };

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '400', margin: '0 0 4px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Flag size={24} color="#d32f2f" />
                        Reported Questions
                    </h1>
                    <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Review and manage issues reported by students</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                        <input
                            type="text"
                            placeholder="Search reports..."
                            style={{
                                padding: '8px 12px 8px 36px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                width: '250px'
                            }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                        <select
                            style={{
                                padding: '8px 12px 8px 36px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {error ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <AlertTriangle size={48} color="#d32f2f" />
                        <div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Error Loading Reports</h3>
                            <p style={{ margin: '0 0 16px 0', color: '#666' }}>{error}</p>
                            <button
                                onClick={fetchReports}
                                style={{ padding: '8px 16px', border: '1px solid #1976d2', borderRadius: '4px', background: '#1976d2', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            ) : loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading reports...</div>
            ) : (
                <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333' }}>Date</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333' }}>Reporter</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333' }}>Issue Type</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333' }}>Question Preview</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#333' }}>Comment</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#333' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <CheckCircle size={32} color="#ccc" />
                                            <p>No reports found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666', whiteSpace: 'nowrap' }}>
                                            {new Date(report.created_at).toLocaleDateString()}
                                            <div style={{ fontSize: '12px', color: '#999' }}>{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                                            <div style={{ fontWeight: '500', color: '#333' }}>{report.reporter.full_name}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{report.reporter.email}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0', textTransform: 'capitalize' }}>
                                                {report.report_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666', maxWidth: '300px' }}>
                                            {report.exam_questions?.questions?.question_text ? (
                                                <div
                                                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    dangerouslySetInnerHTML={{ __html: report.exam_questions.questions.question_text.replace(/<[^>]+>/g, '') }}
                                                />
                                            ) : (
                                                <span style={{ color: '#d32f2f', fontStyle: 'italic' }}>Question deleted or not found</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666', maxWidth: '200px' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={report.comment}>
                                                {report.comment}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={getStatusStyle(report.status)}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => setSelectedReport(report)}
                                                    style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', color: '#1976d2' }}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {report.status === 'open' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                        style={{ padding: '6px', border: '1px solid #c3e6cb', borderRadius: '4px', background: '#d4edda', cursor: 'pointer', color: '#155724' }}
                                                        title="Mark as Resolved"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    style={{ padding: '6px', border: '1px solid #f5c6cb', borderRadius: '4px', background: '#f8d7da', cursor: 'pointer', color: '#721c24' }}
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
            )}

            {/* Detail Modal */}
            {selectedReport && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        width: '100%',
                        maxWidth: '700px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#333' }}>Report Details</h2>
                            <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                            {/* Reporter Info */}
                            <div style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #bbdefb', marginBottom: '24px' }}>
                                <div style={{ backgroundColor: '#bbdefb', padding: '8px', borderRadius: '50%', height: 'fit-content' }}>
                                    <AlertTriangle size={20} color="#1565c0" />
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0d47a1' }}>Reported by {selectedReport.reporter.full_name}</h3>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1565c0' }}>
                                        <strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedReport.report_type}</span> •
                                        <strong> Date:</strong> {new Date(selectedReport.created_at).toLocaleString()}
                                    </p>
                                    <div style={{ fontSize: '14px', color: '#0d47a1', backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #bbdefb' }}>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1976d2', marginBottom: '4px' }}>User Comment:</span>
                                        "{selectedReport.comment}"
                                    </div>
                                </div>
                            </div>

                            {/* Question Content */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666', marginBottom: '8px', letterSpacing: '0.5px' }}>Question Content</h3>
                                <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
                                    {selectedReport.exam_questions?.questions ? (
                                        <>
                                            <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#333', marginBottom: '16px' }} dangerouslySetInnerHTML={{ __html: selectedReport.exam_questions.questions.question_text }} />
                                            <div style={{ fontSize: '12px', color: '#999', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Question ID: {selectedReport.question_id}</span>
                                                <span>Type: {selectedReport.exam_questions.questions.question_type}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertTriangle size={16} />
                                            Original question data is missing or has been deleted.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8f9fa', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                            <button
                                onClick={() => setSelectedReport(null)}
                                style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#666' }}
                            >
                                Close
                            </button>
                            {selectedReport.status !== 'resolved' && (
                                <button
                                    onClick={() => handleStatusUpdate(selectedReport.id, 'resolved')}
                                    disabled={actionLoading}
                                    style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#28a745', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <CheckCircle size={16} />
                                    Mark as Resolved
                                </button>
                            )}
                            {selectedReport.status !== 'rejected' && (
                                <button
                                    onClick={() => handleStatusUpdate(selectedReport.id, 'rejected')}
                                    disabled={actionLoading}
                                    style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#6c757d', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <XCircle size={16} />
                                    Reject Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportedQuestions;
