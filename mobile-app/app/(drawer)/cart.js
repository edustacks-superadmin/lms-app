import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cartService } from '../../lib/cartService';
import { ORG_CONFIG } from '../../config/organization';
import { initiateCartPayment } from '../../lib/payment';
import { supabase } from '../../lib/supabase';

export default function CartScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    const navigateToMyCourses = () => {
        try {
            navigation.navigate('(drawer)', {
                screen: 'home',
                params: { screen: 'My Courses' }
            });
        } catch (e1) {
            try {
                navigation.navigate('home', { screen: 'My Courses' });
            } catch (e2) {
                router.replace('/home');
            }
        }
    };
    const [cart, setCart] = useState({ items: [], count: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);

    const loadCart = useCallback(async () => {
        try {
            const data = await cartService.getCart();
            setCart(data);
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Load every time the Cart screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadCart();
        }, [loadCart])
    );

    // Subscribe to real-time cart changes (add/remove anywhere in app)
    useEffect(() => {
        const unsubscribe = cartService.subscribeCart((count, cartData) => {
            if (cartData && cartData.items) {
                setCart(cartData);
            } else {
                loadCart();
            }
        });
        return unsubscribe;
    }, [loadCart]);

    const onRefresh = () => {
        setRefreshing(true);
        loadCart();
    };

    const handleRemove = async (productId) => {
        const res = await cartService.removeFromCart(productId);
        if (res.success) {
            loadCart();
        } else {
            Alert.alert('Error', res.message || 'Failed to remove item');
        }
    };

    const handleProceedToCheckout = async () => {
        if (!cart.items || cart.items.length === 0) {
            Alert.alert('Cart Empty', 'Your cart has no items to purchase.');
            return;
        }

        try {
            setProcessing(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Login Required', 'Please login to complete your purchase.');
                return;
            }

            const result = await initiateCartPayment(cart, user);
            if (result.success) {
                // Clear cart locally and notify
                await cartService.clearCart();

                Alert.alert(
                    'Payment Successful! 🎉',
                    `You have successfully purchased ${result.count || cart.items.length} ${
                        (result.count || cart.items.length) === 1 ? 'course' : 'courses'
                    }. All materials are now unlocked.`,
                    [
                        {
                            text: 'Go to My Courses',
                            onPress: () => navigateToMyCourses()
                        }
                    ]
                );
            }
        } catch (err) {
            console.error('Cart checkout error:', err);
            Alert.alert('Checkout Error', err.message || 'Failed to complete checkout');
        } finally {
            setProcessing(false);
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `${ORG_CONFIG.supabase.url}/storage/v1/object/public/${cleanPath}`;
    };

    const renderItem = ({ item }) => {
        const imageUrl = getImageUrl(item.image);
        const targetProductId = item.product_id || item.id;

        return (
            <View className="bg-white p-4 mx-4 mb-3 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/product/${targetProductId}`)}
                    className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden items-center justify-center mr-3 border border-gray-100"
                >
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                        <Ionicons name="image-outline" size={24} color="#cbd5e1" />
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/product/${targetProductId}`)}
                    className="flex-1 mr-2"
                >
                    <Text className="text-[14px] font-bold text-slate-900 leading-snug" numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text className="text-blue-600 font-bold mt-1 text-base">₹{item.price}</Text>
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.push({
                            pathname: '/checkout',
                            params: { productId: targetProductId }
                        })}
                        className="bg-blue-50 px-2.5 py-1.5 rounded-xl mr-2 border border-blue-200"
                        activeOpacity={0.8}
                    >
                        <Text className="text-blue-600 font-bold text-xs">Buy Alone</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleRemove(targetProductId)}
                        className="p-1.5 rounded-lg bg-red-50"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <View className="bg-white px-5 py-4 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-bold text-slate-900">My Cart</Text>
                    <Text className="text-sm text-slate-500">{cart.count} {cart.count === 1 ? 'Course' : 'Courses'}</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={cart.items}
                    renderItem={renderItem}
                    keyExtractor={(item) => (item.product_id || item.id).toString()}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-10">
                            <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-6">
                                <Ionicons name="cart-outline" size={40} color="#2563EB" />
                            </View>
                            <Text className="text-xl font-bold text-slate-900 text-center">Your cart is empty</Text>
                            <Text className="text-slate-500 text-center mt-2 leading-snug">
                                Looks like you haven't added any courses to your cart yet.
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/home/explore')}
                                className="mt-8 bg-blue-600 px-8 py-3 rounded-full"
                            >
                                <Text className="text-white font-bold">Explore Courses</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    ListFooterComponent={cart.count > 0 ? (
                        <View className="px-5 pt-4 pb-20">
                            <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-slate-500 font-medium">Items in Cart</Text>
                                    <Text className="text-slate-800 font-bold">{cart.count} items</Text>
                                </View>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-slate-500 font-medium">Subtotal</Text>
                                    <Text className="text-slate-900 font-bold">₹{cart.total}</Text>
                                </View>
                                <View className="flex-row justify-between mb-6 pt-4 border-t border-gray-100">
                                    <View>
                                        <Text className="text-lg font-bold text-slate-900">Total Amount</Text>
                                        <Text className="text-xs text-slate-400">All courses in single transaction</Text>
                                    </View>
                                    <Text className="text-2xl font-black text-blue-600">₹{cart.total}</Text>
                                </View>
                                <TouchableOpacity
                                    className={`py-4 rounded-2xl items-center shadow-lg shadow-blue-200 flex-row justify-center ${
                                        processing ? 'bg-blue-400' : 'bg-blue-600'
                                    }`}
                                    onPress={handleProceedToCheckout}
                                    disabled={processing}
                                    activeOpacity={0.85}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="#ffffff" className="mr-2" />
                                    ) : (
                                        <Ionicons name="card-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                                    )}
                                    <Text className="text-white font-black text-lg">
                                        {processing ? 'Processing...' : `Pay Total ₹${cart.total}`}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}
                />
            )}
        </SafeAreaView>
    );
}
