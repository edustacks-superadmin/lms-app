const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importGSSubjects() {
    try {
        const subjects = JSON.parse(
            fs.readFileSync(path.join(__dirname, '..', 'gs-subjects.json'), 'utf8')
        );

        console.log(`🚀 Importing ${subjects.length} General Studies subjects...\n`);

        let imported = 0;
        let updated = 0;

        for (const subject of subjects) {
            let parentId = null;
            if (subject.parent_name) {
                const parent = await prisma.$queryRaw`
                    SELECT id FROM subjects WHERE name = ${subject.parent_name} LIMIT 1
                `;
                parentId = parent[0]?.id || null;
            }

            // Check by testpress_id OR name to find existing
            const existing = await prisma.$queryRaw`
                SELECT id FROM subjects 
                WHERE testpress_id = ${subject.testpress_id} OR name = ${subject.name}
                LIMIT 1
            `;

            if (existing && existing.length > 0) {
                await prisma.$executeRaw`
                    UPDATE subjects 
                    SET name = ${subject.name}, parent_id = ${parentId}, testpress_id = ${subject.testpress_id}
                    WHERE id = ${existing[0].id}
                `;
                console.log(`  ♻️  Updated: ${subject.name} → ${subject.parent_name}`);
                updated++;
            } else {
                await prisma.$executeRaw`
                    INSERT INTO subjects (name, testpress_id, parent_id, institute_id, created_at)
                    VALUES (${subject.name}, ${subject.testpress_id}, ${parentId}, 10, NOW())
                `;
                console.log(`  ✅ Created: ${subject.name} → ${subject.parent_name}`);
                imported++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📈 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Created:  ${imported}`);
        console.log(`♻️  Updated:  ${updated}`);
        console.log(`📁 Total:    ${subjects.length}`);
        console.log('='.repeat(50));

        console.log('\n✅ General Studies subjects imported!');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

importGSSubjects();
