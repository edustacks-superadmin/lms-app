import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        if (isNaN(productId)) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
        }

        // 1. Fetch courses linked to this product (Bundle Content)
        // We find courses where allowed_products (array) contains the productId
        const courses = await prisma.courses.findMany({
            where: {
                allowed_products: {
                    has: productId
                }
            },
            select: {
                id: true,
                title: true,
                chapters: {
                    orderBy: {
                        order: 'asc'
                    },
                    select: {
                        id: true,
                        name: true,
                        icon: true,
                        parent_id: true,
                        chapter_contents: {
                            orderBy: {
                                order: 'asc'
                            },
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                free_preview: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                title: 'asc' // Or added_at if available
            }
        });

        return NextResponse.json(courses);

    } catch (error) {
        console.error('Error fetching product curriculum:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
