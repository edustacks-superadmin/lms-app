import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cartService } from '../../lib/cartService';
import { ORG_CONFIG } from '../../config/organization';

export default function CartScreen() {
    const router = useRouter();
    const [cart, setCart] = useState({ items: [], count: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            setLoading(true);
            const data = await cartService.getCart();
            setCart(data);
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

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

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `${ORG_CONFIG.supabase.url}/storage/v1/object/public/${cleanPath}`;
    };

    const renderItem = ({ item }) => {
        const imageUrl = getImageUrl(item.image);
        return (
            <View className="bg-white p-4 mx-4 mb-3 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
                <View className="w-20 h-16 bg-gray-50 rounded-lg overflow-hidden items-center justify-center mr-4">
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                        <Ionicons name="image-outline" size={24} color="#cbd5e1" />
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-[15px] font-bold text-slate-900 leading-snug" numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text className="text-blue-600 font-bold mt-1">₹{item.price}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleRemove(item.product_id || item.id)}
                    className="p-2 ml-2"
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
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
                                    <Text className="text-slate-500">Subtotal</Text>
                                    <Text className="text-slate-900 font-bold">₹{cart.total}</Text>
                                </View>
                                <View className="flex-row justify-between mb-6 pt-4 border-t border-gray-50">
                                    <Text className="text-lg font-bold text-slate-900">Total Amount</Text>
                                    <Text className="text-2xl font-black text-blue-600">₹{cart.total}</Text>
                                </View>
                                <TouchableOpacity
                                    className="bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-200"
                                    onPress={() => Alert.alert('Checkout', 'Checkout functionality will be integrated soon.')}
                                >
                                    <Text className="text-white font-black text-lg">Proceed to Checkout</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}
                />
            )}
        </SafeAreaView>
    );
}
