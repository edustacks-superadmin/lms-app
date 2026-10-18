import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Helper to create Supabase client for route handlers (web - cookie based)
async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Ignore errors in server components
                    }
                },
            },
        }
    );
}

// Helper to get user from request - supports both cookie auth (web) and Bearer token (mobile)
async function getUserFromRequest(request) {
    // First try Bearer token (mobile app)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
            return user;
        }
    }

    // Fall back to cookie auth (web)
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// GET - Fetch user's cart items
export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);

        if (!user) {
            return NextResponse.json({ items: [], count: 0 });
        }

        // Get member ID
        const member = await prisma.members.findFirst({
            where: {
                OR: [
                    { auth_user_id: user.id },
                    { email: user.email }
                ]
            },
            select: { id: true }
        });

        if (!member) {
            return NextResponse.json({ items: [], count: 0 });
        }

        // Get cart items with product details
        const cartItems = await prisma.cart_items.findMany({
            where: { member_id: member.id },
            include: {
                products: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        strikethrough_price: true,
                        image: true,
                        slug: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // Calculate total
        const total = cartItems.reduce((sum, item) => {
            return sum + (Number(item.products.price) || 0);
        }, 0);

        return NextResponse.json({
            items: cartItems.map(item => ({
                id: item.id,
                product_id: item.product_id,
                ...item.products
            })),
            count: cartItems.length,
            total
        });
    } catch (error) {
        console.error('Cart GET error:', error);
        return NextResponse.json({
            error: 'Failed to fetch cart',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

// POST - Add item to cart
export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);

        if (!user) {
            return NextResponse.json({ error: 'Please login to add items to cart' }, { status: 401 });
        }

        const { productId, productIds } = await request.json();

        if (!productId && (!productIds || !Array.isArray(productIds) || productIds.length === 0)) {
            return NextResponse.json({ error: 'Product ID or Product IDs array is required' }, { status: 400 });
        }

        // Get member ID
        const member = await prisma.members.findFirst({
            where: {
                OR: [
                    { auth_user_id: user.id },
                    { email: user.email }
                ]
            },
            select: { id: true, institute_id: true }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Handle single product addition
        if (productId) {
            const product = await prisma.products.findUnique({
                where: { id: parseInt(productId) },
                select: { id: true, title: true }
            });

            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            const cartItem = await prisma.cart_items.upsert({
                where: {
                    member_id_product_id: {
                        member_id: member.id,
                        product_id: parseInt(productId)
                    }
                },
                update: {},
                create: {
                    member_id: member.id,
                    product_id: parseInt(productId),
                    institute_id: member.institute_id || 10
                }
            });

            const count = await prisma.cart_items.count({
                where: { member_id: member.id }
            });

            return NextResponse.json({
                success: true,
                message: `${product.title} added to cart`,
                cartItemId: cartItem.id,
                count
            });
        }

        // Handle bulk addition
        if (productIds && Array.isArray(productIds)) {
            const numericIds = productIds.map(id => parseInt(id)).filter(id => !isNaN(id));

            // Filter out products already in cart to avoid unique constraint violations
            const existingItems = await prisma.cart_items.findMany({
                where: {
                    member_id: member.id,
                    product_id: { in: numericIds }
                },
                select: { product_id: true }
            });

            const existingIds = new Set(existingItems.map(item => item.product_id));
            const newIds = numericIds.filter(id => !existingIds.has(id));

            if (newIds.length > 0) {
                await prisma.cart_items.createMany({
                    data: newIds.map(pid => ({
                        member_id: member.id,
                        product_id: pid,
                        institute_id: member.institute_id || 10
                    })),
                    skipDuplicates: true
                });
            }

            const count = await prisma.cart_items.count({
                where: { member_id: member.id }
            });

            return NextResponse.json({
                success: true,
                message: `${newIds.length} items added to cart`,
                count
            });
        }
    } catch (error) {
        console.error('Cart POST error:', error);
        return NextResponse.json({
            error: 'Failed to add to cart',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

// DELETE - Remove item from cart (by product ID in body)
export async function DELETE(request) {
    try {
        const user = await getUserFromRequest(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productId, clearAll } = await request.json();

        // Get member ID
        const member = await prisma.members.findFirst({
            where: {
                OR: [
                    { auth_user_id: user.id },
                    { email: user.email }
                ]
            },
            select: { id: true }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        if (clearAll) {
            // Delete all items for this member
            await prisma.cart_items.deleteMany({
                where: { member_id: member.id }
            });

            return NextResponse.json({
                success: true,
                message: 'Cart cleared successfully',
                count: 0
            });
        }

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        // Delete specific cart item
        await prisma.cart_items.deleteMany({
            where: {
                member_id: member.id,
                product_id: parseInt(productId)
            }
        });

        // Get updated cart count
        const count = await prisma.cart_items.count({
            where: { member_id: member.id }
        });

        return NextResponse.json({
            success: true,
            message: 'Item removed from cart',
            count
        });
    } catch (error) {
        console.error('Cart DELETE error:', error);
        return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
    }
}
