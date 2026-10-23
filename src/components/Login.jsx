import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // 2FA / MFA state
    const [mfaChallenge, setMfaChallenge] = useState(null); // { factorId, email }
    const [totpCode, setTotpCode] = useState('');
    const [verifyingMfa, setVerifyingMfa] = useState(false);

    const { signIn } = useAuth();
    const { institute } = useInstitute();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const completeLoginRedirect = async (userEmail) => {
        try {
            const { data: memberData } = await supabase
                .from('members')
                .select('role')
                .eq('email', userEmail)
                .maybeSingle();

            if (memberData?.role === 'student') {
                navigate('/student/dashboard');
            } else {
                navigate('/courses');
            }
        } catch (err) {
            console.error('Error fetching user role:', err);
            navigate('/courses');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await signIn(email, password);

        if (error) {
            showToast(error.message || 'Invalid email or password', 'error');
            setLoading(false);
            return;
        }

        // Check if 2FA (TOTP) is required
        try {
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const totpFactor = (factors?.all || factors?.totp || []).find(f => f.status === 'verified');
                if (totpFactor) {
                    setMfaChallenge({
                        factorId: totpFactor.id,
                        email: email
                    });
                    setLoading(false);
                    return;
                }
            }
        } catch (mfaErr) {
            console.warn('MFA check notice:', mfaErr);
        }

        // No 2FA required -> proceed with login redirect
        await completeLoginRedirect(email);
    };

    const handleVerifyMfa = async (e) => {
        e.preventDefault();
        const code = totpCode.trim();
        if (!code || code.length !== 6) {
            showToast('Please enter the 6-digit code from Google Authenticator', 'error');
            return;
        }

        setVerifyingMfa(true);
        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: mfaChallenge.factorId,
                code: code
            });

            if (error) throw error;

            showToast('Two-Factor Authentication verified successfully!', 'success');
            await completeLoginRedirect(mfaChallenge.email);
        } catch (err) {
            console.error('MFA verify error:', err);
            showToast(err.message || 'Invalid 6-digit code. Please check your app and try again.', 'error');
            setVerifyingMfa(false);
        }
    };

    const handleCancelMfa = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            // Ignore
        }
        setMfaChallenge(null);
        setTotpCode('');
        setLoading(false);
        setVerifyingMfa(false);
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - var(--header-height))',
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
                maxWidth: '420px',
                transition: 'transform 0.3s ease',
            }}>
                {mfaChallenge ? (
                    /* 2FA Verification View */
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                margin: '0 auto 16px',
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                            }}>
                                <ShieldCheck size={32} />
                            </div>

                            <h1 style={{
                                fontSize: '22px',
                                fontWeight: '700',
                                marginBottom: '8px',
                                color: '#1a1a1a',
                                letterSpacing: '-0.5px'
                            }}>
                                Two-Factor Authentication
                            </h1>

                            <p style={{
                                fontSize: '14px',
                                color: '#6b7280',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                                Enter the 6-digit verification code generated by your Google Authenticator app for:
                            </p>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginTop: '4px' }}>
                                {mfaChallenge.email}
                            </span>
                        </div>

                        <form onSubmit={handleVerifyMfa}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    textAlign: 'center'
                                }}>
                                    6-Digit Authenticator Code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '24px',
                                        letterSpacing: '8px',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        border: '2px solid #2563eb',
                                        borderRadius: '8px',
                                        backgroundColor: '#f8fafc',
                                        color: '#1e293b'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={verifyingMfa || totpCode.length !== 6}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: (verifyingMfa || totpCode.length !== 6) ? '#93c5fd' : 'var(--primary-color, #2563eb)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: (verifyingMfa || totpCode.length !== 6) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                                    marginBottom: '12px'
                                }}
                            >
                                {verifyingMfa ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify & Sign In <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleCancelMfa}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: 'transparent',
                                    color: '#6b7280',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                            >
                                <ArrowLeft size={16} /> Back to standard login
                            </button>
                        </form>
                    </div>
                ) : (
                    /* Standard Login View */
                    <div>
                        {/* Institute Branding */}
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            {institute?.logo_url ? (
                                <img
                                    src={institute.logo_url}
                                    alt="Logo"
                                    style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '16px' }}
                                />
                            ) : institute?.name ? (
                                <div style={{
                                    width: '70px',
                                    height: '70px',
                                    margin: '0 auto 16px',
                                    background: 'linear-gradient(135deg, var(--primary-color) 0%, #2563eb 100%)',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '28px',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    {institute.name.substring(0, 2).toUpperCase()}
                                </div>
                            ) : null}

                            <h1 style={{
                                fontSize: '26px',
                                fontWeight: '800',
                                marginBottom: '8px',
                                color: '#1a1a1a',
                                letterSpacing: '-0.5px'
                            }}>
                                Welcome Back
                            </h1>

                            <p style={{
                                fontSize: '15px',
                                color: '#6b7280',
                                margin: '0',
                                lineHeight: '1.5'
                            }}>
                                Sign in to continue to {institute?.name || 'your dashboard'}
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Email Address
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#9ca3af'
                                    }}>
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            fontSize: '15px',
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            backgroundColor: '#f9fafb'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.backgroundColor = 'white';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.backgroundColor = '#f9fafb';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <label style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>
                                        Password
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        style={{
                                            fontSize: '13px',
                                            color: 'var(--primary-color)',
                                            textDecoration: 'none',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
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
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%',
                                            padding: '12px 40px 12px 40px',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            fontSize: '15px',
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            backgroundColor: '#f9fafb'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
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
                                        tabIndex={-1}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            color: '#9ca3af',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#4b5563'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: loading ? '#93c5fd' : 'var(--primary-color)',
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
                                onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
                                onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                            <style>{`
                                @keyframes spin {
                                    from { transform: rotate(0deg); }
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                        </form>

                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                Don't have an account?{' '}
                                <Link
                                    to="/student/signup"
                                    style={{
                                        color: 'var(--primary-color)',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    Create account
                                </Link>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
