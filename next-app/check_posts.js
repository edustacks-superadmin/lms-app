
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.posts.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
            id: true,
            title: true,
            cover_image: true,
            icon: true,
            slug: true
        }
    });
    console.log(JSON.stringify(posts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
