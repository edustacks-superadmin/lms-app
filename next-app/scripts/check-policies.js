const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
    console.log('Checking RLS Policies for quotes...');

    try {
        const policies = await prisma.$queryRaw`
            SELECT tablename, policyname, cmd, roles, qual, with_check 
            FROM pg_policies
            WHERE tablename = 'quotes';
        `;

        console.log('RLS Policies for quotes table:');
        if (policies.length === 0) {
            console.log('No policies found for table "quotes".');

            // Check if RLS is enabled
            const rlsStatus = await prisma.$queryRaw`
                 SELECT relname, relrowsecurity 
                 FROM pg_class 
                 WHERE relname = 'quotes';
            `;
            console.log('RLS Status (relrowsecurity):', rlsStatus);

        } else {
            console.log(JSON.stringify(policies, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
                , 2));
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
