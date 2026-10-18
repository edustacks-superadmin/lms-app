import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Image, ToastAndroid, Platform, Alert } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { ORG_CONFIG, getApiUrl } from '../../../config/organization';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductCardSkeleton } from '../../../components/SkeletonLoader';
import { cartService } from '../../../lib/cartService';

export default function Store() {
    const router = useRouter();
    const navigation = useNavigation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        fetchStoreData();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [products, searchQuery, selectedCategory]);

    const fetchStoreData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Categories
            let categoriesData = [];
            const { data: filteredCats, error: catError } = await supabase
                .from('product_categories')
                .select('id, name, institute_id')
                .eq('institute_id', ORG_CONFIG.id)
                .order('name');

            if (!catError) {
                categoriesData = filteredCats || [];
            }

            if (categoriesData.length === 0) {
                const { data: allCats, error: allError } = await supabase
                    .from('product_categories')
                    .select('id, name, institute_id')
                    .order('name');

                if (!allError && allCats) {
                    categoriesData = allCats.filter(cat => cat.institute_id === ORG_CONFIG.id);
                }
            }

            setCategories(categoriesData);

            // 2. Fetch Products
            const { data: productsData, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .eq('institute_id', ORG_CONFIG.id)
                .order('created_at', { ascending: false });

            if (prodError) console.error('Error fetching products:', prodError);
            else setProducts(productsData || []);

        } catch (error) {
            console.error('Store data fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStoreData();
    };

    const filterProducts = () => {
        let result = products;
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category_id === selectedCategory);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.title && p.title.toLowerCase().includes(query)) ||
                (p.short_description && p.short_description.toLowerCase().includes(query))
            );
        }
        setFilteredProducts(result);
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `${ORG_CONFIG.supabase.url}/storage/v1/object/public/${cleanPath}`;
    };

    const handleAddToCart = async (product) => {
        const res = await cartService.addToCart(product);
        if (res.success) {
            if (Platform.OS === 'android') {
                ToastAndroid.show(res.message, ToastAndroid.SHORT);
            } else {
                Alert.alert('Success', res.message);
            }
        } else {
            Alert.alert('Error', res.message);
        }
    };

    const renderProduct = ({ item }) => {
        const discount = item.strikethrough_price && item.price < item.strikethrough_price
            ? Math.round(((item.strikethrough_price - item.price) / item.strikethrough_price) * 100)
            : 0;

        const imageUrl = getImageUrl(item.image);

        return (
            <TouchableOpacity
                className="bg-white shadow-sm border-b border-gray-200 overflow-hidden flex-row h-28"
                activeOpacity={0.7}
                onPress={() => {
                    if (item.id) {
                        router.push({
                            pathname: '/product/[id]',
                            params: { id: item.id }
                        });
                    }
                }}
            >
                <View className="w-40 bg-white relative h-full p-2">
                    {discount > 0 && (
                        <View className="absolute top-1 right-1 z-10 bg-green-500 px-2 py-1 rounded-md shadow-md">
                            <Text className="text-white font-black text-[10px]">{discount}% OFF</Text>
                        </View>
                    )}
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            className="w-full h-full"
                            resizeMode="contain"
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Ionicons name="cart-outline" size={32} color="#9ca3af" />
                        </View>
                    )}
                </View>

                <View className="flex-1 p-3 justify-center">
                    <Text className="text-[15px] font-bold text-slate-900 mb-2 leading-snug" numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View className="flex-row items-center justify-between mt-1">
                        <View className="flex-row items-center flex-wrap">
                            <Text className="text-base font-bold text-slate-900 mr-2">
                                {item.price > 0 ? `₹${item.price}` : 'Free'}
                            </Text>
                            {item.strikethrough_price && item.price < item.strikethrough_price && (
                                <Text className="text-xs text-slate-400 line-through">
                                    ₹{item.strikethrough_price}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => handleAddToCart(item)}
                            className="p-2 bg-blue-50 rounded-xl"
                        >
                            <Ionicons name="cart-outline" size={20} color="#2563EB" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />
            <View className="bg-white px-5 pt-4 border-b border-gray-100">
                <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-3">
                        <Ionicons name="cart" size={24} color="#2563EB" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-slate-900">Store</Text>
                        <Text className="text-sm text-blue-600">Upgrade your skills today</Text>
                    </View>
                </View>

                <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-3 border border-gray-200">
                    <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search courses..."
                        className="flex-1 text-slate-800 text-[15px]"
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-3">
                    <TouchableOpacity
                        onPress={() => setSelectedCategory('all')}
                        className={`px-4 py-1.5 rounded-full mr-2 border ${selectedCategory === 'all' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                    >
                        <Text className={`text-xs font-semibold ${selectedCategory === 'all' ? 'text-white' : 'text-slate-600'}`}>All</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-1.5 rounded-full mr-2 border ${selectedCategory === cat.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-semibold ${selectedCategory === cat.id ? 'text-white' : 'text-slate-600'}`}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && !refreshing ? (
                <View className="px-4 pt-4">
                    {[1, 2, 3, 4, 5].map(i => <ProductCardSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProduct}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                            <Text className="text-slate-500 mt-4 font-medium">No products found</Text>
                            <Text className="text-slate-400 text-xs mt-1">Try adjusting your filters</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
