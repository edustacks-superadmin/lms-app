import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ORG_CONFIG } from '../../config/organization';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const defaultPostImage = require('../../assets/images/default-post.jpg');
const FILTER_TABS = [
    { key: 'latest', label: 'Latest', icon: 'time-outline' },
    { key: 'popular', label: 'Popular', icon: 'flame-outline' },
    { key: 'featured', label: 'Featured', icon: 'star-outline' },
];

const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${ORG_CONFIG.supabase.url}/storage/v1/object/public/${cleanPath}`;
};

const PostsList = () => {
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 10;

    // Filters
    const [activeFilter, setActiveFilter] = useState('latest');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Fetch posts and whenever filters change
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchPosts(0, true);
    }, [selectedCategory, searchQuery, activeFilter]);

    const fetchCategories = async () => {
        try {
            const { data } = await supabase
                .from('categories')
                .select('id, name, color')
                .eq('institute_id', ORG_CONFIG.id)
                .order('name');
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchPosts = async (pageNumber = 0, isInitial = false) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            let query = supabase
                .from('posts')
                .select(`
                    id, 
                    title, 
                    description, 
                    content,
                    cover_image, 
                    icon, 
                    created_at, 
                    publication_date,
                    category_id,
                    view_count,
                    like_count,
                    is_featured
                `, { count: 'exact' })
                .eq('is_deleted', false)
                .eq('institute_id', ORG_CONFIG.id)
                .eq('access_control', 'Public')
                .lte('publication_date', new Date().toISOString());

            // --- Server Side Filters ---
            if (searchQuery.trim()) {
                query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            if (selectedCategory) {
                query = query.eq('category_id', selectedCategory);
            }

            if (activeFilter === 'featured') {
                query = query.eq('is_featured', true);
            }

            // Sorting
            if (activeFilter === 'popular') {
                query = query.order('view_count', { ascending: false });
            } else {
                query = query.order('publication_date', { ascending: false });
            }

            // Pagination
            const from = pageNumber * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            // Fetch categories for posts in this batch
            const categoryIds = [...new Set(data.map(p => p.category_id).filter(id => id != null))];
            let categoriesMap = {};

            if (categoryIds.length > 0) {
                const { data: categoriesData } = await supabase
                    .from('categories')
                    .select('id, name, color')
                    .in('id', categoryIds);
                if (categoriesData) {
                    categoriesData.forEach(cat => categoriesMap[cat.id] = cat);
                }
            }

            const formattedPosts = data.map(post => ({
                ...post,
                category: categoriesMap[post.category_id],
                readTime: Math.max(1, Math.ceil((post.content || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).length / 200))
            }));

            if (isInitial) {
                setPosts(formattedPosts);
            } else {
                setPosts(prev => [...prev, ...formattedPosts]);
            }

            // Check if we have more to load
            setHasMore(posts.length + formattedPosts.length < (count || 0));
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchPosts(nextPage);
        }
    };

    const renderPostItem = ({ item }) => (
        <TouchableOpacity
            className="flex-row bg-white border-b border-gray-100 p-3"
            onPress={() => router.push(`/posts/${item.id}`)}
            activeOpacity={0.7}
        >
            {/* Thumbnail */}
            <View className="w-24 h-16 rounded-lg bg-gray-100 mr-3 overflow-hidden">
                <Image
                    source={getImageUrl(item.cover_image) ? { uri: getImageUrl(item.cover_image) } : defaultPostImage}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
                {/* Featured Badge */}
                {item.is_featured && (
                    <View className="absolute top-1 left-1 bg-orange-500 rounded px-1">
                        <Text className="text-[8px] text-white font-bold">⭐</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View className="flex-1 justify-center">
                {/* Category Badge */}
                <View
                    className="px-1.5 py-0.5 rounded self-start mb-1"
                    style={{ backgroundColor: item.category?.color || '#2563EB' }}
                >
                    <Text className="text-[8px] font-bold text-white uppercase">
                        {item.category?.name || 'General'}
                    </Text>
                </View>

                {/* Title */}
                <Text className="text-sm font-bold text-slate-900 leading-5 mb-1" numberOfLines={2}>
                    {item.title}
                </Text>

                {/* Meta Row */}
                <View className="flex-row items-center">
                    <Text className="text-[10px] text-slate-400">
                        {new Date(item.publication_date || item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <View className="w-1 h-1 bg-slate-300 rounded-full mx-2" />
                    <Ionicons name="time-outline" size={10} color="#94a3b8" />
                    <Text className="text-[10px] text-slate-400 ml-0.5">{item.readTime} min</Text>
                    <View className="w-1 h-1 bg-slate-300 rounded-full mx-2" />
                    <Ionicons name="eye-outline" size={10} color="#94a3b8" />
                    <Text className="text-[10px] text-slate-400 ml-0.5">{item.view_count || 0}</Text>
                </View>
            </View>

            <View className="justify-center ml-1">
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );

    const selectedCategoryName = selectedCategory
        ? categories.find(c => c.id === selectedCategory)?.name
        : 'All Categories';

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-4 py-3 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-800 flex-1">Academy Insights</Text>
            </View>

            {/* Search Bar */}
            <View className="px-4 py-2 bg-gray-50">
                <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <Ionicons name="search" size={18} color="#9ca3af" />
                    <TextInput
                        placeholder="Search posts..."
                        className="flex-1 ml-2 text-sm text-slate-800"
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Filter Tabs */}
            <View className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                        {FILTER_TABS.map(tab => (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setActiveFilter(tab.key)}
                                className={`flex-row items-center px-4 py-2 rounded-full ${activeFilter === tab.key
                                    ? 'bg-blue-600'
                                    : 'bg-white border border-gray-200'
                                    }`}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={14}
                                    color={activeFilter === tab.key ? '#fff' : '#64748b'}
                                />
                                <Text className={`text-xs font-semibold ml-1.5 ${activeFilter === tab.key ? 'text-white' : 'text-slate-600'
                                    }`}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {/* Category Dropdown Button */}
                        <TouchableOpacity
                            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                            className={`flex-row items-center px-4 py-2 rounded-full ${selectedCategory
                                ? 'bg-emerald-600'
                                : 'bg-white border border-gray-200'
                                }`}
                        >
                            <Ionicons
                                name="pricetag-outline"
                                size={14}
                                color={selectedCategory ? '#fff' : '#64748b'}
                            />
                            <Text className={`text-xs font-semibold ml-1.5 ${selectedCategory ? 'text-white' : 'text-slate-600'
                                }`} numberOfLines={1}>
                                {selectedCategoryName}
                            </Text>
                            <Ionicons
                                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={selectedCategory ? '#fff' : '#64748b'}
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

            {/* Category Picker Dropdown */}
            {showCategoryPicker && (
                <View className="bg-white border-b border-gray-200 px-4 py-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => { setSelectedCategory(null); setShowCategoryPicker(false); }}
                                className={`px-3 py-1.5 rounded-full ${!selectedCategory ? 'bg-slate-800' : 'bg-gray-100'
                                    }`}
                            >
                                <Text className={`text-xs font-medium ${!selectedCategory ? 'text-white' : 'text-slate-600'
                                    }`}>All</Text>
                            </TouchableOpacity>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => { setSelectedCategory(cat.id); setShowCategoryPicker(false); }}
                                    className="px-3 py-1.5 rounded-full"
                                    style={{ backgroundColor: selectedCategory === cat.id ? cat.color : '#f1f5f9' }}
                                >
                                    <Text className={`text-xs font-medium ${selectedCategory === cat.id ? 'text-white' : 'text-slate-600'
                                        }`}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Results Count */}
            <View className="px-4 py-2 bg-blue-50 flex-row items-center justify-between">
                <Text className="text-xs text-blue-700 font-medium">
                    {posts.length} post{posts.length !== 1 ? 's' : ''} found
                </Text>
                {(searchQuery || selectedCategory || activeFilter !== 'latest') && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory(null); setActiveFilter('latest'); }}>
                        <Text className="text-xs text-blue-600 font-semibold">Clear filters</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Posts List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPostItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color="#2563eb" />
                            </View>
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); setPage(0); fetchPosts(0, true); }}
                            colors={['#2563eb']}
                            tintColor="#2563eb"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                            <Text className="text-slate-500 mt-4 font-medium">No posts found</Text>
                            <Text className="text-slate-400 text-sm mt-1">Try adjusting your filters</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default PostsList;
