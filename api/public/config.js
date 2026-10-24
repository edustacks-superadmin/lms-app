import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const platform = req.query?.platform || 'android';
        const host = req.headers.host || '';

        // Extract subdomain or default to maheshiesacademy
        let slug = 'maheshiesacademy';
        if (host && host.includes('.')) {
            const parts = host.split('.');
            if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
                slug = parts[0];
            }
        }

        // Fetch settings from Supabase
        let { data: inst } = await supabase
            .from('institute_settings')
            .select('id, name, logo_url, theme_color, android_app_config, feature_flags, ios_app_config, desktop_app_config')
            .or(`slug.eq.${slug},id.eq.10`)
            .limit(1)
            .single();

        if (!inst) {
            // Fallback: fetch default institute (id: 10)
            const { data: defaultInst } = await supabase
                .from('institute_settings')
                .select('id, name, logo_url, theme_color, android_app_config, feature_flags, ios_app_config, desktop_app_config')
                .eq('id', 10)
                .single();
            inst = defaultInst;
        }

        const rawConfig = inst?.android_app_config || {};
        const androidConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : rawConfig;
        const featureFlags = inst?.feature_flags || {};

        const response = {
            appName: inst?.name || 'Mahesh IES Academy',
            logoUrl: inst?.logo_url,
            platform,
            primaryColor: androidConfig.primaryColor || inst?.theme_color || '#10b981',
            secondaryColor: androidConfig.secondaryColor || '#3b82f6',
            tertiaryColor: androidConfig.tertiaryColor || '#f59e0b',
            maintenance: {
                enabled: androidConfig.maintenanceEnabled || false,
                title: androidConfig.maintenanceTitle || 'Under Maintenance',
                message: androidConfig.maintenanceMessage || 'We are upgrading our servers. Please check back soon.',
                estimatedTime: androidConfig.maintenanceEstimatedTime || ''
            },
            version: {
                current: androidConfig.currentVersion || androidConfig.version || '1.0.5',
                minimum: androidConfig.minimumVersion || '1.0.0',
                forceUpdate: androidConfig.forceUpdate === true,
                updateMessage: androidConfig.updateMessage || 'A new version is available. Please update to continue.',
                storeUrl: androidConfig.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile',
                playStoreUrl: androidConfig.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile'
            },
            mobileFeatures: {
                darkMode: androidConfig.darkModeEnabled || false,
                offlineMode: androidConfig.offlineModeEnabled || false,
                biometricLogin: androidConfig.biometricLoginEnabled !== false,
                pushNotifications: androidConfig.pushNotificationsEnabled !== false,
                preventExamScreenshots: androidConfig.preventExamScreenshots !== undefined ? androidConfig.preventExamScreenshots : true,
                preventPdfScreenshots: androidConfig.preventPdfScreenshots !== undefined ? androidConfig.preventPdfScreenshots : true,
                preventAllScreenshots: androidConfig.preventAllScreenshots || false,
                zoom: androidConfig.zoomEnabled || false
            },
            security: {
                preventExamScreenshots: androidConfig.preventExamScreenshots !== undefined ? androidConfig.preventExamScreenshots : true,
                preventPdfScreenshots: androidConfig.preventPdfScreenshots !== undefined ? androidConfig.preventPdfScreenshots : true,
                preventAllScreenshots: androidConfig.preventAllScreenshots || false
            },
            features: {
                aiChat: featureFlags.aiChatEnabled !== false,
                leaderboard: featureFlags.leaderboardEnabled !== false,
                examMode: featureFlags.examModeEnabled !== false,
                bookmarks: featureFlags.bookmarksEnabled !== false,
                posts: featureFlags.postsEnabled !== false
            }
        };

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(200).json(response);
    } catch (error) {
        console.error('Config API error:', error);
        return res.status(500).json({ error: 'Failed to fetch config' });
    }
}
