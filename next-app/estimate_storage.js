const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Fetch a sample of members with photos
        const members = await prisma.members.findMany({
            where: {
                photo_url: {
                    contains: 'testpress.in', // Filter for external URLs
                    not: null
                }
            },
            select: { photo_url: true },
            take: 50 // Sample size
        });

        if (members.length === 0) {
            console.log('No members found with Testpress photo URLs.');
            return;
        }

        console.log(`Sampling ${members.length} images...`);

        let totalSize = 0;
        let successCount = 0;

        for (const m of members) {
            try {
                const res = await fetch(m.photo_url, { method: 'HEAD' });
                if (res.ok) {
                    const size = parseInt(res.headers.get('content-length') || '0');
                    if (size > 0) {
                        totalSize += size;
                        successCount++;
                    }
                }
            } catch (err) {
                // Ignore fetch errors for estimation
            }
        }

        if (successCount === 0) {
            console.log('Could not fetch any image sizes.');
            return;
        }

        const avgSize = totalSize / successCount;
        const avgSizeKB = (avgSize / 1024).toFixed(2);
        const estTotalMB = ((avgSize * 13000) / (1024 * 1024)).toFixed(2);
        const estTotalGB = (estTotalMB / 1024).toFixed(2);

        console.log(`Average Image Size: ${avgSizeKB} KB`);
        console.log(`Total Users: ~13,000`);
        console.log(`Estimated Total Storage: ${estTotalMB} MB (~${estTotalGB} GB)`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
