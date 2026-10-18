import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Ranking() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchLeaders();
    }, []);

    const fetchLeaders = async () => {
        try {
            // Fetch Overall Leaderboard (Top 100)
            const { data, error } = await supabase.rpc('get_leaderboard', {
                p_time_filter: 'all_time',
                p_limit: 100
            });

            if (error) throw error;
            setLeaders(data || []);

        } catch (error) {
            console.error('Leaderboard error:', error);
            // Fallback to empty handling in UI
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaders();
    };

    const getRankIcon = (index) => {
        if (index === 0) return { name: 'trophy', color: '#F59E0B' }; // Gold
        if (index === 1) return { name: 'medal', color: '#94A3B8' }; // Silver
        if (index === 2) return { name: 'medal', color: '#B45309' }; // Bronze
        return null;
    };

    const renderLeaderItem = ({ item, index }) => {
        const isTop3 = index < 3;
        const icon = getRankIcon(index);

        return (
            <View className={`flex-row items-center p-4 mb-2 bg-white rounded-xl border ${isTop3 ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100'}`}>
                <View className="w-10 items-center justify-center mr-3">
                    {icon ? (
                        <Ionicons name={icon.name} size={28} color={icon.color} />
                    ) : (
                        <Text className="text-gray-500 font-bold text-lg">#{index + 1}</Text>
                    )}
                </View>

                <View className="flex-1 flex-row items-center">
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-200' : index === 2 ? 'bg-orange-100' : 'bg-blue-100'}`}>
                        <Text className={`font-bold ${index === 0 ? 'text-yellow-700' : index === 1 ? 'text-gray-700' : index === 2 ? 'text-orange-800' : 'text-blue-700'}`}>
                            {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <Text className="font-bold text-slate-800 text-[15px] flex-1 mb-0.5" numberOfLines={1}>
                        {item.name || 'Unknown User'}
                    </Text>
                </View>

                <View className="items-end pl-2">
                    <Text className="font-black text-lg text-blue-600 leading-none">{item.total_score}</Text>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Points</Text>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />

            <View className="bg-white px-5 pt-4 border-b border-gray-100">
                <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 bg-yellow-50 rounded-2xl items-center justify-center mr-3 border border-yellow-100">
                        <Ionicons name="trophy" size={24} color="#ca8a04" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-slate-900">Overall Ranking</Text>
                        <Text className="text-sm text-blue-600">Top 100 students all-time</Text>
                    </View>
                </View>

                {/* Table Header */}
                <View className="flex-row py-2 border-b-2 border-slate-100">
                    <Text className="w-14 text-center text-xs font-bold text-slate-500 uppercase">Rank</Text>
                    <Text className="flex-1 px-3 text-xs font-bold text-slate-500 uppercase">Student</Text>
                    <Text className="w-20 text-center text-xs font-bold text-slate-500 uppercase">Points</Text>
                </View>
            </View>
            {/* Leaderboard Section */}
            <View className="bg-white flex-1">
                <FlatList
                    data={leaders}
                    renderItem={({ item, index }) => (
                        <View className={`flex-row items-center py-3 border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <Text className={`w-14 text-center font-bold ${index < 3 ? 'text-yellow-600 text-lg' : 'text-slate-500'}`}>
                                #{index + 1}
                            </Text>
                            <View className="flex-1 px-3 flex-row items-center">
                                {item.photo_url ? (
                                    <Image
                                        source={{ uri: item.photo_url }}
                                        className="w-8 h-8 rounded-full bg-gray-200 mr-3"
                                    />
                                ) : (
                                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                                        <Text className="text-blue-700 font-bold text-xs">
                                            {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                                        </Text>
                                    </View>
                                )}
                                <Text className="text-slate-700 font-semibold text-sm flex-1" numberOfLines={1}>
                                    {item.name || 'Unknown User'}
                                </Text>
                            </View>
                            <Text className="w-20 text-center font-bold text-blue-600 text-sm">
                                {item.total_score}
                            </Text>
                        </View>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-8">
                            <Ionicons name="ribbon-outline" size={64} color="#cbd5e1" />
                            <Text className="text-slate-500 mt-4 font-medium text-center">No rankings available yet.</Text>
                            <Text className="text-slate-400 text-xs mt-1 text-center">Complete courses and exams to earn points!</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}
