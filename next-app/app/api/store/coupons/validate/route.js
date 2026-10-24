import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
    try {
        const { code, productId, productIds, userId, orderAmount, instituteId } = await req.json();

        if (!code) {
            return NextResponse.json({ valid: false, message: 'Coupon code required' });
        }

        // Normalize product IDs to an array
        const idsToProcess = productIds && Array.isArray(productIds) ? productIds : (productId ? [productId] : []);

        // 1. Fetch Coupon
        const where = {
            code: { equals: code, mode: 'insensitive' },
            status: 'active'
        };

        if (instituteId) {
            where.institute_id = parseInt(instituteId);
        }

        const coupon = await prisma.offers.findFirst({
            where
        });

        if (!coupon) {
            return NextResponse.json({ valid: false, message: 'Invalid coupon code' });
        }

        // 2. Check Dates
        const now = new Date();
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            return NextResponse.json({ valid: false, message: 'Coupon is not yet active' });
        }
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            return NextResponse.json({ valid: false, message: 'Coupon has expired' });
        }

        // 3. Check Usage Limits (Global)
        if (coupon.max_uses && (coupon.usage_count || 0) >= coupon.max_uses) {
            return NextResponse.json({ valid: false, message: 'Coupon usage limit reached' });
        }

        // 4. Check Minimum Order Value
        if (coupon.min_order_value && orderAmount < parseFloat(coupon.min_order_value)) {
            return NextResponse.json({ valid: false, message: `Minimum order of ₹${coupon.min_order_value} required` });
        }

        // 5. Check Product Applicability
        // applicable_products is JSON array of IDs.
        if (coupon.applicable_products && Array.isArray(coupon.applicable_products) && coupon.applicable_products.length > 0) {
            const isApplicable = idsToProcess.some(id => coupon.applicable_products.includes(parseInt(id)));
            if (!isApplicable) {
                return NextResponse.json({ valid: false, message: 'Coupon not valid for items in your cart' });
            }
        }

        // 6. Check User Limits & Renewal Logic
        if (userId) {
            // Resolve Supabase UUID to integer member ID
            const member = await prisma.members.findUnique({
                where: { auth_user_id: userId },
                select: { id: true }
            });

            if (!member) {
                return NextResponse.json({ valid: false, message: 'User not found' });
            }

            const memberId = member.id;

            // Per User Limit
            const userOrders = await prisma.orders.count({
                where: {
                    member_id: memberId,
                    coupon_code: { equals: code, mode: 'insensitive' },
                    status: 'completed'
                }
            });

            if (coupon.per_user_limit && userOrders >= coupon.per_user_limit) {
                return NextResponse.json({ valid: false, message: 'You have already used this coupon' });
            }

            // Renewal / Repurchase Validation
            if (coupon.is_renewal_offer) {
                // Check if user has bought ANY of the products before (if it's a renewal offer)
                // For bulk, we check if at least one product is a renewal
                const pastOrders = await prisma.orders.count({
                    where: {
                        member_id: memberId,
                        product_id: { in: idsToProcess.map(id => parseInt(id)) },
                        status: 'completed'
                    }
                });

                if (pastOrders === 0) {
                    try {
                        const linkedCourseEnrollments = await prisma.$queryRawUnsafe(
                            `SELECT count(*)::int as count 
                             FROM enrollments e 
                             JOIN courses c ON e.course_id = c.id 
                             WHERE e.member_id = $1 
                             AND c.allowed_products ?| $2::text[]`,
                            memberId,
                            idsToProcess.map(String)
                        );
                        const pastEnrollments = linkedCourseEnrollments[0]?.count || 0;
                        if (pastEnrollments === 0) {
                            return NextResponse.json({ valid: false, message: 'This offer is only for renewing/repurchasing users.' });
                        }
                    } catch (e) {
                        return NextResponse.json({ valid: false, message: 'This offer is only for renewing/repurchasing users.' });
                    }
                }
            }
        } else if (coupon.is_renewal_offer) {
            // Guest cannot use renewal offer
            return NextResponse.json({ valid: false, message: 'Please login to use this renewal offer.' });
        }

        // 7. Calculate Discount
        let discount = 0;
        if (coupon.discount_type === 'percent') {
            discount = (orderAmount * parseFloat(coupon.discount_value)) / 100;
        } else {
            discount = parseFloat(coupon.discount_value);
        }

        // Ensure discount doesn't exceed order amount
        if (discount > orderAmount) discount = orderAmount;

        return NextResponse.json({
            valid: true,
            discountAmount: discount,
            finalPrice: orderAmount - discount,
            couponId: coupon.id,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Coupon validation error:', error);
        return NextResponse.json({ valid: false, message: 'Server error validating coupon' }, { status: 500 });
    }
}
