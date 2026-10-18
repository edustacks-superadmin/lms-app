import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const tagsColumns = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tags'
            ORDER BY ordinal_position;
        `);

        const courseTagsColumns = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'course_tags'
            ORDER BY ordinal_position;
        `);

        const tagsData = await prisma.$queryRawUnsafe(`SELECT * FROM "tags" LIMIT 5;`);
        const courseTagsData = await prisma.$queryRawUnsafe(`SELECT * FROM "course_tags" LIMIT 5;`);

        // Serialize BigInt
        const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({
            tags: {
                columns: tagsColumns,
                sampleData: serialize(tagsData)
            },
            course_tags: {
                columns: courseTagsColumns,
                sampleData: serialize(courseTagsData)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
