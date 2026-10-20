import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../config/organization';
import { initiatePayment } from '../lib/payment';

export default function Checkout() {
    const { productId } = useLocalSearchParams();
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

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [product, setProduct] = useState(null);
    const [user, setUser] = useState(null);
    const [memberData, setMemberData] = useState(null);

    // Coupon states
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Price calculation
    const [subtotal, setSubtotal] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (product) {
            calculatePrices();
        }
    }, [product, appliedCoupon]);

    const fetchData = async () => {
        try {
            // Get user
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
                Alert.alert('Error', 'Please login to continue');
                router.back();
                return;
            }
            setUser(currentUser);

            // Get member data
            let { data: member } = await supabase
                .from('members')
                .select('*')
                .eq('auth_user_id', currentUser.id)
                .single();

            if (!member) {
                const { data: emailMember } = await supabase
                    .from('members')
                    .select('*')
                    .eq('email', currentUser.email)
                    .single();
                member = emailMember;
            }
            setMemberData(member);

            // Get product
            const { data: productData, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (error) throw error;
            setProduct(productData);
            setSubtotal(productData.price || 0);
            setTotal(productData.price || 0);

        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load checkout data');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const calculatePrices = () => {
        if (!product) return;

        const basePrice = product.price || 0;
        setSubtotal(basePrice);

        if (appliedCoupon) {
            let discountAmount = 0;

            if (appliedCoupon.discount_type === 'percentage' || appliedCoupon.discount_type === 'percent') {
                discountAmount = (basePrice * appliedCoupon.discount_value) / 100;

                // Apply max discount if exists
                if (appliedCoupon.max_discount_amount && discountAmount > appliedCoupon.max_discount_amount) {
                    discountAmount = appliedCoupon.max_discount_amount;
                }
            } else {
                discountAmount = appliedCoupon.discount_value;
            }

            setDiscount(discountAmount);
            setTotal(Math.max(0, basePrice - discountAmount));
        } else {
            setDiscount(0);
            setTotal(basePrice);
        }
    };

    const validateCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError('Please enter a coupon code');
            return;
        }

        setValidatingCoupon(true);
        setCouponError('');

        try {
            const { data: offer, error } = await supabase
                .from('offers')
                .select('*')
                .eq('code', couponCode.toUpperCase())
                .eq('type', 'coupon')
                .single();

            if (error || !offer) {
                setCouponError('Invalid coupon code');
                setValidatingCoupon(false);
                return;
            }

            // Check validity dates
            const now = new Date();
            const validFrom = new Date(offer.valid_from);
            const validTo = new Date(offer.valid_to);

            if (now < validFrom || now > validTo) {
                setCouponError('Coupon has expired');
                setValidatingCoupon(false);
                return;
            }

            // Check minimum purchase
            if (subtotal < (offer.min_purchase_amount || 0)) {
                setCouponError(`Minimum purchase of ₹${offer.min_purchase_amount} required`);
                setValidatingCoupon(false);
                return;
            }

            // Coupon is valid
            setAppliedCoupon(offer);
            setCouponError('');
            Alert.alert('Success', 'Coupon applied successfully!');

        } catch (error) {
            console.error('Error validating coupon:', error);
            setCouponError('Failed to validate coupon');
        } finally {
            setValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };



    const handleProceedToPay = async () => {
        if (total === 0) {
            // Free enrollment
            await createFreeEnrollment();
        } else {
            // Paid Product - Razorpay Flow
            setProcessing(true);
            try {
                const result = await initiatePayment({ ...product, finalPrice: total }, user, appliedCoupon?.code);

                if (result.success) {
                    Alert.alert(
                        'Payment Successful! 🎉',
                        `You have successfully purchased ${product.title}.`,
                        [{ text: 'Go to My Courses', onPress: () => navigateToMyCourses() }]
                    );
                } else {
                    // Start of manual error handling if needed, but initiatePayment usually alerts errors.
                    console.log("Payment failed or cancelled");
                }
            } catch (error) {
                console.error('Payment Flow Error:', error);
                Alert.alert('Error', 'Payment failed to initialize');
            } finally {
                setProcessing(false);
            }
        }
    };

    const createFreeEnrollment = async () => {
        setProcessing(true);
        try {
            console.log('=== FREE ENROLLMENT DEBUG ===');
            console.log('Product ID:', productId);
            console.log('Product ID (parsed):', parseInt(productId));
            console.log('Member Data:', memberData);

            // Find all courses that include this product
            const { data: courses, error: coursesError } = await supabase
                .from('courses')
                .select('id, title, allowed_products')
                .contains('allowed_products', [parseInt(productId)]);

            console.log('Courses Query Error:', coursesError);
            console.log('Courses Found:', courses);

            if (coursesError) throw coursesError;

            if (!courses || courses.length === 0) {
                // Maybe the field name is different? Let's try fetching ALL courses to see
                const { data: allCourses } = await supabase
                    .from('courses')
                    .select('id, title, allowed_products, product_id')
                    .limit(5);

                console.log('Sample courses from DB:', allCourses);

                Alert.alert(
                    'Configuration Error',
                    `This product (ID: ${productId}) is not linked to any courses. Please check the courses table to ensure allowed_products is configured.`,
                    [
                        { text: 'View Console', onPress: () => console.log('Check Metro bundler for debug logs') },
                        { text: 'Go Back', onPress: () => router.back() }
                    ]
                );
                return;
            }

            // Check if already enrolled in any of these courses
            const { data: existingEnrollments } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('member_id', memberData.id)
                .in('course_id', courses.map(c => c.id));

            console.log('Existing Enrollments:', existingEnrollments);

            const enrolledCourseIds = existingEnrollments?.map(e => e.course_id) || [];
            const coursesToEnroll = courses.filter(c => !enrolledCourseIds.includes(c.id));

            console.log('Courses to enroll:', coursesToEnroll);

            if (coursesToEnroll.length === 0) {
                Alert.alert(
                    'Already Enrolled',
                    `You already have access to ${courses.length > 1 ? 'these courses' : 'this course'}`,
                    [{ text: 'OK', onPress: () => navigateToMyCourses() }]
                );
                return;
            }

            // Create enrollments for all linked courses
            const enrollmentData = coursesToEnroll.map(course => ({
                member_id: memberData.id,
                course_id: course.id,
                status: 'active',
                enrolled_at: new Date().toISOString(),
                progress: 0
            }));

            console.log('Enrollment Data to Insert:', enrollmentData);

            const { error: enrollError } = await supabase
                .from('enrollments')
                .insert(enrollmentData);

            console.log('Enrollment Error:', enrollError);

            if (enrollError) {
                if (enrollError.code === '23505') {
                    // Duplicate key - already enrolled
                    Alert.alert('Already Enrolled', 'You already have access to this course');
                    navigateToMyCourses();
                } else {
                    throw enrollError;
                }
                return;
            }

            console.log('=== ENROLLMENT SUCCESS ===');

            // Send order/enrollment confirmation email
            try {
                const courseNames = coursesToEnroll.map(c => c.title).join(', ');
                await fetch(getApiUrl('/api/order/confirm'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        student_name: memberData.name || memberData.first_name || 'Student',
                        course_name: courseNames,
                        order_id: `FREE-${Date.now()}`,
                        order_amount: 0,
                        is_free: true
                    })
                });
                console.log('Enrollment confirmation email sent');
            } catch (emailErr) {
                console.error('Failed to send enrollment email:', emailErr);
            }

            Alert.alert(
                'Success! 🎉',
                `You have been enrolled in ${coursesToEnroll.length} course${coursesToEnroll.length > 1 ? 's' : ''}!\n\n${coursesToEnroll.map(c => '• ' + c.title).join('\n')}`,
                [{ text: 'Go to My Courses', onPress: () => navigateToMyCourses() }]
            );

        } catch (error) {
            console.error('=== ENROLLMENT ERROR ===');
            console.error('Error creating enrollment:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            Alert.alert('Error', `Failed to enroll: ${error.message}. Check console for details.`);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-4 py-3 flex-row items-center bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-slate-900">Checkout</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Product Info */}
                <View className="bg-white p-4 mb-4 border-b border-gray-100">
                    <Text className="text-sm text-slate-500 mb-1">You're purchasing</Text>
                    <Text className="text-lg font-bold text-slate-900">{product?.title}</Text>
                </View>

                {/* Coupon Section */}
                <View className="bg-white p-4 mb-4">
                    <Text className="text-base font-semibold text-slate-900 mb-3">
                        Have a coupon code?
                    </Text>

                    {appliedCoupon ? (
                        <View className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-sm font-bold text-green-700">
                                            {appliedCoupon.code}
                                        </Text>
                                        <Text className="text-xs text-green-600">
                                            {(appliedCoupon.discount_type === 'percentage' || appliedCoupon.discount_type === 'percent')
                                                ? `${appliedCoupon.discount_value}% off`
                                                : `₹${appliedCoupon.discount_value} off`}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={removeCoupon}>
                                    <Ionicons name="close-circle" size={24} color="#22c55e" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <View className="flex-row items-center">
                                <TextInput
                                    className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-slate-900 font-medium uppercase"
                                    placeholder="Enter coupon code"
                                    placeholderTextColor="#94a3b8"
                                    value={couponCode}
                                    onChangeText={(text) => {
                                        setCouponCode(text);
                                        setCouponError('');
                                    }}
                                    autoCapitalize="characters"
                                    editable={!validatingCoupon}
                                />
                                <TouchableOpacity
                                    className="ml-3 bg-blue-600 px-6 py-3 rounded-xl"
                                    onPress={validateCoupon}
                                    disabled={validatingCoupon}
                                >
                                    {validatingCoupon ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold">Apply</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                            {couponError ? (
                                <Text className="text-red-500 text-sm mt-2 ml-1">{couponError}</Text>
                            ) : null}
                        </>
                    )}
                </View>

                {/* Price Breakdown */}
                <View className="bg-white p-4">
                    <Text className="text-base font-semibold text-slate-900 mb-4">
                        Order Summary
                    </Text>

                    <View className="space-y-3">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-600">Subtotal</Text>
                            <Text className="text-slate-900 font-medium">₹{subtotal}</Text>
                        </View>

                        {discount > 0 && (
                            <View className="flex-row justify-between items-center">
                                <Text className="text-green-600">Discount ({appliedCoupon?.code})</Text>
                                <Text className="text-green-600 font-medium">-₹{discount.toFixed(2)}</Text>
                            </View>
                        )}

                        <View className="border-t border-gray-200 pt-3 mt-2">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-lg font-bold text-slate-900">Total</Text>
                                <Text className="text-2xl font-bold text-blue-600">
                                    ₹{total.toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        {discount > 0 && (
                            <View className="bg-green-50 p-3 rounded-lg">
                                <Text className="text-center text-green-700 font-medium text-sm">
                                    🎉 You saved ₹{discount.toFixed(2)}!
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Pay Button */}
            <View className="p-4 bg-white border-t border-gray-200">
                <TouchableOpacity
                    className={`py-4 rounded-xl items-center ${processing ? 'bg-blue-400' : 'bg-blue-600'}`}
                    onPress={handleProceedToPay}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            {total === 0 ? 'Enroll for Free' : `Proceed to Pay ₹${total.toFixed(2)}`}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
