import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersion, hasSoftUpdate } from '../lib/configService';

const DISMISS_KEY = '@soft_update_dismissed_version';

export default function SoftUpdateBanner({ config, containerStyle }) {
    const [dismissed, setDismissed] = useState(false);
    const { updateMessage, playStoreUrl, storeUrl, current, latest } = config?.version || {};
    const latestVersion = current || latest || '';
    const currentVersion = getAppVersion();

    useEffect(() => {
        checkDismissed();
    }, [latestVersion]);

    const checkDismissed = async () => {
        try {
            const savedVersion = await AsyncStorage.getItem(DISMISS_KEY);
            if (savedVersion && savedVersion === latestVersion) {
                setDismissed(true);
            }
        } catch (e) {
            console.warn('Error reading dismissed update flag:', e);
        }
    };

    const handleDismiss = async () => {
        setDismissed(true);
        try {
            if (latestVersion) {
                await AsyncStorage.setItem(DISMISS_KEY, latestVersion);
            }
        } catch (e) {
            console.warn('Error saving dismissed update flag:', e);
        }
    };

    const handleUpdate = async () => {
        const packageName = 'com.maheshiesacademy.mobile';
        const marketUrl = `market://details?id=${packageName}`;
        const webUrl = storeUrl || playStoreUrl || `https://play.google.com/store/apps/details?id=${packageName}`;

        if (Platform.OS === 'android') {
            try {
                const canOpen = await Linking.canOpenURL(marketUrl);
                if (canOpen) {
                    await Linking.openURL(marketUrl);
                    return;
                }
            } catch (err) {
                console.log('Fallback to web play store URL');
            }
        }

        Linking.openURL(webUrl).catch(err => console.error('Error opening store URL:', err));
    };

    if (dismissed || !hasSoftUpdate(config)) {
        return null;
    }

    return (
        <View 
            className="mx-4 my-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex-row items-center shadow-sm"
            style={containerStyle}
        >
            {/* Icon */}
            <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mr-3 shadow-sm shadow-blue-300">
                <Ionicons name="sparkles" size={20} color="white" />
            </View>

            {/* Info */}
            <View className="flex-1 mr-2">
                <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Text className="text-slate-900 font-bold text-sm">
                        New Update Available
                    </Text>
                    <View className="bg-blue-100 px-1.5 py-0.5 rounded">
                        <Text className="text-blue-700 font-bold text-[10px]">
                            v{latestVersion}
                        </Text>
                    </View>
                </View>
                <Text className="text-slate-600 text-xs leading-4" numberOfLines={2}>
                    {updateMessage || 'A new version with performance improvements is available on Google Play.'}
                </Text>
            </View>

            {/* Actions */}
            <View className="flex-row items-center gap-2">
                <TouchableOpacity
                    onPress={handleUpdate}
                    className="bg-blue-600 px-3.5 py-2 rounded-xl flex-row items-center gap-1 shadow-sm shadow-blue-300"
                    activeOpacity={0.8}
                >
                    <Ionicons name="cloud-download-outline" size={15} color="white" />
                    <Text className="text-white font-bold text-xs">
                        Update
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDismiss}
                    className="p-1.5 rounded-full"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                >
                    <Ionicons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
