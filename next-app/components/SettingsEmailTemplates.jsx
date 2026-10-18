'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Info, Save, X, Check, Copy, AlertCircle, Loader } from 'lucide-react';

const SettingsEmailTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const availableVariables = [
        { name: '{{student_name}}', description: 'Name of the student' },
        { name: '{{course_name}}', description: 'Name of the purchased course/product' },
        { name: '{{order_id}}', description: 'Unique order ID' },
        { name: '{{order_amount}}', description: 'Total amount paid' },
        { name: '{{purchase_date}}', description: 'Date of purchase' },
        { name: '{{institute_name}}', description: 'Name of your institute' },
        { name: '{{login_link}}', description: 'Link to the login page' },
        { name: '{{username}}', description: 'Username (Email address) of the student' },
    ];

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch('/api/admin/settings/email-templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            setError('Failed to fetch email templates.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template) => {
        setCurrentTemplate(template);
        setIsEditing(true);
        setError(null);
    };

    const handleCreate = () => {
        setCurrentTemplate({
            name: '',
            subject: '',
            body: '',
            is_active: true
        });
        setIsEditing(true);
        setError(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const method = currentTemplate.id ? 'PUT' : 'POST';
            const url = currentTemplate.id
                ? `/api/admin/settings/email-templates/${currentTemplate.id}`
                : '/api/admin/settings/email-templates';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentTemplate)
            });

            if (!response.ok) {
                throw new Error('Failed to save template');
            }

            const savedTemplate = await response.json();

            if (method === 'POST') {
                setTemplates([...templates, savedTemplate]);
            } else {
                setTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t));
            }

            setIsEditing(false);
            setCurrentTemplate(null);
        } catch (error) {
            console.error('Error saving template:', error);
            setError('Failed to save template. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;

        try {
            const response = await fetch(`/api/admin/settings/email-templates/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setTemplates(templates.filter(t => t.id !== id));
            } else {
                throw new Error('Failed to delete template');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading templates...</p>
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {currentTemplate.id ? 'Edit Template' : 'Create Template'}
                    </h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <form onSubmit={handleSave} className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Template Name</label>
                            <input
                                type="text"
                                value={currentTemplate.name}
                                onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                                placeholder="e.g. Order Confirmation"
                                required
                                disabled={['welcome email', 'order confirmation'].includes(currentTemplate.name.toLowerCase())}
                                className={`
                                    w-full px-4 py-2.5 border rounded-lg outline-none text-sm transition-colors
                                    ${['welcome email', 'order confirmation'].includes(currentTemplate.name.toLowerCase())
                                        ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                                        : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}
                                `}
                            />
                            {['welcome email', 'order confirmation'].includes(currentTemplate.name.toLowerCase()) && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <AlertCircle size={12} /> This is a system template. The name cannot be changed.
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Email Subject</label>
                            <input
                                type="text"
                                value={currentTemplate.subject}
                                onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                                placeholder="e.g. Thank you for your order!"
                                required
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                            />
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Email Body</label>
                                <textarea
                                    value={currentTemplate.body}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                                    placeholder="Enter your email content here..."
                                    required
                                    rows={15}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-mono text-slate-800 placeholder:text-slate-400 transition-colors resize-y"
                                />
                            </div>

                            <div className="lg:w-80 space-y-4">
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 h-full">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
                                        <Info size={16} className="text-blue-500" />
                                        Available Variables
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-4">Click to copy variable to clipboard</p>

                                    <div className="space-y-2">
                                        {availableVariables.map((v) => (
                                            <button
                                                key={v.name}
                                                type="button"
                                                onClick={() => navigator.clipboard.writeText(v.name)}
                                                className="w-full text-left p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
                                                title={v.description}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <code className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{v.name}</code>
                                                    <Copy size={12} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-[11px] text-slate-500 leading-tight">{v.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center gap-1.5"
                            >
                                {saving ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Save Template
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Email Templates</h2>
                    <p className="text-slate-500 text-sm mt-1">Customize the automated emails sent to your students</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                >
                    <Plus size={18} /> Create New Template
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 mx-auto mb-4">
                        <Mail size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No email templates found</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto mb-6">Create templates to automate your communication with students.</p>
                    <button
                        onClick={handleCreate}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                        Create one now <Plus size={14} />
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 mb-1">{template.name}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        <span className="font-medium text-slate-400">Subject:</span>
                                        <span className="truncate max-w-md">{template.subject}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(template)}
                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SettingsEmailTemplates;
