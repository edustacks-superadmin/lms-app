import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Get device information
export const getDeviceInfo = () => {
    try {
        const deviceInfo = {
            brand: Device.brand || 'Unknown',
            model: Device.modelName || Device.deviceName || 'Unknown',
            systemName: Platform.OS,
            systemVersion: Platform.Version?.toString() || Device.osVersion || 'Unknown',
            deviceId: Constants.sessionId || 'Unknown',
            deviceType: Device.deviceType || 'PHONE',
            isTablet: Device.deviceType === Device.DeviceType.TABLET,
        };
        return deviceInfo;
    } catch (error) {
        console.error('Error getting device info:', error);
        return null;
    }
};

// Get IP address and location
export const getIPInfo = async () => {
    try {
        // Try primary API
        const response = await fetch('https://ipapi.co/json/', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const text = await response.text();
        const data = JSON.parse(text);

        return {
            ip: data.ip || 'Unknown',
            city: data.city || null,
            region: data.region || null,
            country: data.country_name || null,
            country_code: data.country_code || null,
        };
    } catch (error) {
        // Silently fail - IP lookup is not critical
        // Return fallback data
        return { ip: 'Unknown', city: null, region: null, country: null, country_code: null };
    }
};

// Record new session on login
// Record new session on login
export const recordSession = async (userId) => {
    try {
        const deviceInfo = getDeviceInfo();

        // Try to get IP info, but don't fail if it doesn't work
        let ipInfo = { ip: 'Unknown', city: null, region: null, country: null, country_code: null };
        try {
            ipInfo = await getIPInfo();
        } catch (ipError) {
            console.log('IP lookup unavailable, continuing without it');
        }

        const deviceName = `${deviceInfo?.brand} ${deviceInfo?.model}`;
        const osName = deviceInfo?.systemName;
        const osVersion = deviceInfo?.systemVersion;

        // 1. Check if a session already exists for this specific device
        const { data: existingSession, error: checkError } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('device_name', deviceName)
            .eq('os_name', osName)
            .eq('os_version', osVersion)
            .maybeSingle();

        if (checkError) console.error('Error checking existing session:', checkError);

        // 2. Mark all other sessions as not current
        await supabase
            .from('user_sessions')
            .update({ is_current: false })
            .eq('user_id', userId);

        const sessionData = {
            user_id: userId,
            device_info: deviceInfo,
            ip_address: ipInfo.ip,
            device_name: deviceName,
            os_name: osName,
            os_version: osVersion,
            browser_name: 'Mobile App',
            location: {
                city: ipInfo.city,
                region: ipInfo.region,
                country: ipInfo.country,
                country_code: ipInfo.country_code,
            },
            is_current: true,
            login_time: new Date().toISOString(),
            last_active: new Date().toISOString(),
        };

        let result;

        if (existingSession?.id) {
            // 3. Update existing session
            const { data, error } = await supabase
                .from('user_sessions')
                .update(sessionData)
                .eq('id', existingSession.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // 4. Insert new session if none exists
            const { data, error } = await supabase
                .from('user_sessions')
                .insert([sessionData])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return result;
    } catch (error) {
        console.error('Error recording session:', error);
        return null;
    }
};

// Fetch user sessions
export const getUserSessions = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('last_active', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return [];
    }
};

// Logout from all devices
export const logoutAllDevices = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Delete all sessions for this user
        const { error } = await supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;

        // Sign out from current device
        await supabase.auth.signOut();
        return true;
    } catch (error) {
        console.error('Error logging out all devices:', error);
        return false;
    }
};

// Update last active time for current session
export const updateLastActive = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('user_sessions')
            .update({ last_active: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('is_current', true);
    } catch (error) {
        console.error('Error updating last active:', error);
    }
};

// Delete a specific session
export const deleteSession = async (sessionId) => {
    try {
        const { error } = await supabase
            .from('user_sessions')
            .delete()
            .eq('id', sessionId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting session:', error);
        return false;
    }
};

// Check if current session is valid (Single device policy)
export const checkSessionValidity = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return true; // Not logged in, so "valid" state in terms of no conflict

        const deviceInfo = getDeviceInfo();
        const deviceName = `${deviceInfo?.brand} ${deviceInfo?.model}`;

        // Check if there is an active session for THIS device
        const { data: session, error } = await supabase
            .from('user_sessions')
            .select('is_current')
            .eq('user_id', user.id)
            .eq('device_name', deviceName)
            .eq('os_name', deviceInfo?.systemName)
            .eq('os_version', deviceInfo?.systemVersion)
            .maybeSingle();

        if (error) {
            console.error('Error checking session validity:', error);
            // On network error, don't kick user out immediately
            return true;
        }

        // If session exists but is NOT current, it means another device took over.
        // If session doesn't exist, it's also technically invalid if we enforce strict tracking,
        // but let's just cover the 'kicked out' scenario (is_current === false).
        if (session && session.is_current === false) {
            return false; // INVALID
        }

        return true;
    } catch (error) {
        console.error('Error in session validity check:', error);
        return true;
    }
};


