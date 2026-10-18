import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('instituteId');

    if (!instituteId) {
        return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    try {
        // Use raw SQL to avoid BigInt serialization issues
        const products = await prisma.$queryRawUnsafe(
            `SELECT * FROM "products" WHERE "institute_id" = $1 ORDER BY "created_at" DESC`,
            parseInt(instituteId)
        );

        console.log(`Debug Products API: Found ${products.length} products for institute ${instituteId}`);

        // Fetch tags for all products
        const productIds = products.map(p => p.id);
        let productTagsMap = {};

        if (productIds.length > 0) {
            console.log('Debug Products API: Fetching tags for IDs:', productIds);

            // Use raw SQL to avoid stale Prisma Client issues
            const productTags = await prisma.$queryRawUnsafe(
                `SELECT pt.product_id, t.id as tag_id, t.name as tag_name, t.color as tag_color 
                 FROM "product_tags" pt 
                 JOIN "tags" t ON pt.tag_id = t.id 
                 WHERE pt.product_id IN (${productIds.join(',')})`
            );

            console.log(`Debug Products API: Found ${productTags.length} tags`);

            // Group tags by product_id
            productTags.forEach(pt => {
                const pId = pt.product_id;
                if (!productTagsMap[pId]) {
                    productTagsMap[pId] = [];
                }
                productTagsMap[pId].push({
                    id: pt.tag_id,
                    name: pt.tag_name,
                    color: pt.tag_color
                });
            });
        }

        // Merge tags into products and serialize BigInts
        const serializedProducts = products.map(product => {
            const serialized = JSON.parse(JSON.stringify(product, (key, value) =>
                typeof value === 'bigint'
                    ? value.toString()
                    : value
            ));
            serialized.product_tags = productTagsMap[product.id] || [];
            return serialized;
        });

        return NextResponse.json(serializedProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
