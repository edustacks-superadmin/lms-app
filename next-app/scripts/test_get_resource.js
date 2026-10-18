
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing fetch resource by ID...');

        // First get any resource to find a valid ID
        const resource = await prisma.resources.findFirst();

        if (!resource) {
            console.log('No resources found in database to test with.');
            return;
        }

        console.log('Found resource for testing:', resource.id);

        const fetchedResource = await prisma.resources.findUnique({
            where: { id: resource.id }
        });

        console.log('Fetched resource:', fetchedResource);

    } catch (error) {
        console.error('Error fetching resource:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
