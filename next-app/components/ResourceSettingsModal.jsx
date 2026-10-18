'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';

const ResourceSettingsModal = ({ isOpen, onClose }) => {
    const { institute } = useInstitute();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        label_resource_syllabus: 'Syllabus',
        label_resource_pyq: 'Previous Year Papers',
        label_resource_notifications: 'Notifications',
        label_resource_page_title: 'Free Resources',
    });

    useEffect(() => {
        if (isOpen && institute?.id) {
            fetchSettings();
        }
    }, [isOpen, institute?.id]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/resources/settings?institute_id=${institute.id}`);
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();

            // Only update if data exists, otherwise keep defaults
            if (data && Object.keys(data).length > 0) {
                setFormData(prev => ({
                    ...prev,
                    label_resource_syllabus: data.label_resource_syllabus || prev.label_resource_syllabus,
                    label_resource_pyq: data.label_resource_pyq || prev.label_resource_pyq,
                    label_resource_notifications: data.label_resource_notifications || prev.label_resource_notifications,
                    label_resource_page_title: data.label_resource_page_title || prev.label_resource_page_title,
                }));
            }
        } catch (err) {
            console.error(err);
            setError('Could not load current settings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/admin/resources/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    institute_id: institute.id,
                    ...formData
                })
            });

            if (!res.ok) throw new Error('Failed to save settings');

            onClose();
            // Optional: Trigger a global refresh or toast
        } catch (err) {
            console.error(err);
            setError('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800">Customize Resource Labels</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8 text-slate-400">Loading settings...</div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Page Title</label>
                                <input
                                    type="text"
                                    name="label_resource_page_title"
                                    value={formData.label_resource_page_title}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Free Downloads"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tab 1 Label (Syllabus)</label>
                                <input
                                    type="text"
                                    name="label_resource_syllabus"
                                    value={formData.label_resource_syllabus}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Curriculum"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tab 2 Label (PYQs)</label>
                                <input
                                    type="text"
                                    name="label_resource_pyq"
                                    value={formData.label_resource_pyq}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Old Papers"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tab 3 Label (Notifications)</label>
                                <input
                                    type="text"
                                    name="label_resource_notifications"
                                    value={formData.label_resource_notifications}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Alerts"
                                />
                            </div>
                        </>
                    )}

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResourceSettingsModal;
