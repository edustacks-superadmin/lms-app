/**
 * Platform Check Middleware
 * 
 * Checks if content is accessible on current platform
 * Returns 403 Forbidden if platform is restricted
 */

import { NextResponse } from 'next/server';
import { getPlatform, isPlatformAllowed, getPlatformDisplayName } from '@/lib/platform';

export async function checkPlatformAccess(request, allowedPlatforms) {
    const currentPlatform = getPlatform(request.headers);

    if (!isPlatformAllowed(allowedPlatforms, currentPlatform)) {
        const platformNames = allowedPlatforms
            .map(p => getPlatformDisplayName(p))
            .join(' or ');

        return NextResponse.json(
            {
                error: 'Platform Restricted',
                message: `This content is only available on: ${platformNames}`,
                currentPlatform: getPlatformDisplayName(currentPlatform),
                allowedPlatforms: platformNames
            },
            { status: 403 }
        );
    }

    return null; // Access allowed
}
