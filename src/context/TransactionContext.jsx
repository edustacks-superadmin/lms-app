import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const TransactionContext = createContext();

export const useTransactions = () => useContext(TransactionContext);

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    products (title)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map to flat structure for UI
            const uniqueEmails = [...new Set((data || []).map(o => o.user_email).filter(Boolean))];

            // Fetch members for these emails
            let emailToMemberId = {};
            if (uniqueEmails.length > 0) {
                const { data: members } = await supabase
                    .from('members')
                    .select('id, email')
                    .in('email', uniqueEmails);

                if (members) {
                    members.forEach(m => {
                        if (m.email) emailToMemberId[m.email.toLowerCase()] = m.id;
                    });
                }
            }

            const formattedData = (data || []).map(order => ({
                ...order,
                product_name: order.products?.title || 'Unknown Product',
                type: order.payment_method === 'razorpay' ? 'Razorpay' : 'UPI',
                member_id: order.member_id || (order.user_email ? emailToMemberId[order.user_email.toLowerCase()] : null)
            }));

            setTransactions(formattedData);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createOrder = async (orderData) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .insert([orderData])
                .select();

            if (error) throw error;
            await fetchTransactions(); // Refresh list
            return { success: true, data };
        } catch (err) {
            console.error('Error creating order:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const approveOrder = async (orderId) => {
        setLoading(true);
        try {
            // 1. Update order status
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', orderId)
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create enrollment
            // Need to fetch member_id first based on user_id or email
            // Assuming we can find member by email stored in order
            const { data: member } = await supabase
                .from('members')
                .select('id')
                .ilike('email', order.user_email) // Use ilike for case-insensitive match
                .single();

            if (member) {
                // We need to find the course_id first
                const { data: product } = await supabase
                    .from('products')
                    .select('title')
                    .eq('id', order.product_id)
                    .single();

                if (product) {
                    let courseId = product.course_id;

                    // 1. Check if course_id is directly linked in products table
                    if (!courseId) {
                        // 2. Brute force check for allowed_products (more reliable than .contains for mixed types)
                        const { data: allCourses } = await supabase
                            .from('courses')
                            .select('id, title, allowed_products');

                        if (allCourses) {
                            const matchedCourse = allCourses.find(c =>
                                c.allowed_products &&
                                Array.isArray(c.allowed_products) &&
                                c.allowed_products.includes(order.product_id)
                            );

                            if (matchedCourse) {
                                courseId = matchedCourse.id;
                                console.log('Found course via JS check:', courseId);
                            }
                        }
                    }

                    // 3. Fallback to title match if still no courseId
                    if (!courseId) {
                        console.log('No direct link or allowed_products match, trying title match for:', product.title);
                        const { data: courses } = await supabase
                            .from('courses')
                            .select('id')
                            .ilike('title', `%${product.title.trim()}%`)
                            .limit(1);

                        if (courses && courses.length > 0) {
                            courseId = courses[0].id;
                        }
                    }

                    if (courseId) {
                        // Check if already enrolled using the CORRECT courseId
                        const { data: existing } = await supabase
                            .from('enrollments')
                            .select('id')
                            .eq('member_id', member.id)
                            .eq('course_id', courseId)
                            .maybeSingle();

                        if (!existing) {
                            const { error: insertError } = await supabase
                                .from('enrollments')
                                .insert({
                                    member_id: member.id,
                                    course_id: courseId,
                                    status: 'active',
                                    progress: 0,
                                    enrolled_at: new Date().toISOString()
                                });

                            if (insertError) {
                                console.error('Error creating enrollment:', insertError);
                                alert('Order Approved, but Error enrolling student: ' + insertError.message);
                            } else {
                                console.log('Successfully enrolled student in course:', courseId);
                                alert('Order Approved & Student Enrolled Successfully!');
                            }
                        } else {
                            console.log('Student already enrolled in course:', courseId);
                            alert('Order Approved. Student was already enrolled.');
                        }
                    } else {
                        console.warn('No matching course found for product:', product.title);
                        alert('Order Approved, but NO COURSE FOUND matching this product. Please check Course Settings -> Access Control.');
                    }
                }
            }

            await fetchTransactions();
            return { success: true };
        } catch (err) {
            console.error('Error approving order:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const rejectOrder = async (orderId) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'rejected' })
                .eq('id', orderId);

            if (error) throw error;
            await fetchTransactions();
            return { success: true };
        } catch (err) {
            console.error('Error rejecting order:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const createRazorpayOrder = async (orderData) => {
        setLoading(true);
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const functionUrl = `${supabaseUrl}/functions/v1/create-razorpay-order`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to create Razorpay order');
            }

            return {
                success: true,
                orderId: result.orderId,
                amount: result.amount,
                currency: result.currency,
                dbOrderId: result.dbOrderId
            };
        } catch (err) {
            console.error('Error creating Razorpay order:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const verifyRazorpayPayment = async (paymentData) => {
        setLoading(true);
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const functionUrl = `${supabaseUrl}/functions/v1/verify-razorpay-payment`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Payment verification failed');
            }

            await fetchTransactions(); // Refresh transactions list
            return { success: true, verified: result.verified };
        } catch (err) {
            console.error('Error verifying Razorpay payment:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const validateCoupon = async (code, productId, originalPrice) => {
        try {
            const { data: offer, error } = await supabase
                .from('offers')
                .select('*')
                .eq('code', code)
                .eq('type', 'coupon')
                .eq('status', 'active')
                .single();

            if (error || !offer) {
                return { valid: false, message: 'Invalid coupon code' };
            }

            const now = new Date();
            if (offer.start_date && new Date(offer.start_date) > now) {
                return { valid: false, message: 'Coupon is not yet active' };
            }
            if (offer.end_date && new Date(offer.end_date) < now) {
                return { valid: false, message: 'Coupon has expired' };
            }

            // Check applicable products
            if (offer.applicable_products && offer.applicable_products.length > 0) {
                if (!offer.applicable_products.includes(productId)) {
                    return { valid: false, message: 'Coupon not applicable to this product' };
                }
            }

            let discountAmount = 0;
            if (offer.discount_type === 'percentage') {
                discountAmount = (originalPrice * offer.discount_value) / 100;
            } else {
                discountAmount = offer.discount_value;
            }

            // Ensure discount doesn't exceed price
            discountAmount = Math.min(discountAmount, originalPrice);

            return {
                valid: true,
                offerId: offer.id,
                discountAmount: discountAmount,
                finalPrice: originalPrice - discountAmount,
                message: 'Coupon applied successfully'
            };

        } catch (err) {
            console.error('Error validating coupon:', err);
            return { valid: false, message: 'Error validating coupon' };
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <TransactionContext.Provider value={{
            transactions,
            fetchTransactions,
            createOrder,
            createRazorpayOrder,
            verifyRazorpayPayment,
            approveOrder,
            rejectOrder,
            validateCoupon,
            loading,
            error
        }}>
            {children}
        </TransactionContext.Provider>
    );
};
