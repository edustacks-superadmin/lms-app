const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching institute_settings...');
        const settings = await prisma.institute_settings.findMany();
        console.log(`Fetched ${settings.length} records.`);

        const fs = require('fs');
        fs.writeFileSync('institute_settings_debug.json', JSON.stringify(settings, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
        console.log('Successfully wrote to institute_settings_debug.json');
    } catch (err) {
        console.error('Error in main execution:', err);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
