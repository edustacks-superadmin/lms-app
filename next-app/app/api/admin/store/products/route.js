import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
    try {
        const body = await request.json();
        console.log('API: Creating new product with body:', body);

        // Extract tagIds separately as they're handled via junction table
        const { id, product_tags: tagIds, ...rawBody } = body;

        // Proper type casting and cleaning for Prisma
        const createData = {
            ...rawBody,
            category_id: rawBody.category_id ? parseInt(rawBody.category_id) : null,
            parent_product_id: rawBody.parent_product_id ? parseInt(rawBody.parent_product_id) : null,
            price: rawBody.price !== '' && rawBody.price !== null ? parseFloat(rawBody.price) : 0,
            strikethrough_price: rawBody.strikethrough_price !== '' && rawBody.strikethrough_price !== null ? parseFloat(rawBody.strikethrough_price) : null,
            // Handle dates: ensure they are null if empty string
            start_date: rawBody.start_date || null,
            end_date: rawBody.end_date || null,
            pricing_start_date: rawBody.pricing_start_date || null,
            pricing_end_date: rawBody.pricing_end_date || null,
            // Handle email template id
            email_template_id: rawBody.email_template_id ? parseInt(rawBody.email_template_id) : null,
        };

        // Remove NaN if parseInt failed
        if (isNaN(createData.category_id)) createData.category_id = null;
        if (isNaN(createData.parent_product_id)) createData.parent_product_id = null;
        if (isNaN(createData.email_template_id)) createData.email_template_id = null;

        // Create product using Prisma
        const newProduct = await prisma.products.create({
            data: createData
        });

        const newId = newProduct.id;

        // Handle product_tags junction table
        if (tagIds && tagIds.length > 0) {
            // Insert tag associations using Raw SQL (standard pattern in this project)
            const values = tagIds.map(tagId => `(${newId}, ${parseInt(tagId)})`).join(', ');
            await prisma.$executeRawUnsafe(
                `INSERT INTO "product_tags" ("product_id", "tag_id") VALUES ${values}`
            );
        }

        // Fetch back the product with tags for the response
        const productWithTags = await prisma.$queryRawUnsafe(`
            SELECT p.*,
            (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
             FROM "product_tags" pt
             JOIN "tags" t ON pt.tag_id = t.id
             WHERE pt.product_id = p.id) as product_tags
            FROM "products" p
            WHERE p.id = $1
        `, newId);

        let result = productWithTags[0];

        // Handle BigInt serialization
        if (result) {
            result = JSON.parse(JSON.stringify(result, (key, value) =>
                typeof value === 'bigint'
                    ? value.toString()
                    : value
            ));
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Server error creating product:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
