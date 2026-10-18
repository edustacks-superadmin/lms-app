const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importTamilSubjects() {
    try {
        const subjects = JSON.parse(
            fs.readFileSync(path.join(__dirname, '..', 'tamil-subjects.json'), 'utf8')
        );

        console.log(`🚀 Importing ${subjects.length} Tamil subjects...\n`);

        let imported = 0;
        let updated = 0;

        for (const subject of subjects) {
            // Find parent if specified
            let parentId = null;
            if (subject.parent_name) {
                const parent = await prisma.$queryRaw`
                    SELECT id FROM subjects WHERE name = ${subject.parent_name} LIMIT 1
                `;
                parentId = parent[0]?.id || null;

                if (!parentId) {
                    console.log(`  ⚠️  Parent "${subject.parent_name}" not found for ${subject.name}`);
                }
            }

            // Check if subject exists
            const existing = await prisma.$queryRaw`
                SELECT id FROM subjects WHERE testpress_id = ${subject.testpress_id} LIMIT 1
            `;

            if (existing && existing.length > 0) {
                // Update existing
                await prisma.$executeRaw`
                    UPDATE subjects 
                    SET name = ${subject.name}, parent_id = ${parentId}
                    WHERE testpress_id = ${subject.testpress_id}
                `;
                console.log(`  ♻️  Updated: ${subject.name} → ${subject.parent_name || 'no parent'}`);
                updated++;
            } else {
                // Create new subject
                await prisma.$executeRaw`
                    INSERT INTO subjects (name, testpress_id, parent_id, institute_id, created_at)
                    VALUES (${subject.name}, ${subject.testpress_id}, ${parentId}, 10, NOW())
                `;
                console.log(`  ✅ Created: ${subject.name} → ${subject.parent_name || 'no parent'}`);
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

        console.log('\n✅ Tamil subjects imported and linked!');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

importTamilSubjects();
