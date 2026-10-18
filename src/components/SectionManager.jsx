import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { useExams } from '../context/ExamContext';

const SectionManager = ({ examId, isOpen, onClose, onSectionsUpdated }) => {
    const { getExamSections, addExamSection, updateExamSection, deleteExamSection } = useExams();

    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSection, setEditingSection] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        section_name: '',
        section_order: 1,
        instructions: '',
        total_marks: '',
        passing_marks: '',
        is_mandatory: true
    });

    useEffect(() => {
        if (isOpen && examId) {
            loadSections();
        }
    }, [isOpen, examId]);

    const loadSections = async () => {
        setLoading(true);
        const data = await getExamSections(examId);
        setSections(data);
        setLoading(false);
    };

    const handleAdd = () => {
        setFormData({
            section_name: '',
            section_order: sections.length + 1,
            instructions: '',
            total_marks: '',
            passing_marks: '',
            is_mandatory: true
        });
        setEditingSection(null);
        setShowAddForm(true);
    };

    const handleEdit = (section) => {
        setFormData({
            section_name: section.section_name,
            section_order: section.section_order,
            instructions: section.instructions || '',
            total_marks: section.total_marks || '',
            passing_marks: section.passing_marks || '',
            is_mandatory: section.is_mandatory
        });
        setEditingSection(section);
        setShowAddForm(true);
    };

    const handleSave = async () => {
        try {
            if (editingSection) {
                await updateExamSection(editingSection.id, formData);
            } else {
                await addExamSection(examId, formData);
            }
            await loadSections();
            setShowAddForm(false);
            setEditingSection(null);
            if (onSectionsUpdated) onSectionsUpdated();
        } catch (error) {
            alert('Error saving section: ' + error.message);
        }
    };

    const handleDelete = async (sectionId) => {
        if (!confirm('Delete this section? Questions in this section will become unsectioned.')) return;

        try {
            await deleteExamSection(sectionId);
            await loadSections();
            if (onSectionsUpdated) onSectionsUpdated();
        } catch (error) {
            alert('Error deleting section: ' + error.message);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h2 style={{ margin: 0 }}>Manage Exam Sections</h2>
                    <button onClick={onClose} style={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div style={styles.content}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Loading sections...</div>
                    ) : (
                        <>
                            {/* Sections List */}
                            <div style={{ marginBottom: '20px' }}>
                                {sections.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                                        No sections yet. Click "Add Section" to create one.
                                    </div>
                                ) : (
                                    sections.map((section) => (
                                        <div key={section.id} style={styles.sectionItem}>
                                            <div>
                                                <div style={{ fontWeight: '500', fontSize: '16px' }}>
                                                    {section.section_order}. {section.section_name}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                                                    {section.total_marks && `${section.total_marks} marks`}
                                                    {section.passing_marks && ` | Passing: ${section.passing_marks}`}
                                                    {section.is_mandatory && ' | Mandatory'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleEdit(section)} style={styles.iconBtn}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(section.id)} style={{ ...styles.iconBtn, color: '#dc3545' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add/Edit Form */}
                            {showAddForm ? (
                                <div style={styles.form}>
                                    <h3 style={{ marginTop: 0 }}>{editingSection ? 'Edit Section' : 'Add New Section'}</h3>

                                    <div style={styles.formRow}>
                                        <div style={{ flex: 2 }}>
                                            <label style={styles.label}>Section Name *</label>
                                            <input
                                                type="text"
                                                name="section_name"
                                                value={formData.section_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Part A - Multiple Choice"
                                                style={styles.input}
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.label}>Order</label>
                                            <input
                                                type="number"
                                                name="section_order"
                                                value={formData.section_order}
                                                onChange={handleChange}
                                                min="1"
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Instructions</label>
                                        <textarea
                                            name="instructions"
                                            value={formData.instructions}
                                            onChange={handleChange}
                                            placeholder="Instructions for this section..."
                                            rows={3}
                                            style={styles.textarea}
                                        />
                                    </div>

                                    <div style={styles.formRow}>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.label}>Total Marks</label>
                                            <input
                                                type="number"
                                                name="total_marks"
                                                value={formData.total_marks}
                                                onChange={handleChange}
                                                step="0.5"
                                                min="0"
                                                placeholder="e.g., 40"
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.label}>Passing Marks</label>
                                            <input
                                                type="number"
                                                name="passing_marks"
                                                value={formData.passing_marks}
                                                onChange={handleChange}
                                                step="0.5"
                                                min="0"
                                                placeholder="e.g., 20"
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                name="is_mandatory"
                                                checked={formData.is_mandatory}
                                                onChange={handleChange}
                                            />
                                            <span>Mandatory (All questions must be answered)</span>
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setEditingSection(null);
                                            }}
                                            style={styles.cancelBtn}
                                        >
                                            Cancel
                                        </button>
                                        <button onClick={handleSave} style={styles.saveBtn}>
                                            <Save size={16} />
                                            {editingSection ? 'Update' : 'Save'} Section
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={handleAdd} style={styles.addBtn}>
                                    <Plus size={16} />
                                    Add Section
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        background: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
    },
    header: {
        padding: '20px 24px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center'
    },
    content: {
        padding: '24px',
        overflowY: 'auto',
        flex: 1
    },
    sectionItem: {
        padding: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    iconBtn: {
        background: 'none',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: '#666'
    },
    form: {
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px'
    },
    formGroup: {
        marginBottom: '16px'
    },
    formRow: {
        display: 'flex',
        gap: '16px',
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '500',
        fontSize: '14px'
    },
    input: {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    textarea: {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical'
    },
    addBtn: {
        width: '100%',
        padding: '12px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500'
    },
    saveBtn: {
        padding: '10px 20px',
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500'
    },
    cancelBtn: {
        padding: '10px 20px',
        background: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    }
};

export default SectionManager;
