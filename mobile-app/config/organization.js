/**
 * Organization Configuration
 * 
 * This file contains all organization-specific settings.
 * When white-labeling for a new organization, update these values
 * and rebuild the app with their branding.
 */

export const ORG_CONFIG = {
    // Organization Details
    id: 10,
    name: "Mahesh IES Academy",
    shortName: "Mahesh IES",
    logoUrl: "https://pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev/institute-assets/1767814745553_7aajopnka1y.jpg",

    // API Endpoints
    webUrl: "https://maheshiesacademy.edustacks.co.in",

    // Supabase Configuration
    supabase: {
        url: "https://xalbtjoykovnlbjeddtv.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c"
    },

    // Branding
    colors: {
        primary: "#2563EB",
        secondary: "#1e40af",
        accent: "#3b82f6",
    },

    // App Store Details (for future deployment)
    bundleId: "com.maheshiesacademy.mobile", // Android: applicationId, iOS: bundle identifier
    appName: "Mahesh IES Academy",

    // Contact Information
    support: {
        email: "maheshiesacademy@gmail.com",
        phone: "+91-XXXXXXXXXX",
        website: "https://maheshiesacademy.edustacks.co.in"
    }
};

/**
 * Helper function to get full API URL
 */
export const getApiUrl = (path) => {
    return `${ORG_CONFIG.webUrl}${path}`;
};

/**
 * Helper function to get exam URL for WebView
 */
export const getExamUrl = (examId) => {
    return `${ORG_CONFIG.webUrl}/student/exam/${examId}/take`;
};
