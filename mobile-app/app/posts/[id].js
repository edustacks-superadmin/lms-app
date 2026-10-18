import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, Share, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const VIEW_EXPIRY_HOURS = 12; // Match web (12 hours)

const PostDetail = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasLiked, setHasLiked] = useState(false);
    const [hasViewed, setHasViewed] = useState(false);
    const { width } = useWindowDimensions();

    // Check if already liked on mount
    useEffect(() => {
        const checkLikedStatus = async () => {
            try {
                const likedStatus = await AsyncStorage.getItem(`liked_post_${id}`);
                if (likedStatus === 'true') {
                    setHasLiked(true);
                }
            } catch (error) {
                console.error('Error checking like status:', error);
            }
        };
        if (id) checkLikedStatus();
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchPostDetails();
        }
    }, [id]);

    const fetchPostDetails = async () => {
        try {
            setLoading(true);

            // Determine if passed id is an actual ID or a slug
            const isNumericId = /^\d+$/.test(id);

            let query = supabase.from('posts').select('*');

            if (isNumericId) {
                query = query.eq('id', id);
            } else {
                query = query.eq('slug', id);
            }

            const { data: postData, error } = await query.single();

            if (error || !postData) {
                console.error('Error fetching post or post not found:', error);
                setPost(null);
                setLoading(false);
                return;
            }

            // Mobile App Timezone Check Fix (Same as Web)
            const cleanDateStr = postData.publication_date ? postData.publication_date.replace(/Z|[+-]\d{2}:?\d{2}$/, '') : null;
            if (cleanDateStr && new Date(cleanDateStr) > new Date()) {
                setPost(null);
                setLoading(false);
                return;
            }

            let category = null;
            if (postData.category_id) {
                const { data: catData } = await supabase
                    .from('categories')
                    .select('id, name, color')
                    .eq('id', postData.category_id)
                    .single();

                if (catData) category = catData;

                // Fetch Related Posts
                const { data: relatedData } = await supabase
                    .from('posts')
                    .select('id, title, cover_image, icon, created_at, slug, view_count, content, category_id')
                    .eq('category_id', postData.category_id)
                    .eq('is_deleted', false)
                    .neq('id', id)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (relatedData) setRelatedPosts(relatedData);
            }

            setPost({ ...postData, categories: category });
        } catch (error) {
            console.error('Error fetching post details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            const url = `http://maheshiesacademy.edustacks.co.in/posts/${id}`;
            await Share.share({
                title: post.title,
                message: `${post.title}\n\n${post.description || ''}\n\nRead more: ${url}`,
                url: url // iOS only
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    // Increment view count (with duplicate prevention)
    const incrementViewCount = async () => {
        try {
            const viewKey = `viewed_post_${id}`;
            const viewData = await AsyncStorage.getItem(viewKey);

            // Check if already viewed within expiry window
            if (viewData) {
                const { timestamp } = JSON.parse(viewData);
                const hoursSinceView = (Date.now() - timestamp) / (1000 * 60 * 60);
                if (hoursSinceView < VIEW_EXPIRY_HOURS) {
                    setHasViewed(true);
                    return; // Already counted
                }
            }

            // Increment in database
            const { data: currentPost } = await supabase
                .from('posts')
                .select('view_count')
                .eq('id', id)
                .single();

            await supabase
                .from('posts')
                .update({ view_count: (currentPost?.view_count || 0) + 1 })
                .eq('id', id);

            // Store view timestamp
            await AsyncStorage.setItem(viewKey, JSON.stringify({ timestamp: Date.now() }));
            setHasViewed(true);
        } catch (error) {
            console.error('Error incrementing view:', error);
        }
    };

    // Handle like/helpful button (with persistence)
    const handleLike = async () => {
        if (hasLiked) return;

        const likeKey = `liked_post_${id}`;
        setHasLiked(true);
        setPost(prev => ({ ...prev, like_count: (prev?.like_count || 0) + 1 }));

        try {
            // Persist like status
            await AsyncStorage.setItem(likeKey, 'true');

            // Update database
            const { data: currentPost } = await supabase
                .from('posts')
                .select('like_count')
                .eq('id', id)
                .single();

            await supabase
                .from('posts')
                .update({ like_count: (currentPost?.like_count || 0) + 1 })
                .eq('id', id);
        } catch (error) {
            console.error('Error liking post:', error);
            // Rollback on error
            setHasLiked(false);
            setPost(prev => ({ ...prev, like_count: Math.max(0, (prev?.like_count || 0) - 1) }));
            await AsyncStorage.removeItem(likeKey);
        }
    };

    // Calculate read time
    const readTime = post ? Math.max(1, Math.ceil((post.content || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).length / 200)) : 1;

    // Increment view on mount
    useEffect(() => {
        if (post && id) {
            incrementViewCount();
        }
    }, [post?.id]);

    if (loading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!post) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <Text className="text-slate-500">Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-blue-600 font-bold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-4 py-3 flex-row items-center border-b border-gray-100 bg-white z-10">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-gray-100"
                >
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View className="flex-1 ml-2">
                    <Text className="text-lg font-semibold text-slate-800" numberOfLines={1}>
                        {post.categories?.name || 'Post Detail'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleShare}
                    className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100"
                >
                    <Ionicons name="share-outline" size={24} color="#1e293b" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Cover Image - Auto Height */}
                <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f1f5f9' }}>
                    {post.cover_image || (post.icon && post.icon.startsWith('http')) ? (
                        <Image
                            source={{ uri: post.cover_image || post.icon }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                            <Ionicons name="image-outline" size={48} color="#cbd5e1" />
                        </View>
                    )}
                </View>

                <View className="px-5 pt-5 pb-10">
                    {/* Metadata Row */}
                    <View className="flex-row items-center flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100">
                        {/* Date */}
                        <View className="flex-row items-center">
                            <Ionicons name="calendar-outline" size={14} color="#64748b" />
                            <Text className="text-xs text-slate-500 font-medium ml-1">
                                {new Date(post.publication_date || post.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>

                        {/* Read Time */}
                        <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={14} color="#f97316" />
                            <Text className="text-xs text-orange-500 font-semibold ml-1">
                                {readTime} min read
                            </Text>
                        </View>

                        {/* Views */}
                        <View className="flex-row items-center">
                            <Ionicons name="eye-outline" size={14} color="#3b82f6" />
                            <Text className="text-xs text-blue-500 font-medium ml-1">
                                {post.view_count || 0} views
                            </Text>
                        </View>

                        {/* Like/Helpful Button */}
                        <TouchableOpacity
                            onPress={handleLike}
                            className={`flex-row items-center px-3 py-1.5 rounded-full ${hasLiked ? 'bg-red-50' : 'bg-gray-100'
                                }`}
                            disabled={hasLiked}
                        >
                            <Ionicons
                                name={hasLiked ? "heart" : "heart-outline"}
                                size={14}
                                color={hasLiked ? "#ef4444" : "#64748b"}
                            />
                            <Text className={`text-xs font-medium ml-1 ${hasLiked ? 'text-red-500' : 'text-slate-500'
                                }`}>
                                {hasLiked ? 'Thanks!' : 'Helpful?'}
                            </Text>
                            {(post.like_count > 0) && (
                                <Text className="text-xs text-slate-400 ml-1">
                                    ({post.like_count})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-bold text-slate-900 mb-5 leading-9">
                        {post.title}
                    </Text>

                    {/* Description (Summary) */}
                    {post.description && (
                        <View className="bg-slate-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
                            <Text className="text-base text-slate-700 leading-7 font-medium italic">
                                {post.description}
                            </Text>
                        </View>
                    )}

                    {/* Content */}
                    {post.content ? (
                        <RenderHtml
                            contentWidth={width - 40}
                            source={{
                                html: (post.content || '')
                                    .replace(/\u00A0/g, ' ')
                                    .replace(/&nbsp;/g, ' ')
                                    // Hacky but effective for mobile: 
                                    // Join <li> blocks that start with MCQ option patterns into the previous <li>
                                    .replace(/<\/li>\s*<li>\s*(\([A-Da-d]\)|Answer:)/gi, '<br/>$1')
                            }}
                            enableExperimentalMarginCollapsing={true}
                            tagsStyles={{
                                body: { color: '#334155', fontSize: 16, lineHeight: 28, textAlign: 'left' },
                                p: { marginBottom: 16, fontSize: 16, lineHeight: 28, textAlign: 'left' },
                                ul: { marginBottom: 16, paddingLeft: 10 },
                                ol: { marginBottom: 16, paddingLeft: 10 },
                                li: { marginBottom: 8, fontSize: 16, lineHeight: 28 },
                                h1: { fontSize: 26, fontWeight: 'bold', marginVertical: 18, color: '#1e293b', lineHeight: 32 },
                                h2: { fontSize: 22, fontWeight: 'bold', marginTop: 16, marginBottom: 12, color: '#1e293b', lineHeight: 28 },
                                h3: { fontSize: 20, fontWeight: 'bold', marginTop: 14, marginBottom: 10, color: '#334155', lineHeight: 26 },
                                strong: { fontWeight: 'bold', color: '#0f172a' },
                                img: { width: '100%', height: 'auto', borderRadius: 12, marginVertical: 15 },
                                a: { color: '#2563eb', textDecorationLine: 'underline' },
                                blockquote: {
                                    borderLeftWidth: 4,
                                    borderLeftColor: '#e2e8f0',
                                    paddingLeft: 16,
                                    fontStyle: 'italic',
                                    marginVertical: 15
                                }
                            }}
                        />
                    ) : null}

                    {/* Related Posts */}
                    {relatedPosts.length > 0 && (
                        <View className="mt-12 border-t border-slate-100 pt-10">
                            <View className="flex-row items-center mb-6">
                                <View className="w-1.5 h-6 bg-blue-500 rounded-full mr-3" />
                                <Text className="text-xl font-bold text-slate-800">Related Posts</Text>
                            </View>

                            <View>
                                {relatedPosts.map((rp) => {
                                    const rpReadTime = Math.max(1, Math.ceil((rp.content || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).length / 200));
                                    return (
                                        <TouchableOpacity
                                            key={rp.id}
                                            onPress={() => router.replace(`/posts/${rp.id}`)}
                                            className="flex-row bg-white border-b border-gray-100 py-3"
                                        >
                                            <View className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden">
                                                {rp.cover_image ? (
                                                    <Image
                                                        source={{ uri: rp.cover_image }}
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="w-full h-full items-center justify-center bg-blue-50">
                                                        <Ionicons name="newspaper-outline" size={20} color="#3b82f6" />
                                                    </View>
                                                )}
                                            </View>
                                            <View className="flex-1 ml-3 justify-center">
                                                {/* Category Badge */}
                                                <View
                                                    className="px-1.5 py-0.5 rounded self-start mb-1"
                                                    style={{ backgroundColor: post.categories?.color || '#2563EB' }}
                                                >
                                                    <Text className="text-[8px] font-bold text-white uppercase">
                                                        {post.categories?.name || 'General'}
                                                    </Text>
                                                </View>

                                                {/* Title */}
                                                <Text className="text-sm font-semibold text-slate-800 leading-5 mb-1" numberOfLines={2}>
                                                    {rp.title}
                                                </Text>

                                                {/* Meta Row */}
                                                <View className="flex-row items-center">
                                                    <Text className="text-[10px] text-slate-400">
                                                        {new Date(rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </Text>
                                                    <View className="w-1 h-1 bg-slate-300 rounded-full mx-1.5" />
                                                    <Ionicons name="time-outline" size={10} color="#94a3b8" />
                                                    <Text className="text-[10px] text-slate-400 ml-0.5">{rpReadTime}m</Text>
                                                    <View className="w-1 h-1 bg-slate-300 rounded-full mx-1.5" />
                                                    <Ionicons name="eye-outline" size={10} color="#94a3b8" />
                                                    <Text className="text-[10px] text-slate-400 ml-0.5">{rp.view_count || 0}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
export default PostDetail;
