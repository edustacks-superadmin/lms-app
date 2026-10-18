import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        console.log('Finding and fixing all UUID foreign key columns...');

        // Find all UUID columns (not just id)
        const uuidColumns = await prisma.$queryRawUnsafe(`
            SELECT table_name, column_name
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND data_type = 'uuid'
            AND column_name != 'id'
            ORDER BY table_name, column_name;
        `);

        console.log('Found UUID columns:', uuidColumns);

        const results = [];

        for (const { table_name, column_name } of uuidColumns) {
            try {
                console.log(`\nConverting ${table_name}.${column_name} from UUID to INT...`);

                // Step 1: Drop any foreign key constraints
                const constraints = await prisma.$queryRawUnsafe(`
                    SELECT constraint_name
                    FROM information_schema.table_constraints
                    WHERE table_name = $1
                    AND constraint_type = 'FOREIGN KEY';
                `, table_name);

                for (const { constraint_name } of constraints) {
                    await prisma.$executeRawUnsafe(`
                        ALTER TABLE "${table_name}" DROP CONSTRAINT IF EXISTS "${constraint_name}";
                    `);
                }

                // Step 2: Clear the column data (can't convert UUID to Int directly)
                await prisma.$executeRawUnsafe(`
                    UPDATE "${table_name}" SET "${column_name}" = NULL;
                `);

                // Step 3: Change column type to INT
                await prisma.$executeRawUnsafe(`
                    ALTER TABLE "${table_name}" 
                    ALTER COLUMN "${column_name}" DROP DEFAULT,
                    ALTER COLUMN "${column_name}" TYPE INT USING NULL;
                `);

                results.push({
                    table: table_name,
                    column: column_name,
                    status: 'success'
                });
                console.log(`✓ Converted ${table_name}.${column_name}`);

            } catch (error) {
                results.push({
                    table: table_name,
                    column: column_name,
                    status: 'error',
                    error: error.message
                });
                console.error(`✗ Error converting ${table_name}.${column_name}:`, error.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Converted ${results.filter(r => r.status === 'success').length} UUID columns to Int`,
            results
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
