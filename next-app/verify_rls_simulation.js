const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRLS() {
    try {
        console.log("--- 1. Testing Permission Logic ---");

        // 1. Get a test user
        const staffUser = await prisma.members.findFirst({ where: { role: 'Staff' } });
        console.log(`Test User: ${staffUser.display_name}, Role: ${staffUser.role}`);

        // 2. Fetch Role Permissions
        const roleDef = await prisma.roles.findFirst({ where: { name: staffUser.role } });
        const permissions = roleDef.permissions;

        // 3. Simulate check_permission function logic
        // FUNCTION LOGIC: COALESCE((user_permissions -> resource_name ->> action_name)::boolean, false);

        const check = (resource, action) => {
            const hasAccess = permissions[resource]?.[action] || false;
            console.log(`Check [${resource}].[${action}]: ${hasAccess ? 'ALLOWED' : 'DENIED'}`);
            return hasAccess;
        };

        // 4. Test Cases
        const canView = check('courses', 'view');  // Should be true
        const canDelete = check('courses', 'delete'); // Should be false (undefined in JSON)

        if (canView === true && canDelete === false) {
            console.log("\n✅ SUCCESS: Logic correctly allows View and denies Delete.");
        } else {
            console.log("\n❌ FAILURE: Logic mismatch.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyRLS();
