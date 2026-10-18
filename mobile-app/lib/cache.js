import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@lms_cache_';

/**
 * Set data in cache with TTL (Time To Live)
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttlSeconds - Time to live in seconds (default: 5 minutes)
 */
export const setCache = async (key, data, ttlSeconds = 300) => {
    try {
        const cacheItem = {
            data,
            timestamp: Date.now(),
            ttl: ttlSeconds * 1000 // Convert to milliseconds
        };
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
        return true;
    } catch (error) {
        console.error(`Error setting cache for key "${key}":`, error);
        return false;
    }
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export const getCache = async (key) => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!cached) return null;

        const cacheItem = JSON.parse(cached);
        const now = Date.now();
        const age = now - cacheItem.timestamp;

        // Check if cache is still valid
        if (age > cacheItem.ttl) {
            // Cache expired, remove it
            await removeCache(key);
            return null;
        }

        return cacheItem.data;
    } catch (error) {
        console.error(`Error getting cache for key "${key}":`, error);
        return null;
    }
};

/**
 * Remove specific cache entry
 * @param {string} key - Cache key
 */
export const removeCache = async (key) => {
    try {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return true;
    } catch (error) {
        console.error(`Error removing cache for key "${key}":`, error);
        return false;
    }
};

/**
 * Clear all app cache
 */
export const clearAllCache = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared ${cacheKeys.length} cache entries`);
        return true;
    } catch (error) {
        console.error('Error clearing cache:', error);
        return false;
    }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

        const stats = {
            totalEntries: cacheKeys.length,
            keys: cacheKeys.map(k => k.replace(CACHE_PREFIX, ''))
        };

        return stats;
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return { totalEntries: 0, keys: [] };
    }
};

export default { setCache, getCache, removeCache, clearAllCache, getCacheStats };
