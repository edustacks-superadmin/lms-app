import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getUserPerformanceData } from '../../lib/analyticsService';
import PerformanceDonutChart from '../../components/PerformanceDonutChart';
import SubjectAccordion from '../../components/SubjectAccordion';

export default function PerformanceAnalytics() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [performanceData, setPerformanceData] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overall'); // 'overall' or 'subjects'

    useEffect(() => {
        loadPerformanceData();
    }, []);

    const loadPerformanceData = async () => {
        try {
            setError(null);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('User not authenticated');
                return;
            }

            // Get member ID from email
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('id')
                .eq('email', user.email)
                .single();

            if (memberError || !member) {
                setError('Member not found');
                return;
            }

            // Fetch performance data using member ID
            const data = await getUserPerformanceData(member.id);
            setPerformanceData(data);
        } catch (err) {
            console.error('Error loading performance data:', err);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPerformanceData();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
                <StatusBar style="dark" />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="text-slate-600 mt-4">Loading analytics...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
                <StatusBar style="dark" />
                <View className="bg-white border-b border-gray-200 px-4 py-3">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3">
                            <Ionicons name="arrow-back" size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-slate-900">Performance Analytics</Text>
                    </View>
                </View>
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle" size={64} color="#ef4444" />
                    <Text className="text-slate-700 text-center mt-4">{error}</Text>
                    <TouchableOpacity
                        onPress={loadPerformanceData}
                        className="mt-6 bg-blue-600 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const hasData = performanceData && performanceData.overall.totalTests > 0;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white border-b border-gray-200">
                <View className="px-4 py-3">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                            <TouchableOpacity onPress={() => router.back()} className="mr-3">
                                <Ionicons name="arrow-back" size={24} color="#1e293b" />
                            </TouchableOpacity>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-slate-900">Performance Analytics</Text>
                                {hasData && (
                                    <Text className="text-xs text-slate-500">
                                        {performanceData.overall.totalTests} test{performanceData.overall.totalTests !== 1 ? 's' : ''} analyzed
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tab Bar */}
                {hasData && (
                    <View style={{
                        flexDirection: 'row',
                        paddingHorizontal: 16,
                        paddingBottom: 0,
                        backgroundColor: 'white'
                    }}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('overall')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderBottomWidth: 3,
                                borderBottomColor: activeTab === 'overall' ? '#2563eb' : 'transparent',
                                marginRight: 8
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons
                                    name="stats-chart"
                                    size={18}
                                    color={activeTab === 'overall' ? '#2563eb' : '#94a3b8'}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={{
                                    fontSize: 15,
                                    fontWeight: '600',
                                    color: activeTab === 'overall' ? '#2563eb' : '#94a3b8'
                                }}>
                                    Overall
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('subjects')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderBottomWidth: 3,
                                borderBottomColor: activeTab === 'subjects' ? '#2563eb' : 'transparent',
                                marginLeft: 8
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons
                                    name="list"
                                    size={18}
                                    color={activeTab === 'subjects' ? '#2563eb' : '#94a3b8'}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={{
                                    fontSize: 15,
                                    fontWeight: '600',
                                    color: activeTab === 'subjects' ? '#2563eb' : '#94a3b8'
                                }}>
                                    Subject-Wise
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                }
            >
                {!hasData ? (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="stats-chart-outline" size={80} color="#cbd5e1" />
                        <Text className="text-slate-500 text-lg font-medium mt-4">No Exam Data</Text>
                        <Text className="text-slate-400 text-sm text-center mt-2 px-8">
                            Take some exams to see your performance analytics here
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Overall Performance Tab */}
                        {activeTab === 'overall' && (
                            <View>
                                <PerformanceDonutChart data={performanceData.overall} />

                                <View className="bg-blue-50 rounded-xl p-4 mt-4 border border-blue-100">
                                    <View className="flex-row items-start">
                                        <Ionicons name="information-circle" size={20} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                                        <View className="flex-1">
                                            <Text className="text-blue-900 font-semibold mb-1">Quick Tips</Text>
                                            <Text className="text-blue-800 text-xs leading-5">
                                                • Track your progress over time{'\n'}
                                                • Focus on improving weak areas{'\n'}
                                                • Review unanswered questions{'\n'}
                                                • Switch to Subject-Wise tab for detailed breakdown
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Subject-Wise Analysis Tab */}
                        {activeTab === 'subjects' && (
                            <View>
                                {performanceData.subjects && performanceData.subjects.length > 0 ? (
                                    <>
                                        <Text className="text-lg font-bold text-slate-800 mb-3">
                                            Subject Performance
                                        </Text>
                                        {performanceData.subjects.map((subject) => (
                                            <SubjectAccordion key={subject.id} subject={subject} />
                                        ))}

                                        <View className="bg-blue-50 rounded-xl p-4 mt-2 border border-blue-100">
                                            <View className="flex-row items-start">
                                                <Ionicons name="information-circle" size={20} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                                                <View className="flex-1">
                                                    <Text className="text-blue-900 font-semibold mb-1">How to Use This Data</Text>
                                                    <Text className="text-blue-800 text-xs leading-5">
                                                        • Subjects sorted by performance (weakest first){'\n'}
                                                        • Tap to expand and see topic breakdown{'\n'}
                                                        • Focus on "Needs Improvement" topics{'\n'}
                                                        • Review concepts for high skip rates
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <View className="items-center justify-center py-20">
                                        <Ionicons name="file-tray-outline" size={64} color="#cbd5e1" />
                                        <Text className="text-slate-500 text-base mt-4">No Subject Data</Text>
                                        <Text className="text-slate-400 text-sm text-center mt-2 px-8">
                                            Subject information will appear here once available
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
