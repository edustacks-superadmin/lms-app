import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const TransactionContext = createContext();

export const useTransactions = () => useContext(TransactionContext);

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { institute } = useInstitute();

    const fetchTransactions = async (instituteId) => {
        setLoading(true);
        setError(null);
        try {
            if (!instituteId) return;

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    products (title)
                `)
                .eq('institute_id', instituteId)
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

                type: (() => {
                    const pm = order.payment_method?.toLowerCase();
                    if (pm === 'cash') return 'Cash';
                    if (pm === 'razorpay') return 'Razorpay';
                    if (pm === 'upi') return 'UPI';
                    return order.payment_method || '-';
                })(),
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
                .insert([{ ...orderData, institute_id: institute?.id }])
                .select();

            if (error) throw error;
            await fetchTransactions(institute?.id); // Refresh list
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
                        // Compute expires_at based on product validity
                        let expiresAt = null;
                        if (product.validity_type === 'Fixed (calendar date)' && product.validity) {
                            expiresAt = new Date(`${product.validity}T23:59:59.999Z`).toISOString();
                        } else if (product.validity_type === 'Relative (in days)' && product.validity) {
                            const days = parseInt(product.validity, 10);
                            if (!isNaN(days) && days > 0) {
                                expiresAt = new Date(Date.now() + days * 86400000).toISOString();
                            }
                        }

                        // Check if already enrolled using the CORRECT courseId
                        const { data: existing } = await supabase
                            .from('enrollments')
                            .select('id, cycle_number')
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
                                    enrolled_at: new Date().toISOString(),
                                    expires_at: expiresAt,
                                    cycle_number: 1
                                });

                            if (insertError) {
                                console.error('Error creating enrollment:', insertError);
                                alert('Order Approved, but Error enrolling student: ' + insertError.message);
                            } else {
                                console.log('Successfully enrolled student in course:', courseId);
                                alert('Order Approved & Student Enrolled Successfully!');
                            }
                        } else {
                            // Repurchase / renewal: Reactivate and start a new cycle!
                            const { error: updateError } = await supabase
                                .from('enrollments')
                                .update({
                                    status: 'active',
                                    enrolled_at: new Date().toISOString(),
                                    expires_at: expiresAt,
                                    cycle_number: (existing.cycle_number || 1) + 1
                                })
                                .eq('id', existing.id);

                            if (updateError) {
                                console.error('Error renewing student enrollment:', updateError);
                                alert('Order Approved, but Error renewing access: ' + updateError.message);
                            } else {
                                console.log('Successfully renewed student enrollment in course:', courseId);
                                alert('Order Approved & Student Access Renewed Successfully!');
                            }
                        }
                    } else {
                        console.warn('No matching course found for product:', product.title);
                        alert('Order Approved, but NO COURSE FOUND matching this product. Please check Course Settings -> Access Control.');
                    }
                }
            }

            await fetchTransactions(institute?.id);
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
            await fetchTransactions(institute?.id);
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
            const response = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                // Return Gatekeeper data if present
                if (result.requires_action) {
                    return {
                        success: false,
                        error: result.error,
                        requires_action: result.requires_action,
                        missing_fields: result.missing_fields
                    };
                }
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
            const response = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Payment verification failed');
            }

            await fetchTransactions(institute?.id); // Refresh transactions list
            return { success: true, verified: result.verified };
        } catch (err) {
            console.error('Error verifying Razorpay payment:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const validateCoupon = async (code, productId, originalPrice, productIds = []) => {
        try {
            const response = await fetch('/api/store/coupons/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    productId,
                    productIds,
                    orderAmount: originalPrice,
                    instituteId: institute?.id,
                    userId: await supabase.auth.getUser().then(({ data }) => data.user?.id) // Ensure we pass current user ID
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { valid: false, message: result.message || 'Error validating coupon' };
            }

            return {
                valid: result.valid,
                offerId: result.couponId, // API returns couponId
                discountAmount: result.discountAmount,
                finalPrice: result.finalPrice,
                message: result.message
            };

        } catch (err) {
            console.error('Error validating coupon:', err);
            return { valid: false, message: 'Server error validating coupon' };
        }
    };

    useEffect(() => {
        if (institute?.id) {
            fetchTransactions(institute.id);
        }
    }, [institute?.id]);

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
