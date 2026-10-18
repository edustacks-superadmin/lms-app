import React, { useState, useEffect } from 'react';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { Save, Upload, Loader, Info, Image as ImageIcon, Link as LinkIcon, Type, LayoutTemplate } from 'lucide-react';

const SettingsHome = () => {
    const { settings, updateHomeSettings, loading } = useHomeSettings();
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
            setBannerPreview(settings.hero_banner_image);
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        const result = await updateHomeSettings(formData, null, bannerFile);

        if (result.success) {
            setMessage({ type: 'success', text: 'Home page settings updated successfully!' });
            setBannerFile(null);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
        } else {
            setMessage({ type: 'error', text: `Failed to update settings: ${result.error}` });
        }

        setSaving(false);
    };

    if (loading) {
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
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Home Page Settings</h2>
                <p className="text-slate-500 text-sm mt-1">Customize the appearance and content of your landing page</p>
            </div>

            {/* Notification */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-sm text-blue-700">
                <Info size={18} className="shrink-0 mt-0.5" />
                <div>
                    <span className="font-semibold block mb-0.5">Note</span>
                    To update your institute name, logo, contact information, or social media links, please visit{' '}
                    <a href="/settings/institute" className="underline hover:text-blue-800 font-medium">
                        Settings → Institute
                    </a>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {message.text && (
                    <div className={`
                        p-4 rounded-lg flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300
                        ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'}
                    `}>
                        <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {message.text}
                    </div>
                )}

                {/* Hero Banner Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Hero Section</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Banner Image</label>

                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-blue-300 transition-colors bg-slate-50/30">
                                {bannerPreview ? (
                                    <div className="space-y-4">
                                        <div className="relative aspect-video w-full max-w-lg mx-auto bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                            <img
                                                src={bannerPreview}
                                                alt="Banner preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm cursor-pointer shadow-sm">
                                                <ImageIcon size={16} /> Change Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleBannerChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Upload size={24} />
                                        </div>
                                        <h4 className="text-sm font-medium text-slate-900 mb-1">Upload banner image</h4>
                                        <p className="text-xs text-slate-500 mb-4">Recommended size: 1920x1080px (16:9)</p>
                                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm cursor-pointer shadow-sm">
                                            Select Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleBannerChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Hero Title</label>
                                <div className="relative">
                                    <Type size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        name="hero_title"
                                        value={formData.hero_title || ''}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                        placeholder="e.g., Welcome to Our Academy"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Hero Subtitle</label>
                                <textarea
                                    name="hero_subtitle"
                                    value={formData.hero_subtitle || ''}
                                    onChange={handleChange}
                                    rows={1}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors resize-none h-[42px]"
                                    placeholder="e.g., Empowering Students, One Course at a Time"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Call-to-Action Button Text</label>
                                <input
                                    type="text"
                                    name="hero_cta_text"
                                    value={formData.hero_cta_text || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                    placeholder="e.g., Explore Courses"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Sign Up Button Text</label>
                                <input
                                    type="text"
                                    name="signup_link_text"
                                    value={formData.signup_link_text || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                    placeholder="e.g., Sign Up"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Stats Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Live Stats Section</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center h-6 mt-0.5">
                                <input
                                    type="checkbox"
                                    name="show_live_stats"
                                    checked={formData.show_live_stats || false}
                                    onChange={handleChange}
                                    id="show_live_stats"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="show_live_stats" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                    Show live stats on home page
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    Display statistics like "500+ Students", "50+ Courses" below the hero section
                                </p>
                            </div>
                        </div>

                        {formData.show_live_stats && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <p className="text-sm text-slate-600 font-medium">Configure Stats (up to 4 items)</p>

                                {[0, 1, 2, 3].map((index) => {
                                    const stats = formData.live_stats_config?.stats || [];
                                    const stat = stats[index] || { label: '', value: '', icon: 'users' };

                                    return (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500 uppercase">Value</label>
                                                <input
                                                    type="text"
                                                    value={stat.value || ''}
                                                    onChange={(e) => {
                                                        const newStats = [...(formData.live_stats_config?.stats || [{}, {}, {}, {}])];
                                                        newStats[index] = { ...newStats[index], value: e.target.value };
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            live_stats_config: { stats: newStats }
                                                        }));
                                                    }}
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                                    placeholder="e.g., 500+"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500 uppercase">Label</label>
                                                <input
                                                    type="text"
                                                    value={stat.label || ''}
                                                    onChange={(e) => {
                                                        const newStats = [...(formData.live_stats_config?.stats || [{}, {}, {}, {}])];
                                                        newStats[index] = { ...newStats[index], label: e.target.value };
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            live_stats_config: { stats: newStats }
                                                        }));
                                                    }}
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                                    placeholder="e.g., Students Enrolled"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500 uppercase">Icon</label>
                                                <select
                                                    value={stat.icon || 'users'}
                                                    onChange={(e) => {
                                                        const newStats = [...(formData.live_stats_config?.stats || [{}, {}, {}, {}])];
                                                        newStats[index] = { ...newStats[index], icon: e.target.value };
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            live_stats_config: { stats: newStats }
                                                        }));
                                                    }}
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900"
                                                >
                                                    <option value="users">Users</option>
                                                    <option value="book">Book/Courses</option>
                                                    <option value="trophy">Trophy</option>
                                                    <option value="star">Star</option>
                                                    <option value="award">Award</option>
                                                    <option value="check">Checkmark</option>
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Announcement Bar Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Announcement Bar</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center h-6 mt-0.5">
                                <input
                                    type="checkbox"
                                    name="announcement_bar_enabled"
                                    checked={formData.announcement_bar_enabled || false}
                                    onChange={handleChange}
                                    id="announcement_bar_enabled"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="announcement_bar_enabled" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                    Show announcement bar
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    Display a dismissible banner at the top of the page for promotions or important notices
                                </p>
                            </div>
                        </div>

                        {formData.announcement_bar_enabled && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Announcement Text</label>
                                    <input
                                        type="text"
                                        name="announcement_bar_text"
                                        value={formData.announcement_bar_text || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="e.g., 🎉 New Year Sale! Get 20% off on all courses"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Link URL (Optional)</label>
                                    <input
                                        type="url"
                                        name="announcement_bar_link"
                                        value={formData.announcement_bar_link || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Background Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                name="announcement_bar_bg_color"
                                                value={formData.announcement_bar_bg_color || '#3b82f6'}
                                                onChange={handleChange}
                                                className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                name="announcement_bar_bg_color"
                                                value={formData.announcement_bar_bg_color || '#3b82f6'}
                                                onChange={handleChange}
                                                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Text Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                name="announcement_bar_text_color"
                                                value={formData.announcement_bar_text_color || '#ffffff'}
                                                onChange={handleChange}
                                                className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                name="announcement_bar_text_color"
                                                value={formData.announcement_bar_text_color || '#ffffff'}
                                                onChange={handleChange}
                                                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                {formData.announcement_bar_text && (
                                    <div className="pt-4">
                                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Preview</p>
                                        <div
                                            className="rounded-lg py-2.5 px-4 text-sm font-medium text-center"
                                            style={{
                                                backgroundColor: formData.announcement_bar_bg_color || '#3b82f6',
                                                color: formData.announcement_bar_text_color || '#ffffff'
                                            }}
                                        >
                                            {formData.announcement_bar_text}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Newsletter Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Newsletter Subscription</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center h-6 mt-0.5">
                                <input
                                    type="checkbox"
                                    name="show_newsletter"
                                    checked={formData.show_newsletter || false}
                                    onChange={handleChange}
                                    id="show_newsletter"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="show_newsletter" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                    Show newsletter subscription in footer
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    Allow visitors to subscribe to your newsletter with their email address
                                </p>
                            </div>
                        </div>

                        {formData.show_newsletter && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Section Title</label>
                                    <input
                                        type="text"
                                        name="newsletter_title"
                                        value={formData.newsletter_title || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="Subscribe to Our Newsletter"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Section Subtitle</label>
                                    <input
                                        type="text"
                                        name="newsletter_subtitle"
                                        value={formData.newsletter_subtitle || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="Stay updated with latest courses and offers"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Partner Logos Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Partner Logos</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center h-6 mt-0.5">
                                <input
                                    type="checkbox"
                                    name="show_partner_logos"
                                    checked={formData.show_partner_logos || false}
                                    onChange={handleChange}
                                    id="show_partner_logos"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="show_partner_logos" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                    Show partner/trust logos section
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    Display logos of partners, accreditations, or trusted organizations on the home page
                                </p>
                            </div>
                        </div>

                        {formData.show_partner_logos && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Section Title</label>
                                    <input
                                        type="text"
                                        name="partner_logos_title"
                                        value={formData.partner_logos_title || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="Trusted By"
                                    />
                                </div>

                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-sm text-blue-700">
                                        <strong>Note:</strong> To add or manage partner logos, go to{' '}
                                        <a href="/settings/partners" className="underline font-medium hover:text-blue-800">
                                            Settings → Partners
                                        </a>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LinkIcon size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Footer Links</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Copyright Text</label>
                            <input
                                type="text"
                                name="copyright_text"
                                value={formData.copyright_text || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                placeholder="e.g., © 2025 Institute Name. All rights reserved."
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Privacy Policy Link</label>
                                <input
                                    type="url"
                                    name="privacy_policy_link"
                                    value={formData.privacy_policy_link || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Terms of Service Link</label>
                                <input
                                    type="url"
                                    name="terms_link"
                                    value={formData.terms_link || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Display Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Display Settings</h3>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-3">
                                <div className="relative flex items-center h-6 mt-0.5">
                                    <input
                                        type="checkbox"
                                        name="show_products"
                                        checked={formData.show_products || false}
                                        onChange={handleChange}
                                        id="show_products"
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="show_products" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                        Show products on home page
                                    </label>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Enable this to display your courses and products on the landing page
                                    </p>
                                </div>
                            </div>

                            <div className="w-full md:w-auto">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Number of items to show
                                </label>
                                <input
                                    type="number"
                                    name="products_to_display"
                                    value={formData.products_to_display || 6}
                                    onChange={handleChange}
                                    min="1"
                                    max="12"
                                    className="w-24 px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 transition-colors text-center"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call to Action Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Call to Action Section</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center h-6 mt-0.5">
                                <input
                                    type="checkbox"
                                    name="show_cta_section"
                                    checked={formData.show_cta_section || false}
                                    onChange={handleChange}
                                    id="show_cta_section"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="show_cta_section" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                    Show call to action section
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    Display a prominent CTA banner at the bottom of the home page to encourage sign-ups
                                </p>
                            </div>
                        </div>

                        {formData.show_cta_section && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">CTA Title</label>
                                    <input
                                        type="text"
                                        name="cta_title"
                                        value={formData.cta_title || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="Ready to Start Your Learning Journey?"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">CTA Subtitle</label>
                                    <input
                                        type="text"
                                        name="cta_subtitle"
                                        value={formData.cta_subtitle || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="Join thousands of students..."
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Button Text</label>
                                        <input
                                            type="text"
                                            name="cta_button_text"
                                            value={formData.cta_button_text || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                            placeholder="Get Started Now"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Button Link</label>
                                        <input
                                            type="text"
                                            name="cta_button_link"
                                            value={formData.cta_button_link || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                                            placeholder="/store"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Experience Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Mobile Experience</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center h-6 mt-0.5">
                                <input
                                    type="checkbox"
                                    name="mobile_bottom_nav_enabled"
                                    checked={formData.mobile_bottom_nav_enabled !== false}
                                    onChange={handleChange}
                                    id="mobile_bottom_nav_enabled"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="mobile_bottom_nav_enabled" className="text-sm font-semibold text-slate-800 cursor-pointer">
                                    Show mobile bottom navigation
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    Display a fixed navigation bar at the bottom of the screen on mobile devices with quick access to Home, Store, Resources, and Login
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 pb-12">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsHome;
