/**
 * Config Service
 * Fetches and caches app configuration from the server
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORG_CONFIG, getApiUrl } from '../config/organization';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const CONFIG_CACHE_KEY = '@app_config';
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let cachedConfig = null;
let lastFetchTime = 0;

/**
 * Fetch app configuration from server
 */
export const fetchAppConfig = async (forceRefresh = false) => {
    const now = Date.now();

    // Return cached config if still valid
    if (!forceRefresh && cachedConfig && (now - lastFetchTime) < CONFIG_CACHE_DURATION) {
        return cachedConfig;
    }

    // 1. Primary: Direct Supabase Fetch (Instant, Real-time from institute_settings)
    try {
        const { data: instData, error: instError } = await supabase
            .from('institute_settings')
            .select('id, name, logo_url, theme_color, android_app_config, feature_flags')
            .or(`id.eq.${ORG_CONFIG.id || 10},slug.eq.maheshiesacademy`)
            .single();

        if (!instError && instData) {
            const rawConfig = instData.android_app_config || {};
            const androidConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : rawConfig;
            const featureFlags = instData.feature_flags || {};

            const config = {
                appName: instData.name || ORG_CONFIG.name,
                logoUrl: instData.logo_url,
                platform: 'android',
                primaryColor: androidConfig.primaryColor || instData.theme_color || ORG_CONFIG.colors.primary,
                secondaryColor: androidConfig.secondaryColor || ORG_CONFIG.colors.secondary,
                tertiaryColor: androidConfig.tertiaryColor || ORG_CONFIG.colors.accent,
                maintenance: {
                    enabled: androidConfig.maintenanceEnabled || false,
                    title: androidConfig.maintenanceTitle || 'Under Maintenance',
                    message: androidConfig.maintenanceMessage || 'We are upgrading our servers. Please check back soon.',
                    estimatedTime: androidConfig.maintenanceEstimatedTime || ''
                },
                version: {
                    current: androidConfig.currentVersion || androidConfig.version || getAppVersion(),
                    minimum: androidConfig.minimumVersion || '1.0.0',
                    forceUpdate: androidConfig.forceUpdate === true,
                    updateMessage: androidConfig.updateMessage || 'A new version is available. Please update to continue.',
                    storeUrl: androidConfig.playStoreUrl || `https://play.google.com/store/apps/details?id=${ORG_CONFIG.bundleId}`,
                    playStoreUrl: androidConfig.playStoreUrl || `https://play.google.com/store/apps/details?id=${ORG_CONFIG.bundleId}`
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

            cachedConfig = config;
            lastFetchTime = now;

            await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
                config,
                timestamp: now
            }));

            return config;
        }
    } catch (dbErr) {
        console.warn('[configService] Supabase config query failed, attempting HTTP fallback:', dbErr);
    }

    // 2. Secondary Fallback: HTTP Endpoint
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

        const response = await fetch(getApiUrl('/api/public/config?platform=android'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const config = await response.json();
                cachedConfig = config;
                lastFetchTime = now;
                await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
                    config,
                    timestamp: now
                }));
                return config;
            }
        }
    } catch (httpError) {
        console.warn('[configService] HTTP config fetch failed:', httpError);
    }

    // 3. Try to get cached config from storage
    try {
        const stored = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
        if (stored) {
            const { config } = JSON.parse(stored);
            cachedConfig = config;
            return config;
        }
    } catch (e) {
        console.error('Error reading cached config:', e);
    }

    // 4. Return default config if all else fails
    return getDefaultConfig();
};

/**
 * Get current app version from app.json
 */
export const getAppVersion = () => {
    return Constants.expoConfig?.version || '1.0.0';
};

/**
 * Check if maintenance mode is active
 */
export const isMaintenanceMode = (config) => {
    return config?.maintenance?.enabled === true;
};

/**
 * Check if force update is required
 */
export const needsForceUpdate = (config) => {
    if (!config?.version?.forceUpdate) {
        return false;
    }

    const currentVersion = getAppVersion();
    const minimumVersion = config.version.minimum || '0.0.0';

    return compareVersions(currentVersion, minimumVersion) < 0;
};

/**
 * Compare version strings (returns -1, 0, or 1)
 */
export const compareVersions = (v1, v2) => {
    const parts1 = String(v1 || '0').split('.').map(Number);
    const parts2 = String(v2 || '0').split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    return 0;
};

/**
 * Check if a soft (non-blocking) update is available
 */
export const hasSoftUpdate = (config) => {
    if (!config?.version) {
        return false;
    }

    // If force update is active, soft update banner is not needed
    if (needsForceUpdate(config)) {
        return false;
    }

    const currentVersion = getAppVersion();
    const latestVersion = config.version.latest || config.version.current || '0.0.0';

    return compareVersions(currentVersion, latestVersion) < 0;
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (config, featureName) => {
    return config?.features?.[featureName] !== false;
};

/**
 * Check if a mobile feature is enabled
 */
export const isMobileFeatureEnabled = (config, featureName) => {
    return config?.mobileFeatures?.[featureName] === true;
};

/**
 * Check if screenshot protection is enabled for a given screen/context
 * @param {'exam' | 'pdf' | 'global'} screenType
 * @returns {Promise<boolean>}
 */
export const isScreenshotProtectionEnabled = async (screenType = 'global') => {
    try {
        const config = await fetchAppConfig();
        const sec = config?.security || config?.mobileFeatures || {};
        if (sec.preventAllScreenshots) return true;
        if (screenType === 'exam') return sec.preventExamScreenshots !== false;
        if (screenType === 'pdf') return sec.preventPdfScreenshots !== false;
        return false;
    } catch {
        return false;
    }
};

/**
 * Get default config for offline/error scenarios
 */
const getDefaultConfig = () => {
    const ver = getAppVersion();
    return {
        appName: ORG_CONFIG.name,
        primaryColor: ORG_CONFIG.colors.primary,
        secondaryColor: ORG_CONFIG.colors.secondary,
        maintenance: { enabled: false },
        version: {
            current: ver,
            minimum: '1.0.0',
            forceUpdate: false,
            updateMessage: 'A new version is available. Please update to continue.',
            storeUrl: `https://play.google.com/store/apps/details?id=${ORG_CONFIG.bundleId}`,
            playStoreUrl: `https://play.google.com/store/apps/details?id=${ORG_CONFIG.bundleId}`
        },
        mobileFeatures: {
            darkMode: false,
            offlineMode: false,
            biometricLogin: false,
            pushNotifications: true,
            zoom: false
        },
        features: {
            aiChat: true,
            leaderboard: true,
            examMode: true,
            bookmarks: true,
            posts: true
        }
    };
};

/**
 * Clear config cache
 */
export const clearConfigCache = async () => {
    cachedConfig = null;
    lastFetchTime = 0;
    await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
};
