/**
 * Config Service
 * Fetches and caches app configuration from the server
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORG_CONFIG, getApiUrl } from '../config/organization';
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

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 seconds for slow connections

        const response = await fetch(getApiUrl('/api/public/config?platform=android'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Failed to fetch config');
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return getDefaultConfig();
        }
        const config = await response.json();

        // Cache the config
        cachedConfig = config;
        lastFetchTime = now;

        // Also store in AsyncStorage for offline access
        await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
            config,
            timestamp: now
        }));

        return config;
    } catch (error) {
        console.error('Error fetching config:', error);

        // Try to get cached config from storage
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

        // Return default config if all else fails
        return getDefaultConfig();
    }
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
const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    return 0;
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
const getDefaultConfig = () => ({
    appName: ORG_CONFIG.name,
    primaryColor: ORG_CONFIG.colors.primary,
    secondaryColor: ORG_CONFIG.colors.secondary,
    maintenance: { enabled: false },
    version: {
        current: '1.0.0',
        minimum: '1.0.0',
        forceUpdate: false
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
});

/**
 * Clear config cache
 */
export const clearConfigCache = async () => {
    cachedConfig = null;
    lastFetchTime = 0;
    await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
};
