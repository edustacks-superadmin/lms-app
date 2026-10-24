import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        console.log('API: Updating product', id, 'with body:', body);

        // Parse ID to integer
        const idInt = parseInt(id, 10);

        if (isNaN(idInt)) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        // Extract tagIds and syncEnrollments separately
        const { id: _, tagIds, syncEnrollments, ...rawBody } = body;

        // Proper type casting and cleaning for Prisma
        const updateData = {
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
            // Handle email template id - Parse as Int for new schema
            email_template_id: rawBody.email_template_id ? parseInt(rawBody.email_template_id) : null,
        };

        // Remove the old 'tags' text array field from updateData since we're now using junction table
        delete updateData.tags;

        // Remove NaN if parseInt failed
        if (isNaN(updateData.category_id)) updateData.category_id = null;
        if (isNaN(updateData.parent_product_id)) updateData.parent_product_id = null;
        if (isNaN(updateData.email_template_id)) updateData.email_template_id = null;

        // Dynamic SQL construction to bypass Prisma Client validation schema mismatch
        const keys = Object.keys(updateData);

        if (keys.length > 0) {
            const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
            const values = keys.map(key => updateData[key]);

            // $1 is the ID
            const query = `UPDATE "products" SET ${setClause} WHERE "id" = $1`;

            await prisma.$executeRawUnsafe(query, idInt, ...values);
        }

        // Handle product_tags junction table
        // Handle product_tags junction table
        if (tagIds !== undefined) {
            // Delete existing tag associations using Raw SQL
            await prisma.$executeRawUnsafe(
                `DELETE FROM "product_tags" WHERE "product_id" = $1`,
                idInt
            );

            // Insert new tag associations using Raw SQL
            if (tagIds && tagIds.length > 0) {
                // Construct VALUES string: (id, tag1), (id, tag2)
                const values = tagIds.map(tagId => `(${idInt}, ${parseInt(tagId)})`).join(', ');
                await prisma.$executeRawUnsafe(
                    `INSERT INTO "product_tags" ("product_id", "tag_id") VALUES ${values}`
                );
            }
        }

        // If syncEnrollments is true, update existing active enrollments with new expiry
        if (syncEnrollments && updateData.validity_type) {
            try {
                let newExpiresAt = null;
                if (updateData.validity_type === 'Fixed (calendar date)' && updateData.validity) {
                    newExpiresAt = new Date(`${updateData.validity}T23:59:59.999Z`).toISOString();
                } else if (updateData.validity_type === 'Relative (in days)' && updateData.validity) {
                    const days = parseInt(updateData.validity, 10);
                    if (!isNaN(days) && days > 0) {
                        newExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
                    }
                }

                const { data: linkedCourses } = await supabaseAdmin
                    .from('courses')
                    .select('id')
                    .contains('allowed_products', [idInt]);

                if (linkedCourses && linkedCourses.length > 0) {
                    const courseIds = linkedCourses.map(c => c.id);
                    await supabaseAdmin
                        .from('enrollments')
                        .update({ expires_at: newExpiresAt })
                        .in('course_id', courseIds)
                        .eq('status', 'active');
                }
            } catch (syncErr) {
                console.warn('Error syncing enrollments for product update:', syncErr.message);
            }
        }

        // Fetch the updated product with tags
        const result = await prisma.$queryRawUnsafe(`SELECT * FROM "products" WHERE "id" = $1`, idInt);
        let updatedProduct = result[0];

        // Fetch associated tags via Raw SQL
        const productTags = await prisma.$queryRawUnsafe(
            `SELECT pt.tag_id, t.name as tag_name, t.color as tag_color 
             FROM "product_tags" pt 
             JOIN "tags" t ON pt.tag_id = t.id 
             WHERE pt.product_id = $1`,
            idInt
        );

        // Handle BigInt serialization
        if (updatedProduct) {
            updatedProduct = JSON.parse(JSON.stringify(updatedProduct, (key, value) =>
                typeof value === 'bigint'
                    ? value.toString()
                    : value // return everything else unchanged
            ));
            // Add tags to response
            updatedProduct.product_tags = productTags.map(pt => ({
                id: pt.tag_id,
                name: pt.tag_name,
                color: pt.tag_color
            }));
        }

        console.log('Product updated successfully via Raw SQL');
        return NextResponse.json({ success: true, data: updatedProduct });
    } catch (error) {
        console.error('Server error updating product:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const idInt = parseInt(id, 10);

        if (isNaN(idInt)) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        await prisma.products.delete({
            where: { id: idInt }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
