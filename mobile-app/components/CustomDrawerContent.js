import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Share, Platform, Linking } from 'react-native';
import { DrawerContentScrollView, DrawerItem, useDrawerStatus } from '@react-navigation/drawer';
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
    const drawerStatus = useDrawerStatus();
    const [appConfig, setAppConfig] = useState(null);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const loadConfig = async () => {
            const config = await fetchAppConfig();
            setAppConfig(config);
        };
        loadConfig();
    }, []);

    // Real-time cart synchronization
    useEffect(() => {
        // Fetch current count on mount
        cartService.getCart().then(cart => setCartCount(cart.count || 0));

        // Subscribe to live cart changes (add/remove anywhere in app)
        const unsubscribe = cartService.subscribeCart(count => {
            setCartCount(count);
        });

        return unsubscribe;
    }, []);

    // Re-verify immediately when drawer is slid open
    useEffect(() => {
        if (drawerStatus === 'open') {
            cartService.getCart().then(cart => setCartCount(cart.count || 0));
        }
    }, [drawerStatus]);

    const handleRateUs = async () => {
        try {
            console.log('[Drawer] Rate Us clicked');
            const storeUrl = appConfig?.version?.storeUrl || 'https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile';
            console.log('[Drawer] Opening store URL:', storeUrl);
            await Linking.openURL(storeUrl);
        } catch (error) {
            console.error('[Drawer] Rate Us Error:', error);
        }
    };

    const handleShare = async () => {
        try {
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
            props.navigation.closeDrawer();
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
            }
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

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Custom Drawer Header / Profile Section */}
                <View style={styles.headerContainer}>
                    <Image
                        source={require('../assets/adaptive-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>
                        {appConfig?.appName || 'Mahesh IES Academy'}
                    </Text>
                </View>

                {/* Main Navigation Items */}
                <View style={styles.drawerItemsContainer}>
                    {/* My Profile */}
                    <DrawerItem
                        label="My Profile"
                        labelStyle={styles.menuItemLabel}
                        icon={({ color, size }) => (
                            <Ionicons name="person-outline" size={22} color="#475569" />
                        )}
                        onPress={() => {
                            props.navigation.closeDrawer();
                            router.push('/(drawer)/profile');
                        }}
                    />

                    {/* Cart */}
                    <DrawerItem
                        label={() => (
                            <View style={styles.menuItemRow}>
                                <Text style={styles.menuItemLabel}>Cart</Text>
                                {cartCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{cartCount}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        icon={({ color, size }) => (
                            <Ionicons name="cart-outline" size={22} color="#475569" />
                        )}
                        onPress={() => {
                            props.navigation.closeDrawer();
                            router.push('/(drawer)/cart');
                        }}
                    />

                    {/* Bookmarks */}
                    {isFeatureEnabled(appConfig, 'bookmarksEnabled') && (
                        <DrawerItem
                            label={appConfig?.labels?.bookmarks || 'Bookmarks'}
                            labelStyle={styles.menuItemLabel}
                            icon={({ color, size }) => (
                                <Ionicons name="bookmark-outline" size={22} color="#475569" />
                            )}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/(drawer)/bookmarks');
                            }}
                        />
                    )}

                    {/* Posts */}
                    {isFeatureEnabled(appConfig, 'postsEnabled') && (
                        <DrawerItem
                            label="Posts"
                            labelStyle={styles.menuItemLabel}
                            icon={({ color, size }) => (
                                <Ionicons name="newspaper-outline" size={22} color="#475569" />
                            )}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/(drawer)/posts');
                            }}
                        />
                    )}

                    {/* Analytics */}
                    {isFeatureEnabled(appConfig, 'studentAnalyticsEnabled') && (
                        <DrawerItem
                            label="Analytics"
                            labelStyle={styles.menuItemLabel}
                            icon={({ color, size }) => (
                                <Ionicons name="pie-chart-outline" size={22} color="#475569" />
                            )}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/(drawer)/analytics');
                            }}
                        />
                    )}

                    {/* Your Report */}
                    {isFeatureEnabled(appConfig, 'studentAnalyticsEnabled') && (
                        <DrawerItem
                            label="Your Report"
                            labelStyle={styles.menuItemLabel}
                            icon={({ color, size }) => (
                                <Ionicons name="bar-chart-outline" size={22} color="#475569" />
                            )}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/(drawer)/analytics');
                            }}
                        />
                    )}

                    {/* AI Chat */}
                    {isFeatureEnabled(appConfig, 'aiChatEnabled') && (
                        <DrawerItem
                            label="AI Chat"
                            labelStyle={styles.menuItemLabel}
                            icon={({ color, size }) => (
                                <Ionicons name="chatbubbles-outline" size={22} color="#475569" />
                            )}
                            onPress={() => {
                                props.navigation.closeDrawer();
                                router.push('/(drawer)/chat');
                            }}
                        />
                    )}

                    {/* Login Activity */}
                    <DrawerItem
                        label="Login Activity"
                        labelStyle={styles.menuItemLabel}
                        icon={({ color, size }) => (
                            <Ionicons name="lock-closed-outline" size={22} color="#475569" />
                        )}
                        onPress={() => {
                            props.navigation.closeDrawer();
                            router.push('/(drawer)/login-activity');
                        }}
                    />

                    {/* Logout */}
                    <DrawerItem
                        label="Logout"
                        labelStyle={styles.menuItemLabel}
                        icon={({ color, size }) => (
                            <Ionicons name="log-out-outline" size={22} color="#475569" />
                        )}
                        onPress={handleLogout}
                    />

                    {/* Privacy Policy */}
                    <DrawerItem
                        label="Privacy Policy"
                        labelStyle={styles.menuItemLabel}
                        icon={({ color, size }) => (
                            <Ionicons name="shield-checkmark-outline" size={22} color="#475569" />
                        )}
                        onPress={() => {
                            props.navigation.closeDrawer();
                            router.push('/(drawer)/privacy-policy');
                        }}
                    />

                    {/* Rate Us */}
                    <DrawerItem
                        label="Rate Us"
                        labelStyle={styles.menuItemLabel}
                        icon={({ color, size }) => (
                            <Ionicons name="create-outline" size={22} color="#475569" />
                        )}
                        onPress={handleRateUs}
                    />

                    {/* Share */}
                    <DrawerItem
                        label="Share"
                        labelStyle={styles.menuItemLabel}
                        icon={({ color, size }) => (
                            <Ionicons name="share-social-outline" size={22} color="#475569" />
                        )}
                        onPress={handleShare}
                    />

                    {/* Version info */}
                    <View style={styles.versionContainer}>
                        <Ionicons name="information-circle-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
                        <Text style={styles.versionText}>
                            Version - {appConfig?.version?.current || '1.0.2'}
                        </Text>
                    </View>
                </View>
            </DrawerContentScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        alignItems: 'center',
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginBottom: 10,
    },
    appName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
    },
    drawerItemsContainer: {
        paddingTop: 8,
    },
    menuItemLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e293b',
        marginLeft: -10,
    },
    menuItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        paddingRight: 12,
    },
    badge: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    versionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    versionText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
});
