import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getUserSessions, logoutAllDevices, deleteSession } from '../../lib/sessionService';
import { format } from 'date-fns';

export default function LoginActivity() {
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await getUserSessions();
            setSessions(data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            Alert.alert('Error', 'Failed to load login activity');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSessions();
    };

    const handleLogoutAll = () => {
        Alert.alert(
            'Logout All Devices',
            'Are you sure you want to logout from all devices? You will need to login again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout All',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await logoutAllDevices();
                        if (success) {
                            router.replace('/');
                        } else {
                            Alert.alert('Error', 'Failed to logout from all devices');
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteSession = (sessionId, isCurrentDevice) => {
        if (isCurrentDevice) {
            Alert.alert('Cannot Remove', 'You cannot remove the current session');
            return;
        }

        Alert.alert(
            'Remove Device',
            'Are you sure you want to remove this device?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteSession(sessionId);
                        if (success) {
                            fetchSessions();
                        } else {
                            Alert.alert('Error', 'Failed to remove device');
                        }
                    }
                }
            ]
        );
    };

    const getDeviceIcon = (osName) => {
        if (!osName) return 'phone-portrait-outline';
        const os = osName.toLowerCase();
        if (os.includes('android')) return 'logo-android';
        if (os.includes('ios')) return 'logo-apple';
        return 'phone-portrait-outline';
    };

    const formatTime = (timestamp) => {
        try {
            return format(new Date(timestamp), 'MMM dd, yyyy • hh:mm a');
        } catch {
            return 'Unknown';
        }
    };

    const renderSession = (session) => {
        const isCurrent = session.is_current;
        const location = session.location || {};
        const locationText = location.city && location.country
            ? `${location.city}, ${location.country}`
            : location.country || 'Unknown Location';

        return (
            <View
                key={session.id}
                className={`mb-4 rounded-2xl p-4 ${isCurrent ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white border border-gray-200'}`}
            >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${isCurrent ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Ionicons
                                name={getDeviceIcon(session.os_name)}
                                size={24}
                                color={isCurrent ? '#2563eb' : '#64748b'}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`font-bold text-base ${isCurrent ? 'text-blue-900' : 'text-slate-900'}`}>
                                {session.device_name || 'Unknown Device'}
                            </Text>
                            {isCurrent && (
                                <View className="bg-blue-600 px-2 py-0.5 rounded-full self-start mt-1">
                                    <Text className="text-white text-xs font-bold">This Device</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    {!isCurrent && (
                        <TouchableOpacity
                            onPress={() => handleDeleteSession(session.id, false)}
                            className="w-8 h-8 items-center justify-center"
                        >
                            <Ionicons name="trash-outline" size={20} color="#dc2626" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Details */}
                <View className="space-y-2">
                    <View className="flex-row items-center">
                        <Ionicons name="desktop-outline" size={16} color="#64748b" style={{ marginRight: 8, width: 20 }} />
                        <Text className="text-slate-600 text-sm">
                            {session.os_name} {session.os_version}
                        </Text>
                    </View>

                    <View className="flex-row items-center">
                        <Ionicons name="globe-outline" size={16} color="#64748b" style={{ marginRight: 8, width: 20 }} />
                        <Text className="text-slate-600 text-sm">{session.ip_address || 'Unknown IP'}</Text>
                    </View>

                    <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={16} color="#64748b" style={{ marginRight: 8, width: 20 }} />
                        <Text className="text-slate-600 text-sm">{locationText}</Text>
                    </View>

                    <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={16} color="#64748b" style={{ marginRight: 8, width: 20 }} />
                        <Text className="text-slate-600 text-sm">
                            {formatTime(session.login_time)}
                        </Text>
                    </View>

                    <View className="flex-row items-center">
                        <Ionicons name="pulse-outline" size={16} color="#64748b" style={{ marginRight: 8, width: 20 }} />
                        <Text className="text-slate-600 text-sm">
                            Last active: {formatTime(session.last_active)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <StatusBar style="dark" />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-3">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-slate-900">Login Activity</Text>
                        <Text className="text-xs text-slate-500">
                            {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                }
            >
                {sessions.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <Ionicons name="lock-closed-outline" size={64} color="#cbd5e1" />
                        <Text className="text-slate-400 text-base mt-4">No active sessions</Text>
                    </View>
                ) : (
                    sessions.map(renderSession)
                )}
            </ScrollView>

            {/* Bottom Actions */}
            {sessions.length > 0 && (
                <View className="bg-white border-t border-gray-200 px-4 py-3">
                    <View className="flex-row space-x-3">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                        >
                            <Text className="text-slate-700 font-bold text-base">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleLogoutAll}
                            className="flex-1 bg-red-600 py-3 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-base">Logout All Devices</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
