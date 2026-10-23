import React, { useState, useEffect } from 'react';
import { Save, Shield, Smartphone, AlertTriangle, CheckCircle, Lock, EyeOff } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';

const SettingsMobileApp = () => {
    const { institute, updateInstituteSettings, loading: contextLoading } = useInstitute();
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    const [config, setConfig] = useState({
        // Security & Content Protection
        preventExamScreenshots: true,
        preventPdfScreenshots: true,
        preventAllScreenshots: false,

        // Maintenance Mode
        maintenanceEnabled: false,
        maintenanceMessage: 'We are upgrading our servers. Please check back soon.',

        // Version Control
        currentVersion: '1.0.4',
        minimumVersion: '1.0.0',
        forceUpdate: false,
        playStoreUrl: ''
    });

    // Populate from institute settings
    useEffect(() => {
        if (institute) {
            const rawConfig = institute.android_app_config || {};
            const parsedConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : rawConfig;
            
            setConfig(prev => ({
                ...prev,
                preventExamScreenshots: parsedConfig.preventExamScreenshots !== undefined ? parsedConfig.preventExamScreenshots : true,
                preventPdfScreenshots: parsedConfig.preventPdfScreenshots !== undefined ? parsedConfig.preventPdfScreenshots : true,
                preventAllScreenshots: parsedConfig.preventAllScreenshots || false,
                maintenanceEnabled: parsedConfig.maintenanceEnabled || false,
                maintenanceMessage: parsedConfig.maintenanceMessage || 'We are upgrading our servers. Please check back soon.',
                currentVersion: parsedConfig.currentVersion || parsedConfig.version || '1.0.4',
                minimumVersion: parsedConfig.minimumVersion || '1.0.0',
                forceUpdate: parsedConfig.forceUpdate || false,
                playStoreUrl: parsedConfig.playStoreUrl || ''
            }));
        }
    }, [institute]);

    const handleToggle = (key) => {
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const rawConfig = institute?.android_app_config || {};
            const existing = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : rawConfig;

            const updatedConfig = {
                ...existing,
                ...config
            };

            const result = await updateInstituteSettings({
                android_app_config: updatedConfig
            });

            if (result.success) {
                setNotification({ type: 'success', message: 'Mobile app & security settings saved successfully!' });
            } else {
                setNotification({ type: 'error', message: result.error || 'Failed to save settings' });
            }
        } catch (err) {
            setNotification({ type: 'error', message: err.message });
        } finally {
            setSaving(false);
            setTimeout(() => setNotification(null), 3500);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                        Mobile App & Security Settings
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Manage student mobile app permissions, exam & PDF screenshot blocking, and app updates.
                    </p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {notification && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    backgroundColor: notification.type === 'success' ? '#def7ec' : '#fde8e8',
                    color: notification.type === 'success' ? '#03543f' : '#9b1c1c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    border: `1px solid ${notification.type === 'success' ? '#bcf0da' : '#fbd5d5'}`
                }}>
                    {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {notification.message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* 1. Security & Content Protection */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', color: '#2563eb' }}>
                            <Shield size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                Security & Content Protection
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                                Control screenshot and screen recording restrictions in the student Android app (enforced by OS-level FLAG_SECURE).
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Exam Screenshot Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ maxWidth: '80%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Lock size={16} color="#2563eb" />
                                    <strong style={{ fontSize: '15px', color: '#1f2937' }}>Prevent Screenshots in Exams</strong>
                                    {config.preventExamScreenshots && (
                                        <span style={{ fontSize: '11px', backgroundColor: '#def7ec', color: '#03543f', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Active</span>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 0 0', lineHeight: '1.4' }}>
                                    Blocks students from taking screenshots and screen recordings while taking tests or reviewing question solutions.
                                </p>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={config.preventExamScreenshots}
                                    onChange={() => handleToggle('preventExamScreenshots')}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: config.preventExamScreenshots ? '#2563eb' : '#d1d5db',
                                    borderRadius: '24px', transition: '.3s'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px', left: config.preventExamScreenshots ? '26px' : '3px', bottom: '3px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '.3s'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* PDF Screenshot Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ maxWidth: '80%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <EyeOff size={16} color="#d97706" />
                                    <strong style={{ fontSize: '15px', color: '#1f2937' }}>Prevent Screenshots in PDFs & Course Materials</strong>
                                    {config.preventPdfScreenshots && (
                                        <span style={{ fontSize: '11px', backgroundColor: '#def7ec', color: '#03543f', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Active</span>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 0 0', lineHeight: '1.4' }}>
                                    Blocks students from taking screenshots while reading PDF notes, assignments, and study materials.
                                </p>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={config.preventPdfScreenshots}
                                    onChange={() => handleToggle('preventPdfScreenshots')}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: config.preventPdfScreenshots ? '#2563eb' : '#d1d5db',
                                    borderRadius: '24px', transition: '.3s'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px', left: config.preventPdfScreenshots ? '26px' : '3px', bottom: '3px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '.3s'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* App-Wide Screenshot Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', backgroundColor: config.preventAllScreenshots ? '#fffbeb' : '#f9fafb', borderRadius: '8px', border: `1px solid ${config.preventAllScreenshots ? '#fde68a' : '#e5e7eb'}` }}>
                            <div style={{ maxWidth: '80%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Shield size={16} color="#dc2626" />
                                    <strong style={{ fontSize: '15px', color: '#1f2937' }}>Block Screenshots Everywhere (App-Wide)</strong>
                                    {config.preventAllScreenshots && (
                                        <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Strict Mode</span>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 0 0', lineHeight: '1.4' }}>
                                    Enforces strict screenshot and screen recording blocking across the entire application (including Dashboard, Profile, and Store).
                                </p>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={config.preventAllScreenshots}
                                    onChange={() => handleToggle('preventAllScreenshots')}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: config.preventAllScreenshots ? '#dc2626' : '#d1d5db',
                                    borderRadius: '24px', transition: '.3s'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px', left: config.preventAllScreenshots ? '26px' : '3px', bottom: '3px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '.3s'
                                    }} />
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Version Management */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '8px', color: '#374151' }}>
                            <Smartphone size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                App Version & Play Store
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                                Control minimum required app version and force-update prompts for students.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                                Current Version
                            </label>
                            <input
                                type="text"
                                name="currentVersion"
                                value={config.currentVersion}
                                onChange={handleChange}
                                placeholder="1.0.4"
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                                Minimum Required Version
                            </label>
                            <input
                                type="text"
                                name="minimumVersion"
                                value={config.minimumVersion}
                                onChange={handleChange}
                                placeholder="1.0.0"
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                            Play Store URL
                        </label>
                        <input
                            type="text"
                            name="playStoreUrl"
                            value={config.playStoreUrl}
                            onChange={handleChange}
                            placeholder="https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '15px',
                            cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Save size={18} />
                        {saving ? 'Saving Changes...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsMobileApp;
