const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyPermissionLogic() {
    try {
        console.log("--- 1. Testing Permission Logic ---");

        // 1. Get a test user (e.g., our Staff user)
        const staffUser = await prisma.members.findFirst({
            where: { role: 'Staff' }
        });

        if (!staffUser) {
            console.error("No Staff user found. Cannot test.");
            return;
        }

        console.log(`Test User: ${staffUser.display_name} (ID: ${staffUser.id})`);
        console.log(`Role: ${staffUser.role}`);

        // 2. Fetch the Role definition
        const roleDef = await prisma.roles.findFirst({
            where: { name: staffUser.role }
        });

        if (!roleDef) {
            console.error(`Role definition for '${staffUser.role}' not found in roles table!`);
            return;
        }

        console.log(`Role Definition Found. Permissions:`, JSON.stringify(roleDef.permissions, null, 2));

        // 3. Check for specific permission: 'courses' -> 'delete'
        // We need to know the ID of the 'courses' resource from your UI setup
        // Looking at the uploaded images, it seems resources might be named directly or by ID?
        // Let's assume the JSON keys are Resource IDs.
        // We'll inspect the keys in the output.

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPermissionLogic();
