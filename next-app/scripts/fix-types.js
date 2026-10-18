const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertTypes() {
    console.log('Reverting type="pdf" back to "file" for R2 migrated content...');

    // Find all content that has an R2 URL and type='pdf'
    // Assuming we only want to fix the ones we just touched. 
    // But safely, if the frontend expects 'file', we should probably revert all 'pdf' types if they are actually files.

    const count = await prisma.chapter_contents.updateMany({
        where: {
            type: 'pdf',
            url: {
                contains: 'r2.dev'
            }
        },
        data: {
            type: 'file'
        }
    });

    console.log(`Reverted ${count.count} records from 'pdf' to 'file'.`);
}

revertTypes()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
