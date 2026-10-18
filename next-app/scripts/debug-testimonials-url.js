const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all testimonials...');
    try {
        const testimonials = await prisma.testimonials.findMany({
            orderBy: { id: 'desc' }
        });

        console.log(`Fetched ${testimonials.length} records.`);
        const fs = require('fs');
        fs.writeFileSync('testimonials_data.json', JSON.stringify(testimonials, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
        console.log('Written to testimonials_data.json');
    } catch (e) {
        console.error('Error fetching testimonials:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
