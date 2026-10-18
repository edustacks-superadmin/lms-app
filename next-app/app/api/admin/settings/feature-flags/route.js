import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getInstituteIdFromRequest } from '../../../../../lib/server/getInstituteFromRequest';

export async function GET(request) {
    try {
        // Get institute ID dynamically from subdomain
        const instituteId = await getInstituteIdFromRequest(request);

        const settings = await prisma.institute_settings.findFirst({
            where: { id: instituteId }
        });

        if (!settings) {
            return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
        }

        return NextResponse.json({
            featureFlags: settings.feature_flags || {}
        });

    } catch (error) {
        console.error('Error fetching feature flags:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { featureFlags } = body;

        // Get institute ID dynamically from subdomain
        const instituteId = await getInstituteIdFromRequest(request);

        const updatedSettings = await prisma.institute_settings.update({
            where: { id: instituteId },
            data: { feature_flags: featureFlags }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating feature flags:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
