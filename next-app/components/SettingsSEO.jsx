import React, { useState, useEffect } from 'react';
import { useInstitute } from '../context/InstituteContext';
import { Save, Globe, Info, AlertCircle, CheckCircle } from 'lucide-react';

const SettingsSEO = () => {
    const { institute, updateInstituteSettings, loading } = useInstitute();
    const [formData, setFormData] = useState({
        seo_title: '',
        meta_description: '',
        keywords: '',
        meta_robots_follow: 'Follow',
        meta_robots_index: 'Index'
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (institute) {
            setFormData({
                seo_title: institute.seo_title || '',
                meta_description: institute.meta_description || '',
                keywords: institute.keywords || '',
                meta_robots_follow: institute.meta_robots_follow || 'Follow',
                meta_robots_index: institute.meta_robots_index || 'Index'
            });
        }
    }, [institute]);

    // Auto-dismiss message
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
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
        setMessage(null);

        try {
            const result = await updateInstituteSettings(formData);
            if (result.success) {
                setMessage({ type: 'success', text: 'SEO settings updated successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings: ' + result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred.' });
        } finally {
            setSaving(false);
        }
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

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <Globe size={28} className="text-blue-600" />
                    Update Institute SEO Settings
                </h2>
                <p className="text-slate-500 text-sm mt-1 ml-10">
                    Configure global SEO settings for your institute. These settings will be applied to all pages unless overridden.
                </p>
            </div>

            {/* Notification */}
            {message && (
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

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* SEO Title */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">SEO Title</label>
                            <p className="text-xs text-slate-500">The title that appears in browser tabs and search engine results.</p>
                        </div>
                        <div className="md:col-span-8">
                            <input
                                type="text"
                                name="seo_title"
                                value={formData.seo_title}
                                onChange={handleChange}
                                placeholder="e.g. ABC Academy - Online Learning Platform"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Meta Description */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Description</label>
                            <p className="text-xs text-slate-500">A brief description often shown in search results below the title.</p>
                        </div>
                        <div className="md:col-span-8">
                            <textarea
                                name="meta_description"
                                value={formData.meta_description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Brief description of your institute..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400 resize-y"
                            />
                            <div className="flex justify-end mt-1">
                                <span className="text-xs text-slate-400">{formData.meta_description.length} characters</span>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Keywords */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Keywords</label>
                            <p className="text-xs text-slate-500">Comma-separated keywords relevant to your institute.</p>
                        </div>
                        <div className="md:col-span-8">
                            <input
                                type="text"
                                name="keywords"
                                value={formData.keywords}
                                onChange={handleChange}
                                placeholder="e.g. tnpsc, coaching, academy"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Robots Follow */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Robots Follow</label>
                            <p className="text-xs text-slate-500">Control if search engines should follow links on your pages.</p>
                        </div>
                        <div className="md:col-span-8">
                            <select
                                name="meta_robots_follow"
                                value={formData.meta_robots_follow}
                                onChange={handleChange}
                                className="w-full md:w-64 px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 cursor-pointer"
                            >
                                <option value="Follow">Follow</option>
                                <option value="Nofollow">Nofollow</option>
                            </select>
                            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <span className="font-medium text-slate-800">Follow:</span> Crawlers should follow links and pass equity.<br />
                                    <span className="font-medium text-slate-800">Nofollow:</span> Crawlers should not follow links.
                                </p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Robots Index */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Robots Index</label>
                            <p className="text-xs text-slate-500">Control if search engines should index your pages.</p>
                        </div>
                        <div className="md:col-span-8">
                            <select
                                name="meta_robots_index"
                                value={formData.meta_robots_index}
                                onChange={handleChange}
                                className="w-full md:w-64 px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 cursor-pointer"
                            >
                                <option value="Index">Index</option>
                                <option value="Noindex">Noindex</option>
                            </select>
                            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <span className="font-medium text-slate-800">Index:</span> Search engines should index the pages.<br />
                                    <span className="font-medium text-slate-800">Noindex:</span> Search engines should not index the pages.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg 
                            hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-sm
                            ${saving ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsSEO;
