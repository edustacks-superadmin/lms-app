const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTamilSubjects() {
    try {
        console.log('🔄 Updating Tamil subject relationships...\n');

        // First, find the parent தமிழ்மொழி
        const parent = await prisma.subjects.findFirst({
            where: { name: 'தமிழ்மொழி' }
        });

        if (!parent) {
            console.log('❌ Parent subject "தமிழ்மொழி" not found in database');
            return;
        }

        console.log(`✅ Found parent: தமிழ்மொழி (ID: ${parent.id})`);

        // Child subjects to link
        const children = ['கலைச்சொல்', 'பிரித்து எழுதுக'];

        let updated = 0;
        let notFound = 0;

        for (const childName of children) {
            const child = await prisma.subjects.findFirst({
                where: { name: childName }
            });

            if (!child) {
                console.log(`  ⚠️  Child subject not found: ${childName}`);
                notFound++;
                continue;
            }

            // Update the child to link to parent
            await prisma.subjects.update({
                where: { id: child.id },
                data: { parent_id: parent.id }
            });

            console.log(`  ✅ Linked: ${childName} → தமிழ்மொழி`);
            updated++;
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Updated: ${updated} Tamil subjects`);
        console.log(`⚠️  Not found: ${notFound}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Update failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTamilSubjects();
