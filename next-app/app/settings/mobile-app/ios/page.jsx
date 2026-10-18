'use client';

import React, { useState, useEffect } from 'react';
import { Save, Upload, ArrowLeft, Smartphone, Loader2, AlertTriangle, RefreshCw, Moon, Wifi, ScanFace, Bell, Apple } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../supabaseClient';

export default function IOSConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewTab, setPreviewTab] = useState('home');

    const [config, setConfig] = useState({
        // Branding
        appName: 'MAHESH IES ACADEMY',
        primaryColor: '#10b981',
        secondaryColor: '#3b82f6',
        tertiaryColor: '#f59e0b',
        shareMessage: 'Check out this amazing app!',
        logoUrl: '',
        splashUrl: '',

        // Maintenance Mode
        maintenanceEnabled: false,
        maintenanceTitle: 'Under Maintenance',
        maintenanceMessage: 'We are upgrading our servers. Please check back soon.',
        maintenanceEstimatedTime: '',

        // Version Management
        currentVersion: '1.0.0',
        minimumVersion: '1.0.0',
        forceUpdate: false,
        updateMessage: 'A new version is available. Please update to continue.',
        appStoreUrl: '',

        // iOS-Specific Feature Toggles
        darkModeEnabled: false,
        offlineModeEnabled: false,
        faceIdEnabled: false,
        pushNotificationsEnabled: true,
        appleSignInEnabled: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/settings/mobile-app');
                const data = await res.json();
                if (data.iosConfig && Object.keys(data.iosConfig).length > 0) {
                    setConfig(prev => ({ ...prev, ...data.iosConfig }));
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `ios_${fieldName}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('institute-assets')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('institute-assets')
                .getPublicUrl(fileName);

            setConfig(prev => ({ ...prev, [fieldName]: publicUrl }));
        } catch (error) {
            alert('Upload failed: ' + error.message);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/mobile-app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ iosConfig: config })
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('iOS settings saved successfully!');
        } catch (error) {
            alert('Error saving settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const previewTabs = [
        { id: 'home', label: 'Home' },
        { id: 'login', label: 'Login' },
        { id: 'maintenance', label: 'Maintenance' },
        { id: 'update', label: 'Update' }
    ];

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
            {/* LEFT: Configuration Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px' }}>
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <Apple size={28} color="#000" />
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                            iOS App Configuration
                        </h1>
                    </div>

                    {/* Maintenance Mode */}
                    <Section title="🚧 Maintenance Mode" highlight={config.maintenanceEnabled}>
                        <Toggle
                            label="Enable Maintenance Mode"
                            name="maintenanceEnabled"
                            checked={config.maintenanceEnabled}
                            onChange={handleChange}
                            warning={config.maintenanceEnabled}
                        />
                        {config.maintenanceEnabled && (
                            <>
                                <Input label="Title" name="maintenanceTitle" value={config.maintenanceTitle} onChange={handleChange} />
                                <Input label="Message" name="maintenanceMessage" value={config.maintenanceMessage} onChange={handleChange} />
                                <Input label="Estimated Time" name="maintenanceEstimatedTime" value={config.maintenanceEstimatedTime} onChange={handleChange} placeholder="e.g., 2 hours" />
                            </>
                        )}
                    </Section>

                    {/* Version Management */}
                    <Section title="📦 Version Management">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Current Version" name="currentVersion" value={config.currentVersion} onChange={handleChange} />
                            <Input label="Minimum Version" name="minimumVersion" value={config.minimumVersion} onChange={handleChange} />
                        </div>
                        <Toggle
                            label="Force Update"
                            name="forceUpdate"
                            checked={config.forceUpdate}
                            onChange={handleChange}
                            description="Block app usage until updated"
                        />
                        <Input label="Update Message" name="updateMessage" value={config.updateMessage} onChange={handleChange} />
                        <Input label="App Store URL" name="appStoreUrl" value={config.appStoreUrl} onChange={handleChange} placeholder="https://apps.apple.com/app/..." />
                    </Section>

                    {/* iOS Feature Toggles */}
                    <Section title="📱 iOS Features">
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <FeatureToggle icon={<Moon size={18} />} label="Dark Mode" name="darkModeEnabled" checked={config.darkModeEnabled} onChange={handleChange} />
                            <FeatureToggle icon={<Wifi size={18} />} label="Offline Mode" name="offlineModeEnabled" checked={config.offlineModeEnabled} onChange={handleChange} />
                            <FeatureToggle icon={<ScanFace size={18} />} label="Face ID Login" name="faceIdEnabled" checked={config.faceIdEnabled} onChange={handleChange} />
                            <FeatureToggle icon={<Bell size={18} />} label="Push Notifications" name="pushNotificationsEnabled" checked={config.pushNotificationsEnabled} onChange={handleChange} />
                            <FeatureToggle icon={<Apple size={18} />} label="Apple Sign In" name="appleSignInEnabled" checked={config.appleSignInEnabled} onChange={handleChange} />
                        </div>
                    </Section>

                    {/* Branding */}
                    <Section title="🎨 Branding">
                        <Input label="App Name" name="appName" value={config.appName} onChange={handleChange} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <ColorInput label="Primary" name="primaryColor" value={config.primaryColor} onChange={handleChange} />
                            <ColorInput label="Secondary" name="secondaryColor" value={config.secondaryColor} onChange={handleChange} />
                            <ColorInput label="Tertiary" name="tertiaryColor" value={config.tertiaryColor} onChange={handleChange} />
                        </div>
                    </Section>

                    {/* Assets */}
                    <Section title="🖼️ Assets">
                        <FileUpload label="App Logo" fieldName="logoUrl" currentUrl={config.logoUrl} onUpload={handleFileUpload} />
                        <FileUpload label="Splash Screen" fieldName="splashUrl" currentUrl={config.splashUrl} onUpload={handleFileUpload} />
                    </Section>

                </div>
            </div>

            {/* RIGHT: Live Preview */}
            <div style={{ width: '400px', backgroundColor: '#1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>Live Preview</h3>

                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#374151', borderRadius: '8px', padding: '4px' }}>
                    {previewTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setPreviewTab(tab.id)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                background: previewTab === tab.id ? 'white' : 'transparent',
                                color: previewTab === tab.id ? '#1f2937' : '#9ca3af'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* iPhone Frame */}
                <div style={{
                    width: '280px',
                    height: '560px',
                    backgroundColor: config.darkModeEnabled ? '#111827' : 'white',
                    borderRadius: '36px',
                    border: '8px solid #000',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {/* Notch */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '28px',
                        backgroundColor: '#000',
                        borderRadius: '0 0 16px 16px',
                        zIndex: 10
                    }} />

                    {/* Content */}
                    <div style={{ height: '100%', paddingTop: '28px' }}>
                        {previewTab === 'home' && <HomePreview config={config} />}
                        {previewTab === 'login' && <LoginPreview config={config} />}
                        {previewTab === 'maintenance' && <MaintenancePreview config={config} />}
                        {previewTab === 'update' && <UpdatePreview config={config} />}
                    </div>
                </div>
            </div>

            {/* Floating Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    position: 'fixed',
                    bottom: '32px',
                    right: '440px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
            >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save'}
            </button>
        </div>
    );
}

// Helper Components
const Section = ({ title, children, highlight }) => (
    <div style={{
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: highlight ? '#fef3c7' : 'white',
        borderRadius: '12px',
        border: highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb'
    }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
);

const Input = ({ label, name, value, onChange, placeholder }) => (
    <div>
        <label style={{ fontSize: '14px', color: '#374151', display: 'block', marginBottom: '6px' }}>{label}</label>
        <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
        />
    </div>
);

const ColorInput = ({ label, name, value, onChange }) => (
    <div style={{ minWidth: 0 }}>
        <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="color" name={name} value={value} onChange={onChange} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} />
            <input type="text" value={value} onChange={onChange} name={name} style={{ width: '100%', minWidth: 0, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
    </div>
);

const Toggle = ({ label, name, checked, onChange, description, warning }) => (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div>
            <span style={{ fontSize: '14px', color: warning ? '#dc2626' : '#374151', fontWeight: warning ? '600' : '400' }}>{label}</span>
            {description && <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{description}</p>}
        </div>
        <input type="checkbox" name={name} checked={checked} onChange={onChange} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
    </label>
);

const FeatureToggle = ({ icon, label, name, checked, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: checked ? '#ecfdf5' : '#f9fafb', borderRadius: '8px', cursor: 'pointer', border: checked ? '1px solid #10b981' : '1px solid #e5e7eb' }}>
        <div style={{ color: checked ? '#10b981' : '#6b7280' }}>{icon}</div>
        <span style={{ flex: 1, fontSize: '14px', color: checked ? '#065f46' : '#374151' }}>{label}</span>
        <input type="checkbox" name={name} checked={checked} onChange={onChange} style={{ width: '18px', height: '18px' }} />
    </label>
);

const FileUpload = ({ label, fieldName, currentUrl, onUpload }) => (
    <div>
        <label style={{ fontSize: '14px', color: '#374151', display: 'block', marginBottom: '6px' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentUrl && <img src={currentUrl} alt={label} style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb' }} />}
            <label style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={14} /> Upload
                <input type="file" accept="image/*" onChange={(e) => onUpload(e, fieldName)} style={{ display: 'none' }} />
            </label>
        </div>
    </div>
);

// Preview Components
const HomePreview = ({ config }) => (
    <>
        <div style={{ height: '56px', background: config.primaryColor, display: 'flex', alignItems: 'center', padding: '0 16px', color: 'white' }}>
            <span style={{ fontWeight: '600', fontSize: '16px' }}>{config.appName}</span>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: config.darkModeEnabled ? '#1f2937' : 'white' }}>
            <div style={{ padding: '16px', backgroundColor: config.darkModeEnabled ? '#374151' : '#f3f4f6', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: config.darkModeEnabled ? 'white' : '#111827', marginBottom: '8px' }}>Welcome Back!</div>
                <div style={{ fontSize: '12px', color: config.darkModeEnabled ? '#9ca3af' : '#6b7280' }}>Continue your learning journey</div>
            </div>
        </div>
    </>
);

const LoginPreview = ({ config }) => (
    <div style={{ height: '100%', background: config.darkModeEnabled ? '#1f2937' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {config.splashUrl && (
            <img src={config.splashUrl} alt="Splash" style={{ width: '100px', height: '100px', borderRadius: '16px', marginBottom: '16px', objectFit: 'cover' }} />
        )}
        {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '16px' }} />
        ) : (
            <div style={{ width: '80px', height: '80px', background: config.primaryColor + '20', borderRadius: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Apple size={40} color={config.primaryColor} />
            </div>
        )}
        <div style={{ fontSize: '18px', fontWeight: '700', color: config.darkModeEnabled ? 'white' : '#111827', marginBottom: '24px' }}>{config.appName}</div>
        {config.faceIdEnabled && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '11px' }}>
                <ScanFace size={16} /> Face ID enabled
            </div>
        )}
    </div>
);

const MaintenancePreview = ({ config }) => (
    <div style={{ height: '100%', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: '16px' }} />
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>{config.maintenanceTitle}</div>
        <div style={{ fontSize: '12px', color: '#b91c1c', lineHeight: '1.5' }}>{config.maintenanceMessage}</div>
        {config.maintenanceEstimatedTime && (
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#dc2626' }}>ETA: {config.maintenanceEstimatedTime}</div>
        )}
    </div>
);

const UpdatePreview = ({ config }) => (
    <div style={{ height: '100%', background: '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <RefreshCw size={40} color="#3b82f6" style={{ marginBottom: '16px' }} />
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>Update Required</div>
        <div style={{ fontSize: '12px', color: '#3b82f6', lineHeight: '1.5' }}>{config.updateMessage}</div>
        <button style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
            Open App Store
        </button>
    </div>
);
