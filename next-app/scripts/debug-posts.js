const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching latest posts...');
    const posts = await prisma.posts.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            title: true,
            cover_image: true,
            created_at: true
        }
    });

    console.log(`Fetched ${posts.length} posts.`);
    fs.writeFileSync('posts_debug.json', JSON.stringify(posts, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
        , 2));
    console.log('Written to posts_debug.json');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
