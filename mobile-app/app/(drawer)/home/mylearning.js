import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { ORG_CONFIG } from '../../../config/organization';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyLearning() {
    const router = useRouter();
    const navigation = useNavigation();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Helper to check if course allows mobile
    const isMobileAllowed = (course) => {
        if (!course) return false;
        // Check if allowed_platforms exists and includes 'mobile'
        // If the column doesn't exist yet (cached data?), default to allow
        if (!course.allowed_platforms) return true;
        return course.allowed_platforms.includes('mobile');
    };

    useEffect(() => {
        fetchEnrolledCourses();
    }, []);

    const fetchEnrolledCourses = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // 1. Get Member ID
            const { data: member } = await supabase
                .from('members')
                .select('id, email')
                .eq('email', user.email)
                .eq('institute_id', ORG_CONFIG.id)
                .single();

            if (!member) {
                setLoading(false);
                return;
            }

            // 2. Fetch Batches & Valid Subscriptions
            const { data: batchMemberships } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('member_id', member.id);

            const studentBatches = (batchMemberships || []).map(bm => bm.batch_id);
            let validBatches = [];

            if (studentBatches.length > 0) {
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('batch_id, status, expires_on')
                    .eq('member_id', member.id)
                    .in('batch_id', studentBatches);

                const today = new Date().toISOString().split('T')[0];
                validBatches = (subscriptions || [])
                    .filter(sub => {
                        if (sub.status !== 'Active') return false;
                        if (sub.expires_on && sub.expires_on < today) return false;
                        return true;
                    })
                    .map(sub => sub.batch_id);
            }

            // 3. Manual Enrollments
            const { data: manualEnrollments } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    courses:course_id (
                        *,
                        chapters:chapters(id, chapter_contents(count))
                    )
                `)
                .eq('member_id', member.id)
                .in('status', ['active', 'completed']);

            // Filter out courses not allowed on mobile
            const filteredManualEnrollments = (manualEnrollments || []).filter(enrollment =>
                isMobileAllowed(enrollment.courses)
            );

            // 4. Batch Courses (Linked via batch_courses)
            let batchCourses = [];
            if (validBatches.length > 0) {
                const { data: batchCourseLinks } = await supabase
                    .from('batch_courses')
                    .select('course_id')
                    .in('batch_id', validBatches);

                if (batchCourseLinks && batchCourseLinks.length > 0) {
                    const courseIds = batchCourseLinks.map(bc => bc.course_id);
                    const { data: courseData } = await supabase
                        .from('courses')
                        .select('*, chapters(id, chapter_contents(count))')
                        .in('id', courseIds);

                    const linkedCourses = (courseData || [])
                        .filter(c => isMobileAllowed(c))
                        .map(course => ({
                            id: `batch-${course.id}`,
                            course_id: course.id,
                            progress: 0,
                            status: 'active',
                            enrolled_at: new Date().toISOString(),
                            source: 'batch',
                            courses: course
                        }));
                    batchCourses = [...batchCourses, ...linkedCourses];
                }
            }

            // 5. Product/Order Based Courses
            let productCourses = [];
            const { data: orders } = await supabase
                .from('orders')
                .select('product_id')
                .or(`member_id.eq.${member.id},user_id.eq.${member.id},user_email.ilike.${member.email}`)
                .eq('status', 'completed');

            if (orders && orders.length > 0) {
                const purchasedProductIds = orders.map(o => o.product_id).filter(Boolean);
                if (purchasedProductIds.length > 0) {
                    const { data: allowedProductCourses } = await supabase
                        .from('courses')
                        .select('*, chapters(id, chapter_contents(count))')
                        .overlaps('allowed_products', purchasedProductIds);

                    if (allowedProductCourses && allowedProductCourses.length > 0) {
                        productCourses = allowedProductCourses
                            .filter(c => isMobileAllowed(c))
                            .map(course => ({
                                id: `product-allowed-${course.id}`,
                                course_id: course.id,
                                progress: 0,
                                status: 'active',
                                enrolled_at: new Date().toISOString(),
                                source: 'product',
                                courses: course
                            }));
                    }
                }
            }

            // 6. Public Courses
            let publicCourses = [];
            const { data: publicCoursesData } = await supabase
                .from('courses')
                .select('*, chapters(id, chapter_contents(count))')
                .eq('is_public', true)
                .eq('institute_id', ORG_CONFIG.id);

            if (publicCoursesData) {
                publicCourses = publicCoursesData
                    .filter(c => isMobileAllowed(c))
                    .map(course => ({
                        id: `public-${course.id}`,
                        course_id: course.id,
                        progress: 0,
                        status: 'active',
                        enrolled_at: new Date().toISOString(),
                        source: 'public',
                        courses: course
                    }));
            }

            // Merge & Deduplicate
            const allCourses = [
                ...(filteredManualEnrollments || []),
                ...batchCourses,
                ...productCourses,
                ...publicCourses
            ];

            const courseMap = new Map();
            allCourses.forEach(enrollment => {
                const courseId = enrollment.course_id;
                // Prefer manual enrollments for progress
                if (!courseMap.has(courseId)) {
                    courseMap.set(courseId, enrollment);
                } else {
                    const existing = courseMap.get(courseId);
                    if (enrollment.source !== 'batch' && enrollment.source !== 'public' && enrollment.source !== 'product') {
                        courseMap.set(courseId, enrollment);
                    }
                }
            });

            setCourses(Array.from(courseMap.values()));

        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchEnrolledCourses();
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        // Fallback for relative paths: assume Supabase Storage
        // Remove leading slash if present to avoid double slashes
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `${ORG_CONFIG.supabase.url}/storage/v1/object/public/${cleanPath}`;
    };

    const renderCourseItem = ({ item }) => {
        const course = item.courses || item;
        const chapCount = course.chapters?.length || 0;
        const progress = item.progress || 0;

        return (
            <TouchableOpacity
                className="bg-white border-b border-gray-100 flex-row"
                style={{ height: 80 }}
                onPress={() => {
                    if (course && course.id) {
                        router.push({
                            pathname: '/course/[id]',
                            params: { id: course.id }
                        });
                    } else {
                        console.warn('Attempted to navigate with invalid course ID', course);
                    }
                }}
            >
                {/* Image Section */}
                <View className="justify-center pl-4">
                    <View className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
                        {(course.image || course.thumbnail_url) ? (
                            <Image
                                source={{ uri: getImageUrl(course.image || course.thumbnail_url) }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-gray-50">
                                <Ionicons name="book-outline" size={20} color="#9ca3af" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Details Section */}
                <View className="flex-1 p-3 justify-center">
                    <Text className="text-[15px] font-bold text-slate-900 mb-2 leading-snug" numberOfLines={2}>
                        {course.title}
                    </Text>

                    <View className="flex-row items-center">
                        <View className={`${course.is_public ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border px-2 py-0.5 rounded mr-2`}>
                            <Text className={`text-[10px] ${course.is_public ? 'text-green-600' : 'text-amber-600'} font-bold`}>
                                {course.is_public ? 'FREE' : 'PAID'}
                            </Text>
                        </View>
                        <Text className="text-xs text-slate-400 font-medium">
                            {chapCount} {chapCount === 1 ? 'Chapter' : 'Chapters'}
                        </Text>
                    </View>
                </View>

                {/* Play Button */}
                <View className="justify-center pr-4">
                    <Ionicons name="play-circle" size={28} color="#2563EB" opacity={0.8} />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header Section */}
            <View className="bg-white px-5 pt-4 border-b border-gray-100">
                <View className="flex-row items-center mb-3">
                    <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-3">
                        <Ionicons name="book" size={24} color="#2563EB" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-slate-900">My Courses</Text>
                        <Text className="text-sm text-blue-600">Continue your learning journey</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={courses}
                renderItem={renderCourseItem}
                keyExtractor={item => (item.id || item.course_id).toString()}
                contentContainerStyle={{ paddingBottom: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center mt-20 px-8 opacity-60">
                        <Ionicons name="library-outline" size={64} color="#94a3b8" />
                        <Text className="text-slate-500 text-center mt-4 font-medium">No courses found.</Text>
                        <Text className="text-slate-400 text-center text-xs mt-1">
                            Your enrolled courses will appear here.
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
