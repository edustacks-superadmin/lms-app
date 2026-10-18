import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        console.log('Starting comprehensive UUID to Int migration...');

        const tables = [
            'categories',
            'content_progress',
            'post_categories',
            'post_comments',
            'folders'
        ];

        const results = [];

        for (const tableName of tables) {
            try {
                // Check if table exists
                const tableExists = await prisma.$queryRawUnsafe(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '${tableName}'
                    );
                `);

                if (!tableExists[0].exists) {
                    results.push({ table: tableName, status: 'skipped', reason: 'does not exist' });
                    continue;
                }

                // Check if already Int
                const columnInfo = await prisma.$queryRawUnsafe(`
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '${tableName}' 
                    AND column_name = 'id';
                `);

                if (columnInfo[0]?.data_type === 'integer') {
                    results.push({ table: tableName, status: 'already_int' });
                    continue;
                }

                console.log(`Migrating ${tableName}...`);

                // Get all columns
                const columns = await prisma.$queryRawUnsafe(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '${tableName}'
                    AND column_name != 'id'
                    ORDER BY ordinal_position;
                `);

                // Build column definitions
                const columnDefs = columns.map(col => {
                    let def = `"${col.column_name}" `;

                    // Map data types
                    if (col.data_type === 'text') def += 'TEXT';
                    else if (col.data_type === 'character varying') def += 'VARCHAR';
                    else if (col.data_type === 'integer') def += 'INT';
                    else if (col.data_type === 'bigint') def += 'BIGINT';
                    else if (col.data_type === 'boolean') def += 'BOOLEAN';
                    else if (col.data_type === 'timestamp with time zone') def += 'TIMESTAMPTZ';
                    else if (col.data_type === 'timestamp without time zone') def += 'TIMESTAMP';
                    else if (col.data_type === 'uuid') def += 'UUID';
                    else if (col.data_type === 'json') def += 'JSON';
                    else if (col.data_type === 'jsonb') def += 'JSONB';
                    else def += col.data_type.toUpperCase();

                    // Add NOT NULL if applicable
                    if (col.is_nullable === 'NO') def += ' NOT NULL';

                    // Add DEFAULT if exists
                    if (col.column_default && !col.column_default.includes('nextval')) {
                        def += ` DEFAULT ${col.column_default}`;
                    }

                    return def;
                }).join(',\n                ');

                // Step 1: Create new table
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE "${tableName}_new" (
                        "id" SERIAL PRIMARY KEY,
                        ${columnDefs}
                    );
                `);

                // Step 2: Copy data
                const columnNames = columns.map(c => `"${c.column_name}"`).join(', ');
                await prisma.$executeRawUnsafe(`
                    INSERT INTO "${tableName}_new" (${columnNames})
                    SELECT ${columnNames}
                    FROM "${tableName}";
                `);

                // Step 3: Drop old table
                await prisma.$executeRawUnsafe(`DROP TABLE "${tableName}" CASCADE;`);

                // Step 4: Rename
                await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}_new" RENAME TO "${tableName}";`);

                results.push({ table: tableName, status: 'success' });
                console.log(`✓ Migrated ${tableName}`);

            } catch (error) {
                results.push({ table: tableName, status: 'error', error: error.message });
                console.error(`✗ Error migrating ${tableName}:`, error.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Migration completed',
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
