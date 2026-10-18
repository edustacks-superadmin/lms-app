const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function refresh() {
    try {
        console.log("Notifying PostgREST to reload schema...");
        await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload schema';");
        console.log("Notification sent.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

refresh();
