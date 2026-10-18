import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getInstituteFromRequest } from '../../../../lib/server/getInstituteFromRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform') || 'android';

        // Get institute from subdomain dynamically
        const settings = await getInstituteFromRequest(request);

        if (!settings) {
            return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
        }

        // Get platform-specific config
        // Get platform-specific config
        const androidConfig = settings.android_app_config || {};
        const iosConfig = settings.ios_app_config || {};
        const desktopConfig = settings.desktop_app_config || {};
        const featureFlags = settings.feature_flags || {};

        // Select config based on platform
        let platformConfig = androidConfig; // Default
        if (platform === 'ios') {
            platformConfig = iosConfig;
        } else if (['web', 'windows', 'macos'].includes(platform)) {
            platformConfig = desktopConfig;
        }

        // Build response based on platform
        const response = {
            // Basic Info
            appName: settings.name || 'App',
            logoUrl: settings.logo_url,
            platform: platform,

            // Branding
            primaryColor: platformConfig.primaryColor || settings.theme_color || '#10b981',
            secondaryColor: platformConfig.secondaryColor || '#3b82f6',
            tertiaryColor: platformConfig.tertiaryColor || '#f59e0b',

            // Maintenance Mode
            maintenance: {
                enabled: platformConfig.maintenanceEnabled || false,
                title: platformConfig.maintenanceTitle || 'Under Maintenance',
                message: platformConfig.maintenanceMessage || 'We are upgrading our servers. Please check back soon.',
                estimatedTime: platformConfig.maintenanceEstimatedTime || ''
            },

            // Version Control
            version: {
                current: platformConfig.currentVersion || platformConfig.version || '1.0.0',
                minimum: platformConfig.minimumVersion || '1.0.0',
                forceUpdate: platformConfig.forceUpdate || false,
                updateMessage: platformConfig.updateMessage || 'A new version is available. Please update to continue.',
                // Platform-specific store URL
                storeUrl: platform === 'ios'
                    ? (platformConfig.appStoreUrl || '')
                    : (['web', 'windows', 'macos'].includes(platform) ? (platformConfig.windowsInstallerUrl || platformConfig.macInstallerUrl || '') : (platformConfig.playStoreUrl || ''))
            },

            // Mobile-Specific Features
            mobileFeatures: {
                darkMode: platformConfig.darkModeEnabled || false,
                offlineMode: platformConfig.offlineModeEnabled || false,
                // Platform-specific biometric
                biometricLogin: platform === 'ios'
                    ? (platformConfig.faceIdEnabled || false)
                    : (platformConfig.biometricLoginEnabled || false),
                pushNotifications: platformConfig.pushNotificationsEnabled !== false,
                // iOS-specific
                ...(platform === 'ios' && {
                    appleSignIn: platformConfig.appleSignInEnabled !== false
                }),
                // Android-specific
                ...(platform === 'android' && {
                    zoom: platformConfig.zoomEnabled || false
                })
            },

            // Universal Feature Flags
            features: {
                aiChat: featureFlags.aiChatEnabled !== false,
                leaderboard: featureFlags.leaderboardEnabled !== false,
                hideLeaderboardNames: featureFlags.hideLeaderboardNames === true,
                examMode: featureFlags.examModeEnabled !== false,
                bookmarks: featureFlags.bookmarksEnabled !== false,
                studentAnalytics: featureFlags.studentAnalyticsEnabled !== false,
                posts: featureFlags.postsEnabled !== false,
                courseReviews: featureFlags.courseReviewsEnabled !== false,
                discussionForum: featureFlags.discussionForumEnabled || false,
                liveClasses: featureFlags.liveClassesEnabled !== false,
                dailyStreaks: featureFlags.dailyStreaksEnabled || false,
                achievementBadges: featureFlags.achievementBadgesEnabled || false,
                referralProgram: featureFlags.referralProgramEnabled || false
            },

            // Social Links
            social: {
                whatsapp: settings.whatsapp_url,
                instagram: settings.instagram_url,
                youtube: settings.youtube_url,
                facebook: settings.facebook_url,
                telegram: settings.telegram_url,
                email: settings.email,
                phone: settings.phone
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching public config:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
