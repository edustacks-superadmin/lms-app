import React, { useState, useEffect } from 'react';
import { useInstitute } from '../context/InstituteContext';
import { Save, MessageCircle, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';

const SettingsIntegrations = () => {
    const { institute, updateInstituteSettings, loading: contextLoading } = useInstitute();

    // UI State
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Form Data
    const [whatsappData, setWhatsappData] = useState({
        whatsapp_url: ''
    });

    const [razorpayData, setRazorpayData] = useState({
        key_id: '',
        key_secret: ''
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
        }

        setLoading(false);
        if (result.success) {
            setNotification({ type: 'success', message: `${section === 'whatsapp' ? 'WhatsApp' : 'Razorpay'} settings saved!` });
        } else {
            setNotification({ type: 'error', message: `Failed to save ${section} settings.` });
        }
    };

    if (contextLoading) {
        return <div style={{ padding: '20px' }}>Loading settings...</div>;
    }

    const cardStyle = {
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px'
    };

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f3f4f6'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        marginBottom: '16px',
        outline: 'none',
        transition: 'border-color 0.15s ease-in-out'
    };

    return (
        <div className="settings-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>App Integrations</h1>
                <p style={{ color: '#6b7280', marginTop: '4px' }}>Manage your third-party application connections.</p>
            </div>

            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 50,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {notification.message}
                </div>
            )}

            {/* WhatsApp Integration */}
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <MessageCircle size={24} color="#16A34A" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>WhatsApp Integration</h2>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0 0' }}>Connect with your students via WhatsApp.</p>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>WhatsApp Link / URL</label>
                    <input
                        type="url"
                        value={whatsappData.whatsapp_url}
                        onChange={handleWhatsappChange}
                        placeholder="https://wa.me/919876543210"
                        style={inputStyle}
                    />
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                        Enter your full WhatsApp link (e.g., <code>https://wa.me/your_number</code>) to allow users to contact you directly.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => handleSave('whatsapp')}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#16A34A',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '500',
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        <Save size={16} /> Save WhatsApp Settings
                    </button>
                </div>
            </div>

            {/* Razorpay Integration */}
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: '#DBEAFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CreditCard size={24} color="#2563EB" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Razorpay Payment Gateway</h2>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0 0' }}>Accept online payments securely.</p>
                    </div>
                    <a
                        href="https://dashboard.razorpay.com/"
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#2563EB', textDecoration: 'none' }}
                    >
                        Dashboard <ExternalLink size={14} />
                    </a>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Key ID</label>
                    <input
                        type="text"
                        name="key_id"
                        value={razorpayData.key_id}
                        onChange={handleRazorpayChange}
                        placeholder="rzp_test_..."
                        style={inputStyle}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Key Secret</label>
                    <input
                        type="password"
                        name="key_secret"
                        value={razorpayData.key_secret}
                        onChange={handleRazorpayChange}
                        placeholder="••••••••••••••••"
                        style={inputStyle}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => handleSave('razorpay')}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#2563EB',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '500',
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        <Save size={16} /> Save Razorpay Keys
                    </button>
                </div>
            </div>

            {/* Add more integrations here in future */}

        </div>
    );
};

export default SettingsIntegrations;
