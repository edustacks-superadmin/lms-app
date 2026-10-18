import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Share, Platform, Linking } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { cartService } from '../lib/cartService';
import { useIsFocused } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { fetchAppConfig, isFeatureEnabled } from '../lib/configService';

export default function CustomDrawerContent(props) {
    const router = useRouter();
    const isFocused = useIsFocused();
    const [appConfig, setAppConfig] = useState(null);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const loadConfig = async () => {
            const config = await fetchAppConfig();
            setAppConfig(config);
        };
        loadConfig();
    }, []);

    useEffect(() => {
        const loadCartCount = async () => {
            const cart = await cartService.getCart();
            setCartCount(cart.count || 0);
        };
        if (isFocused) {
            loadCartCount();
        }
    }, [isFocused]);

    const handleRateUs = async () => {
        try {
            console.log('[Drawer] Rate Us clicked');

            // Get store URL from config or use default
            const storeUrl = appConfig?.version?.storeUrl || 'https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile';
            console.log('[Drawer] Opening store URL:', storeUrl);

            // Directly open Play Store (StoreReview doesn't work reliably in dev builds)
            await Linking.openURL(storeUrl);
        } catch (error) {
            console.error('[Drawer] Rate Us Error:', error);
        }
    };

    const handleShare = async () => {
        try {
            // Use Play Store URL from config, fallback to website
            const storeUrl = appConfig?.version?.storeUrl || 'https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile';
            const appName = appConfig?.appName || 'Mahesh IES Academy';
            const message = `Check out ${appName} App for competitive exam preparation!\n\nDownload here: ${storeUrl}`;

            await Share.share({
                message: message,
                url: storeUrl,
                title: appName
            });
        } catch (error) {
            console.error('Share Error:', error);
        }
    };

    const handleLogout = async () => {
        try {
            console.log('Logging out...');

            // Close drawer first
            props.navigation.closeDrawer();

            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Logout error:', error);
                // Continue to clear navigation even if server request fails
            }

            console.log('Sign out successful, navigating to login...');

            // Reset navigation stack to login screen
            setTimeout(() => {
                props.navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'index' }],
                    })
                );
            }, 100);
        } catch (err) {
            console.error('Unexpected logout error:', err);
        }
    };

    const DrawerList = [
        { label: 'Cart', icon: 'cart', route: '/(drawer)/cart', badge: cartCount },
        ...(isFeatureEnabled(appConfig, 'bookmarks') ? [{ label: 'Bookmarks', icon: 'bookmark', route: '/(drawer)/bookmarks' }] : []),
        ...(isFeatureEnabled(appConfig, 'posts') ? [{ label: 'Posts', icon: 'newspaper', route: '/(drawer)/posts' }] : []),
        { label: 'Analytics', icon: 'pie-chart', route: '/(drawer)/analytics' },
        { label: 'Your Report', icon: 'bar-chart', route: '' },
    ];

    const ProfileList = [
        ...(isFeatureEnabled(appConfig, 'aiChat') ? [{ label: 'AI Chat', icon: 'chatbubble-ellipses', route: '/(drawer)/chat' }] : []),
        { label: 'Login Activity', icon: 'lock-closed-outline', route: '/(drawer)/login-activity' },
        { label: 'Logout', icon: 'log-out-outline', action: handleLogout },
    ];

    const OtherList = [
        { label: 'Privacy Policy', icon: 'shield-checkmark-outline', route: '/(drawer)/privacy-policy' },
        { label: 'Rate Us', icon: 'create-outline', action: handleRateUs },
        { label: 'Share', icon: 'share-social-outline', action: handleShare },
    ];

    const DrawerRow = ({ item }) => (
        <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 }}
            className="flex-row items-center py-4 px-6"
            onPress={() => {
                if (item.action) {
                    item.action();
                } else if (item.route) {
                    router.push(item.route);
                }
            }}
        >
            <View className="w-8 items-center">
                <Ionicons name={item.icon} size={22} color="#555" />
            </View>
            <Text style={{ marginLeft: 16 }} className="ml-4 text-slate-700 font-medium text-[15px] flex-1">{item.label}</Text>
            {item.badge > 0 && (
                <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2">
                    <Text className="text-white text-[10px] font-bold">{item.badge}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1 }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
                {/* Section 1 */}
                <View className="mb-2">
                    {DrawerList.map((item, index) => (
                        <DrawerRow key={index} item={item} />
                    ))}
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-gray-200 mx-0 my-1" />

                {/* Section 2 */}
                <View className="my-2">
                    {ProfileList.map((item, index) => (
                        <DrawerRow key={index} item={item} />
                    ))}
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-gray-200 mx-0 my-1" />

                {/* Section 3 */}
                <View className="mt-2">
                    {OtherList.map((item, index) => (
                        <DrawerRow key={index} item={item} />
                    ))}

                    {/* Version */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 }} className="flex-row items-center py-4 px-6">
                        <View className="w-8 items-center">
                            <Ionicons name="information-circle-outline" size={24} color="#555" />
                        </View>
                        <Text style={{ marginLeft: 16 }} className="ml-4 text-slate-500 font-medium text-[15px]">
                            Version - {Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0'}
                        </Text>
                    </View>
                </View>
            </DrawerContentScrollView>
        </View>
    );
}
