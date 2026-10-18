import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        console.log('Starting categories UUID to Int migration...');

        // Step 1: Create new table with Int ID
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "categories_new" (
                "id" SERIAL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "color" TEXT,
                "is_starred" BOOLEAN DEFAULT FALSE,
                "created_at" TIMESTAMPTZ DEFAULT NOW(),
                "institute_id" BIGINT DEFAULT 10
            );
        `);
        console.log('✓ Created categories_new table');

        // Step 2: Copy data from old table
        await prisma.$executeRawUnsafe(`
            INSERT INTO "categories_new" (name, color, is_starred, created_at, institute_id)
            SELECT name, color, is_starred, created_at, institute_id
            FROM "categories"
            WHERE TRUE
            ON CONFLICT DO NOTHING;
        `);
        console.log('✓ Copied data to categories_new');

        // Step 3: Drop old table
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "categories" CASCADE;`);
        console.log('✓ Dropped old categories table');

        // Step 4: Rename new table
        await prisma.$executeRawUnsafe(`ALTER TABLE "categories_new" RENAME TO "categories";`);
        console.log('✓ Renamed categories_new to categories');

        return NextResponse.json({
            success: true,
            message: 'Categories table successfully migrated from UUID to Int'
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
