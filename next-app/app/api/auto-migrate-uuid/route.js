import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        console.log('Finding and migrating all UUID tables...');

        // Find all tables with UUID id column
        const uuidTables = await prisma.$queryRawUnsafe(`
            SELECT table_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND column_name = 'id' 
            AND data_type = 'uuid'
            ORDER BY table_name;
        `);

        const results = [];

        for (const { table_name } of uuidTables) {
            try {
                console.log(`\nMigrating ${table_name}...`);

                // Get all columns except id
                const columns = await prisma.$queryRawUnsafe(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    AND column_name != 'id'
                    ORDER BY ordinal_position;
                `, table_name);

                // Build column definitions
                const columnDefs = columns.map(col => {
                    let def = `"${col.column_name}" `;

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
                    else if (col.data_type === 'numeric') def += 'NUMERIC';
                    else if (col.data_type === 'ARRAY') def += 'INT[]';
                    else def += col.data_type.toUpperCase();

                    if (col.is_nullable === 'NO') def += ' NOT NULL';

                    if (col.column_default && !col.column_default.includes('nextval') && !col.column_default.includes('uuid_generate')) {
                        def += ` DEFAULT ${col.column_default}`;
                    } else if (col.column_default && col.column_default.includes('now()')) {
                        def += ' DEFAULT NOW()';
                    } else if (col.column_default && col.column_default.includes('false')) {
                        def += ' DEFAULT FALSE';
                    } else if (col.column_default && col.column_default.includes('true')) {
                        def += ' DEFAULT TRUE';
                    }

                    return def;
                }).join(',\n                ');

                // Create new table
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE "${table_name}_new" (
                        "id" SERIAL PRIMARY KEY${columnDefs ? ',\n                ' + columnDefs : ''}
                    );
                `);

                // Copy data
                const columnNames = columns.map(c => `"${c.column_name}"`).join(', ');
                if (columnNames) {
                    await prisma.$executeRawUnsafe(`
                        INSERT INTO "${table_name}_new" (${columnNames})
                        SELECT ${columnNames}
                        FROM "${table_name}";
                    `);
                }

                // Drop old table
                await prisma.$executeRawUnsafe(`DROP TABLE "${table_name}" CASCADE;`);

                // Rename
                await prisma.$executeRawUnsafe(`ALTER TABLE "${table_name}_new" RENAME TO "${table_name}";`);

                results.push({ table: table_name, status: 'success' });
                console.log(`✓ Migrated ${table_name}`);

            } catch (error) {
                results.push({ table: table_name, status: 'error', error: error.message });
                console.error(`✗ Error migrating ${table_name}:`, error.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Migrated ${results.filter(r => r.status === 'success').length} tables`,
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
