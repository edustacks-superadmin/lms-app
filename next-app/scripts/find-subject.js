const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findSubject() {
    try {
        const subjects = await prisma.subjects.findMany({
            where: {
                name: { contains: '590' }
            },
            select: { id: true, name: true, testpress_id: true }
        });

        console.log('Subjects matching "590":');
        subjects.forEach(s => {
            console.log(`  ID: ${s.id}, Name: ${s.name}, Testpress ID: ${s.testpress_id}`);
        });

        if (subjects.length === 0) {
            console.log('\nNo subjects found matching "590"');
            console.log('\nSearching for "590 U1" specifically:');

            const u1Subjects = await prisma.subjects.findMany({
                where: {
                    OR: [
                        { name: { contains: 'U1' } },
                        { name: { contains: '590' } }
                    ]
                },
                select: { id: true, name: true },
                take: 20
            });

            u1Subjects.forEach(s => {
                console.log(`  ID: ${s.id}, Name: ${s.name}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

findSubject();
