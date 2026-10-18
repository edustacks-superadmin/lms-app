const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    const data = await prisma.home_settings.findMany();
    console.log(`Fetched ${data.length} home_settings records.`);
    fs.writeFileSync('home_settings_debug.json', JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
        , 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
