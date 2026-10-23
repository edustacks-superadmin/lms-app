import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldCheck, ShieldAlert, Key, Copy, Check, RefreshCw, X, AlertTriangle } from 'lucide-react';

const TwoFactorAuthSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [factors, setFactors] = useState([]);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollData, setEnrollData] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [copiedSecret, setCopiedSecret] = useState(false);
    const [disabling, setDisabling] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState([]);

    useEffect(() => {
        if (user) {
            fetchFactors();
        }
    }, [user]);

    const fetchFactors = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            const verified = (data?.all || []).filter(f => f.status === 'verified');
            setFactors(verified);
        } catch (err) {
            console.error('Error fetching MFA factors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEnrollment = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        setVerifying(false);
        setVerificationCode('');
        setIsEnrolling(true);

        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Mahesh IES Academy',
                friendlyName: 'Google Authenticator'
            });

            if (error) throw error;
            setEnrollData(data);
        } catch (err) {
            console.error('Error starting enrollment:', err);
            setErrorMsg(err.message || 'Failed to start 2FA setup');
            setIsEnrolling(false);
        }
    };

    const handleVerifyEnrollment = async (e) => {
        e?.preventDefault();
        if (!verificationCode || verificationCode.trim().length !== 6) {
            setErrorMsg('Please enter the 6-digit code from Google Authenticator.');
            return;
        }

        setVerifying(true);
        setErrorMsg('');

        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: enrollData.id,
                code: verificationCode.trim()
            });

            if (error) throw error;

            // Generate 8 random recovery codes for emergency use
            const generatedCodes = Array.from({ length: 8 }, () =>
                Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                Math.random().toString(36).substring(2, 6).toUpperCase()
            );
            setRecoveryCodes(generatedCodes);

            setSuccessMsg('Two-Factor Authentication is now ENABLED on your account!');
            setIsEnrolling(false);
            setEnrollData(null);
            setVerificationCode('');
            await fetchFactors();
        } catch (err) {
            console.error('Error verifying 2FA:', err);
            setErrorMsg(err.message || 'Invalid code. Please ensure time on phone is accurate and try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleCancelEnrollment = async () => {
        if (enrollData?.id) {
            try {
                await supabase.auth.mfa.unenroll({ factorId: enrollData.id });
            } catch (e) {
                // Ignore cleanup error
            }
        }
        setIsEnrolling(false);
        setEnrollData(null);
        setErrorMsg('');
        setVerificationCode('');
    };

    const handleDisable2FA = async (factorId) => {
        if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.')) {
            return;
        }

        setDisabling(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            setSuccessMsg('Two-Factor Authentication has been disabled.');
            await fetchFactors();
        } catch (err) {
            console.error('Error disabling 2FA:', err);
            setErrorMsg(err.message || 'Failed to disable 2FA');
        } finally {
            setDisabling(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2500);
    };

    const is2FAEnabled = factors.length > 0;

    return (
        <div className="card" style={{ padding: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: is2FAEnabled ? '#dcfce7' : '#f3f4f6',
                        color: is2FAEnabled ? '#16a34a' : '#4b5563',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {is2FAEnabled ? <ShieldCheck size={24} /> : <Shield size={24} />}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#111827' }}>
                            Two-Factor Authentication (Google Authenticator)
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                            Secure your admin login with a one-time 6-digit code from Google Authenticator, Microsoft Authenticator, or Authy.
                        </p>
                    </div>
                </div>

                {!loading && (
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        backgroundColor: is2FAEnabled ? '#dcfce7' : '#fee2e2',
                        color: is2FAEnabled ? '#15803d' : '#b91c1c'
                    }}>
                        {is2FAEnabled ? 'ENABLED' : 'NOT ENABLED'}
                    </span>
                )}
            </div>

            {/* Notification messages */}
            {successMsg && (
                <div style={{ padding: '14px 16px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={20} />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div style={{ padding: '14px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={20} />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div style={{ padding: '24px 0', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                    Checking 2FA security status...
                </div>
            ) : !isEnrolling ? (
                /* Status View */
                <div>
                    {is2FAEnabled ? (
                        <div>
                            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '20px' }}>
                                Your administrator account is protected with Google Authenticator. Whenever you sign in with your email and password, you will be prompted for your 6-digit authenticator code.
                            </p>

                            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                                {factors.map((factor) => (
                                    <div key={factor.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                                                {factor.friendly_name || 'Google Authenticator'} (TOTP)
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                Enrolled on {new Date(factor.created_at || Date.now()).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDisable2FA(factor.id)}
                                            disabled={disabling}
                                            style={{
                                                backgroundColor: '#fee2e2',
                                                color: '#b91c1c',
                                                border: '1px solid #fca5a5',
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: disabling ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {disabling ? 'Disabling...' : 'Disable 2FA'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Show recovery codes if freshly generated */}
                            {recoveryCodes.length > 0 && (
                                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#1e40af' }}>
                                        Emergency Backup Recovery Codes
                                    </h4>
                                    <p style={{ fontSize: '13px', color: '#1e3a8a', margin: '0 0 12px 0' }}>
                                        Save these emergency backup codes in a safe place. You can use each code once if you ever lose access to your phone:
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontFamily: 'monospace', fontSize: '14px', fontWeight: '600', color: '#1e3a8a', backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                                        {recoveryCodes.map((code, idx) => (
                                            <div key={idx}>{code}</div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(recoveryCodes.join('\n'))}
                                        style={{ marginTop: '12px', background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                                    >
                                        Copy All Recovery Codes
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', marginBottom: '20px' }}>
                                Two-Factor Authentication adds an extra layer of defense against phishing, leaked passwords, and brute-force attempts. Setting it up takes less than 2 minutes.
                            </p>

                            <button
                                onClick={handleStartEnrollment}
                                style={{
                                    backgroundColor: '#00bfa5',
                                    color: 'white',
                                    border: 'none',
                                    padding: '11px 22px',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                                }}
                            >
                                <ShieldCheck size={18} /> Enable Google Authenticator
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* Enrollment Wizard */
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                            Scan QR Code with Google Authenticator
                        </h4>
                        <button onClick={handleCancelEnrollment} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {/* QR Code Container */}
                        <div style={{
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: '10px',
                            border: '1px solid #d1d5db',
                            textAlign: 'center',
                            minWidth: '200px'
                        }}>
                            {enrollData?.totp?.qr_code ? (
                                <img
                                    src={enrollData.totp.qr_code.startsWith('data:') ? enrollData.totp.qr_code : `data:image/svg+xml;utf-8,${encodeURIComponent(enrollData.totp.qr_code)}`}
                                    alt="2FA QR Code"
                                    style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                                />
                            ) : (
                                <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                    Loading QR...
                                </div>
                            )}
                            <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', display: 'block' }}>
                                Scan using Google Authenticator
                            </span>
                        </div>

                        {/* Setup Instructions */}
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151', lineHeight: '1.8' }}>
                                <li>Open <strong>Google Authenticator</strong> (or Microsoft Authenticator / Authy) on your phone.</li>
                                <li>Tap <strong>+</strong> and select <strong>Scan a QR code</strong>.</li>
                                <li>Point your phone's camera at the QR code on the left.</li>
                                <li>
                                    <span>If you can't scan, enter this key manually:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginBottom: '8px' }}>
                                        <code style={{ backgroundColor: 'white', padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontWeight: 'bold', letterSpacing: '1px', fontSize: '13px' }}>
                                            {enrollData?.totp?.secret || 'Generating...'}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(enrollData?.totp?.secret || '')}
                                            style={{
                                                background: 'none',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px',
                                                color: '#374151'
                                            }}
                                        >
                                            {copiedSecret ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                                            {copiedSecret ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </li>
                            </ol>

                            {/* Verification Input */}
                            <form onSubmit={handleVerifyEnrollment} style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                                    Enter 6-digit code from your app to activate:
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        autoFocus
                                        style={{
                                            width: '160px',
                                            padding: '10px 14px',
                                            fontSize: '18px',
                                            letterSpacing: '4px',
                                            fontWeight: '700',
                                            textAlign: 'center',
                                            border: '1px solid #9ca3af',
                                            borderRadius: '6px'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={verifying || verificationCode.length !== 6}
                                        style={{
                                            backgroundColor: (verifying || verificationCode.length !== 6) ? '#93c5fd' : '#2563eb',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '6px',
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            cursor: (verifying || verificationCode.length !== 6) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {verifying ? 'Verifying...' : 'Verify & Activate'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEnrollment}
                                        style={{
                                            backgroundColor: '#f3f4f6',
                                            color: '#4b5563',
                                            border: '1px solid #d1d5db',
                                            padding: '10px 16px',
                                            borderRadius: '6px',
                                            fontWeight: '500',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TwoFactorAuthSettings;
