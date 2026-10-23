'use client';

import React, { useState, useEffect } from 'react';
import { Save, Upload, ArrowLeft, Smartphone, Loader2, AlertTriangle, RefreshCw, Moon, Wifi, Fingerprint, Bell, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../supabaseClient';

export default function AndroidConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewTab, setPreviewTab] = useState('home');

    // Core Config State
    const [config, setConfig] = useState({
        // Existing
        appName: 'MAHESH IES ACADEMY',
        primaryColor: '#10b981',
        secondaryColor: '#3b82f6',
        tertiaryColor: '#f59e0b',
        shareMessage: 'Check out this amazing app!',
        zoomEnabled: false,
        logoUrl: '',
        splashUrl: '',
        deepLinkConfig: '{}',

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
        playStoreUrl: '',

        // Mobile-Specific Feature Toggles
        darkModeEnabled: false,
        offlineModeEnabled: false,
        biometricLoginEnabled: false,
        pushNotificationsEnabled: true,

        // Security & Content Protection
        preventExamScreenshots: true,
        preventPdfScreenshots: true,
        preventAllScreenshots: false
    });

    // Fetch initial settings
    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/settings/mobile-app');
                const data = await res.json();
                if (data.androidConfig && Object.keys(data.androidConfig).length > 0) {
                    setConfig(prev => ({ ...prev, ...data.androidConfig }));
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
            const fileName = `android_${fieldName}_${Date.now()}.${fileExt}`;
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
                body: JSON.stringify({ androidConfig: config })
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Settings saved successfully!');
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

                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: '#111827' }}>
                        Android App Configuration
                    </h1>

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
                            <Input label="Current Version" name="currentVersion" value={config.currentVersion} onChange={handleChange} placeholder="1.0.0" />
                            <Input label="Minimum Required" name="minimumVersion" value={config.minimumVersion} onChange={handleChange} placeholder="1.0.0" />
                        </div>
                        <Toggle
                            label="Force Update"
                            name="forceUpdate"
                            checked={config.forceUpdate}
                            onChange={handleChange}
                            description="Users with older versions must update to continue"
                        />
                        <Input label="Update Message" name="updateMessage" value={config.updateMessage} onChange={handleChange} />
                        <Input label="Play Store URL" name="playStoreUrl" value={config.playStoreUrl} onChange={handleChange} placeholder="https://play.google.com/store/apps/details?id=..." />
                    </Section>

                    {/* Mobile Feature Toggles */}
                    <Section title="📱 Mobile Features">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <FeatureToggle icon={Moon} label="Dark Mode" name="darkModeEnabled" checked={config.darkModeEnabled} onChange={handleChange} />
                            <FeatureToggle icon={Wifi} label="Offline Mode" name="offlineModeEnabled" checked={config.offlineModeEnabled} onChange={handleChange} />
                            <FeatureToggle icon={Fingerprint} label="Biometric Login" name="biometricLoginEnabled" checked={config.biometricLoginEnabled} onChange={handleChange} />
                            <FeatureToggle icon={Bell} label="Push Notifications" name="pushNotificationsEnabled" checked={config.pushNotificationsEnabled} onChange={handleChange} />
                        </div>
                    </Section>

                    {/* Security & Content Protection */}
                    <Section title="🛡️ Security & Content Protection">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Toggle
                                label="Prevent Screenshots & Screen Recording in Exams"
                                name="preventExamScreenshots"
                                checked={config.preventExamScreenshots ?? true}
                                onChange={handleChange}
                                description="Disables screenshots and screen recording while students are taking tests or viewing question solutions"
                            />
                            <Toggle
                                label="Prevent Screenshots in PDFs & Course Materials"
                                name="preventPdfScreenshots"
                                checked={config.preventPdfScreenshots ?? true}
                                onChange={handleChange}
                                description="Disables screenshots and screen recording while students are viewing PDFs and study notes"
                            />
                            <Toggle
                                label="Block Screenshots Everywhere (App-Wide)"
                                name="preventAllScreenshots"
                                checked={config.preventAllScreenshots || false}
                                onChange={handleChange}
                                warning={config.preventAllScreenshots}
                                description="Enforces strict screenshot and screen recording blocking across the entire application"
                            />
                        </div>
                    </Section>

                    {/* App Details */}
                    <Section title="App Details">
                        <Input label="App Name" name="appName" value={config.appName} onChange={handleChange} />
                        <Input label="Share Message" name="shareMessage" value={config.shareMessage} onChange={handleChange} />
                    </Section>

                    {/* Branding */}
                    <Section title="Branding">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <ColorPicker label="Primary Color" name="primaryColor" value={config.primaryColor} onChange={handleChange} />
                            <ColorPicker label="Secondary Color" name="secondaryColor" value={config.secondaryColor} onChange={handleChange} />
                            <ColorPicker label="Tertiary Color" name="tertiaryColor" value={config.tertiaryColor} onChange={handleChange} />
                        </div>
                    </Section>

                    {/* Assets */}
                    <Section title="Assets">
                        <FileUpload label="Splash Screen Image" onChange={(e) => handleFileUpload(e, 'splashUrl')} preview={config.splashUrl} />
                        <FileUpload label="App Logo" onChange={(e) => handleFileUpload(e, 'logoUrl')} preview={config.logoUrl} />
                    </Section>

                    {/* Features */}
                    <Section title="Features">
                        <Toggle label="Enable Zoom Support" name="zoomEnabled" checked={config.zoomEnabled} onChange={handleChange} />
                    </Section>

                    {/* Deep Linking */}
                    <Section title="Deep Linking">
                        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>?</span>
                                How to Configure Deep Linking
                            </h4>
                            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#15803d', lineHeight: '1.8' }}>
                                <li><strong>Get your Package Name</strong> from <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>app.json</code> or Google Play Console</li>
                                <li><strong>Find SHA-256 Fingerprint</strong>: Go to <em>Google Play Console → Your App → Setup → App signing</em></li>
                                <li>Copy the <strong>SHA-256 certificate fingerprint</strong> from "App signing key certificate"</li>
                                <li>Paste the JSON config below and click <strong>Save Changes</strong></li>
                            </ol>
                        </div>

                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Asset Links JSON</label>

                        <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                            <p style={{ fontSize: '12px', color: '#854d0e', margin: 0 }}>
                                <strong>Example Format:</strong>
                            </p>
                            <pre style={{ fontSize: '11px', color: '#713f12', margin: '8px 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{`{
  "package_name": "com.yourcompany.app",
  "sha256_cert_fingerprints": [
    "14:6D:E9:83:C5:73:..."
  ]
}`}</pre>
                        </div>

                        <textarea
                            name="deepLinkConfig"
                            value={config.deepLinkConfig}
                            onChange={handleChange}
                            placeholder='{"package_name": "com.example.app", "sha256_cert_fingerprints": ["..."]}'
                            style={{ width: '100%', height: '150px', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '12px' }}
                        />
                    </Section>

                    <div style={{ height: '100px' }} /> {/* Spacer */}
                </div>
            </div>

            {/* RIGHT: Live Preview */}
            <div style={{ width: '400px', backgroundColor: '#1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Preview</h3>

                {/* Preview Tabs */}
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
                                background: previewTab === tab.id ? config.primaryColor : 'transparent',
                                color: previewTab === tab.id ? 'white' : '#9ca3af',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Phone Frame */}
                <div style={{
                    width: '280px',
                    height: '560px',
                    border: '10px solid #111827',
                    borderRadius: '36px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: config.darkModeEnabled ? '#111827' : 'white',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Status Bar */}
                    <div style={{ height: '24px', background: config.primaryColor, width: '100%' }}></div>

                    {/* Render Preview Based on Tab */}
                    {previewTab === 'home' && (
                        <HomePreview config={config} />
                    )}
                    {previewTab === 'login' && (
                        <LoginPreview config={config} />
                    )}
                    {previewTab === 'maintenance' && (
                        <MaintenancePreview config={config} />
                    )}
                    {previewTab === 'update' && (
                        <UpdatePreview config={config} />
                    )}
                </div>
            </div>

            {/* Floating Save Button */}
            <div style={{ position: 'fixed', bottom: '24px', right: '440px' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        background: config.maintenanceEnabled ? '#ef4444' : '#10b981',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        border: 'none',
                        fontWeight: '600',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        cursor: saving ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Saving...' : config.maintenanceEnabled ? 'Save (Maintenance ON)' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

// Preview Components
const HomePreview = ({ config }) => (
    <>
        <div style={{ height: '56px', background: config.primaryColor, display: 'flex', alignItems: 'center', padding: '0 16px', color: 'white' }}>
            <div style={{ fontWeight: 'bold' }}>{config.appName || 'My App'}</div>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: config.darkModeEnabled ? '#1f2937' : 'white' }}>
            <div style={{ borderRadius: '12px', background: config.darkModeEnabled ? '#374151' : '#f3f4f6', padding: '16px', textAlign: 'center' }}>
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" style={{ width: '48px', height: '48px', margin: '0 auto 8px', borderRadius: '12px' }} />
                ) : (
                    <div style={{ width: '48px', height: '48px', background: '#e5e7eb', borderRadius: '12px', margin: '0 auto 8px' }} />
                )}
                <h4 style={{ fontWeight: 'bold', color: config.darkModeEnabled ? 'white' : '#374151', fontSize: '14px' }}>Welcome Student!</h4>
                <p style={{ fontSize: '11px', color: config.darkModeEnabled ? '#9ca3af' : '#6b7280' }}>Start learning today.</p>
            </div>
            <div style={{ background: config.secondaryColor, color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: '500', fontSize: '13px' }}>
                Continue Learning
            </div>
            {/* Feature Indicators */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {config.darkModeEnabled && <FeatureBadge icon="🌙" label="Dark" />}
                {config.offlineModeEnabled && <FeatureBadge icon="📥" label="Offline" />}
                {config.biometricLoginEnabled && <FeatureBadge icon="👆" label="Biometric" />}
                {config.pushNotificationsEnabled && <FeatureBadge icon="🔔" label="Push" />}
                {config.zoomEnabled && <FeatureBadge icon="📹" label="Zoom" />}
            </div>
        </div>
    </>
);

const LoginPreview = ({ config }) => (
    <div style={{ height: '100%', background: config.darkModeEnabled ? '#1f2937' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {config.splashUrl ? (
            <img src={config.splashUrl} alt="Splash" style={{ width: '100px', height: '100px', borderRadius: '16px', marginBottom: '16px', objectFit: 'cover' }} />
        ) : (
            <div style={{ width: '100px', height: '100px', background: config.primaryColor + '20', borderRadius: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={40} color={config.primaryColor} />
            </div>
        )}
        <h3 style={{ fontWeight: 'bold', color: config.darkModeEnabled ? 'white' : '#111827', marginBottom: '8px', fontSize: '16px' }}>{config.appName}</h3>
        <p style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '20px' }}>Sign in to continue</p>
        <div style={{ width: '100%', background: config.primaryColor, color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>
            Sign In
        </div>
        {config.biometricLoginEnabled && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '11px' }}>
                <Fingerprint size={16} /> Use Fingerprint
            </div>
        )}
    </div>
);

const MaintenancePreview = ({ config }) => (
    <div style={{ height: '100%', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <AlertTriangle size={30} color="#ef4444" />
        </div>
        <h3 style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '8px', fontSize: '16px' }}>
            {config.maintenanceTitle || 'Under Maintenance'}
        </h3>
        <p style={{ color: '#b91c1c', fontSize: '12px', lineHeight: '1.5', marginBottom: '12px' }}>
            {config.maintenanceMessage || 'We are upgrading our servers.'}
        </p>
        {config.maintenanceEstimatedTime && (
            <div style={{ background: '#fecaca', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', color: '#991b1b' }}>
                ⏱️ Est. {config.maintenanceEstimatedTime}
            </div>
        )}
    </div>
);

const UpdatePreview = ({ config }) => (
    <div style={{ height: '100%', background: config.darkModeEnabled ? '#1f2937' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', background: config.primaryColor + '20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <RefreshCw size={30} color={config.primaryColor} />
        </div>
        <h3 style={{ fontWeight: 'bold', color: config.darkModeEnabled ? 'white' : '#111827', marginBottom: '8px', fontSize: '16px' }}>
            Update Required
        </h3>
        <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: '1.5', marginBottom: '16px' }}>
            {config.updateMessage || 'Please update to the latest version.'}
        </p>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '16px' }}>
            Current: v{config.currentVersion} → Min: v{config.minimumVersion}
        </div>
        <div style={{ width: '100%', background: config.primaryColor, color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>
            Update Now
        </div>
    </div>
);

const FeatureBadge = ({ icon, label }) => (
    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon} {label}
    </span>
);

// Helper Components
const Section = ({ title, children, highlight }) => (
    <div style={{
        background: highlight ? '#fef2f2' : 'white',
        padding: '24px',
        borderRadius: '12px',
        border: highlight ? '2px solid #fecaca' : '1px solid #e5e7eb',
        marginBottom: '24px'
    }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: highlight ? '#dc2626' : '#374151', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>{children}</div>
    </div>
);

const Input = ({ label, ...props }) => (
    <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>{label}</label>
        <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }} {...props} />
    </div>
);

const ColorPicker = ({ label, value, onChange, name }) => (
    <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="color" name={name} value={value} onChange={onChange} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
            <input type="text" name={name} value={value} onChange={onChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        </div>
    </div>
);

const Toggle = ({ label, checked, onChange, name, warning, description }) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: warning && checked ? '#dc2626' : '#374151' }}>{label}</span>
                {description && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{description}</p>}
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                <input type="checkbox" name={name} checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: checked ? (warning ? '#ef4444' : '#10b981') : '#ccc', borderRadius: '34px', transition: '.4s'
                }} />
                <span style={{
                    position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                    backgroundColor: 'white', borderRadius: '50%', transition: '.4s',
                    transform: checked ? 'translateX(20px)' : 'translateX(0)'
                }} />
            </label>
        </div>
    </div>
);

const FeatureToggle = ({ icon: Icon, label, name, checked, onChange }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        background: checked ? '#f0fdf4' : '#f9fafb',
        borderRadius: '8px',
        border: checked ? '1px solid #bbf7d0' : '1px solid #e5e7eb'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon size={18} color={checked ? '#22c55e' : '#9ca3af'} />
            <span style={{ fontSize: '13px', fontWeight: '500', color: checked ? '#166534' : '#6b7280' }}>{label}</span>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
            <input type="checkbox" name={name} checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: checked ? '#22c55e' : '#ccc', borderRadius: '34px', transition: '.4s'
            }} />
            <span style={{
                position: 'absolute', height: '14px', width: '14px', left: '3px', bottom: '3px',
                backgroundColor: 'white', borderRadius: '50%', transition: '.4s',
                transform: checked ? 'translateX(16px)' : 'translateX(0)'
            }} />
        </label>
    </div>
);

const FileUpload = ({ label, onChange, preview }) => (
    <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>{label}</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
            {preview && <img src={preview} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />}
            <label style={{
                flex: 1, padding: '20px', border: '2px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
            }}>
                <Upload size={20} />
                <span style={{ fontSize: '14px' }}>Click to Upload Image</span>
                <input type="file" accept="image/*" onChange={onChange} style={{ display: 'none' }} />
            </label>
        </div>
    </div>
);
