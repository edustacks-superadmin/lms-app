import { supabase } from '../supabaseClient';

// Get device information for web
export const getDeviceInfo = () => {
    try {
        const userAgent = navigator.userAgent;
        let os = 'Unknown';
        let osVersion = '';
        let browser = 'Unknown';
        let browserVersion = '';
        let deviceType = 'Desktop';

        // Detect OS
        if (userAgent.includes('Windows')) {
            os = 'Windows';
            const match = userAgent.match(/Windows NT (\d+\.\d+)/);
            osVersion = match ? match[1] : '';
        } else if (userAgent.includes('Mac OS')) {
            os = 'macOS';
            const match = userAgent.match(/Mac OS X ([\d_]+)/);
            osVersion = match ? match[1].replace(/_/g, '.') : '';
        } else if (userAgent.includes('Linux')) {
            os = 'Linux';
        } else if (userAgent.includes('Android')) {
            os = 'Android';
            deviceType = 'Mobile';
            const match = userAgent.match(/Android ([\d.]+)/);
            osVersion = match ? match[1] : '';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            os = 'iOS';
            deviceType = userAgent.includes('iPad') ? 'Tablet' : 'Mobile';
            const match = userAgent.match(/OS ([\d_]+)/);
            osVersion = match ? match[1].replace(/_/g, '.') : '';
        }

        // Detect Browser
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
            const match = userAgent.match(/Chrome\/([\d.]+)/);
            browserVersion = match ? match[1] : '';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            const match = userAgent.match(/Firefox\/([\d.]+)/);
            browserVersion = match ? match[1] : '';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
            const match = userAgent.match(/Version\/([\d.]+)/);
            browserVersion = match ? match[1] : '';
        } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
            const match = userAgent.match(/Edg\/([\d.]+)/);
            browserVersion = match ? match[1] : '';
        }

        return {
            brand: browser,
            model: deviceType,
            systemName: os,
            systemVersion: osVersion,
            browserName: browser,
            browserVersion: browserVersion,
            deviceType: deviceType,
        };
    } catch (error) {
        console.error('Error getting device info:', error);
        return null;
    }
};

// Get IP address and location
export const getIPInfo = async () => {
    try {
        const response = await fetch('https://ipapi.co/json/', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        return {
            ip: data.ip || 'Unknown',
            city: data.city || null,
            region: data.region || null,
            country: data.country_name || null,
            country_code: data.country_code || null,
        };
    } catch (error) {
        return { ip: 'Unknown', city: null, region: null, country: null, country_code: null };
    }
};

// Fetch user sessions (deduplicated by device - keeps only latest per device)
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

        // Deduplicate by device_name - keep only the latest session per device
        const deviceMap = new Map();
        (data || []).forEach(session => {
            const deviceKey = session.device_name || 'Unknown Device';
            // Only keep the first (most recent due to ordering) session for each device
            if (!deviceMap.has(deviceKey)) {
                deviceMap.set(deviceKey, session);
            }
        });

        return Array.from(deviceMap.values());
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

        const { error } = await supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;

        await supabase.auth.signOut();
        return true;
    } catch (error) {
        console.error('Error logging out all devices:', error);
        return false;
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
