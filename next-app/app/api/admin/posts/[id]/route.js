import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId') || searchParams.get('institute_id');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const post = await prisma.posts.findUnique({
            where: {
                id: parseInt(id),
                institute_id: BigInt(instituteId)
            },
            include: {
                post_batches: true,
                post_tags: {
                    include: {
                        tags: {
                            select: { id: true, name: true, color: true }
                        }
                    }
                }
            }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
        }

        let categoryData = null;
        if (post.category_id) {
            categoryData = await prisma.categories.findUnique({
                where: { id: post.category_id },
                select: { id: true, name: true, color: true }
            });
        }

        // Serialize BigInt
        const serialized = {
            ...post,
            institute_id: post.institute_id.toString(),
            categoryName: categoryData?.name || 'Uncategorized',
            categoryColor: categoryData?.color || '#00838f',
            // Transform post_tags to include tag details directly
            post_tags: post.post_tags.map(pt => ({
                id: pt.tags.id,
                name: pt.tags.name,
                color: pt.tags.color
            })),
            allowedProducts: post.allowed_products || [],
            batches: post.post_batches?.map(pb => pb.batch_id) || [],
            // Ensure dates are strings
            created_at: post.created_at.toISOString(),
            updated_at: post.updated_at?.toISOString()
        };

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('API Get Post Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId') || searchParams.get('institute_id');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        // Verify ownership/existence first (optional but good for debugging 404s)
        const existing = await prisma.posts.findFirst({
            where: { id: parseInt(id), institute_id: BigInt(instituteId) }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
        }

        const {
            title, content, summary, description, cover_image, status, category_id,
            slug, access_control, allow_comments, is_featured,
            publication_date, batches, allowed_products, tags, product_name,
            is_deleted
        } = body;

        // Construct update data
        const updateData = {
            title,
            content,
            summary: summary || description,
            description: description || summary,
            cover_image,
            status,
            category_id: category_id ? parseInt(category_id) : null,
            slug,
            access_control,
            allow_comments: typeof allow_comments === 'boolean' ? allow_comments : (String(allow_comments).toLowerCase() === 'true'),
            is_featured: typeof is_featured === 'boolean' ? is_featured : (String(is_featured).toLowerCase() === 'true'),
            product_name,
            allowed_products: Array.isArray(allowed_products) ? allowed_products.map(Number) : undefined,
            publication_date: publication_date ? new Date(publication_date) : undefined
        };

        // Handle optional boolean for soft delete/restore
        if (typeof is_deleted === 'boolean') {
            updateData.is_deleted = is_deleted;
        }

        // Helper to parse comma-separated or array inputs
        const parseIds = (input) => {
            if (!input) return [];
            if (Array.isArray(input)) return input.map(Number).filter(Boolean);
            if (typeof input === 'string') return input.split(',').map(s => parseInt(s.trim())).filter(Boolean);
            return [];
        };

        const tagIds = parseIds(tags);
        const batchIds = parseIds(batches);

        // Use transaction for relations update
        const updatedPost = await prisma.$transaction(async (tx) => {
            // 1. Update Post
            const post = await tx.posts.update({
                where: { id: parseInt(id) },
                data: updateData
            });

            // 2. Update Batches (if provided)
            if (batches) {
                await tx.post_batches.deleteMany({ where: { post_id: post.id } });
                if (batchIds.length > 0) {
                    await tx.post_batches.createMany({
                        data: batchIds.map(bid => ({
                            post_id: post.id,
                            batch_id: bid,
                            institute_id: BigInt(instituteId)
                        }))
                    });
                }
            }

            // 3. Update Tags (if provided)
            if (tags) {
                await tx.post_tags.deleteMany({ where: { post_id: post.id } });
                if (tagIds.length > 0) {
                    await tx.post_tags.createMany({
                        data: tagIds.map(tid => ({
                            post_id: post.id,
                            tag_id: tid,
                            institute_id: BigInt(instituteId)
                        }))
                    });
                }
            }

            return post;
        });

        const serialized = JSON.parse(JSON.stringify(updatedPost, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, post: serialized });

    } catch (error) {
        console.error('API Update Post Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId') || searchParams.get('institute_id');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        // Verify existence
        const post = await prisma.posts.findFirst({
            where: { id: parseInt(id), institute_id: BigInt(instituteId) }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Delete relations first (Prisma sometimes expects this unless cascade is set up perfectly in DB)
        // Check schema for cascade. Assuming logic: best to delete relations.
        await prisma.post_batches.deleteMany({ where: { post_id: parseInt(id) } });
        await prisma.post_tags.deleteMany({ where: { post_id: parseInt(id) } });

        await prisma.posts.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(instituteId)
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Delete Post Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
