import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

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
            }),
        });
    } catch (e) {
        console.warn('Failed to load expo-notifications:', e);
    }
}

/**
 * Register for push notifications and get Expo Push Token
 * @returns {Promise<string|null>} - Expo Push Token or null if registration failed
 */
export async function registerForPushNotificationsAsync() {
    if (isExpoGo || !Notifications) {
        console.log('Push notifications are not supported in Expo Go (SDK 53+)');
        return null;
    }
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563EB',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.error('Project ID not found. Please configure EAS in app.json');
                return null;
            }

            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('Push notification token:', token);
        } catch (error) {
            console.error('Error getting push token:', error);
            return null;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

/**
 * Schedule a local notification
 * @param {Object} notification - Notification content
 * @param {Object} trigger - Notification trigger (time or manual)
 */
export async function scheduleLocalNotification(notification, trigger = null) {
    if (isExpoGo || !Notifications) return;
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
                sound: true,
            },
            trigger: trigger || null, // null = immediate
        });
    } catch (error) {
        console.error('Error scheduling notification:', error);
    }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
    if (isExpoGo || !Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications() {
    if (isExpoGo || !Notifications) return [];
    return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Set notification badge count (iOS)
 * @param {number} count - Badge count
 */
export async function setBadgeCount(count) {
    if (isExpoGo || !Notifications) return;
    if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(count);
    }
}

export default {
    registerForPushNotificationsAsync,
    scheduleLocalNotification,
    cancelAllNotifications,
    getAllScheduledNotifications,
    setBadgeCount,
};
