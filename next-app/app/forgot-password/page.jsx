'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInstitute } from '../../context/InstituteContext';
import { useToast } from '../../context/ToastContext';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { sendPasswordResetEmail } = useAuth();
    const { institute } = useInstitute();
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await sendPasswordResetEmail(email);

        if (error) {
            console.error('Supabase Reset Password Error:', error);
            showToast(error.message || 'Failed to send reset link', 'error');
            setLoading(false);
        } else {
            console.log('Supabase Reset Password Link Request Success');
            setSubmitted(true);
            setLoading(false);
            showToast('Reset link sent successfully!', 'success');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    {institute?.logo_url ? (
                        <div className="mx-auto h-20 w-20 relative mb-6 rounded-2xl overflow-hidden shadow-sm bg-gray-50 p-2">
                            <img
                                className="h-full w-full object-contain"
                                src={institute.logo_url}
                                alt={institute.name}
                            />
                        </div>
                    ) : (
                        <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                            <span className="text-2xl font-bold text-blue-600">
                                {(institute?.name || 'A').charAt(0)}
                            </span>
                        </div>
                    )}
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Forgot Password?
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {submitted
                            ? "Check your email for the reset link"
                            : "Enter your email address and we'll send you a link to reset your password."}
                    </p>
                </div>

                {submitted ? (
                    <div className="mt-8 text-center animate-in zoom-in-95 duration-500">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <p className="text-gray-700 mb-6">
                            We've sent a password reset link to <span className="font-semibold">{email}</span>.
                            Please check your inbox and spam folder.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-xl relative block w-full pl-10 pr-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white sm:text-sm"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/30 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {loading && <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
                                {loading ? 'Sending Link...' : 'Send Reset Link'}
                            </button>
                        </div>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
