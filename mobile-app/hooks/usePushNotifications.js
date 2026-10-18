import { useState, useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registerForPushNotificationsAsync } from '../lib/notifications';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load notifications
let Notifications = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        console.warn('Failed to load expo-notifications in hook:', e);
    }
}

/**
 * Custom hook for managing push notifications
 * @param {Function} onNotificationReceived - Callback when notification is received while app is open
 * @param {Function} onNotificationTapped - Callback when user taps<br/> notification
 * @returns {Object} - { expoPushToken, notification }
 */
export const usePushNotifications = (onNotificationReceived, onNotificationTapped) => {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // Register for push notifications
        registerForPushNotificationsAsync().then(token => {
            if (token) {
                setExpoPushToken(token);
            }
        });

        // Listener for notifications received while app is foregrounded
        if (Notifications) {
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
                if (onNotificationReceived) {
                    onNotificationReceived(notification);
                }
            });
        }

        // Listener for when user taps on or interacts with a notification
        if (Notifications) {
            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data;
                if (onNotificationTapped) {
                    onNotificationTapped(data);
                }
            });
        }

        return () => {
            // Cleanup listeners
            if (notificationListener.current && Notifications) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current && Notifications) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [onNotificationReceived, onNotificationTapped]);

    return {
        expoPushToken,
        notification,
    };
};

export default usePushNotifications;
