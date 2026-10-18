'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInstitute } from '../../context/InstituteContext';
import { useToast } from '../../context/ToastContext';
import { Lock, CheckCircle2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const { updateUserPassword, session } = useAuth();
    const { institute } = useInstitute();
    const { showToast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // If there's no session, it means the user didn't come from a valid reset link
        // or the session expired.
        if (!session && !loading && !success) {
            // We give it a moment as session might be loading
            const timer = setTimeout(() => {
                if (!session) {
                    setError("Invalid or expired reset link. Please request a new one.");
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [session, loading, success]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        setLoading(true);
        setError(null);

        const { error: resetError } = await updateUserPassword(password);

        if (resetError) {
            showToast(resetError.message || 'Failed to update password', 'error');
            setError(resetError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            showToast('Password updated successfully!', 'success');
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
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
                        Reset Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {success
                            ? "Your password has been reset successfully."
                            : "Enter your new password below."}
                    </p>
                </div>

                {error && !success && (
                    <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                            <Link href="/forgot-password" size="sm" className="text-sm text-red-600 hover:text-red-500 underline mt-1 block">
                                Request a new link
                            </Link>
                        </div>
                    </div>
                )}

                {success ? (
                    <div className="mt-8 text-center animate-in zoom-in-95 duration-500">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <p className="text-gray-700 mb-6 font-medium">
                            Success! You can now log in with your new password.
                            Redirecting to login page...
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-500 py-3 px-6 bg-blue-50 rounded-xl transition-all"
                        >
                            Log in now
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="appearance-none rounded-xl relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white sm:text-sm"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="confirm-password"
                                        name="confirm-password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="appearance-none rounded-xl relative block w-full pl-10 pr-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white sm:text-sm"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !!error}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/30 ${(loading || !!error) ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {loading && <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
                                {loading ? 'Updating Password...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
