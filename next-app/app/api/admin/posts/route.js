import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Adjust path if needed: lib/prisma.js is at root/lib/prisma.js -> ../../../../lib/prisma.js from app/api/admin/posts

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract params
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const instituteId = searchParams.get('institute_id');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || ''; // 'published', 'draft', 'deleted'
        const accessControl = searchParams.get('access_control'); // 'Public', 'Private'
        const featured = searchParams.get('featured'); // 'true'

        const categoryId = searchParams.get('category_id');
        const tags = searchParams.get('tags'); // comma separated ids
        const sortBy = searchParams.get('sort_by') || 'newest';

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const skip = (page - 1) * limit;

        // Build Base Where Clause (Common for stats and main query)
        const baseWhere = {
            institute_id: parseInt(instituteId),
        };

        // Search Logic
        if (search) {
            baseWhere.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { summary: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Category Filter
        if (categoryId) {
            baseWhere.category_id = parseInt(categoryId);
        }

        // Tags Filter
        if (tags) {
            const tagIds = tags.split(',').map(Number).filter(Boolean);
            if (tagIds.length > 0) {
                baseWhere.post_tags = {
                    some: {
                        tag_id: { in: tagIds }
                    }
                };
            }
        }

        // Main Query Where Clause
        const where = { ...baseWhere };

        // Status Logic for Main Query
        if (status === 'deleted') {
            where.is_deleted = true;
        } else {
            where.is_deleted = false;
            if (status) {
                where.status = status; // 'published' or 'draft'
            }
            // Access Control Filter
            if (accessControl) {
                where.access_control = accessControl;
            }
            // Featured Filter
            if (featured === 'true') {
                where.is_featured = true;
            }
        }

        // Sorting
        let orderBy = {};
        switch (sortBy) {
            case 'newest':
                orderBy = { publication_date: 'desc' };
                break;
            case 'oldest':
                orderBy = { publication_date: 'asc' };
                break;
            case 'title_asc':
                orderBy = { title: 'asc' };
                break;
            case 'title_desc':
                orderBy = { title: 'desc' };
                break;
            default:
                orderBy = { publication_date: 'desc' };
        }

        // Stats Base Where (Non-deleted)
        const statsBase = { ...baseWhere, is_deleted: false };

        // Execute Queries
        const [posts, total, publishedCount, draftCount, publicCount, privateCount, featuredCount, totalStatsCount] = await Promise.all([
            prisma.posts.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    post_tags: {
                        include: {
                            tags: true
                        }
                    },
                    post_batches: true,
                }
            }),
            prisma.posts.count({ where }),
            prisma.posts.count({ where: { ...statsBase, status: 'published' } }),
            prisma.posts.count({ where: { ...statsBase, status: 'draft' } }),
            prisma.posts.count({ where: { ...statsBase, access_control: 'Public' } }),
            prisma.posts.count({ where: { ...statsBase, access_control: 'Private' } }),
            prisma.posts.count({ where: { ...statsBase, is_featured: true } }),
            prisma.posts.count({ where: statsBase })
        ]);

        // Format response similar to PostContext transformation
        const formattedPosts = posts.map(post => ({
            ...post,
            institute_id: post.institute_id?.toString(), // Serialize BigInt
            id: post.id,
            title: post.title,
            batches: post.post_batches.map(pb => pb.batch_id),
            post_tags: post.post_tags
                .filter(pt => pt.tags)
                .map(pt => ({
                    ...pt.tags,
                    institute_id: pt.tags.institute_id?.toString()
                })),
            commentCount: 0,
            _count: undefined,
            post_batches: undefined,
        }));

        return NextResponse.json({
            posts: formattedPosts,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            stats: {
                published: publishedCount,
                draft: draftCount,
                public: publicCount,
                private: privateCount,
                featured: featuredCount,
                total: totalStatsCount
            }
        });

    } catch (error) {
        console.error('API Admin Posts Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            title,
            content,
            summary,
            description,
            cover_image,
            status = 'draft',
            institute_id = 10,
            category_id,
            tags = [],
            slug,
            access_control = 'Public',
            allow_comments = true,
            is_featured = false,
            publication_date,
            batches = [],
            allowed_products = [],
            product_name
        } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Generate slug if not provided
        let finalSlug = slug;
        if (!finalSlug) {
            finalSlug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            const uniqueSuffix = Date.now().toString(36).slice(-4);
            finalSlug = `${finalSlug}-${uniqueSuffix}`;
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

        // Create post with all fields
        const newPost = await prisma.posts.create({
            data: {
                title,
                content,
                summary: summary || description,
                description: description || summary,
                cover_image,
                status,
                institute_id: BigInt(institute_id),
                category_id: category_id ? parseInt(category_id) : undefined,
                slug: finalSlug,
                publication_date: publication_date ? new Date(publication_date) : new Date(),
                access_control,
                allow_comments: String(allow_comments).toLowerCase() === 'true',
                is_featured: String(is_featured).toLowerCase() === 'true',
                product_name,
                allowed_products: allowed_products.map(Number),
                is_deleted: false,
                // Handle tags if provided
                post_tags: tagIds.length > 0 ? {
                    create: tagIds.map(tagId => ({
                        tag_id: tagId,
                        institute_id: BigInt(institute_id)
                    }))
                } : undefined,
                // Handle batches if provided
                post_batches: batchIds.length > 0 ? {
                    create: batchIds.map(batchId => ({
                        batch_id: batchId,
                        institute_id: BigInt(institute_id)
                    }))
                } : undefined
            }
        });

        // Convert BigInt to string for JSON serialization
        const serializedPost = {
            ...newPost,
            institute_id: newPost.institute_id.toString()
        };

        return NextResponse.json({ success: true, post: serializedPost });

    } catch (error) {
        console.error('API Admin Posts Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json();
        const { ids, updates } = body;
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id') || body.institute_id;

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        // Support both {ids: [], updates: {}} and flat {ids: 1, status: ''} for easier n8n integration
        const finalIds = Array.isArray(ids) ? ids : [ids];
        const updateSource = updates || body;

        if (!Array.isArray(finalIds) || finalIds.filter(Boolean).length === 0) {
            return NextResponse.json({ error: 'Post IDs are required' }, { status: 400 });
        }

        // Filter valid updates to avoid unintended field modifications
        const allowedUpdates = {};
        if (updateSource) {
            if (typeof updateSource.status === 'string') allowedUpdates.status = updateSource.status;
            if (typeof updateSource.is_deleted === 'boolean') allowedUpdates.is_deleted = updateSource.is_deleted;
            if (typeof updateSource.is_featured === 'boolean') allowedUpdates.is_featured = updateSource.is_featured;
            if (typeof updateSource.access_control === 'string') allowedUpdates.access_control = updateSource.access_control;
            if (typeof updateSource.cover_image === 'string') allowedUpdates.cover_image = updateSource.cover_image;
            if (typeof updateSource.title === 'string') allowedUpdates.title = updateSource.title;
            if (typeof updateSource.category_id !== 'undefined') allowedUpdates.category_id = updateSource.category_id ? parseInt(updateSource.category_id) : null;
        }

        const result = await prisma.posts.updateMany({
            where: {
                id: { in: finalIds.map(Number) },
                institute_id: BigInt(instituteId)
            },
            data: allowedUpdates
        });

        return NextResponse.json({
            success: true,
            count: result.count
        });

    } catch (error) {
        console.error('API Admin Posts Bulk Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
