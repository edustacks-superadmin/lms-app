import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Search, BookOpen, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { useSubjects } from '../context/SubjectContext';

const SubjectList = () => {
    const navigate = useNavigate();
    const { subjects, fetchSubjects, deleteSubject, loading } = useSubjects();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState([]);

    useEffect(() => {
        fetchSubjects();
    }, []);

    // Build tree structure from flat list
    const subjectTree = useMemo(() => {
        const map = {};
        const roots = [];

        // Initialize map
        subjects.forEach(s => {
            map[s.id] = { ...s, children: [] };
        });

        // Build tree
        subjects.forEach(s => {
            if (s.parent_id && map[s.parent_id]) {
                map[s.parent_id].children.push(map[s.id]);
            } else {
                roots.push(map[s.id]);
            }
        });

        return roots;
    }, [subjects]);

    // Flatten tree for rendering, respecting expanded state
    const getFlattenedSubjects = (nodes, level = 0) => {
        let result = [];
        for (const node of nodes) {
            result.push({ ...node, level });
            if (expandedIds.includes(node.id) && node.children && node.children.length > 0) {
                result = result.concat(getFlattenedSubjects(node.children, level + 1));
            }
        }
        return result;
    };

    const subjectsToRender = useMemo(() => {
        if (searchTerm) {
            // If searching, show flat filtered list
            return subjects.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => ({ ...s, level: 0 }));
        }
        return getFlattenedSubjects(subjectTree);
    }, [subjects, subjectTree, expandedIds, searchTerm]);

    const toggleExpand = (id) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this subject?')) {
            const result = await deleteSubject(id);
            if (result.success) {
                setOpenMenuId(null);
            }
        }
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setShowCreateModal(true);
        setOpenMenuId(null);
    };

    return (
        <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>
                        Subjects
                    </h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                        Manage subjects and topics for your question bank
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="input-group" style={{ width: '250px' }}>
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button><Search size={18} /></button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setShowCreateModal(true);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={18} />
                        Create Subject
                    </button>
                </div>
            </div>

            {/* Subjects List */}
            <div className="card">
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
                        Loading subjects...
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Subject Name</th>
                                    <th>Questions</th>
                                    <th>Description</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjectsToRender.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                                            {searchTerm ? 'No subjects found matching your search.' : 'No subjects found. Create your first subject!'}
                                        </td>
                                    </tr>
                                ) : (
                                    subjectsToRender.map((subject) => {
                                        const hasChildren = subjects.some(s => s.parent_id === subject.id);
                                        const isExpanded = expandedIds.includes(subject.id);

                                        return (
                                            <tr key={subject.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: `${subject.level * 32}px` }}>
                                                        {/* Expand/Collapse Toggle */}
                                                        <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                                                            {hasChildren && !searchTerm && (
                                                                <button
                                                                    onClick={() => toggleExpand(subject.id)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}
                                                                >
                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            backgroundColor: subject.level === 0 ? 'rgba(0, 136, 204, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: subject.level === 0 ? 'var(--primary-color)' : '#6b7280'
                                                        }}>
                                                            {subject.level === 0 ? <BookOpen size={16} /> : <Folder size={16} />}
                                                        </div>
                                                        <span style={{ fontWeight: subject.level === 0 ? '600' : '400' }}>{subject.name}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-gray">
                                                        {subject.questionCount || 0} questions
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-light)' }}>
                                                    {subject.description || '-'}
                                                </td>
                                                <td>
                                                    <div style={{ position: 'relative' }}>
                                                        <button
                                                            onClick={() => setOpenMenuId(openMenuId === subject.id ? null : subject.id)}
                                                            className="btn-icon btn-ghost"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>

                                                        {openMenuId === subject.id && (
                                                            <div className="dropdown-menu" style={{ right: 0, zIndex: 10 }}>
                                                                <div className="dropdown-item" onClick={() => handleEdit(subject)}>
                                                                    Edit
                                                                </div>
                                                                <div className="dropdown-item danger" onClick={() => handleDelete(subject.id)}>
                                                                    Delete
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <CreateSubjectModal
                    subject={editingSubject}
                    subjects={subjects}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingSubject(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingSubject(null);
                        fetchSubjects();
                    }}
                />
            )}
        </div>
    );
};

const CreateSubjectModal = ({ subject, subjects, onClose, onSuccess }) => {
    const { addSubject, updateSubject } = useSubjects();
    const [formData, setFormData] = useState({
        name: subject?.name || '',
        parent_id: subject?.parent_id || null,
        description: subject?.description || ''
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        const result = subject
            ? await updateSubject(subject.id, formData)
            : await addSubject(formData);

        setSaving(false);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div className="card" style={{ width: '90%', maxWidth: '500px', padding: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="card-header">
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        {subject ? 'Edit Subject' : 'Create Subject'}
                    </h2>
                </div>

                <div className="card-body">
                    {error && (
                        <div style={{ padding: '10px', marginBottom: '16px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '14px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                Choose Parent
                            </label>
                            <select
                                className="form-control"
                                value={formData.parent_id || ''}
                                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                            >
                                <option value="">None (Top Level)</option>
                                {subjects.filter(s => s.id !== subject?.id).map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                Subject Name *
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., Mathematics"
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                Description
                            </label>
                            <textarea
                                className="form-control"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                placeholder="Optional description..."
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : (subject ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubjectList;
