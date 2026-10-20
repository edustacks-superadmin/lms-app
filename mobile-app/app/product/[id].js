import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [courseContent, setCourseContent] = useState([]);
    const [expandedChapters, setExpandedChapters] = useState({});
    const { width } = useWindowDimensions();

    // Auto-refresh product details & pricing when returning to screen
    useFocusEffect(
        useCallback(() => {
            if (id) fetchProductDetails();
        }, [id])
    );

    useEffect(() => {
        if (id) fetchProductDetails();
    }, [id]);

    const fetchProductDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setProduct(data);
            setLoading(false);

            // Fetch course content in background
            fetchCourseContent(id);
        } catch (error) {
            console.error('Error fetching product:', error);
            Alert.alert('Error', 'Product not found');
            router.back();
            setLoading(false);
        }
    };

    const fetchCourseContent = async (productId) => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select(`
                    id, title,
                    chapters (
                        id, name, order,
                        chapter_contents (
                            id, title, type, free_preview, order
                        )
                    )
                `)
                .contains('allowed_products', [productId]);

            if (error) {
                console.error('Error fetching course content:', error);
                return;
            }

            if (data && data.length > 0) {
                const sortedCourses = data.map(course => ({
                    ...course,
                    chapters: course.chapters
                        ?.sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(chapter => ({
                            ...chapter,
                            chapter_contents: chapter.chapter_contents?.sort((a, b) => (a.order || 0) - (b.order || 0))
                        }))
                }));
                setCourseContent(sortedCourses);

                if (sortedCourses[0]?.chapters?.[0]) {
                    setExpandedChapters({ [sortedCourses[0].chapters[0].id]: true });
                }
            }
        } catch (err) {
            console.error('Error fetching course content:', err);
        }
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const handlePreview = (content) => {
        if (!content.free_preview) {
            Alert.alert('Locked Content', 'This content is only available after purchase.');
            return;
        }

        // Navigate to content player
        router.push({
            pathname: '/course/content/[id]',
            params: { id: content.id }
        });
    };

    const handleBuy = async () => {
        if (!product) return;
        setBuying(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'Please login to continue');
                setBuying(false);
                return;
            }

            router.push({
                pathname: '/checkout',
                params: { productId: product.id }
            });

        } catch (error) {
            console.error('Error:', error);
            Alert.alert('Error', error.message || 'An error occurred');
        } finally {
            setBuying(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!product) return null;

    const discount = product.strikethrough_price && product.price < product.strikethrough_price
        ? Math.round(((product.strikethrough_price - product.price) / product.strikethrough_price) * 100)
        : 0;

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        // Import ORG_CONFIG if not already imported, but it seems to be missing in imports.
        // Actually ORG_CONFIG isn't imported in [id].js based on the view_file output.
        // I need to start my replacement earlier to add the import if it's missing, 
        // OR just hardcode the supabase URL logic if I can't easily add the import without a larger diff.
        // Looking at explore.js, it imported ORG_CONFIG. 
        // Let's check imports in [id].js again.
        // Imports are lines 1-8. ORG_CONFIG is NOT imported.
        // I should stick to the current plan but maybe simpler logic or assume I'll add the import in a separate block? 
        // No, I should do it properly. 
        // Wait, replace_file_content targets specific lines. 
        // I'll assume supabase client is available, maybe I can just use supabase.storage... 
        // But explore.js used ORG_CONFIG.supabase.url. 
        // Effectively `supabase` client usually has the URL too. 
        // `supabase.storageUrl` isn't always standard.
        // Let's Import ORG_CONFIG first.
        return `https://xalbtjoykovnlbjeddtv.supabase.co/storage/v1/object/public/${cleanPath}`;
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar style="dark" />

            <View className="flex-1 relative">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-4 left-4 z-20 w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                >
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="w-full bg-white">
                        {getImageUrl(product.image) ? (
                            <Image
                                source={{ uri: getImageUrl(product.image) }}
                                className="w-full"
                                style={{ height: 280, width: '100%' }}
                                resizeMode="contain"
                            />
                        ) : (
                            <View className="w-full h-64 bg-gray-100 items-center justify-center">
                                <Ionicons name="image-outline" size={64} color="#cbd5e1" />
                            </View>
                        )}
                        {discount > 0 && (
                            <View className="absolute bottom-4 left-4 bg-green-500 px-3 py-1 rounded-full shadow-sm">
                                <Text className="text-white font-bold text-xs">{discount}% OFF</Text>
                            </View>
                        )}
                    </View>

                    <View className="px-5 pt-6">
                        <Text className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
                            {product.title}
                        </Text>

                        <View className="flex-row items-baseline mb-6">
                            <Text className="text-3xl font-black text-blue-600 mr-3">
                                {product.price > 0 ? `₹${product.price}` : 'Free'}
                            </Text>
                            {product.strikethrough_price && (
                                <Text className="text-base text-slate-400 line-through">
                                    ₹{product.strikethrough_price}
                                </Text>
                            )}
                        </View>

                        <View className="mb-8">
                            <Text className="text-lg font-bold text-slate-800 mb-2">About this Course</Text>
                            {product.description || product.short_description ? (
                                <RenderHtml
                                    contentWidth={width - 40}
                                    source={{ html: product.description || product.short_description }}
                                    tagsStyles={{
                                        body: { color: '#475569', fontSize: 16, lineHeight: 24 },
                                        p: { marginBottom: 10 },
                                        ul: { marginBottom: 10, paddingLeft: 20 },
                                        ol: { marginBottom: 10, paddingLeft: 20 },
                                        li: { marginBottom: 5 },
                                        h1: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
                                        h2: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#334155' },
                                        strong: { fontWeight: 'bold', color: '#0f172a' }
                                    }}
                                />
                            ) : (
                                <Text className="text-slate-500 italic">No description available.</Text>
                            )}
                        </View>

                        {courseContent.length > 0 && (
                            <View className="mb-8">
                                <Text className="text-lg font-bold text-slate-800 mb-3">Course Content</Text>

                                {courseContent.map(course => (
                                    <View key={course.id} className="mb-4">
                                        {courseContent.length > 1 && (
                                            <Text className="text-base font-bold text-slate-700 mb-2">{course.title}</Text>
                                        )}

                                        {course.chapters?.map(chapter => (
                                            <View key={chapter.id} className="mb-3 border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                <TouchableOpacity
                                                    onPress={() => toggleChapter(chapter.id)}
                                                    className="flex-row items-center justify-between p-4 bg-gray-50"
                                                    activeOpacity={0.7}
                                                >
                                                    <View className="flex-row items-center flex-1">
                                                        <View className="w-9 h-9 bg-white rounded-lg items-center justify-center mr-3 shadow-sm">
                                                            <Ionicons name="document-text" size={18} color="#64748b" />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="font-bold text-slate-700 text-sm mb-0.5" numberOfLines={1}>
                                                                {chapter.name}
                                                            </Text>
                                                            <Text className="text-xs text-slate-500 font-medium">
                                                                {chapter.chapter_contents?.length || 0} Lessons
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Ionicons
                                                        name={expandedChapters[chapter.id] ? "chevron-up" : "chevron-down"}
                                                        size={20}
                                                        color="#94a3b8"
                                                    />
                                                </TouchableOpacity>

                                                {expandedChapters[chapter.id] && (
                                                    <View className="border-t border-gray-100">
                                                        {chapter.chapter_contents?.length > 0 ? (
                                                            chapter.chapter_contents.map((content, index) => (
                                                                <TouchableOpacity
                                                                    key={content.id}
                                                                    className={`flex-row items-center justify-between px-4 py-3 ${index < chapter.chapter_contents.length - 1 ? 'border-b border-gray-50' : ''
                                                                        }`}
                                                                    onPress={() => handlePreview(content)}
                                                                    activeOpacity={content.free_preview ? 0.7 : 1}
                                                                    disabled={!content.free_preview}
                                                                >
                                                                    <View className="flex-row items-center flex-1 mr-3">
                                                                        <View className={`w-7 h-7 rounded-full items-center justify-center mr-2.5 ${content.type === 'video' ? 'bg-blue-100' : 'bg-orange-100'
                                                                            }`}>
                                                                            <Ionicons
                                                                                name={content.type === 'video' ? 'play' : 'document-text'}
                                                                                size={14}
                                                                                color={content.type === 'video' ? '#2563eb' : '#ea580c'}
                                                                            />
                                                                        </View>
                                                                        <Text className="text-sm text-slate-700 font-medium flex-1" numberOfLines={2}>
                                                                            {content.title}
                                                                        </Text>
                                                                    </View>

                                                                    {content.free_preview ? (
                                                                        <View className="bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                                            <Text className="text-emerald-600 font-bold text-xs">Free</Text>
                                                                        </View>
                                                                    ) : (
                                                                        <View className="bg-amber-50 px-3 py-1.5 rounded-lg flex-row items-center">
                                                                            <Ionicons name="diamond" size={11} color="#d97706" />
                                                                            <Text className="text-amber-600 font-bold text-xs ml-1.5">Premium</Text>
                                                                        </View>
                                                                    )}
                                                                </TouchableOpacity>
                                                            ))
                                                        ) : (
                                                            <View className="p-4">
                                                                <Text className="text-center text-slate-400 text-sm italic">
                                                                    No content in this chapter yet.
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-6 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <TouchableOpacity
                        onPress={handleBuy}
                        disabled={buying}
                        className={`w-full py-4 rounded-xl flex-row items-center justify-center ${buying ? 'bg-blue-400' : 'bg-blue-600'} shadow-lg shadow-blue-200`}
                    >
                        {buying ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white font-bold text-lg mr-2">
                                    {product.price > 0 ? 'Buy Now' : 'Enroll for Free'}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
