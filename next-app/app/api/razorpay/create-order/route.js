import { NextResponse } from 'next/server';
import { validateMemberProfile } from '@/lib/profile';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { productId, productIds, userId, userEmail, couponCode } = body;

        // Normalize to array of product IDs
        const idsToProcess = productIds && Array.isArray(productIds) ? productIds : (productId ? [productId] : []);

        if (idsToProcess.length === 0) {
            return NextResponse.json({ success: false, error: 'No products provided' }, { status: 400 });
        }

        // Use Prisma for easier data fetching
        const { default: prisma } = await import('../../../../lib/prisma');
        const { supabaseAdmin } = await import('../../../../lib/supabase');

        // Gatekeeper: Validate Profile if User ID is present
        if (userId) {
            const validation = await validateMemberProfile(supabaseAdmin, userId);
            if (!validation.valid) {
                // If checking profile fails (e.g. 404), maybe just ignore? 
                // No, if they are logged in, they MUST have a profile.
                // But `validateMemberProfile` returns 404 if not found.
                // `validateMemberProfile` checks for `photo_url` etc.
                if (validation.missing_fields && validation.missing_fields.length > 0) {
                    return NextResponse.json({
                        success: false,
                        error: validation.error,
                        requires_action: validation.requires_action,
                        missing_fields: validation.missing_fields
                    }, { status: 403 });
                }
            }
        }

        // 1. Fetch Product Details
        const products = await prisma.products.findMany({
            where: { id: { in: idsToProcess.map(id => parseInt(id)) } }
        });

        if (products.length === 0) {
            return NextResponse.json({ success: false, error: 'Products not found' }, { status: 404 });
        }

        // Fetch member_id early for validation and order creation
        const { data: member } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('email', userEmail)
            .single();

        let totalOriginalAmount = 0;
        products.forEach(p => {
            totalOriginalAmount += parseFloat(p.price || 0);
        });

        let finalTotalAmount = totalOriginalAmount;
        let totalDiscountAmount = 0;
        let offerId = null;

        // 2. Apply Coupon if present
        if (couponCode) {
            const coupon = await prisma.offers.findFirst({
                where: {
                    code: { equals: couponCode, mode: 'insensitive' },
                    status: 'active'
                }
            });

            if (coupon) {
                const now = new Date();
                let isValid = true;
                let errorMsg = '';

                if (coupon.start_date && new Date(coupon.start_date) > now) { isValid = false; errorMsg = 'Coupon not active'; }
                if (coupon.end_date && new Date(coupon.end_date) < now) { isValid = false; errorMsg = 'Coupon expired'; }
                if (coupon.max_uses && (coupon.usage_count || 0) >= coupon.max_uses) { isValid = false; errorMsg = 'Usage limit reached'; }
                if (coupon.min_order_value && totalOriginalAmount < parseFloat(coupon.min_order_value)) { isValid = false; errorMsg = 'Min order value not met'; }

                // Check if coupon is applicable to ANY of the products in the cart
                if (coupon.applicable_products && Array.isArray(coupon.applicable_products) && coupon.applicable_products.length > 0) {
                    const hasApplicableProduct = products.some(p => coupon.applicable_products.includes(p.id));
                    if (!hasApplicableProduct) { isValid = false; errorMsg = 'Coupon not valid for items in cart'; }
                }

                if (isValid && member?.id) {
                    const userOrdersCount = await prisma.orders.count({
                        where: { member_id: member.id, coupon_code: { equals: couponCode, mode: 'insensitive' }, status: 'completed' }
                    });
                    if (coupon.per_user_limit && userOrdersCount >= coupon.per_user_limit) { isValid = false; errorMsg = 'Usage limit exceeded for this user'; }
                }

                if (isValid) {
                    if (coupon.discount_type === 'percent') {
                        totalDiscountAmount = (totalOriginalAmount * parseFloat(coupon.discount_value)) / 100;
                    } else {
                        totalDiscountAmount = parseFloat(coupon.discount_value);
                    }
                    if (totalDiscountAmount > totalOriginalAmount) totalDiscountAmount = totalOriginalAmount;

                    finalTotalAmount = totalOriginalAmount - totalDiscountAmount;
                    offerId = coupon.id;
                } else {
                    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
                }
            } else {
                return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 });
            }
        }

        // Razorpay Setup
        const instituteSettings = await prisma.institute_settings.findUnique({
            where: { id: 10 },
            select: { razorpay_key_id: true, razorpay_key_secret: true }
        });

        if (!instituteSettings?.razorpay_key_id || !instituteSettings?.razorpay_key_secret) {
            return NextResponse.json({ success: false, error: 'Razorpay configuration missing' }, { status: 500 });
        }

        const Razorpay = (await import('razorpay')).default;
        const razorpay = new Razorpay({
            key_id: instituteSettings.razorpay_key_id,
            key_secret: instituteSettings.razorpay_key_secret
        });

        const options = {
            amount: Math.round(finalTotalAmount * 100), // Convert to paise
            currency: 'INR',
            receipt: `order_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Create Database Orders (one per product)
        // We'll calculate proportional discount if multiple items
        const orderPromises = products.map(product => {
            const productPrice = parseFloat(product.price || 0);
            const proportion = totalOriginalAmount > 0 ? productPrice / totalOriginalAmount : 0;
            const itemDiscount = totalDiscountAmount * proportion;
            const itemFinalAmount = productPrice - itemDiscount;

            return supabaseAdmin
                .from('orders')
                .insert({
                    member_id: member?.id || null,
                    user_id: member?.id || null,
                    user_email: userEmail,
                    product_id: product.id,
                    amount: itemFinalAmount,
                    original_price: productPrice,
                    discount_amount: itemDiscount,
                    coupon_code: couponCode || null,
                    offer_id: offerId || null,
                    status: 'pending',
                    payment_method: 'razorpay',
                    razorpay_order_id: razorpayOrder.id,
                    institute_id: 10
                })
                .select()
                .single();
        });

        const dbOrderResults = await Promise.all(orderPromises);
        const firstDbOrder = dbOrderResults[0].data;

        return NextResponse.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            dbOrderId: firstDbOrder?.id, // Return the first one for backward compatibility
            keyId: instituteSettings.razorpay_key_id
        });

    } catch (error) {
        console.error('Create order error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
