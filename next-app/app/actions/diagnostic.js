'use server';

export async function testPrismaConnection() {
    try {
        // Try to import Prisma
        const { PrismaClient } = await import('@prisma/client');

        // Try to create a client
        const prisma = new PrismaClient();

        // Try to connect
        await prisma.$connect();

        // Try a simple query
        const result = await prisma.$queryRaw`SELECT 1 as test`;

        await prisma.$disconnect();

        return {
            success: true,
            message: "Prisma connection successful!",
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            stack: error.stack,
            name: error.name
        };
    }
}
