import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { institute } = useInstitute();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const redirectUrl = `${window.location.origin}/reset-password`;

            // Call our robust serverless API endpoint
            let sent = false;
            try {
                const res = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email.trim(),
                        origin: window.location.origin
                    })
                });

                const data = await res.json().catch(() => ({}));

                if (res.ok && data.success) {
                    sent = true;
                } else if (res.status !== 404 && res.status !== 502) {
                    throw new Error(data.error || 'Failed to send recovery email');
                }
            } catch (apiErr) {
                if (!apiErr.message.includes('Failed to fetch')) {
                    throw apiErr;
                }
            }

            // Fallback to supabase native mailer if API not reachable (e.g. Vite dev server)
            if (!sent) {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: redirectUrl
                });
                if (error) throw error;
            }

            setSubmitted(true);
            setLoading(false);
            showToast('Password reset link sent to your email!', 'success');
        } catch (err) {
            console.error('Password reset error:', err);
            showToast(err.message || 'Failed to send reset email. Please try again.', 'error');
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
                        Forgot Password?
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0',
                        lineHeight: '1.5'
                    }}>
                        {submitted
                            ? "Check your email for the reset link"
                            : "Enter your registered email and we'll send you a link to reset your password."}
                    </p>
                </div>

                {submitted ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <CheckCircle2 size={56} color="#10b981" />
                        </div>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '24px', lineHeight: '1.6' }}>
                            We have sent a password reset link to <strong style={{ color: '#111827' }}>{email}</strong>.
                            Please check your inbox (and spam/junk folder) and click the link to reset your password.
                        </p>
                        <Link
                            to="/login"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--primary-color, #2563eb)',
                                fontWeight: '600',
                                fontSize: '14px',
                                textDecoration: 'none'
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
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
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="name@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
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
                                marginBottom: '20px',
                                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    Sending Link...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <Link
                                to="/login"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#6b7280',
                                    fontWeight: '500',
                                    fontSize: '14px',
                                    textDecoration: 'none'
                                }}
                            >
                                <ArrowLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
