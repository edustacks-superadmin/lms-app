import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        // Fetch specific influencer coupons (those with a name attached)
        // Also fetch all their successful orders
        const influencerCoupons = await prisma.offers.findMany({
            where: {
                OR: [
                    { influencer_name: { not: null } },
                    { influencer_id: { not: null } }
                ],
                ...(instituteId && { institute_id: parseInt(instituteId) })
            },
            include: {
                members: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });

        // For each coupon, aggregate order stats
        // We do this manually or via groupBy. GroupBy is cleaner but tricky with mixed coupon codes.
        // Let's do a loop or Promise.all for now as number of influencer coupons is likely manageable.

        const reportData = await Promise.all(influencerCoupons.map(async (coupon) => {
            const stats = await prisma.orders.aggregate({
                _sum: {
                    amount: true,
                },
                _count: {
                    id: true
                },
                where: {
                    // Match coupon code (case insensitive usually, but orders stores exact code used usually)
                    // Better to use offer_id if strictly available, but we know orders has coupon_code often.
                    // Let's match primarily by coupon_code as offer_id might have been optional in legacy.
                    coupon_code: { equals: coupon.code, mode: 'insensitive' },
                    status: 'completed'
                }
            });

            const totalSales = stats._count.id || 0;
            // amount is Decimal, need to convert
            const totalRevenue = stats._sum.amount ? parseFloat(stats._sum.amount) : 0;

            // Calculate Commission
            let commission = 0;
            if (coupon.commission_fixed && parseFloat(coupon.commission_fixed) > 0) {
                commission = totalSales * parseFloat(coupon.commission_fixed);
            } else if (coupon.commission_percent && parseFloat(coupon.commission_percent) > 0) {
                commission = (totalRevenue * parseFloat(coupon.commission_percent)) / 100;
            }

            return {
                id: coupon.id,
                influencer_name: coupon.influencer_name || `${coupon.members?.first_name || ''} ${coupon.members?.last_name || ''}`.trim() || 'Unknown',
                influencer_email: coupon.members?.email || null,
                coupon_code: coupon.code,
                commission_percent: coupon.commission_percent,
                commission_fixed: coupon.commission_fixed,
                total_sales_count: totalSales,
                total_revenue: totalRevenue,
                total_commission: commission
            };
        }));

        return NextResponse.json(reportData);
    } catch (error) {
        console.error('Error fetching influencer report:', error);
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
}
