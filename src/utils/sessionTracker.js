import { supabase } from '../supabaseClient';

// Get browser, OS, and device info
export function getWebDeviceInfo() {
    if (typeof window === 'undefined') return null;

    const ua = navigator.userAgent;
    let browserName = "Chrome";
    if (ua.includes("Firefox/")) browserName = "Firefox";
    else if (ua.includes("Edg/")) browserName = "Edge";
    else if (ua.includes("Chrome/")) browserName = "Chrome";
    else if (ua.includes("Safari/")) browserName = "Safari";
    else if (ua.includes("OPR/") || ua.includes("Opera/")) browserName = "Opera";

    let osName = "Windows";
    let osVersion = "";
    if (ua.includes("Windows NT 10.0")) {
        osName = "Windows 10/11";
    } else if (ua.includes("Windows NT")) {
        osName = "Windows";
    } else if (ua.includes("Mac OS X")) {
        osName = "macOS";
    } else if (ua.includes("Android")) {
        osName = "Android";
        const match = ua.match(/Android\s([0-9\.]+)/);
        if (match) osVersion = match[1];
    } else if (ua.includes("iPhone") || ua.includes("iPad")) {
        osName = "iOS";
    } else if (ua.includes("Linux")) {
        osName = "Linux";
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    let deviceId = localStorage.getItem('lms_web_device_id');
    if (!deviceId) {
        deviceId = 'web_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('lms_web_device_id', deviceId);
    }

    const deviceName = `${browserName} on ${osName}${osVersion ? ' ' + osVersion : ''}`;

    return {
        browserName,
        osName,
        osVersion,
        isMobile,
        deviceId,
        deviceName
    };
}

// Get IP and Location
export async function getWebIPInfo() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const data = await res.json();
            return {
                ip: data.ip || 'Unknown',
                city: data.city || null,
                region: data.region || null,
                country: data.country_name || 'India',
                country_code: data.country_code || 'IN'
            };
        }
    } catch (e) {
        // Fallback
    }

    try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
            const data = await res.json();
            return {
                ip: data.ip || 'Unknown',
                city: null,
                region: null,
                country: 'India',
                country_code: 'IN'
            };
        }
    } catch (e) {
        // Fallback
    }

    return {
        ip: 'Unknown',
        city: null,
        region: null,
        country: 'India',
        country_code: 'IN'
    };
}

// Record or update session for the logged in user
export async function recordWebSession(authUser) {
    if (!authUser) return null;
    try {
        const authUserId = authUser.id;
        const authEmail = authUser.email;
        if (!authUserId && !authEmail) return null;

        const dev = getWebDeviceInfo();
        if (!dev) return null;

        const ipInfo = await getWebIPInfo();
        const nowIso = new Date().toISOString();

        let dbSessionId = localStorage.getItem('lms_session_db_id');

        const dbSessionData = {
            user_id: authUserId,
            device_name: dev.deviceName,
            os_name: dev.osName,
            os_version: dev.osVersion || '',
            browser_name: dev.browserName,
            ip_address: ipInfo.ip,
            location: {
                city: ipInfo.city,
                region: ipInfo.region,
                country: ipInfo.country,
                country_code: ipInfo.country_code
            },
            device_info: {
                userAgent: navigator.userAgent,
                deviceId: dev.deviceId,
                screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : ''
            },
            is_current: true,
            login_time: nowIso,
            last_active: nowIso
        };

        // 1. Try to record in user_sessions table
        try {
            let existingSession = null;
            if (dbSessionId) {
                const { data } = await supabase
                    .from('user_sessions')
                    .select('id')
                    .eq('id', dbSessionId)
                    .maybeSingle();
                existingSession = data;
            }

            if (!existingSession) {
                const { data } = await supabase
                    .from('user_sessions')
                    .select('id')
                    .eq('user_id', authUserId)
                    .eq('device_name', dev.deviceName)
                    .maybeSingle();
                existingSession = data;
            }

            if (existingSession?.id) {
                dbSessionId = existingSession.id;
                await supabase
                    .from('user_sessions')
                    .update(dbSessionData)
                    .eq('id', dbSessionId);
            } else {
                const { data: newSession, error: insErr } = await supabase
                    .from('user_sessions')
                    .insert([dbSessionData])
                    .select('id')
                    .single();

                if (!insErr && newSession?.id) {
                    dbSessionId = newSession.id;
                }
            }

            if (dbSessionId) {
                localStorage.setItem('lms_session_db_id', dbSessionId);
            }
        } catch (dbErr) {
            console.warn('user_sessions table write notice:', dbErr);
        }

        // 2. Also record in members.custom_data.active_sessions (guaranteed admin visibility)
        try {
            let memberQuery = supabase.from('members').select('id, custom_data');
            if (authUserId) {
                memberQuery = memberQuery.eq('auth_user_id', authUserId);
            } else {
                memberQuery = memberQuery.eq('email', authEmail);
            }

            const { data: member } = await memberQuery.maybeSingle();
            if (member?.id) {
                const sessionObject = {
                    id: dbSessionId || dev.deviceId,
                    device_id: dev.deviceId,
                    device_name: dev.deviceName,
                    os_name: dev.osName,
                    os_version: dev.osVersion,
                    browser_name: dev.browserName,
                    ip_address: ipInfo.ip,
                    location: dbSessionData.location,
                    is_current: true,
                    login_time: nowIso,
                    last_active: nowIso
                };

                const customData = member.custom_data && typeof member.custom_data === 'object' ? member.custom_data : {};
                const existingSessions = Array.isArray(customData.active_sessions) ? customData.active_sessions : [];

                const otherSessions = existingSessions.filter(s => s.id !== sessionObject.id && s.device_name !== dev.deviceName);
                const updatedSessions = [sessionObject, ...otherSessions].slice(0, 10);

                await supabase
                    .from('members')
                    .update({
                        custom_data: {
                            ...customData,
                            active_sessions: updatedSessions,
                            last_device: dev.deviceName,
                            last_ip: ipInfo.ip
                        }
                    })
                    .eq('id', member.id);
            }
        } catch (memberErr) {
            console.warn('members custom_data session update notice:', memberErr);
        }

        return dbSessionId;
    } catch (err) {
        console.error('recordWebSession error:', err);
        return null;
    }
}

// Check if the current session is still valid in Supabase
export async function checkWebSessionValidity(authUser) {
    if (!authUser?.id) return true;
    try {
        const sessionDbId = localStorage.getItem('lms_session_db_id');
        const dev = getWebDeviceInfo();

        // 1. Check in user_sessions table
        let query = supabase
            .from('user_sessions')
            .select('id, is_current')
            .eq('user_id', authUser.id);

        if (sessionDbId) {
            query = query.eq('id', sessionDbId);
        } else if (dev?.deviceName) {
            query = query.eq('device_name', dev.deviceName);
        } else {
            return true;
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            // Network issue or RLS error: don't kick user out on temporary blip
            return true;
        }

        // If no row exists at all in user_sessions, admin deleted it!
        if (!data) {
            return false;
        }

        // If is_current was explicitly flipped to false
        if (data.is_current === false) {
            return false;
        }

        return true;
    } catch (e) {
        return true;
    }
}

// Clean up session on explicit logout
export async function clearWebSession(authUser) {
    try {
        const sessionDbId = localStorage.getItem('lms_session_db_id');
        if (sessionDbId) {
            await supabase.from('user_sessions').delete().eq('id', sessionDbId);
            localStorage.removeItem('lms_session_db_id');
        }
    } catch (e) {
        console.warn('clearWebSession error:', e);
    }
}
