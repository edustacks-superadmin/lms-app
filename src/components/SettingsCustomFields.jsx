import React, { useState } from 'react';
import { useCustomFields } from '../context/CustomFieldsContext';
import { Plus, GripVertical, Eye, EyeOff, CheckSquare, Square, Edit2, Trash2, X } from 'lucide-react';

const SettingsCustomFields = () => {
    const {
        fields,
        loading,
        addField,
        updateField,
        deleteField,
        toggleFieldEnabled,
        toggleFieldRequired,
        reorderFields
    } = useCustomFields();

    const [showAddModal, setShowAddModal] = useState(false);
    const [newField, setNewField] = useState({
        field_label: '',
        field_type: 'text',
        placeholder: '',
        help_text: '',
        is_required: false,
        field_options: []
    });
    const [optionInput, setOptionInput] = useState('');

    const [draggedItem, setDraggedItem] = useState(null);

    const handleAddField = async () => {
        if (!newField.field_label.trim()) {
            alert('Field label is required');
            return;
        }

        // Validate dropdown has options
        if (newField.field_type === 'select' && newField.field_options.length === 0) {
            alert('Please add at least one option for the dropdown');
            return;
        }

        const result = await addField(newField);
        if (result.success) {
            setShowAddModal(false);
            setNewField({
                field_label: '',
                field_type: 'text',
                placeholder: '',
                help_text: '',
                is_required: false,
                field_options: []
            });
            setOptionInput('');
        } else {
            alert('Error adding field: ' + result.error);
        }
    };

    const addOption = () => {
        if (!optionInput.trim()) return;

        const newOption = {
            label: optionInput.trim(),
            value: optionInput.trim().toLowerCase().replace(/\s+/g, '_')
        };

        setNewField({
            ...newField,
            field_options: [...newField.field_options, newOption]
        });
        setOptionInput('');
    };

    const removeOption = (index) => {
        setNewField({
            ...newField,
            field_options: newField.field_options.filter((_, i) => i !== index)
        });
    };

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;

        const items = [...fields];
        const draggedItemContent = items[draggedItem];
        items.splice(draggedItem, 1);
        items.splice(index, 0, draggedItemContent);

        setDraggedItem(index);
        reorderFields(items);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const fieldTypes = [
        { value: 'text', label: 'Text' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date' },
        { value: 'textarea', label: 'Long Text' },
        { value: 'select', label: 'Dropdown' },
        { value: 'file', label: 'File Upload' }
    ];

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div className="settings-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Registration Form Fields</h2>
                    <p style={{ color: '#666', fontSize: '14px' }}>Customize which fields appear in the student registration form</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} /> Add Custom Field
                </button>
            </div>

            <div className="card" style={{ padding: '0' }}>
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th style={{ width: '30%' }}>Field Label</th>
                            <th style={{ width: '20%' }}>Type</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Enabled</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Required</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <tr
                                key={field.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                style={{
                                    cursor: 'move',
                                    opacity: draggedItem === index ? 0.5 : 1,
                                    backgroundColor: field.is_preset ? '#f9fafb' : 'white'
                                }}
                            >
                                <td>
                                    <GripVertical size={18} color="#999" />
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: '500' }}>{field.field_label}</span>
                                        {field.is_preset && (
                                            <span style={{ fontSize: '12px', color: '#666' }}>Preset Field</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                                        {field.field_type}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => toggleFieldEnabled(field.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: field.field_key === 'name' || field.field_key === 'email' ? 'not-allowed' : 'pointer',
                                            color: field.is_enabled ? '#10b981' : '#999',
                                            padding: '4px'
                                        }}
                                        disabled={field.field_key === 'name' || field.field_key === 'email'}
                                        title={field.field_key === 'name' || field.field_key === 'email' ? 'Cannot disable required fields' : ''}
                                    >
                                        {field.is_enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => toggleFieldRequired(field.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: field.field_key === 'name' || field.field_key === 'email' ? 'not-allowed' : 'pointer',
                                            color: field.is_required ? '#6366f1' : '#999',
                                            padding: '4px'
                                        }}
                                        disabled={field.field_key === 'name' || field.field_key === 'email'}
                                    >
                                        {field.is_required ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {!field.is_preset && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => {
                                                if (confirm(`Delete field "${field.field_label}"?`)) {
                                                    deleteField(field.id);
                                                }
                                            }}
                                            style={{ color: '#ef4444' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Field Modal */}
            {showAddModal && (
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
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '0',
                        width: '100%',
                        maxWidth: '550px',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '24px 32px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Add Custom Field</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#999',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.color = '#333'}
                                onMouseOut={(e) => e.target.style.color = '#999'}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{
                            padding: '32px',
                            overflowY: 'auto',
                            flex: 1
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <label className="form-label" style={{ marginBottom: '8px' }}>
                                        Field Label <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Country, Occupation, Interests"
                                        value={newField.field_label}
                                        onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
                                        This will be displayed as the field name
                                    </p>
                                </div>

                                <div>
                                    <label className="form-label" style={{ marginBottom: '8px' }}>
                                        Field Type <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        className="form-input"
                                        value={newField.field_type}
                                        onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                                        style={{ width: '100%' }}
                                    >
                                        {fieldTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dropdown Options - shown only for select type */}
                                {newField.field_type === 'select' && (
                                    <div style={{
                                        padding: '20px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>
                                            Dropdown Options <span style={{ color: '#ef4444' }}>*</span>
                                        </label>

                                        {/* Add option input */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Enter option (e.g., Option 1)"
                                                value={optionInput}
                                                onChange={(e) => setOptionInput(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addOption();
                                                    }
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={addOption}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                <Plus size={16} /> Add
                                            </button>
                                        </div>

                                        {/* Options list */}
                                        {newField.field_options.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {newField.field_options.map((option, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '10px 12px',
                                                            backgroundColor: 'white',
                                                            borderRadius: '6px',
                                                            border: '1px solid #e5e7eb'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '14px', color: '#374151' }}>
                                                            {option.label}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(index)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: '#ef4444',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px', marginBottom: 0 }}>
                                            Add options that users can choose from
                                        </p>
                                    </div>
                                )}

                                {/* File Upload Info - shown only for file type */}
                                {newField.field_type === 'file' && (
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: '#eff6ff',
                                        borderRadius: '8px',
                                        border: '1px solid #bfdbfe'
                                    }}>
                                        <p style={{ fontSize: '14px', color: '#1e40af', marginBottom: '8px', fontWeight: '500' }}>
                                            📎 File Upload Field
                                        </p>
                                        <p style={{ fontSize: '13px', color: '#3b82f6', marginBottom: 0, lineHeight: '1.6' }}>
                                            Files will be uploaded to Supabase Storage. Accepted file types and size limits can be configured in Supabase.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="form-label" style={{ marginBottom: '8px' }}>
                                        Placeholder Text
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Enter your country"
                                        value={newField.placeholder}
                                        onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
                                        Hint text shown inside the input field
                                    </p>
                                </div>

                                <div>
                                    <label className="form-label" style={{ marginBottom: '8px' }}>
                                        Help Text
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., This helps us customize your experience"
                                        value={newField.help_text}
                                        onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
                                        Additional information shown below the field
                                    </p>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <input
                                        type="checkbox"
                                        id="required-checkbox"
                                        checked={newField.is_required}
                                        onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer',
                                            accentColor: 'var(--primary-color)'
                                        }}
                                    />
                                    <label htmlFor="required-checkbox" style={{
                                        cursor: 'pointer',
                                        margin: 0,
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151'
                                    }}>
                                        Make this field required
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '20px 32px',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            gap: '12px',
                            backgroundColor: '#f9fafb'
                        }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowAddModal(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddField}
                                style={{ flex: 1 }}
                            >
                                <Plus size={18} /> Add Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsCustomFields;
