const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBannerAdsStatus() {
    try {
        console.log('Checking for usage of "banner-ads" bucket in database...');

        const SUPABASE_URL_PART = 'supabase';

        const allAds = await prisma.banner_ads.findMany({
            where: {
                image_url: { not: null }
            },
            select: { id: true, image_url: true, title: true }
        });

        const supabaseAds = allAds.filter(ad => ad.image_url && ad.image_url.includes(SUPABASE_URL_PART));
        const r2Ads = allAds.filter(ad => ad.image_url && !ad.image_url.includes(SUPABASE_URL_PART));

        console.log(`Total Banner Ads with images: ${allAds.length}`);
        console.log(`- Supabase URLs: ${supabaseAds.length}`);
        console.log(`- R2/Other URLs: ${r2Ads.length}`);

        if (supabaseAds.length > 0) {
            console.log('\nWARNING: Found banner ads still pointing to Supabase:');
            supabaseAds.forEach(ad => {
                console.log(`- ID: ${ad.id}, Title: ${ad.title}, URL: ${ad.image_url}`);
            });
        } else {
            console.log('\n✅ No banner ads found pointing to Supabase. Safe to delete bucket.');
        }

    } catch (error) {
        console.error('Error checking banner ads:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBannerAdsStatus();
