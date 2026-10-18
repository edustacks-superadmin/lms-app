'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signOut } = useAuth();
    const { institute } = useInstitute();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await signIn(email, password);

        if (error) {
            showToast(error.message || 'Invalid email or password', 'error');
            setLoading(false);
        } else {
            try {
                if (!institute?.id) {
                    throw new Error('Institute configuration missing');
                }

                // Strict Check: Validate user belongs to THIS institute
                const { data: memberData, error: memberError } = await supabase
                    .from('members')
                    .select('role')
                    .eq('email', email)
                    .eq('institute_id', institute.id)
                    .single();

                if (memberError || !memberData) {
                    console.error('Login Validation Failed: User not part of institute', institute.id);
                    await signOut();
                    showToast('Access Denied: You are not a registered member of this institute.', 'error');
                    setLoading(false);
                    return;
                }

                // -------------------------------------------------------------
                // ENFORCE SINGLE DEVICE POLICY
                // Invalidate all previous sessions for this user
                // -------------------------------------------------------------
                try {
                    await supabase
                        .from('user_sessions')
                        .update({ is_current: false })
                        .eq('user_id', data.user.id);

                    // Optional: Record this new web session if you want strict tracking
                    // For now, just killing others is enough to enforce the policy
                } catch (sessionErr) {
                    console.error('Error invalidating previous sessions:', sessionErr);
                    // Non-blocking error, proceed with login
                }

                if (memberData?.role === 'student') {
                    const redirectUrl = searchParams.get('redirect');
                    if (redirectUrl) {
                        router.push(decodeURIComponent(redirectUrl));
                    } else {
                        router.push('/student/dashboard');
                    }
                } else {
                    router.push('/admin'); // Redirect to dashboard for admins/staff
                }
            } catch (err) {
                console.error('Error fetching user role:', err);
                // If it was our specific error, we already handled it. 
                // If it's something else, fail safe.
                if (err.message !== 'Institute configuration missing') {
                    // Optional: ensure sign out on critical failure
                    await signOut();
                }
                showToast(err.message || 'Login failed. Please try again.', 'error');
                setLoading(false);
            }
        }
    };

    // Safe config parsing
    const androidConfig = React.useMemo(() => {
        if (!institute?.android_app_config) return null;
        if (typeof institute.android_app_config === 'string') {
            try {
                return JSON.parse(institute.android_app_config);
            } catch (e) {
                return {};
            }
        }
        return institute.android_app_config;
    }, [institute]);

    const playStoreUrl = androidConfig?.playStoreUrl;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                {/* Logo & Header */}
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {institute?.logo_url ? (
                        <div className="mx-auto h-24 w-24 relative mb-6 rounded-2xl overflow-hidden shadow-sm bg-gray-50 p-2">
                            <img
                                className="h-full w-full object-contain"
                                src={institute.logo_url}
                                alt={institute.name}
                            />
                        </div>
                    ) : (
                        <div className="mx-auto h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                            <span className="text-3xl font-bold text-blue-600">
                                {(institute?.name || 'A').charAt(0)}
                            </span>
                        </div>
                    )}
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to continue to {institute?.name || 'your account'}
                    </p>
                </div>

                <form className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="mb-4">
                            <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm transition-all bg-gray-50 hover:bg-white"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm transition-all bg-gray-50 hover:bg-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {!institute?.disable_forgot_password && (
                        <div className="flex items-center justify-end">
                            <div className="text-sm">
                                <Link href="/forgot-password" size="sm" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/30 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            Sign In
                            {!loading && (
                                <span className="absolute right-4 inset-y-0 flex items-center pl-3">
                                    <ArrowRight className="h-4 w-4 text-blue-100 group-hover:text-white transition-colors" />
                                </span>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <button
                            onClick={() => router.push('/signup')}
                            className="font-bold text-blue-600 hover:text-blue-500 hover:underline transition-all"
                        >
                            Create account
                        </button>
                    </p>
                </div>

                {/* Mobile App Download Section */}
                <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Download Our Mobile App
                    </p>

                    <div className="flex flex-col items-center gap-3">
                        {/* Google Play Badge */}
                        <a
                            href={playStoreUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-transform hover:scale-105"
                        >
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                                alt="Get it on Google Play"
                                className="h-12"
                            />
                        </a>

                        {/* QR Code */}
                        <div className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(playStoreUrl || 'https://play.google.com/store/apps')}&bgcolor=ffffff`}
                                alt="Scan to Download"
                                className="w-24 h-24"
                                loading="lazy"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400">Scan to download</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
