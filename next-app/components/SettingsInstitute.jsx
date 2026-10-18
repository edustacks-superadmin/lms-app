import React, { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Globe, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube, Lock, Shield, Download, FileText, Video, UserPlus, Key, Palette, Code, Webhook, Smartphone, EyeOff, Layout, MessageSquare, MessageCircle, Bell, Slash, UserCheck } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { supabase } from '../supabaseClient';

const SettingsInstitute = () => {
    const { institute, updateInstituteSettings, loading: contextLoading } = useInstitute();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        slogan: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        theme_color: '#0088cc',
        logo_url: '',
        favicon_url: '',
        facebook_url: '',
        twitter_url: '',
        instagram_url: '',
        linkedin_url: '',
        youtube_url: '',
        telegram_url: '',
        blogger_url: '',
        whatsapp_url: '',
        arattai_url: '',
        upi_id: '',
        upi_qr_url: '',
        mission_text: '',
        // Security
        enable_single_device_login: true,
        allowed_ips: '',
        max_login_attempts: 5,
        login_cooldown_minutes: 30,
        session_timeout_minutes: 60,
        logout_at_browser_close: false,
        // Downloads
        allow_pdf_download: true,
        allow_video_download: true,
        max_video_downloads: 10,
        enable_pdf_watermark: false,
        pdf_watermark_image_url: '',
        enable_video_watermark: false,
        video_watermark_position: 'center',
        // Registration
        allow_student_registration: true,
        verification_method: 'email',
        allow_google_login: false,
        allow_facebook_login: false,
        login_access_code: '',
        // White-Labeling
        label_dashboard: 'Dashboard',
        label_leaderboard: 'Leaderboard',
        label_helpdesk: 'Support',
        label_bookmarks: 'Bookmarks',
        label_username: 'Email / Phone',
        label_password: 'Password',
        msg_empty_course: '',
        custom_header_html: '',
        // Advanced
        webhook_order_success: '',
        webhook_exam_result: '',
        android_app_hash_key: '',
        disable_student_analytics: false,
        hide_leaderboard_names: false,
        // Communication
        enable_comments: true,
        comment_moderation: false,
        notify_admin_on_comment: true,
        blocked_comment_words: '',
        // Student Data
        enforce_user_photo: false,
        allow_user_profile_edit: true,
        disable_forgot_password: false,
        // About Us
        about_us_config: {
            badge: '',
            left_panel: { title: '', description: '' },
            tags: [],
            middle_highlight: '',
            right_panel: { title: '', items: [] },
            stats: []
        }
    });

    const [logoPreview, setLogoPreview] = useState(null);
    const [faviconPreview, setFaviconPreview] = useState(null);
    const [qrPreview, setQrPreview] = useState(null);
    const [notification, setNotification] = useState(null);

    // Sync formData with institute context
    useEffect(() => {
        if (institute) {
            setFormData(prev => ({
                ...prev,
                name: institute.name || '',
                slogan: institute.slogan || '',
                description: institute.description || '',
                address: institute.address || '',
                phone: institute.phone || '',
                email: institute.email || '',
                website: institute.website || '',
                theme_color: institute.theme_color || '#0088cc',
                logo_url: institute.logo_url || '',
                favicon_url: institute.favicon_url || '',
                facebook_url: institute.facebook_url || '',
                twitter_url: institute.twitter_url || '',
                instagram_url: institute.instagram_url || '',
                linkedin_url: institute.linkedin_url || '',
                youtube_url: institute.youtube_url || '',
                telegram_url: institute.telegram_url || '',
                blogger_url: institute.blogger_url || '',
                whatsapp_url: institute.whatsapp_url || '',
                arattai_url: institute.arattai_url || '',
                upi_id: institute.upi_id || '',
                upi_qr_url: institute.upi_qr_url || '',
                mission_text: institute.mission_text || '',
                // Security
                enable_single_device_login: institute.enable_single_device_login ?? true,
                allowed_ips: institute.allowed_ips || '',
                max_login_attempts: institute.max_login_attempts || 5,
                login_cooldown_minutes: institute.login_cooldown_minutes || 30,
                session_timeout_minutes: institute.session_timeout_minutes || 60,
                logout_at_browser_close: institute.logout_at_browser_close ?? false,
                // Downloads
                allow_pdf_download: institute.allow_pdf_download ?? true,
                allow_video_download: institute.allow_video_download ?? true,
                max_video_downloads: institute.max_video_downloads || 10,
                enable_pdf_watermark: institute.enable_pdf_watermark ?? false,
                pdf_watermark_image_url: institute.pdf_watermark_image_url || '',
                enable_video_watermark: institute.enable_video_watermark ?? false,
                video_watermark_position: institute.video_watermark_position || 'center',
                // Registration
                allow_student_registration: institute.allow_student_registration ?? true,
                verification_method: institute.verification_method || 'email',
                allow_google_login: institute.allow_google_login ?? false,
                allow_facebook_login: institute.allow_facebook_login ?? false,
                login_access_code: institute.login_access_code || '',
                // White-Labeling
                label_dashboard: institute.label_dashboard || 'Dashboard',
                label_leaderboard: institute.label_leaderboard || 'Leaderboard',
                label_helpdesk: institute.label_helpdesk || 'Support',
                label_bookmarks: institute.label_bookmarks || 'Bookmarks',
                label_username: institute.label_username || 'Email / Phone',
                label_password: institute.label_password || 'Password',
                msg_empty_course: institute.msg_empty_course || '',
                custom_header_html: institute.custom_header_html || '',
                // Advanced
                webhook_order_success: institute.webhook_order_success || '',
                webhook_exam_result: institute.webhook_exam_result || '',
                android_app_hash_key: institute.android_app_hash_key || '',
                disable_student_analytics: institute.disable_student_analytics ?? false,
                hide_leaderboard_names: institute.hide_leaderboard_names ?? false,
                // Communication
                enable_comments: institute.enable_comments ?? true,
                comment_moderation: institute.comment_moderation ?? false,
                notify_admin_on_comment: institute.notify_admin_on_comment ?? true,
                blocked_comment_words: institute.blocked_comment_words || '',
                // Student Data
                enforce_user_photo: institute.enforce_user_photo ?? false,
                allow_user_profile_edit: institute.allow_user_profile_edit ?? true,
                allow_user_profile_edit: institute.allow_user_profile_edit ?? true,
                disable_forgot_password: institute.disable_forgot_password ?? false,
                // About Us
                about_us_config: institute.about_us_config || {
                    badge: '',
                    left_panel: { title: '', description: '' },
                    tags: [],
                    middle_highlight: '',
                    right_panel: { title: '', items: [] },
                    stats: []
                }
            }));
            setLogoPreview(institute.logo_url);
            setFaviconPreview(institute.favicon_url);
            setQrPreview(institute.upi_qr_url);
        }
    }, [institute]);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAboutUsChange = (section, field, value, index = null, subField = null) => {
        setFormData(prev => {
            const newConfig = { ...prev.about_us_config };

            if (section === 'root') {
                newConfig[field] = value;
            } else if (section === 'left_panel') {
                newConfig.left_panel = { ...newConfig.left_panel, [field]: value };
            } else if (section === 'right_panel') {
                // Ensure right_panel exists
                if (!newConfig.right_panel) {
                    newConfig.right_panel = { title: '', items: [] };
                }

                if (index !== null) {
                    const newItems = [...(newConfig.right_panel.items || [])];
                    if (!newItems[index]) newItems[index] = {};
                    newItems[index] = { ...newItems[index], [subField]: value };
                    newConfig.right_panel = { ...newConfig.right_panel, items: newItems };
                } else {
                    newConfig.right_panel = { ...newConfig.right_panel, [field]: value };
                }
            } else if (section === 'stats') {
                const newStats = [...(newConfig.stats || [])];
                if (!newStats[index]) newStats[index] = {};
                newStats[index] = { ...newStats[index], [field]: value };
                newConfig.stats = newStats;
            } else if (section === 'tags') {
                newConfig.tags = value.split(',').map(t => t.trim());
            }

            return { ...prev, about_us_config: newConfig };
        });
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'logo') setLogoPreview(reader.result);
            else if (type === 'favicon') setFaviconPreview(reader.result);
            else if (type === 'qr') setQrPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to R2 (via server action)
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'institute-assets');

            const { uploadImage } = await import('../app/actions/images');
            const result = await uploadImage(formData);

            if (!result.success) throw new Error(result.error);

            setFormData(prev => ({
                ...prev,
                [type === 'logo' ? 'logo_url' : type === 'favicon' ? 'favicon_url' : 'upi_qr_url']: result.url
            }));

        } catch (error) {
            console.error('Error uploading image:', error);
            setNotification({ type: 'error', message: 'Error uploading image: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await updateInstituteSettings(formData);

        setLoading(false);
        if (result.success) {
            setNotification({ type: 'success', message: 'Institute settings saved successfully!' });
        } else {
            setNotification({ type: 'error', message: 'Failed to save settings: ' + result.error });
        }
    };

    if (contextLoading) {
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
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8">
            {/* Notification Toast */}
            {notification && (
                <div className={`
                    fixed top-5 right-5 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 font-medium animate-in slide-in-from-right-5 duration-300
                    ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}
                `}>
                    {notification.type === 'success' ? '✓' : '✕'} {notification.message}
                </div>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Institute Settings</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Manage your institute's branding, contact details, and social presence
                    </p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} /> Save Changes
                        </>
                    )}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Institute Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                placeholder="e.g. My Academy"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Slogan / Tagline</label>
                            <input
                                type="text"
                                name="slogan"
                                value={formData.slogan || ''}
                                onChange={handleChange}
                                placeholder="e.g. Learn to Lead"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">About / Description</label>
                            <textarea
                                name="description"
                                value={formData.description || ''}
                                onChange={handleChange}
                                placeholder="Tell us about your institute..."
                                rows={4}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400 resize-y"
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Mission Statement</label>
                            <textarea
                                name="mission_text"
                                value={formData.mission_text || ''}
                                onChange={handleChange}
                                placeholder="Our mission is to..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400 resize-y"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">Contact Information</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <MapPin size={16} className="text-slate-400" /> Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Phone size={16} className="text-slate-400" /> Phone Number
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Mail size={16} className="text-slate-400" /> Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Globe size={16} className="text-slate-400" /> Website URL
                            </label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Information */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">Payment Information</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">UPI ID (for Manual Payments)</label>
                            <input
                                type="text"
                                name="upi_id"
                                value={formData.upi_id || ''}
                                onChange={handleChange}
                                placeholder="e.g. merchant@upi"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">
                                This UPI ID will be shown to students when they choose to pay via UPI.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">QR Code (Scan & Pay)</label>
                            <div className="flex items-start gap-4">
                                <div className="w-24 h-24 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                                    {qrPreview ? (
                                        <img src={qrPreview} alt="QR Code" className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon size={24} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="qr-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors bg-white shadow-sm"
                                    >
                                        <Upload size={16} /> Upload QR Code
                                    </label>
                                    <input
                                        id="qr-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'qr')}
                                        className="hidden"
                                    />
                                    <p className="text-xs text-slate-500">Upload your UPI QR Code image.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">Branding</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 block">Institute Logo</label>
                            <div className="flex items-start gap-4">
                                <div className="w-28 h-28 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon size={32} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="logo-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors bg-white shadow-sm"
                                    >
                                        <Upload size={16} /> Upload Logo
                                    </label>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'logo')}
                                        className="hidden"
                                    />
                                    <p className="text-xs text-slate-500">Recommended size: 500x500px (PNG/JPG)</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 block">Favicon</label>
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                                    {faviconPreview ? (
                                        <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <ImageIcon size={24} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="favicon-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors bg-white shadow-sm"
                                    >
                                        <Upload size={16} /> Upload Favicon
                                    </label>
                                    <input
                                        id="favicon-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'favicon')}
                                        className="hidden"
                                    />
                                    <p className="text-xs text-slate-500">Recommended size: 32x32px (ICO/PNG)</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 block">Theme Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    name="theme_color"
                                    value={formData.theme_color || '#0088cc'}
                                    onChange={handleChange}
                                    className="w-12 h-10 p-0.5 border border-slate-300 rounded cursor-pointer bg-white"
                                />
                                <input
                                    type="text"
                                    name="theme_color"
                                    value={formData.theme_color || '#0088cc'}
                                    onChange={handleChange}
                                    className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security & Access Control */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Shield size={20} className="text-slate-500" /> Security & Access Control
                        </h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex items-center justify-between md:col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <h4 className="font-semibold text-slate-800">Single Device Policy</h4>
                                <p className="text-sm text-slate-500 mt-1">Prevent users from logging in on multiple devices simultaneously.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.enable_single_device_login}
                                    onChange={(e) => setFormData(p => ({ ...p, enable_single_device_login: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Allowed IPs (Whitelist)</label>
                            <input
                                type="text"
                                name="allowed_ips"
                                value={formData.allowed_ips || ''}
                                onChange={handleChange}
                                placeholder="e.g. 192.168.1.1, 203.0.113.5 (Leave empty to allow all)"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                            <p className="text-xs text-slate-500">Comma-separated list of IP addresses that bypass login restrictions.</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Max Login Attempts</label>
                            <input
                                type="number"
                                name="max_login_attempts"
                                value={formData.max_login_attempts}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Login Cooldown (Minutes)</label>
                            <input
                                type="number"
                                name="login_cooldown_minutes"
                                value={formData.login_cooldown_minutes}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                            />
                        </div>

                        <div className="flex items-center justify-between md:col-span-2 py-2">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700">Logout on Browser Close</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Force logout when the user closes their browser window.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.logout_at_browser_close}
                                    onChange={(e) => setFormData(p => ({ ...p, logout_at_browser_close: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Content Protection & Downloads */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Lock size={20} className="text-slate-500" /> Content Protection & Downloads
                        </h3>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Global Download Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">Allow PDF Downloads</h4>
                                        <p className="text-xs text-slate-500">Enable download button in PDF viewer</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allow_pdf_download}
                                        onChange={(e) => setFormData(p => ({ ...p, allow_pdf_download: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Video size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">Allow Offline Videos</h4>
                                        <p className="text-xs text-slate-500">Enable offline download in mobile app</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allow_video_download}
                                        onChange={(e) => setFormData(p => ({ ...p, allow_video_download: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Max Offline Video Downloads</label>
                                <input
                                    type="number"
                                    name="max_video_downloads"
                                    value={formData.max_video_downloads}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                                <p className="text-xs text-slate-500">Limit how many videos a user can store offline.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Registration & Onboarding */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <UserPlus size={20} className="text-slate-500" /> Registration & Onboarding
                        </h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex items-center justify-between md:col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <h4 className="font-semibold text-slate-800">Allow Student Registration</h4>
                                <p className="text-sm text-slate-500 mt-1">If disabled, students cannot sign up themselves (only Admin can add).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.allow_student_registration}
                                    onChange={(e) => setFormData(p => ({ ...p, allow_student_registration: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {formData.allow_student_registration && (
                            <>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700">Verification Method</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { value: 'email', label: 'Email OTP' },
                                            { value: 'manual', label: 'Admin Approval' },
                                            { value: 'none', label: 'No Verification' }
                                        ].map(option => (
                                            <div
                                                key={option.value}
                                                onClick={() => setFormData(p => ({ ...p, verification_method: option.value }))}
                                                className={`
                                                    cursor-pointer rounded-lg border px-4 py-3 text-center transition-all
                                                    ${formData.verification_method === option.value
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                                                `}
                                            >
                                                <div className="text-sm font-medium">{option.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">How should new accounts be verified?</p>
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Key size={16} className="text-slate-400" /> Access Code (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        name="login_access_code"
                                        value={formData.login_access_code || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. SECRET2024"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                    />
                                    <p className="text-xs text-slate-500">If set, users must enter this code to sign up. Useful for restricting access to specific cohorts.</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700 mb-3 block">Social Login</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allow_google_login}
                                                    onChange={(e) => setFormData(p => ({ ...p, allow_google_login: e.target.checked }))}
                                                    className="w-5 h-5 border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </div>
                                            <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Google Login</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allow_facebook_login}
                                                    onChange={(e) => setFormData(p => ({ ...p, allow_facebook_login: e.target.checked }))}
                                                    className="w-5 h-5 border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </div>
                                            <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Facebook Login</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Student Data & Profile Policy */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <UserCheck size={20} className="text-slate-500" /> Student Data & Profile Policy
                        </h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <h4 className="font-semibold text-slate-800">Enforce Profile Photo</h4>
                                <p className="text-sm text-slate-500 mt-1">Require students to upload a profile photo.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.enforce_user_photo}
                                    onChange={(e) => setFormData(p => ({ ...p, enforce_user_photo: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <h4 className="font-semibold text-slate-800">Allow Profile Editing</h4>
                                <p className="text-sm text-slate-500 mt-1">Allow students to change name/email after signup.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.allow_user_profile_edit}
                                    onChange={(e) => setFormData(p => ({ ...p, allow_user_profile_edit: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <h4 className="font-semibold text-slate-800">Disable Forgot Password</h4>
                                <p className="text-sm text-slate-500 mt-1">Hide the "Forgot Password" link on login page.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.disable_forgot_password}
                                    onChange={(e) => setFormData(p => ({ ...p, disable_forgot_password: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* UI Customization & White-Labeling */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Palette size={20} className="text-slate-500" /> UI Customization & White-Labeling
                        </h3>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <h4 className="md:col-span-2 font-medium text-slate-900 flex items-center gap-2">
                                <Layout size={16} className="text-slate-400" /> Rename Features (Labels)
                            </h4>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Dashboard Label</label>
                                <input
                                    type="text"
                                    name="label_dashboard"
                                    value={formData.label_dashboard}
                                    onChange={handleChange}
                                    placeholder="e.g. My Zone"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Leaderboard Label</label>
                                <input
                                    type="text"
                                    name="label_leaderboard"
                                    value={formData.label_leaderboard}
                                    onChange={handleChange}
                                    placeholder="e.g. Rankings"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Helpdesk/Doubts Label</label>
                                <input
                                    type="text"
                                    name="label_helpdesk"
                                    value={formData.label_helpdesk}
                                    onChange={handleChange}
                                    placeholder="e.g. Support"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Bookmarks Label</label>
                                <input
                                    type="text"
                                    name="label_bookmarks"
                                    value={formData.label_bookmarks}
                                    onChange={handleChange}
                                    placeholder="e.g. Notes"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Username Field Label</label>
                                <input
                                    type="text"
                                    name="label_username"
                                    value={formData.label_username}
                                    onChange={handleChange}
                                    placeholder="e.g. Mobile Number"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Password Field Label</label>
                                <input
                                    type="text"
                                    name="label_password"
                                    value={formData.label_password}
                                    onChange={handleChange}
                                    placeholder="e.g. Secret Code"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <MessageSquare size={16} className="text-slate-400" /> Empty Course Message
                                </label>
                                <input
                                    type="text"
                                    name="msg_empty_course"
                                    value={formData.msg_empty_course || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. Content coming soon! Stay tuned."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                />
                                <p className="text-xs text-slate-500">Shown to students when they open a course with no content.</p>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Code size={16} className="text-slate-400" /> Custom Header HTML/Scripts
                                </label>
                                <textarea
                                    name="custom_header_html"
                                    value={formData.custom_header_html || ''}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="<script>...</script> or <style>...</style>"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                                />
                                <p className="text-xs text-slate-500">Inject custom scripts or styles into the student portal header (Advanced).</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Developer & Advanced Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Code size={20} className="text-slate-500" /> Developer & Advanced Settings
                        </h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Smartphone size={16} className="text-slate-400" /> Android App Hash Key
                            </label>
                            <input
                                type="text"
                                name="android_app_hash_key"
                                value={formData.android_app_hash_key || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                            />
                            <p className="text-xs text-slate-500">Required for SMS Auto-retrieval on Android.</p>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <h4 className="font-medium text-slate-900 flex items-center gap-2 mb-3">
                                <Webhook size={16} className="text-slate-400" /> Webhooks
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Order Success Webhook</label>
                                    <input
                                        type="url"
                                        name="webhook_order_success"
                                        value={formData.webhook_order_success || ''}
                                        onChange={handleChange}
                                        placeholder="https://your-crm.com/hooks/..."
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Exam/Chapter Result Webhook</label>
                                    <input
                                        type="url"
                                        name="webhook_exam_result"
                                        value={formData.webhook_exam_result || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Communication & Engagement */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <MessageCircle size={20} className="text-slate-500" /> Communication & Engagement
                        </h3>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex items-center justify-between md:col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <h4 className="font-semibold text-slate-800">Enable Comments</h4>
                                    <p className="text-sm text-slate-500 mt-1">Allow students to post comments on lessons and posts.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.enable_comments}
                                        onChange={(e) => setFormData(p => ({ ...p, enable_comments: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {formData.enable_comments && (
                                <>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                                                <Shield size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800">Comment Moderation</h4>
                                                <p className="text-xs text-slate-500">Require admin approval for new comments.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.comment_moderation}
                                                onChange={(e) => setFormData(p => ({ ...p, comment_moderation: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <Bell size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800">Admin Notification</h4>
                                                <p className="text-xs text-slate-500">Email me when a new comment is posted.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.notify_admin_on_comment}
                                                onChange={(e) => setFormData(p => ({ ...p, notify_admin_on_comment: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Slash size={16} className="text-slate-400" /> Blocked Words
                                        </label>
                                        <textarea
                                            name="blocked_comment_words"
                                            value={formData.blocked_comment_words || ''}
                                            onChange={handleChange}
                                            rows={2}
                                            placeholder="Comma-separated list of words to block automatically..."
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">Social Media Links</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Facebook size={16} className="text-[#1877F2]" /> Facebook
                            </label>
                            <input
                                type="url"
                                name="facebook_url"
                                value={formData.facebook_url || ''}
                                onChange={handleChange}
                                placeholder="https://facebook.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Twitter size={16} className="text-[#1DA1F2]" /> Twitter / X
                            </label>
                            <input
                                type="url"
                                name="twitter_url"
                                value={formData.twitter_url || ''}
                                onChange={handleChange}
                                placeholder="https://twitter.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Instagram size={16} className="text-[#E4405F]" /> Instagram
                            </label>
                            <input
                                type="url"
                                name="instagram_url"
                                value={formData.instagram_url || ''}
                                onChange={handleChange}
                                placeholder="https://instagram.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Linkedin size={16} className="text-[#0A66C2]" /> LinkedIn
                            </label>
                            <input
                                type="url"
                                name="linkedin_url"
                                value={formData.linkedin_url || ''}
                                onChange={handleChange}
                                placeholder="https://linkedin.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Youtube size={16} className="text-[#FF0000]" /> YouTube
                            </label>
                            <input
                                type="url"
                                name="youtube_url"
                                value={formData.youtube_url || ''}
                                onChange={handleChange}
                                placeholder="https://youtube.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <span className="text-blue-500">📱</span> Telegram
                            </label>
                            <input
                                type="url"
                                name="telegram_url"
                                value={formData.telegram_url || ''}
                                onChange={handleChange}
                                placeholder="https://t.me/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <span className="text-orange-500">📝</span> Blogger
                            </label>
                            <input
                                type="url"
                                name="blogger_url"
                                value={formData.blogger_url || ''}
                                onChange={handleChange}
                                placeholder="https://blogger.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <span className="text-green-500">💬</span> WhatsApp
                            </label>
                            <input
                                type="url"
                                name="whatsapp_url"
                                value={formData.whatsapp_url || ''}
                                onChange={handleChange}
                                placeholder="https://wa.me/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <span className="text-purple-500">🎙️</span> Arattai
                            </label>
                            <input
                                type="url"
                                name="arattai_url"
                                value={formData.arattai_url || ''}
                                onChange={handleChange}
                                placeholder="https://arattai.com/..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* About Us Page Configuration */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <FileText size={20} className="text-slate-500" /> About Us Page
                        </h3>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Hero Section */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Badge Text</label>
                                <input
                                    type="text"
                                    value={formData.about_us_config?.badge || ''}
                                    onChange={(e) => handleAboutUsChange('root', 'badge', e.target.value)}
                                    placeholder="e.g. IIT & NIT Alumni Initiative"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        {/* Left Panel */}
                        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100">
                            <h4 className="text-md font-semibold text-slate-800">Left Panel (Introduction)</h4>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Title (HTML Supported)</label>
                                <input
                                    type="text"
                                    value={formData.about_us_config?.left_panel?.title || ''}
                                    onChange={(e) => handleAboutUsChange('left_panel', 'title', e.target.value)}
                                    placeholder="Title text..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Description (HTML Supported)</label>
                                <textarea
                                    value={formData.about_us_config?.left_panel?.description || ''}
                                    onChange={(e) => handleAboutUsChange('left_panel', 'description', e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Tags (Comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.about_us_config?.tags?.join(', ') || ''}
                                    onChange={(e) => handleAboutUsChange('tags', null, e.target.value)}
                                    placeholder="TNPSC, GATE, SSC..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Middle Highlight Text</label>
                                <input
                                    type="text"
                                    value={formData.about_us_config?.middle_highlight || ''}
                                    onChange={(e) => handleAboutUsChange('root', 'middle_highlight', e.target.value)}
                                    placeholder="e.g. bilingual explanations"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100">
                            <h4 className="text-md font-semibold text-slate-800">Right Panel (Features)</h4>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Section Title</label>
                                <input
                                    type="text"
                                    value={formData.about_us_config?.right_panel?.title || ''}
                                    onChange={(e) => handleAboutUsChange('right_panel', 'title', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                />
                            </div>

                            {/* Fixed 3 items for simplicity */}
                            {[0, 1, 2].map((idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500">Feature {idx + 1} Title</label>
                                        <input
                                            type="text"
                                            value={formData.about_us_config?.right_panel?.items?.[idx]?.title || ''}
                                            onChange={(e) => handleAboutUsChange('right_panel', null, e.target.value, idx, 'title')}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500">Feature {idx + 1} Description</label>
                                        <input
                                            type="text"
                                            value={formData.about_us_config?.right_panel?.items?.[idx]?.desc || ''}
                                            onChange={(e) => handleAboutUsChange('right_panel', null, e.target.value, idx, 'desc')}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100">
                            <h4 className="text-md font-semibold text-slate-800">Statistics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[0, 1, 2].map((idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">Stat {idx + 1} Value</label>
                                            <input
                                                type="text"
                                                value={formData.about_us_config?.stats?.[idx]?.value || ''}
                                                onChange={(e) => handleAboutUsChange('stats', 'value', e.target.value, idx)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">Stat {idx + 1} Label</label>
                                            <input
                                                type="text"
                                                value={formData.about_us_config?.stats?.[idx]?.label || ''}
                                                onChange={(e) => handleAboutUsChange('stats', 'label', e.target.value, idx)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SettingsInstitute;
