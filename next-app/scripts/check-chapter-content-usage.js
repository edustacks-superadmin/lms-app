const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkChapterContentUsage() {
    try {
        console.log('Checking for usage of "chapter-content" bucket in database...');

        const SUPABASE_URL_PART = 'supabase'; // Rough check for supabase domain

        // Check chapter_contents table (url)
        console.log('Querying chapter_contents table...');
        const allContents = await prisma.chapter_contents.findMany({
            where: {
                url: { contains: 'chapter-content' }
            },
            select: { id: true, url: true, type: true }
        });

        // Safe filtering (handle nulls if any, though 'contains' implies not null)
        const supabaseContents = allContents.filter(c => c.url && c.url.includes(SUPABASE_URL_PART));
        const otherContents = allContents.filter(c => c.url && !c.url.includes(SUPABASE_URL_PART));

        console.log(`Total 'chapter-content' references: ${allContents.length}`);
        console.log(`- Supabase URLs: ${supabaseContents.length}`);
        console.log(`- Other (R2/External) URLs: ${otherContents.length}`);

        if (supabaseContents.length > 0) {
            console.log('\nWARNING: Found content still pointing to Supabase:');
            supabaseContents.slice(0, 5).forEach(c => {
                console.log(`- ID: ${c.id} [${c.type}]: ${c.url}`);
            });
        }

        // Check chapters icon
        console.log('\nQuerying chapters table for icons...');
        const supabaseIcons = await prisma.chapters.count({
            where: {
                icon: { contains: 'chapter-content' }
                // We'll visually inspect if any are supabase, but count all 'chapter-content' first
            }
        });

        // Refine count for supabase only
        const supabaseIconsSpecific = await prisma.chapters.findMany({
            where: {
                icon: { contains: 'chapter-content' }
            },
            select: { id: true, icon: true }
        });
        const realSupabaseIcons = supabaseIconsSpecific.filter(c => c.icon.includes(SUPABASE_URL_PART));

        console.log(`Chapters with 'chapter-content' in icon path: ${supabaseIcons}`);
        console.log(`- Of which contain 'supabase': ${realSupabaseIcons.length}`);

        if (realSupabaseIcons.length > 0) {
            console.log('Examples:');
            realSupabaseIcons.slice(0, 3).forEach(c => console.log(c.icon));
        }

    } catch (error) {
        console.error('Error checking usage:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkChapterContentUsage();
