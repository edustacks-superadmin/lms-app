/**
 * Platform Detection Utility
 * 
 * Detects the current platform (web, mobile, desktop) based on:
 * 1. Custom headers (X-Client-Platform)
 * 2. User-Agent strings
 * 
 * Used for platform-exclusive content filtering
 */

export const PLATFORMS = {
    WEB: 'web',
    MOBILE: 'mobile',
    DESKTOP: 'desktop'
};

/**
 * Get current platform from request headers or navigator
 * 
 * @param {Headers} headers - Request headers (server-side)
 * @returns {string} Platform: 'web', 'mobile', or 'desktop'
 */
export function getPlatform(headers) {
    // Server-side: Check custom header first
    if (headers) {
        const clientPlatform = headers.get('X-Client-Platform');
        if (clientPlatform && Object.values(PLATFORMS).includes(clientPlatform)) {
            return clientPlatform;
        }
    }

    // Client-side: Detect from User-Agent
    if (typeof navigator !== 'undefined') {
        const userAgent = navigator.userAgent || '';

        // Check for mobile devices
        if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
            return PLATFORMS.MOBILE;
        }

        // Check for Electron (desktop app)
        if (/Electron/i.test(userAgent)) {
            return PLATFORMS.DESKTOP;
        }
    }

    // Default to web
    return PLATFORMS.WEB;
}

/**
 * Check if content is accessible on current platform
 * 
 * @param {Array<string>} allowedPlatforms - Array of allowed platforms
 * @param {string} currentPlatform - Current platform
 * @returns {boolean} True if accessible
 */
export function isPlatformAllowed(allowedPlatforms, currentPlatform) {
    if (!allowedPlatforms || allowedPlatforms.length === 0) {
        return true; // No restrictions
    }

    return allowedPlatforms.includes(currentPlatform);
}

/**
 * Get user-friendly platform name
 */
export function getPlatformDisplayName(platform) {
    const names = {
        [PLATFORMS.WEB]: 'Web Browser',
        [PLATFORMS.MOBILE]: 'Mobile App',
        [PLATFORMS.DESKTOP]: 'Desktop App'
    };

    return names[platform] || 'Unknown Platform';
}
