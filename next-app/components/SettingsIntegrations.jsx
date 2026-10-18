import React, { useState, useEffect } from 'react';
import { useInstitute } from '../context/InstituteContext';
import { Save, MessageCircle, CreditCard, ExternalLink, Info, X, Mail, AlertCircle, CheckCircle } from 'lucide-react';

const SettingsIntegrations = () => {
    const { institute, updateInstituteSettings, loading: contextLoading } = useInstitute();

    // UI State
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showGmailHelp, setShowGmailHelp] = useState(false);

    // Form Data
    const [whatsappData, setWhatsappData] = useState({
        whatsapp_url: ''
    });

    const [razorpayData, setRazorpayData] = useState({
        key_id: '',
        key_secret: ''
    });

    const [gmailData, setGmailData] = useState({
        smtp_user: '',
        smtp_password: ''
    });

    // Load data from context
    useEffect(() => {
        if (institute) {
            setWhatsappData({
                whatsapp_url: institute.whatsapp_url || ''
            });

            // Note: In a real scenario, we might likely NOT retrieve the secret key for security.
            // But we can check if keys exist or load them if allowed.
            // For now, these are just UI fields as requested, unless backend supports them.
            setRazorpayData({
                key_id: institute.razorpay_key_id || '',
                key_secret: institute.razorpay_key_secret || ''
            });

            const gmailCreds = institute.gmail_app_credentials || {};
            setGmailData({
                smtp_user: gmailCreds.smtp_user || institute.smtp_user || '',
                smtp_password: gmailCreds.smtp_password || institute.smtp_password || ''
            });
        }
    }, [institute]);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleWhatsappChange = (e) => {
        setWhatsappData(prev => ({ ...prev, whatsapp_url: e.target.value }));
    };

    const handleRazorpayChange = (e) => {
        const { name, value } = e.target;
        setRazorpayData(prev => ({ ...prev, [name]: value }));
    };

    const handleGmailChange = (e) => {
        const { name, value } = e.target;
        setGmailData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (section) => {
        setLoading(true);
        let result;

        if (section === 'whatsapp') {
            result = await updateInstituteSettings(whatsappData);
        } else if (section === 'razorpay') {
            // Check if backend supports saving these fields. 
            // If the database schema isn't updated, this might silently fail or just not persist.
            // But we follow the "SettingsInstitute" pattern which spreads 'settings'.
            result = await updateInstituteSettings({
                razorpay_key_id: razorpayData.key_id,
                razorpay_key_secret: razorpayData.key_secret
            });
        } else if (section === 'gmail') {
            result = await updateInstituteSettings({
                gmail_app_credentials: {
                    smtp_user: gmailData.smtp_user,
                    smtp_password: gmailData.smtp_password
                }
            });
        }

        setLoading(false);
        if (result.success) {
            let sectionName = 'Settings';
            if (section === 'whatsapp') sectionName = 'WhatsApp';
            else if (section === 'razorpay') sectionName = 'Razorpay';
            else if (section === 'gmail') sectionName = 'Gmail';

            setNotification({ type: 'success', message: `${sectionName} settings saved!` });
        } else {
            setNotification({ type: 'error', message: `Failed to save ${section} settings.` });
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
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">App Integrations</h2>
                <p className="text-slate-500 text-sm mt-1">Manage your third-party application connections.</p>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`
                    fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium animate-in slide-in-from-right-10 duration-300
                    ${notification.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'}
                `}>
                    {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {notification.message}
                </div>
            )}

            {/* WhatsApp Integration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">WhatsApp Integration</h2>
                        <p className="text-sm text-slate-500">Connect with your students via WhatsApp.</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">WhatsApp Link / URL</label>
                        <input
                            type="url"
                            value={whatsappData.whatsapp_url}
                            onChange={handleWhatsappChange}
                            placeholder="https://wa.me/919876543210"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                        />
                        <p className="text-xs text-slate-500">
                            Enter your full WhatsApp link (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">https://wa.me/your_number</code>) to allow users to contact you directly.
                        </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={() => handleSave('whatsapp')}
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg 
                                hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-sm
                                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                            `}
                        >
                            <Save size={18} /> Save WhatsApp Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Razorpay Integration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Razorpay Payment Gateway</h2>
                        <p className="text-sm text-slate-500">Accept online payments securely.</p>
                    </div>
                    <a
                        href="https://dashboard.razorpay.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        Dashboard <ExternalLink size={14} />
                    </a>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Key ID</label>
                        <input
                            type="text"
                            name="key_id"
                            value={razorpayData.key_id}
                            onChange={handleRazorpayChange}
                            placeholder="rzp_test_..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Key Secret</label>
                        <input
                            type="password"
                            name="key_secret"
                            value={razorpayData.key_secret}
                            onChange={handleRazorpayChange}
                            placeholder="••••••••••••••••"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={() => handleSave('razorpay')}
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg 
                                hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm
                                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                            `}
                        >
                            <Save size={18} /> Save Razorpay Keys
                        </button>
                    </div>
                </div>
            </div>

            {/* Gmail Integration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Gmail Integration</h2>
                        <p className="text-sm text-slate-500">Configure Gmail to send automated emails.</p>
                    </div>
                    <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                        Get App Password <ExternalLink size={14} />
                    </a>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Gmail Address</label>
                        <input
                            type="email"
                            name="smtp_user"
                            value={gmailData.smtp_user}
                            onChange={handleGmailChange}
                            placeholder="your_email@gmail.com"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-slate-700">App Password</label>
                            <button
                                onClick={() => setShowGmailHelp(true)}
                                className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                            >
                                <Info size={14} /> How to create?
                            </button>
                        </div>
                        <input
                            type="password"
                            name="smtp_password"
                            value={gmailData.smtp_password}
                            onChange={handleGmailChange}
                            placeholder="xxxx xxxx xxxx xxxx"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                        />
                        <p className="text-xs text-slate-500">
                            Use a generated <strong>App Password</strong>, not your regular Gmail password.
                        </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={() => handleSave('gmail')}
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg 
                                hover:bg-red-700 focus:ring-4 focus:ring-red-500/20 transition-all shadow-sm
                                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                            `}
                        >
                            <Save size={18} /> Save Gmail Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Modal */}
            {showGmailHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowGmailHelp(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-6">
                                How to create an App Password
                            </h3>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">1</div>
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">Enable 2-Step Verification</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Account Security</a> settings and ensure 2-Step Verification is turned ON.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">2</div>
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">Search for "App passwords"</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            In the search bar at the top of your Google Account page, type "App passwords" and select it.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">3</div>
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">Create new App Password</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Give it any name (e.g., "LMS App") and click <strong>Create</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">4</div>
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">Copy & Paste</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Copy the 16-character password displayed on your screen and paste it into the <strong>App Password</strong> field here.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <a
                                    href="https://myaccount.google.com/apppasswords"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block w-full py-2.5 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Go to App Passwords Settings
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsIntegrations;
