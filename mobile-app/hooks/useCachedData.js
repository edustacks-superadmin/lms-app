import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '../lib/cache';

/**
 * Custom hook for fetching data with cache support
 * @param {string} cacheKey - Unique cache key
 * @param {Function} fetchFn - Async function to fetch fresh data
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, refresh }
 */
export const useCachedData = (cacheKey, fetchFn, options = {}) => {
    const {
        ttl = 300, // 5 minutes default
        enabled = true, // Allow conditional fetching
        onSuccess,
        onError
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Try cache first (only on initial load, not on refresh)
            if (!isRefresh) {
                const cached = await getCache(cacheKey);
                if (cached) {
                    setData(cached);
                    setLoading(false);
                    // Still fetch fresh data in background
                }
            }

            // Fetch fresh data
            const fresh = await fetchFn();
            setData(fresh);
            await setCache(cacheKey, fresh, ttl);

            if (onSuccess) onSuccess(fresh);
        } catch (err) {
            console.error(`Error fetching ${cacheKey}:`, err);
            setError(err);

            // If initial load failed, try cache as fallback
            if (!isRefresh) {
                const cached = await getCache(cacheKey);
                if (cached) {
                    setData(cached);
                }
            }

            if (onError) onError(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [cacheKey, fetchFn, ttl, enabled, onSuccess, onError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    return {
        data,
        loading,
        refreshing,
        error,
        refresh
    };
};

export default useCachedData;
