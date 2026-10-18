import React, { useState, useEffect } from 'react';
import { useInstitute } from '../context/InstituteContext';
import { Save, Loader, Scale, CheckCircle, AlertCircle } from 'lucide-react';

const SettingsLegal = () => {
    const { institute, updateInstituteSettings, loading } = useInstitute();
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (institute) {
            setFormData(institute);
        }
    }, [institute]);

    // Auto-dismiss message
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        const result = await updateInstituteSettings(formData);

        if (result.success) {
            setMessage({ type: 'success', text: 'Legal pages updated successfully!' });
        } else {
            setMessage({ type: 'error', text: `Failed to update settings: ${result.error}` });
        }

        setSaving(false);
    };

    if (loading && !institute) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading settings...</p>
                </div>
            </div>
        );
    }

    const legalPages = [
        { key: 'privacy_policy', label: 'Privacy Policy' },
        { key: 'terms_of_service', label: 'Terms of Service' },
        { key: 'refund_policy', label: 'Refund Policy' },
        { key: 'shipping_policy', label: 'Shipping Policy' },
        { key: 'delete_account_policy', label: 'Delete Account Policy' },
    ];

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <Scale size={28} className="text-blue-600" />
                    Legal Pages Settings
                </h2>
                <p className="text-slate-500 text-sm mt-1 ml-10">
                    Customize the content for your institute's legal pages. You can use HTML for formatting.
                    Leave blank to use the default dynamic template.
                </p>
            </div>

            {/* Notification */}
            {message.text && (
                <div className={`
                    fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium animate-in slide-in-from-right-10 duration-300
                    ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'}
                `}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {legalPages.map((page) => (
                    <div key={page.key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-base font-semibold text-slate-800">
                                {page.label}
                            </h3>
                        </div>
                        <div className="p-6">
                            <textarea
                                name={page.key}
                                value={formData[page.key] || ''}
                                onChange={handleChange}
                                rows={10}
                                placeholder={`Enter HTML content for ${page.label}...`}
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-mono text-slate-800 placeholder:text-slate-400 resize-y"
                            />
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-[10px]">HTML</span>
                                Supports basic tags (p, h1-h6, ul, li, strong, etc.)
                            </p>
                        </div>
                    </div>
                ))}

                <div className="sticky bottom-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className={`
                            flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20
                            hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all transform hover:-translate-y-0.5
                            ${saving ? 'opacity-70 cursor-not-allowed transform-none' : ''}
                        `}
                    >
                        {saving ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save All Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsLegal;
