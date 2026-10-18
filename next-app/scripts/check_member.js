const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = '16postbox@gmail.com';
    const member = await prisma.members.findUnique({
        where: { email: email },
        select: { id: true, username: true, custom_data: true }
    });

    if (member) {
        console.log(`Found member for ${email}:`);
        console.log(`ID: ${member.id}`);
        console.log(`Username: ${member.username}`);
        console.log(`Custom Data: ${JSON.stringify(member.custom_data)}`);
    } else {
        console.log(`Member with email ${email} not found.`);
    }

    await prisma.$disconnect();
}

main();
