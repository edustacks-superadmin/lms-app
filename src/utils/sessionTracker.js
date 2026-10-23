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
    if (!authUser) return;
    try {
        const authUserId = authUser.id;
        const authEmail = authUser.email;
        if (!authUserId && !authEmail) return;

        const dev = getWebDeviceInfo();
        if (!dev) return;

        const ipInfo = await getWebIPInfo();
        const nowIso = new Date().toISOString();

        const sessionObject = {
            id: dev.deviceId,
            device_id: dev.deviceId,
            device_name: dev.deviceName,
            os_name: dev.osName,
            os_version: dev.osVersion,
            browser_name: dev.browserName,
            ip_address: ipInfo.ip,
            location: {
                city: ipInfo.city,
                region: ipInfo.region,
                country: ipInfo.country,
                country_code: ipInfo.country_code
            },
            is_current: true,
            login_time: nowIso,
            last_active: nowIso
        };

        // 1. Try to record in user_sessions table
        try {
            const { data: existingSession } = await supabase
                .from('user_sessions')
                .select('id')
                .eq('user_id', authUserId)
                .eq('device_name', dev.deviceName)
                .maybeSingle();

            const dbSessionData = {
                user_id: authUserId,
                device_name: dev.deviceName,
                os_name: dev.osName,
                os_version: dev.osVersion || '',
                browser_name: dev.browserName,
                ip_address: ipInfo.ip,
                location: sessionObject.location,
                device_info: {
                    userAgent: navigator.userAgent,
                    deviceId: dev.deviceId,
                    screen: `${window.screen.width}x${window.screen.height}`
                },
                is_current: true,
                login_time: nowIso,
                last_active: nowIso
            };

            if (existingSession?.id) {
                await supabase
                    .from('user_sessions')
                    .update(dbSessionData)
                    .eq('id', existingSession.id);
            } else {
                await supabase
                    .from('user_sessions')
                    .insert([dbSessionData]);
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
                const customData = member.custom_data && typeof member.custom_data === 'object' ? member.custom_data : {};
                const existingSessions = Array.isArray(customData.active_sessions) ? customData.active_sessions : [];

                // Filter out old session with same device_id
                const otherSessions = existingSessions.filter(s => s.id !== dev.deviceId && s.device_name !== dev.deviceName);
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
    } catch (err) {
        console.error('recordWebSession error:', err);
    }
}
