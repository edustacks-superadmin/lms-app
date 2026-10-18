import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
    let prisma;
    try {
        prisma = new PrismaClient();
        const settings = await prisma.institute_settings.findMany({
            select: { slug: true, name: true, android_app_config: true }
        });

        return NextResponse.json({
            version: "v4",
            institutes: settings
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (prisma) await prisma.$disconnect();
    }
}
