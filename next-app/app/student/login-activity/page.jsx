'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getUserSessions, deleteSession, logoutAllDevices } from '../../../lib/sessionService';
import { format } from 'date-fns';
import { Shield, Smartphone, Monitor, Tablet, Trash2, LogOut, RefreshCw, Globe, MapPin, Clock, Activity, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginActivityPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSessions();
        }
    }, [user]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const data = await getUserSessions();
            setSessions(data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        if (!confirm('Are you sure you want to logout from all devices? You will need to login again.')) {
            return;
        }

        const success = await logoutAllDevices();
        if (success) {
            router.replace('/login');
        } else {
            alert('Failed to logout from all devices');
        }
    };

    const handleDeleteSession = async (sessionId, isCurrentDevice) => {
        if (isCurrentDevice) {
            alert('You cannot remove the current session');
            return;
        }

        if (!confirm('Are you sure you want to remove this device?')) {
            return;
        }

        const success = await deleteSession(sessionId);
        if (success) {
            fetchSessions();
        } else {
            alert('Failed to remove device');
        }
    };

    const getDeviceIcon = (osName, deviceType) => {
        if (deviceType === 'Tablet') return <Tablet className="w-6 h-6" />;
        if (deviceType === 'Mobile') return <Smartphone className="w-6 h-6" />;
        return <Monitor className="w-6 h-6" />;
    };

    const formatTime = (timestamp) => {
        try {
            return format(new Date(timestamp), 'MMM dd, yyyy • hh:mm a');
        } catch {
            return 'Unknown';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Login Activity</h1>
                        <p className="text-sm text-gray-500">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={fetchSessions} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
                    <RefreshCw className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No active sessions</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map((session) => {
                        const isCurrent = session.is_current;
                        const location = session.location || {};
                        const locationText = location.city && location.country
                            ? `${location.city}, ${location.country}`
                            : location.country || 'Unknown Location';

                        return (
                            <div
                                key={session.id}
                                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isCurrent ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-100'
                                    }`}
                            >
                                <div className="p-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {getDeviceIcon(session.os_name, session.device_info?.deviceType)}
                                            </div>
                                            <div>
                                                <p className={`font-bold ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>
                                                    {session.device_name || 'Unknown Device'}
                                                </p>
                                                {isCurrent && (
                                                    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full mt-1">
                                                        This Device
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!isCurrent && (
                                            <button
                                                onClick={() => handleDeleteSession(session.id, false)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                                                title="Remove Device"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-gray-400" />
                                            <span>{session.os_name} {session.os_version}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-gray-400" />
                                            <span>{session.ip_address || 'Unknown IP'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>{locationText}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span>Login: {formatTime(session.login_time)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-gray-400" />
                                            <span>Last active: {formatTime(session.last_active)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Logout All Button */}
            {sessions.length > 0 && (
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={handleLogoutAll}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout All Devices
                    </button>
                </div>
            )}

            {/* Security Tip */}
            <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-amber-800">Security Tip</p>
                        <p className="text-sm text-amber-700 mt-1">
                            If you see any devices you don't recognize, remove them immediately and change your password.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
