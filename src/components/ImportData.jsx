import React, { useState } from 'react';
import { Download, ExternalLink, Check, X, ArrowRight, Loader, Eye, RefreshCw, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ImportData = () => {
    const [selectedPlatform, setSelectedPlatform] = useState(null);
    const [step, setStep] = useState(1); // 1: Select Platform, 2: Credentials/Upload, 3: Preview/Map, 4: Import
    const [credentials, setCredentials] = useState({ subdomain: '', username: '', password: '' });
    const [csvFile, setCsvFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ total: 0, imported: 0, status: '', errors: [] });
    const [previewData, setPreviewData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const platforms = [
        {
            id: 'csv',
            name: 'CSV Import',
            logo: null,
            icon: <FileText size={32} color="#666" />,
            color: '#607d8b',
            description: 'Upload CSV files directly',
            fields: [], // No credentials needed
            importTypes: ['Users', 'Questions']
        },
        {
            id: 'testpress',
            name: 'Testpress',
            logo: 'https://testpress.in/static/img/logo.svg',
            color: '#00bfa5',
            description: 'Connect via API',
            fields: [
                { name: 'subdomain', label: 'Subdomain', placeholder: 'yourschool', type: 'text' },
                { name: 'username', label: 'Admin Username', placeholder: 'admin@example.com', type: 'email' },
                { name: 'password', label: 'Admin Password', placeholder: '••••••••', type: 'password' }
            ],
            importTypes: ['Batches', 'Courses', 'Exams', 'Users', 'Questions']
        }
    ];

    const [selectedImportTypes, setSelectedImportTypes] = useState([]);

    const handlePlatformSelect = (platform) => {
        setSelectedPlatform(platform);
        setStep(2);
        setCredentials({ subdomain: '', username: '', password: '' });
        setCsvFile(null);
        setSelectedImportTypes([]);
        setPreviewData(null);
    };

    // Simple CSV Parser
    const parseCSV = (text) => {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const obj = {};
            headers.forEach((h, idx) => {
                let val = row[idx] || '';
                val = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
                obj[h] = val;
            });
            result.push(obj);
        }
        return result;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            setLoadingPreview(true);

            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target.result;
                const data = parseCSV(text);

                // Determine type based on headers
                let type = 'Unknown';
                const headers = Object.keys(data[0] || {});
                if (headers.includes('email') || headers.includes('username')) type = 'users';
                else if (headers.includes('question_text') || headers.includes('question_html')) type = 'questions';

                setPreviewData({
                    [type]: {
                        count: data.length,
                        sample: data.slice(0, 3),
                        allData: data
                    }
                });
                setLoadingPreview(false);
                setStep(3);
            };
            reader.readAsText(file);
        }
    };

    const handleCredentialSubmit = async (e) => {
        e.preventDefault();
        setLoadingPreview(true);
        // Simulate API check
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock API response for Testpress
        setPreviewData({
            users: { count: 120, sample: [{ name: 'John Doe', email: 'john@test.com' }] },
            questions: { count: 500, sample: [{ text: 'Sample Question 1' }] }
        });
        setLoadingPreview(false);
        setStep(3);
    };

    const toggleImportType = (type) => {
        setSelectedImportTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const processUserImport = async (userData) => {
        // Mapping Logic
        const email = userData.email;
        const display_name = userData.display_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;
        const phone = userData.phone_number || userData.mobile || '';

        // Catch-All for extra columns
        const knownFields = ['email', 'username', 'first_name', 'last_name', 'name', 'phone_number', 'mobile', 'phone', 'password'];
        const customData = {};
        Object.keys(userData).forEach(key => {
            if (!knownFields.includes(key)) customData[key] = userData[key];
        });

        if (!email) return { success: false, error: 'No email' };

        // 1. Auth SignUp (Client-side might fail if not anon/service role, but let's try)
        // Note: In a real app, this often needs a backend function to avoid "rate limits" or "captcha"
        // For now we assume we can create users or just insert into members

        const { error: dbError } = await supabase
            .from('members')
            .upsert({
                email,
                display_name,
                phone_number: phone,
                role: 'Student',
                status: 'Active',
                joining_date: new Date().toISOString(),
                custom_data: customData
            }, { onConflict: 'email' });

        return { success: !dbError, error: dbError?.message };
    };

    const handleStartImport = async () => {
        setStep(4);
        setImporting(true);
        setImportProgress({ total: 0, imported: 0, status: 'Starting...', errors: [] });

        let totalItems = 0;
        let processed = 0;
        let errors = [];

        // Calculate total
        selectedImportTypes.forEach(type => {
            const key = type.toLowerCase();
            if (previewData[key]) totalItems += previewData[key].count;
        });

        setImportProgress(prev => ({ ...prev, total: totalItems }));

        // Process Import
        for (const type of selectedImportTypes) {
            const key = type.toLowerCase();
            const dataList = previewData[key]?.allData || []; // For CSV we have allData

            if (key === 'users') {
                for (const item of dataList) {
                    setImportProgress(prev => ({ ...prev, status: `Importing ${item.email || 'User'}...` }));

                    const result = await processUserImport(item);

                    if (result.success) {
                        processed++;
                    } else {
                        errors.push(`Failed ${item.email}: ${result.error}`);
                    }

                    setImportProgress(prev => ({
                        ...prev,
                        imported: processed,
                        errors: errors
                    }));

                    // Small delay to prevent UI freeze
                    if (processed % 5 === 0) await new Promise(r => setTimeout(r, 10));
                }
            }
        }

        setImporting(false);
        setImportProgress(prev => ({ ...prev, status: 'Completed' }));
    };

    const resetImport = () => {
        setStep(1);
        setSelectedPlatform(null);
        setCredentials({ subdomain: '', username: '', password: '' });
        setCsvFile(null);
        setSelectedImportTypes([]);
        setPreviewData(null);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111', margin: '0 0 8px 0' }}>
                    Import Data
                </h1>
                <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
                    Import your existing data from CSV files or other platforms
                </p>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', gap: '12px' }}>
                <StepIndicator number={1} label="Select Source" active={step === 1} completed={step > 1} />
                <div style={{ flex: 1, height: '2px', background: step > 1 ? '#00bfa5' : '#e0e0e0' }} />
                <StepIndicator number={2} label="Upload / Connect" active={step === 2} completed={step > 2} />
                <div style={{ flex: 1, height: '2px', background: step > 2 ? '#00bfa5' : '#e0e0e0' }} />
                <StepIndicator number={3} label="Preview & Map" active={step === 3} completed={step > 3} />
                <div style={{ flex: 1, height: '2px', background: step > 3 ? '#00bfa5' : '#e0e0e0' }} />
                <StepIndicator number={4} label="Import" active={step === 4} completed={false} />
            </div>

            {/* Step 1: Platform Selection */}
            {step === 1 && (
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#333' }}>
                        Choose a source to import from
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
                        {platforms.map(platform => (
                            <PlatformCard
                                key={platform.id}
                                platform={platform}
                                onSelect={() => handlePlatformSelect(platform)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Credentials / Upload */}
            {step === 2 && selectedPlatform && (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: '80px', height: '80px', margin: '0 auto 16px',
                            background: '#f5f5f5', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {selectedPlatform.icon || <span style={{ fontSize: '32px', fontWeight: '700', color: selectedPlatform.color }}>{selectedPlatform.name.charAt(0)}</span>}
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                            {selectedPlatform.id === 'csv' ? 'Upload CSV File' : `Connect to ${selectedPlatform.name}`}
                        </h2>
                    </div>

                    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        {selectedPlatform.id === 'csv' ? (
                            <div style={{ textAlign: 'center' }}>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                    id="csv-upload"
                                />
                                <label htmlFor="csv-upload" style={{
                                    display: 'block', padding: '40px', border: '2px dashed #ccc', borderRadius: '8px',
                                    cursor: 'pointer', color: '#666'
                                }}>
                                    <Upload size={48} style={{ marginBottom: '16px', color: '#999' }} />
                                    <p>Click to upload CSV file</p>
                                    <p style={{ fontSize: '12px', color: '#999' }}>Supported formats: .csv</p>
                                </label>
                            </div>
                        ) : (
                            <form onSubmit={handleCredentialSubmit}>
                                {selectedPlatform.fields.map(field => (
                                    <div key={field.name} style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#333' }}>{field.label}</label>
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={credentials[field.name] || ''}
                                            onChange={(e) => setCredentials({ ...credentials, [field.name]: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                ))}
                                <button type="submit" disabled={loadingPreview} style={{
                                    width: '100%', padding: '12px', background: selectedPlatform.color, color: 'white',
                                    border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer'
                                }}>
                                    {loadingPreview ? 'Connecting...' : 'Connect & Preview'}
                                </button>
                            </form>
                        )}

                        <button onClick={resetImport} style={{ marginTop: '16px', width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>
                            Back
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && selectedPlatform && previewData && (
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', textAlign: 'center' }}>Preview Data</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                        {Object.keys(previewData).map(type => (
                            <PreviewCard
                                key={type}
                                type={type}
                                data={previewData[type]}
                                selected={selectedImportTypes.includes(type)}
                                onToggle={() => toggleImportType(type)}
                                color={selectedPlatform.color}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <button onClick={() => setStep(2)} style={{ padding: '12px 24px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
                        <button onClick={handleStartImport} disabled={selectedImportTypes.length === 0} style={{
                            padding: '12px 24px', background: selectedPlatform.color, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
                        }}>
                            Start Import
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Progress */}
            {step === 4 && (
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ background: 'white', padding: '48px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        {importing ? <Loader size={48} className="spin" style={{ color: selectedPlatform.color }} /> : <Check size={48} color="green" />}
                        <h3 style={{ margin: '24px 0 8px' }}>{importProgress.status}</h3>
                        <p>{importProgress.imported} / {importProgress.total} processed</p>

                        {importProgress.errors.length > 0 && (
                            <div style={{ marginTop: '24px', textAlign: 'left', background: '#fff0f0', padding: '16px', borderRadius: '8px' }}>
                                <h4 style={{ color: 'red', margin: '0 0 8px' }}>Errors ({importProgress.errors.length})</h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'red' }}>
                                    {importProgress.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                                    {importProgress.errors.length > 5 && <li>...and {importProgress.errors.length - 5} more</li>}
                                </ul>
                            </div>
                        )}

                        {!importing && (
                            <button onClick={resetImport} style={{ marginTop: '24px', padding: '12px 24px', background: '#00bfa5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                Import More
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const StepIndicator = ({ number, label, active, completed }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
        <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: completed || active ? '#00bfa5' : '#e0e0e0',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', marginBottom: '8px'
        }}>
            {completed ? <Check size={20} /> : number}
        </div>
        <span style={{ fontSize: '11px', color: active ? '#00bfa5' : '#666', fontWeight: active ? '600' : '400' }}>{label}</span>
    </div>
);

const PlatformCard = ({ platform, onSelect }) => (
    <div onClick={onSelect} style={{
        background: 'white', padding: '24px', borderRadius: '12px', border: '2px solid #e0e0e0',
        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
    }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = platform.color; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
    >
        <div style={{
            width: '80px', height: '80px', margin: '0 auto 16px', background: '#f5f5f5', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {platform.icon || <span style={{ fontSize: '32px', fontWeight: '700', color: platform.color }}>{platform.name.charAt(0)}</span>}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>{platform.name}</h3>
        <p style={{ fontSize: '12px', color: '#666' }}>{platform.description}</p>
    </div>
);

const PreviewCard = ({ type, data, selected, onToggle, color }) => (
    <div onClick={onToggle} style={{
        padding: '24px', borderRadius: '12px', border: `2px solid ${selected ? color : '#e0e0e0'}`,
        background: selected ? `${color}08` : 'white', cursor: 'pointer', position: 'relative'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', textTransform: 'capitalize' }}>{type}</h3>
                <p style={{ fontSize: '24px', fontWeight: '700', color: color, margin: 0 }}>{data.count}</p>
            </div>
            {selected && <Check size={24} color={color} />}
        </div>
        <div style={{ fontSize: '12px', color: '#666', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
            {data.sample.map((item, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>{item.name || item.email || item.text || 'Item'}</div>
            ))}
        </div>
    </div>
);

// Add keyframe animation for spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);

export default ImportData;
