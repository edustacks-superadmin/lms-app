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
            androidConfig: settings.android_app_config || {},
            iosConfig: settings.ios_app_config || {},
            desktopConfig: settings.desktop_app_config || {}
        });

    } catch (error) {
        console.error('Error fetching app settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { androidConfig, iosConfig, desktopConfig } = body;

        // Get institute ID dynamically from subdomain
        const instituteId = await getInstituteIdFromRequest(request);

        const dataToUpdate = {};
        if (androidConfig) dataToUpdate.android_app_config = androidConfig;
        if (iosConfig) dataToUpdate.ios_app_config = iosConfig;
        if (desktopConfig) dataToUpdate.desktop_app_config = desktopConfig;

        const updatedSettings = await prisma.institute_settings.update({
            where: { id: instituteId },
            data: dataToUpdate
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating app settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
