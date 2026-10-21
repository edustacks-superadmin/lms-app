import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const { institute } = useInstitute();
    const { showToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        const checkAuthAndToken = async () => {
            try {
                // 1. Check if token_hash is in URL search parameters (?token_hash=...&type=recovery)
                const searchParams = new URLSearchParams(window.location.search);
                const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
                const type = searchParams.get('type') || 'recovery';

                if (tokenHash) {
                    const { data, error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: type
                    });

                    if (!isMounted) return;

                    if (verifyError) {
                        console.error('OTP verification error:', verifyError);
                        setError(verifyError.message || 'Invalid or expired reset link. Please request a new one.');
                        setVerifying(false);
                        return;
                    }

                    // Successfully verified! Clean up query params from URL bar
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setVerifying(false);
                    return;
                }

                // 2. Check if hash contains access_token from Supabase redirect
                const hash = window.location.hash;
                if (hash && hash.includes('access_token')) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!isMounted) return;
                    if (session) {
                        setVerifying(false);
                        return;
                    }
                }

                // 3. Check existing active session
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;

                if (!session) {
                    setError('Invalid or expired reset link. Please request a new password reset link.');
                }
                setVerifying(false);
            } catch (err) {
                if (!isMounted) return;
                console.error('Reset verification error:', err);
                setError('Failed to verify reset link. Please try again.');
                setVerifying(false);
            }
        };

        checkAuthAndToken();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                console.error('Password update error:', updateError);
                setError(updateError.message || 'Failed to update password');
                setLoading(false);
            } else {
                setSuccess(true);
                setLoading(false);
                showToast('Password updated successfully!', 'success');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            console.error('Password update error:', err);
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - var(--header-height, 0px))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05), 0 5px 10px rgba(0,0,0,0.01)',
                width: '100%',
                maxWidth: '440px'
            }}>
                {/* Institute Branding */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {institute?.logo_url ? (
                        <img
                            src={institute.logo_url}
                            alt="Logo"
                            style={{ width: '70px', height: '70px', objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
                        />
                    ) : institute?.name ? (
                        <div style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, var(--primary-color, #2563eb) 0%, #2563eb 100%)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '24px',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                        }}>
                            {institute.name.substring(0, 2).toUpperCase()}
                        </div>
                    ) : null}

                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        marginBottom: '8px',
                        color: '#1a1a1a',
                        letterSpacing: '-0.5px'
                    }}>
                        Reset Password
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0',
                        lineHeight: '1.5'
                    }}>
                        {success ? 'Your password has been changed!' : 'Enter your new password below.'}
                    </p>
                </div>

                {error && !success && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#dc2626',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <div>{error}</div>
                            <Link to="/forgot-password" style={{ color: '#b91c1c', fontWeight: '600', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
                                Request a new link
                            </Link>
                        </div>
                    </div>
                )}

                {verifying ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <Loader2 className="animate-spin" size={36} color="var(--primary-color, #2563eb)" />
                        </div>
                        <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
                            Verifying your reset link...
                        </p>
                    </div>
                ) : success ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <CheckCircle2 size={56} color="#10b981" />
                        </div>
                        <p style={{ fontSize: '15px', color: '#374151', marginBottom: '24px', lineHeight: '1.6' }}>
                            Your password has been reset successfully. Redirecting you to login...
                        </p>
                        <Link
                            to="/login"
                            style={{
                                display: 'inline-block',
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'var(--primary-color, #2563eb)',
                                color: 'white',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                textAlign: 'center'
                            }}
                        >
                            Log in now
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* New Password */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                New Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="Enter new password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 42px 12px 40px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        backgroundColor: '#f9fafb'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color, #2563eb)';
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#9ca3af',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                Confirm Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="Re-enter new password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 42px 12px 40px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        backgroundColor: '#f9fafb'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color, #2563eb)';
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#9ca3af',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0'
                                    }}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: loading ? '#93c5fd' : 'var(--primary-color, #2563eb)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    Updating Password...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
