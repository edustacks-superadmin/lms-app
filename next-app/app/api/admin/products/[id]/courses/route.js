import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch courses linked to this product (Bundle Content)
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        if (isNaN(productId)) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const searchQuery = searchParams.get('search') || '';

        // 1. Fetch ALREADY LINKED courses (always return these regardless of search)
        const linkedCourses = await prisma.courses.findMany({
            where: {
                allowed_products: {
                    has: productId
                }
            },
            select: {
                id: true,
                title: true
            }
        });

        // 2. Fetch AVAILABLE courses (filtered by search if present)
        const whereClause = {};
        if (searchQuery) {
            whereClause.title = {
                contains: searchQuery,
                mode: 'insensitive'
            };
        }

        const availableCourses = await prisma.courses.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true
            },
            take: 100, // Limit results
            orderBy: { title: 'asc' }
        });

        return NextResponse.json({
            linkedCourses: linkedCourses,
            availableCourses: availableCourses
        });

    } catch (error) {
        console.error('Error fetching bundle content:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Update linked courses (Set Bundle Content)
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const productId = parseInt(id);
        const { courseIds } = await req.json(); // Array of selected course IDs

        if (isNaN(productId) || !Array.isArray(courseIds)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // Transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            // 1. Unlink this product from ALL courses first (Clear previous bundle)
            // We can't easily "remove from array" in one generic update query in Prisma + Postgres Array yet without raw query.
            // So we will do it in two steps:
            // Find all courses currently having this product
            const currentCourses = await tx.courses.findMany({
                where: { allowed_products: { has: productId } },
                select: { id: true, allowed_products: true }
            });

            for (const course of currentCourses) {
                const newAllowed = course.allowed_products.filter(pid => pid !== productId);
                await tx.courses.update({
                    where: { id: course.id },
                    data: { allowed_products: newAllowed }
                });
            }

            // 2. Link this product to the NEW selected courses
            const coursesToLink = await tx.courses.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, allowed_products: true }
            });

            for (const course of coursesToLink) {
                // Avoid duplicates
                if (!course.allowed_products.includes(productId)) {
                    await tx.courses.update({
                        where: { id: course.id },
                        data: { allowed_products: { push: productId } }
                    });
                }
            }
        });

        return NextResponse.json({ success: true, message: 'Bundle updated successfully' });

    } catch (error) {
        console.error('Error updating bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
