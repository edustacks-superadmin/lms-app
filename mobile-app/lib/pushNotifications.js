import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load notifications to avoid side-effects in Expo Go
let Notifications = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (e) {
        console.warn('Failed to load expo-notifications:', e);
    }
}

/**
 * Request notification permissions
 * @returns {Promise<boolean>} - Whether permissions were granted
 */
export async function requestNotificationPermissions() {
    if (isExpoGo || !Device.isDevice) {
        if (isExpoGo) console.log('Push notifications are not supported in Expo Go (SDK 53+)');
        else console.log('Push notifications require a physical device');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permissions not granted');
        return false;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563EB',
        });
    }

    return true;
}

/**
 * Get Expo push token
 * @returns {Promise<string|null>} - Expo push token or null
 */
export async function getExpoPushToken() {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return null;

        // Get the project ID from Constants
        const projectId = Constants.expoConfig?.extra?.eas?.projectId
            ?? Constants.easConfig?.projectId;

        if (!projectId) {
            console.log('No project ID found - push notifications may not work in Expo Go');
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
        });

        console.log('Expo Push Token:', tokenData.data);
        return tokenData.data;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
}

/**
 * Register push token with the server
 * @param {string} memberId - The member's ID
 * @returns {Promise<boolean>} - Success status
 */
export async function registerPushToken(memberId) {
    try {
        if (isExpoGo) return false;
        const token = await getExpoPushToken();
        if (!token) {
            console.log('No push token available');
            return false;
        }

        // Check if token already exists
        const { data: existingToken } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('member_id', memberId)
            .eq('expo_push_token', token)
            .single();

        if (existingToken) {
            // Update existing token
            await supabase
                .from('push_tokens')
                .update({
                    is_active: true,
                    updated_at: new Date().toISOString(),
                    device_type: Platform.OS,
                    device_name: Device.modelName || Device.deviceName
                })
                .eq('id', existingToken.id);

            console.log('Push token updated');
        } else {
            // Insert new token
            const { error } = await supabase
                .from('push_tokens')
                .insert({
                    member_id: memberId,
                    expo_push_token: token,
                    device_type: Platform.OS,
                    device_name: Device.modelName || Device.deviceName,
                    is_active: true
                });

            if (error) {
                console.error('Error saving push token:', error);
                return false;
            }
            console.log('Push token registered');
        }

        return true;
    } catch (error) {
        console.error('Error registering push token:', error);
        return false;
    }
}

/**
 * Unregister push token (on logout)
 * @returns {Promise<void>}
 */
export async function unregisterPushToken() {
    try {
        if (isExpoGo) return;
        const token = await getExpoPushToken();
        if (!token) return;

        await supabase
            .from('push_tokens')
            .update({ is_active: false })
            .eq('expo_push_token', token);

        console.log('Push token deactivated');
    } catch (error) {
        console.error('Error unregistering push token:', error);
    }
}

/**
 * Add notification received listener
 * @param {Function} callback - Callback when notification received
 * @returns {Object} - Subscription object
 */
export function addNotificationReceivedListener(callback) {
    if (isExpoGo) return { remove: () => { } };
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 * @param {Function} callback - Callback when notification tapped
 * @returns {Object} - Subscription object
 */
export function addNotificationResponseListener(callback) {
    if (isExpoGo) return { remove: () => { } };
    return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification (for testing)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
export async function scheduleLocalNotification(title, body) {
    if (isExpoGo) return;
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
        },
        trigger: { seconds: 1 },
    });
}

export default {
    requestNotificationPermissions,
    getExpoPushToken,
    registerPushToken,
    unregisterPushToken,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    scheduleLocalNotification,
};
