const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching roles from database...');
        const roles = await prisma.roles.findMany();
        console.log('Roles found:', roles.map(r => ({ id: r.id.toString(), name: r.name })));

        console.log('\nFetching member role distribution...');
        const members = await prisma.members.findMany({
            select: { role: true }
        });

        const roleCounts = {};
        members.forEach(m => {
            const r = m.role || 'null';
            roleCounts[r] = (roleCounts[r] || 0) + 1;
        });

        console.log('Member Role Counts:', roleCounts);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
