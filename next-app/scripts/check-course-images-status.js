
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const supabaseCount = await prisma.courses.count({
            where: { image: { contains: 'course-images' } },
        });

        const r2Count = await prisma.courses.count({
            where: { image: { contains: 'r2.dev' } }
        });

        const totalWithImage = await prisma.courses.count({
            where: { image: { not: null } }
        });

        console.log(`Found ${supabaseCount} courses using Supabase 'course-images'.`);
        console.log(`Found ${r2Count} courses using R2 images.`);
        console.log(`Total courses with images: ${totalWithImage}`);

    } catch (error) {
        console.error('Error checking courses:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
