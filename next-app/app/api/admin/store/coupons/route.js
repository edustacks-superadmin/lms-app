import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        const where = {
            status: { not: 'deleted' }
        };
        if (instituteId) {
            where.institute_id = parseInt(instituteId);
        }

        const offers = await prisma.offers.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });

        // Ensure usage_count is present (it is a DB field, but default to 0 if null)
        const formattedOffers = offers.map(offer => ({
            ...offer,
            usage_count: offer.usage_count || 0
        }));

        const serializedOffers = JSON.parse(JSON.stringify(formattedOffers, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(serializedOffers);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.code || !body.discount_value || !body.discount_type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let influencerId = null;
        if (body.influencer_email) {
            const member = await prisma.members.findUnique({
                where: { email: body.influencer_email }
            });
            if (member) {
                influencerId = member.id;
            } else {
                // Warning: Influencer email not found, saving without ID but with name
                console.warn(`Influencer email ${body.influencer_email} not found.`);
            }
        }


        const newCoupon = await prisma.offers.create({
            data: {
                code: body.code,
                type: 'coupon', // Defaulting to coupon
                discount_type: body.discount_type, // 'flat' or 'percent'
                discount_value: parseFloat(body.discount_value),
                start_date: body.start_date ? new Date(body.start_date) : null,
                end_date: body.end_date ? new Date(body.end_date) : null,
                applicable_products: body.applicable_products || [], // Array of product IDs
                max_uses: body.max_uses ? parseInt(body.max_uses) : null,
                per_user_limit: body.per_user_limit ? parseInt(body.per_user_limit) : 1,
                min_order_value: body.min_order_value ? parseFloat(body.min_order_value) : null,
                influencer_name: body.influencer_name || null,
                is_renewal_offer: body.is_renewal_offer || false,
                commission_percent: body.commission_percent ? parseFloat(body.commission_percent) : 0,
                commission_fixed: body.commission_fixed ? parseFloat(body.commission_fixed) : 0,
                influencer_id: influencerId,
                status: 'active',
                institute_id: body.institute_id ? parseInt(body.institute_id) : 10 // Use provided ID or default to 10
            }
        });

        const serializedCoupon = JSON.parse(JSON.stringify(newCoupon, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(serializedCoupon);
    } catch (error) {
        console.error('Error creating coupon:', error);
        if (error.code === 'P2002') { // Unique constraint for code
            return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
        }
        // Return actual error message for debugging
        return NextResponse.json({ error: 'Failed to create coupon: ' + error.message }, { status: 500 });
    }
}


export async function PATCH(req) {
    try {
        const body = await req.json();
        const { ids, updates } = body;

        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Missing or invalid IDs' }, { status: 400 });
        }

        await prisma.offers.updateMany({
            where: { id: { in: ids.map(id => parseInt(id)) } },
            data: updates
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating coupons:', error);
        return NextResponse.json({ error: 'Failed to update coupons' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const ids = searchParams.get('ids')?.split(',');

        if (!id && (!ids || ids.length === 0)) {
            return NextResponse.json({ error: 'Missing ID or IDs parameter' }, { status: 400 });
        }

        if (id) {
            await prisma.offers.update({
                where: { id: parseInt(id) },
                data: { status: 'deleted' }
            });
        } else {
            await prisma.offers.updateMany({
                where: { id: { in: ids.map(i => parseInt(i)) } },
                data: { status: 'deleted' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting coupon (soft delete):', error);
        return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }
}
