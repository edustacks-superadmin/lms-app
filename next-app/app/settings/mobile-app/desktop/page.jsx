'use client';

import React, { useState, useEffect } from 'react';
import { Save, Upload, ArrowLeft, Monitor, Loader2, Trash2, FileArchive, Download, Shield, Layout, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../supabaseClient';

export default function DesktopConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState({ windows: false, mac: false });

    // Core Config State
    const [config, setConfig] = useState({
        appName: 'MAHESH IES ACADEMY',
        version: '1.0.0',
        microsoftStoreProductId: '',
        appleAppStoreProductId: '',
        windowsInstallerUrl: '',
        windowsInstallerSize: '',
        macInstallerUrl: '',
        macInstallerSize: ''
    });

    // Fetch initial settings
    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/settings/mobile-app');
                const data = await res.json();
                if (data.desktopConfig && Object.keys(data.desktopConfig).length > 0) {
                    setConfig(prev => ({ ...prev, ...data.desktopConfig }));
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
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleInstallerUpload = async (e, platform) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [platform]: true }));
        try {
            const fileName = `desktop_${platform}_${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('institute-assets')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('institute-assets')
                .getPublicUrl(fileName);

            const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

            setConfig(prev => ({
                ...prev,
                [`${platform}InstallerUrl`]: publicUrl,
                [`${platform}InstallerSize`]: sizeInMB
            }));

        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(prev => ({ ...prev, [platform]: false }));
        }
    };

    const handleRemoveInstaller = (platform) => {
        setConfig(prev => ({
            ...prev,
            [`${platform}InstallerUrl`]: '',
            [`${platform}InstallerSize`]: ''
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/mobile-app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desktopConfig: config })
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Settings saved successfully!');
        } catch (error) {
            alert('Error saving settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
            {/* LEFT: Configuration Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px' }}>
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <Monitor size={28} color="#111827" />
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                            Desktop App Configuration
                        </h1>
                    </div>

                    {/* App Details */}
                    <Section title="📝 App Details">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="App Name" name="appName" value={config.appName} onChange={handleChange} />
                            <Input label="Version" name="version" value={config.version} onChange={handleChange} placeholder="e.g., 1.0.1" />
                        </div>
                    </Section>

                    {/* Windows Installer */}
                    <Section title="🪟 Windows Configuration">
                        <Input label="Microsoft Store Product ID" name="microsoftStoreProductId" value={config.microsoftStoreProductId} onChange={handleChange} placeholder="e.g., 9WZDNCRFJ3Q8" />
                        <div style={{ marginTop: '16px' }}>
                            <InstallerUpload
                                label="Windows Installer (.exe/.msi)"
                                accept=".exe,.msi"
                                url={config.windowsInstallerUrl}
                                size={config.windowsInstallerSize}
                                uploading={uploading.windows}
                                onUpload={(e) => handleInstallerUpload(e, 'windows')}
                                onRemove={() => handleRemoveInstaller('windows')}
                            />
                        </div>
                    </Section>

                    {/* Mac Installer */}
                    <Section title="🍎 macOS Configuration">
                        <Input label="App Store Product ID" name="appleAppStoreProductId" value={config.appleAppStoreProductId} onChange={handleChange} placeholder="e.g., id1234567890" />
                        <div style={{ marginTop: '16px' }}>
                            <InstallerUpload
                                label="Mac Installer (.dmg/.pkg)"
                                accept=".dmg,.pkg"
                                url={config.macInstallerUrl}
                                size={config.macInstallerSize}
                                uploading={uploading.mac}
                                onUpload={(e) => handleInstallerUpload(e, 'mac')}
                                onRemove={() => handleRemoveInstaller('mac')}
                            />
                        </div>
                    </Section>
                </div>
            </div>

            {/* RIGHT: Live Preview */}
            <div style={{ width: '450px', backgroundColor: '#111827', display: 'flex', flexDirection: 'column', padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layout size={18} /> Live Preview
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>
                        Here is how the download section appears on the student dashboard.
                    </p>
                </div>

                {/* Preview Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Monitor size={32} color="#3b82f6" />
                        </div>
                        <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                            Download {config.appName}
                        </h4>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Experience the best learning environment on your desktop.
                            <br />
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', display: 'block' }}>Version {config.version}</span>
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Windows Button */}
                        <button
                            disabled={!config.windowsInstallerUrl}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                width: '100%', padding: '12px',
                                backgroundColor: config.windowsInstallerUrl ? '#2563eb' : '#f3f4f6',
                                color: config.windowsInstallerUrl ? 'white' : '#9ca3af',
                                border: 'none', borderRadius: '10px', fontWeight: '600',
                                opacity: config.windowsInstallerUrl ? 1 : 0.7,
                                cursor: config.windowsInstallerUrl ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0v-8.102zm10.949-1.655l12.723-1.742.062 11.498h-12.79l.005-9.756zm0 11.232l-.005 9.773 12.802 1.768-.073-11.541h-12.724zm-10.949.122h9.75v8.113l-9.75-1.328v-6.785z" /></svg>
                            Download for Windows
                        </button>

                        {/* Mac Button */}
                        <button
                            disabled={!config.macInstallerUrl}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                width: '100%', padding: '12px',
                                backgroundColor: config.macInstallerUrl ? '#111827' : '#f3f4f6',
                                color: config.macInstallerUrl ? 'white' : '#9ca3af',
                                border: 'none', borderRadius: '10px', fontWeight: '600',
                                opacity: config.macInstallerUrl ? 1 : 0.7,
                                cursor: config.macInstallerUrl ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.84 1.53-2.95 1.46-.14-1.2.35-2.25 1.05-3.15z" /></svg>
                            Download for Mac
                        </button>
                    </div>

                    {/* Features List */}
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Included Features
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563' }}>
                                <Shield size={14} color="#10b981" /> Secure Exam Browser
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563' }}>
                                <Download size={14} color="#3b82f6" /> Offline Content Access
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563' }}>
                                <Settings size={14} color="#f59e0b" /> Auto-updates
                            </li>
                        </ul>
                    </div>
                </div>

                <div style={{ marginTop: 'auto', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Protips</div>
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#9ca3af', fontSize: '12px', lineHeight: '1.6' }}>
                        <li>Upload both Windows (.exe) and Mac (.dmg) installers to reach all students.</li>
                        <li>Keep the version number updated to prompt users to upgrade.</li>
                    </ul>
                </div>
            </div>

            {/* Floating Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    position: 'fixed',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 32px',
                    backgroundColor: '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: '100px',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: saving ? 'wait' : 'pointer',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                }}
            >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
        </div>
    );
}

// Helper Components
const Section = ({ title, children }) => (
    <div style={{
        marginBottom: '24px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>{children}</div>
    </div>
);

const Input = ({ label, name, value, onChange, placeholder }) => (
    <div>
        <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>{label}</label>
        <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
    </div>
);

const InstallerUpload = ({ label, accept, url, size, uploading, onUpload, onRemove }) => (
    <div>
        <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>{label}</label>

        {url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '40px', height: '40px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileArchive size={20} color="#3b82f6" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {url.split('/').pop()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {size || 'Unknown size'} •
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>Download</a>
                    </div>
                </div>
                <button
                    onClick={onRemove}
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}
                    title="Remove File"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        ) : (
            <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '32px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center',
                cursor: uploading ? 'wait' : 'pointer', backgroundColor: '#f8fafc', transition: 'all 0.2s'
            }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
            >
                {uploading ? (
                    <Loader2 className="animate-spin" size={24} color="#3b82f6" />
                ) : (
                    <Upload size={24} color="#64748b" />
                )}
                <span style={{ marginTop: '12px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                    {uploading ? 'Uploading...' : 'Click to upload installer'}
                </span>
                <span style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                    Supported: {accept}
                </span>
                <input type="file" accept={accept} onChange={onUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
        )}
    </div>
);
