const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking gallery_items:', !!prisma.gallery_items);
    console.log('Checking galleryItems:', !!prisma.galleryItems);

    try {
        const count = await prisma.gallery_items.count();
        console.log('Count succeeded:', count);
    } catch (e) {
        console.log('Count failed:', e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
