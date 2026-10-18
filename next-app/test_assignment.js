const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Get a random member
        const member = await prisma.members.findFirst();
        if (!member) {
            console.log('No members found to test with.');
            return;
        }
        console.log(`Testing with member: ${member.id} (${member.display_name || member.email})`);
        console.log(`Current role: ${member.role}`);

        // 2. Assign to 'Staff'
        console.log("Assigning role 'Staff'...");
        await prisma.members.update({
            where: { id: member.id },
            data: { role: 'Staff' }
        });
        console.log("Update successful via Prisma.");

        // 3. Verify
        const updatedMember = await prisma.members.findUnique({
            where: { id: member.id }
        });
        console.log(`New role in DB: ${updatedMember.role}`);

        // 4. Check count matching
        const count = await prisma.members.count({
            where: { role: 'Staff' }
        });
        console.log(`Count of members with role 'Staff': ${count}`);

    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
