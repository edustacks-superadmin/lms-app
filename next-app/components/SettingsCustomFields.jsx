import React, { useState } from 'react';
import { useCustomFields } from '../context/CustomFieldsContext';
import { Plus, GripVertical, Eye, EyeOff, CheckSquare, Square, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

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
        // Add a visually distinct style to the drag ghost if possible, or rely on browser default
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
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading fields...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Registration Form Fields</h2>
                    <p className="text-slate-500 text-sm mt-1">Customize which fields appear in the student registration form</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                >
                    <Plus size={18} /> Add Custom Field
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="py-4 pl-4 pr-2 w-10"></th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[30%]">Field Label</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%] text-center">Enabled</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%] text-center">Required</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {fields.map((field, index) => (
                                <tr
                                    key={field.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`
                                        transition-colors group
                                        ${draggedItem === index ? 'bg-blue-50 opacity-50' : 'hover:bg-slate-50/80 bg-white'}
                                        ${field.is_preset ? 'bg-slate-50/30' : ''}
                                    `}
                                >
                                    <td className="py-4 pl-4 pr-2 cursor-move text-slate-400 hover:text-slate-600">
                                        <GripVertical size={18} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{field.field_label}</span>
                                            {field.is_preset && (
                                                <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Preset Field</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                                            {field.field_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => toggleFieldEnabled(field.id)}
                                            disabled={field.field_key === 'email' || field.field_key === 'username'}
                                            title={(field.field_key === 'email' || field.field_key === 'username') ? 'Cannot disable critical fields' : ''}
                                            className={`
                                                p-1.5 rounded-lg transition-colors
                                                ${(field.field_key === 'email' || field.field_key === 'username')
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : field.is_enabled
                                                        ? 'text-emerald-600 hover:bg-emerald-50'
                                                        : 'text-slate-400 hover:bg-slate-100'}
                                            `}
                                        >
                                            {field.is_enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => toggleFieldRequired(field.id)}
                                            disabled={field.field_key === 'email' || field.field_key === 'username'}
                                            title={(field.field_key === 'email' || field.field_key === 'username') ? 'Cannot modify critical fields' : ''}
                                            className={`
                                                p-1.5 rounded-lg transition-colors
                                                ${(field.field_key === 'email' || field.field_key === 'username')
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : field.is_required
                                                        ? 'text-blue-600 hover:bg-blue-50'
                                                        : 'text-slate-400 hover:bg-slate-100'}
                                            `}
                                        >
                                            {field.is_required ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {!field.is_preset && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete field "${field.field_label}"?`)) {
                                                        deleteField(field.id);
                                                    }
                                                }}
                                                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            </div>

            {/* Add Field Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                            <h3 className="text-lg font-semibold text-slate-800">Add Custom Field</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                    Field Label <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Country, Occupation, Interests"
                                    value={newField.field_label}
                                    onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-500">This will be displayed as the field name</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                    Field Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newField.field_type}
                                    onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 cursor-pointer"
                                >
                                    {fieldTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dropdown Options - shown only for select type */}
                            {newField.field_type === 'select' && (
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                        Dropdown Options <span className="text-red-500">*</span>
                                    </label>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter option (e.g., Option 1)"
                                            value={optionInput}
                                            onChange={(e) => setOptionInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addOption();
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                                        >
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>

                                    {newField.field_options.length > 0 && (
                                        <div className="flex flex-col gap-2 mt-2">
                                            {newField.field_options.map((option, index) => (
                                                <div key={index} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                                                    <span className="text-sm text-slate-700">{option.label}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(index)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500">Add options that users can choose from</p>
                                </div>
                            )}

                            {/* File Upload Info */}
                            {newField.field_type === 'file' && (
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-sm font-medium text-blue-800 mb-1 flex items-center gap-2">
                                        <AlertCircle size={16} /> File Upload Field
                                    </p>
                                    <p className="text-xs text-blue-600 leading-relaxed">
                                        Files will be uploaded to Supabase Storage. Accepted file types and size limits can be configured in Supabase.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Placeholder Text</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Enter your country"
                                    value={newField.placeholder}
                                    onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-500">Hint text shown inside the input field</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Help Text</label>
                                <input
                                    type="text"
                                    placeholder="e.g., This helps us customize your experience"
                                    value={newField.help_text}
                                    onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-500">Additional information shown below the field</p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        id="required-checkbox"
                                        checked={newField.is_required}
                                        onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <label htmlFor="required-checkbox" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                    Make this field required
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddField}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center gap-1.5"
                            >
                                <Plus size={16} /> Add Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsCustomFields;
