'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useInstitute } from './InstituteContext';

const FeatureFlagsContext = createContext({
    featureFlags: {},
    loading: true,
    isFeatureEnabled: () => true,
    isMobileFeatureEnabled: () => false,
    maintenance: null,
    version: null,
    refetch: () => { }
});

export const FeatureFlagsProvider = ({ children }) => {
    const { institute } = useInstitute();
    const [featureFlags, setFeatureFlags] = useState({});
    const [mobileFeatures, setMobileFeatures] = useState({});
    const [maintenance, setMaintenance] = useState(null);
    const [version, setVersion] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchFeatureFlags = async () => {
        try {
            const response = await fetch('/api/public/config?platform=web');
            if (!response.ok) throw new Error('Failed to fetch config');

            const data = await response.json();

            setFeatureFlags(data.features || {});
            setMobileFeatures(data.mobileFeatures || {});
            setMaintenance(data.maintenance || null);
            setVersion(data.version || null);
        } catch (error) {
            console.error('Error fetching feature flags:', error);
            // Default to all features enabled on error
            setFeatureFlags({
                aiChat: true,
                leaderboard: true,
                hideLeaderboardNames: false,
                examMode: true,
                bookmarks: true,
                studentAnalytics: true,
                posts: true,
                courseReviews: true,
                discussionForum: false,
                liveClasses: true
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeatureFlags();
    }, [institute?.id]);

    /**
     * Check if a universal feature is enabled
     * @param {string} featureName - e.g., 'aiChat', 'leaderboard', 'examMode'
     * @returns {boolean}
     */
    const isFeatureEnabled = (featureName) => {
        if (loading) return true; // Default to enabled while loading
        return featureFlags[featureName] !== false;
    };

    /**
     * Check if a mobile-specific feature is enabled
     * @param {string} featureName - e.g., 'darkMode', 'offlineMode'
     * @returns {boolean}
     */
    const isMobileFeatureEnabled = (featureName) => {
        if (loading) return false;
        return mobileFeatures[featureName] === true;
    };

    /**
     * Check if maintenance mode is active
     * @returns {boolean}
     */
    const isMaintenanceMode = () => {
        return maintenance?.enabled === true;
    };

    const value = {
        featureFlags,
        mobileFeatures,
        maintenance,
        version,
        loading,
        isFeatureEnabled,
        isMobileFeatureEnabled,
        isMaintenanceMode,
        refetch: fetchFeatureFlags
    };

    return (
        <FeatureFlagsContext.Provider value={value}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};

export const useFeatureFlags = () => {
    const context = useContext(FeatureFlagsContext);
    if (!context) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
    }
    return context;
};

export default FeatureFlagsContext;
