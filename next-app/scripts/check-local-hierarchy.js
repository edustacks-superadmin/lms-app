const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Searching for course "Code: 398"...');
        const course = await prisma.courses.findFirst({
            where: {
                title: { contains: '398' }
            }
        });

        if (!course) {
            console.log('Course not found.');
            return;
        }

        console.log(`Found Course: ${course.title} (ID: ${course.id}, Testpress ID: ${course.testpress_id})`);

        // Get all chapters for this course
        const chapters = await prisma.chapters.findMany({
            where: { course_id: course.id },
            orderBy: { order: 'asc' }
        });

        console.log(`Total local chapters: ${chapters.length}`);

        // Find "TNPSC-AE" chapter
        const parentChapter = chapters.find(c => c.name.includes('TNPSC-AE'));
        if (parentChapter) {
            console.log(`\nParent Chapter: ${parentChapter.name} (ID: ${parentChapter.id}, TP_ID: ${parentChapter.testpress_id})`);

            // Check for children in DB
            const children = await prisma.chapters.findMany({
                where: { parent_id: parentChapter.id }
            });
            console.log(`Children found in DB via parent_id: ${children.length}`);
            children.forEach(c => console.log(` - ${c.name} (${c.id})`));
        } else {
            console.log('Parent chapter "TNPSC-AE" not found locally.');
        }

        // Check if "Strength of Materials" exists and what its parent is
        const som = chapters.find(c => c.name.includes('Strength of Materials'));
        if (som) {
            console.log(`\nCheck "Strength of Materials": ID=${som.id}, ParentID=${som.parent_id}, TP_ID=${som.testpress_id}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
