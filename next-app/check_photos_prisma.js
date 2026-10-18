const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email1 = 'kajies2015@gmail.com';
    const email2 = 'partha.bods91@gmail.com';
    const emails = [email1, email2];

    console.log(`Checking emails: ${emails.join(', ')}`);

    try {
        const users = await prisma.members.findMany({
            where: {
                email: {
                    in: emails,
                    mode: 'insensitive',
                },
            },
            select: {
                email: true,
                photo_url: true,
            },
        });

        console.log('Results from DB:', JSON.stringify(users, null, 2));

        const user1 = users.find((u) => u.email.toLowerCase() === email1.toLowerCase());
        const user2 = users.find((u) => u.email.toLowerCase() === email2.toLowerCase());

        if (!user1) {
            console.log(`User ${email1} NOT FOUND in DB.`);
        } else {
            console.log(`User ${email1} found. Photo URL: ${user1.photo_url || 'NULL'}`);
        }

        if (!user2) {
            console.log(`User ${email2} NOT FOUND in DB.`);
        } else {
            console.log(`User ${email2} found. Photo URL: ${user2.photo_url || 'NULL'}`);
        }

        if (user1 && user2) {
            const photo1 = user1.photo_url || '';
            const photo2 = user2.photo_url || '';

            if (photo1 === photo2) {
                console.log('\nCONCLUSION: The photo URLs are the SAME.');
            } else {
                console.log('\nCONCLUSION: The photo URLs are DIFFERENT.');
            }
        }

    } catch (e) {
        console.error('Error querying database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
