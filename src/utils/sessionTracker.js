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

// Get IP and Location (cached or async fallback)
export async function getWebIPInfo() {
    const cachedIp = localStorage.getItem('lms_cached_ip');
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            if (data.ip) localStorage.setItem('lms_cached_ip', data.ip);
            return {
                ip: data.ip || cachedIp || 'Unknown',
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
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            const data = await res.json();
            if (data.ip) localStorage.setItem('lms_cached_ip', data.ip);
            return {
                ip: data.ip || cachedIp || 'Unknown',
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
        ip: cachedIp || 'Unknown',
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

        // Use cached IP for instant DB insert
        const cachedIp = localStorage.getItem('lms_cached_ip') || 'Unknown';
        const nowIso = new Date().toISOString();

        // Mark login time for grace period
        localStorage.setItem('lms_session_login_time', Date.now().toString());

        let dbSessionId = localStorage.getItem('lms_session_db_id');

        const initialSessionData = {
            user_id: authUserId,
            device_name: dev.deviceName,
            os_name: dev.osName,
            os_version: dev.osVersion || '',
            browser_name: dev.browserName,
            ip_address: cachedIp,
            location: {
                city: null,
                region: null,
                country: 'India',
                country_code: 'IN'
            },
            device_info: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                deviceId: dev.deviceId,
                screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : ''
            },
            is_current: true,
            login_time: nowIso,
            last_active: nowIso
        };

        // 1. Immediately create or update record in user_sessions
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
                    .update(initialSessionData)
                    .eq('id', dbSessionId);
            } else {
                const { data: newSession, error: insErr } = await supabase
                    .from('user_sessions')
                    .insert([initialSessionData])
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

        // 2. Also record in members.custom_data.active_sessions
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
                    ip_address: cachedIp,
                    location: initialSessionData.location,
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
                            last_ip: cachedIp
                        }
                    })
                    .eq('id', member.id);
            }
        } catch (memberErr) {
            console.warn('members custom_data session update notice:', memberErr);
        }

        // 3. Background IP and location enrichment (non-blocking)
        getWebIPInfo().then(async (ipInfo) => {
            if (!ipInfo?.ip || ipInfo.ip === cachedIp) return;
            try {
                if (dbSessionId) {
                    await supabase
                        .from('user_sessions')
                        .update({
                            ip_address: ipInfo.ip,
                            location: {
                                city: ipInfo.city,
                                region: ipInfo.region,
                                country: ipInfo.country,
                                country_code: ipInfo.country_code
                            }
                        })
                        .eq('id', dbSessionId);
                }
            } catch (e) {
                // Ignore background update error
            }
        }).catch(() => {});

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
        
        // If sessionDbId has not been stored yet (new login in progress), do NOT kick out
        if (!sessionDbId) {
            return true;
        }

        // Grace period: Within first 15 seconds after login, avoid race conditions
        const loginTime = parseInt(localStorage.getItem('lms_session_login_time') || '0', 10);
        if (loginTime > 0 && Date.now() - loginTime < 15000) {
            return true;
        }

        // Query user_sessions specifically for this session ID
        const { data, error } = await supabase
            .from('user_sessions')
            .select('id, is_current')
            .eq('id', sessionDbId)
            .maybeSingle();

        if (error) {
            // Network issue or RLS error: don't kick user out on temporary blip
            return true;
        }

        // If no row exists at all for this sessionDbId, the admin deleted this session!
        if (!data) {
            console.log('Session ID was removed from user_sessions by admin:', sessionDbId);
            return false;
        }

        // If is_current was explicitly flipped to false
        if (data.is_current === false) {
            console.log('Session was marked is_current: false:', sessionDbId);
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
        localStorage.removeItem('lms_session_login_time');
    } catch (e) {
        console.warn('clearWebSession error:', e);
    }
}
