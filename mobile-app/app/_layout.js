import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import '../global.css';
import ErrorBoundary from '../components/ErrorBoundary';
import MaintenanceScreen from '../components/MaintenanceScreen';
import UpdateRequiredScreen from '../components/UpdateRequiredScreen';
import { supabase } from '../lib/supabase';
import { fetchAppConfig, isMaintenanceMode, needsForceUpdate } from '../lib/configService';
import { checkSessionValidity } from '../lib/sessionService';
import * as SplashScreen from 'expo-splash-screen';
import {
    requestNotificationPermissions,
    registerPushToken,
    addNotificationReceivedListener,
    addNotificationResponseListener
} from '../lib/pushNotifications';
import * as ScreenCapture from 'expo-screen-capture';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const router = useRouter();
    const notificationListener = useRef();
    const responseListener = useRef();
    const [appIsReady, setAppIsReady] = useState(false);
    const [appConfig, setAppConfig] = useState(null);
    const [blockingScreen, setBlockingScreen] = useState(null); // 'maintenance' | 'update' | null

    const [loaded] = useFonts({
        ...Ionicons.font,
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    useEffect(() => {
        async function prepare() {
            try {
                // Ensure screenshot protection is DISABLED
                await ScreenCapture.allowScreenCaptureAsync();

                // Request notification permissions on app start
                requestNotificationPermissions();

                // Set up notification listeners
                notificationListener.current = addNotificationReceivedListener(notification => {
                    console.log('Notification received:', notification);
                });

                responseListener.current = addNotificationResponseListener(response => {
                    console.log('Notification tapped:', response);
                    const data = response.notification.request.content.data;
                    if (data?.url) {
                        router.push(data.url);
                    }
                });

                // Fetch app config from server
                const config = await fetchAppConfig(true);
                setAppConfig(config);

                // Check for blocking conditions
                if (isMaintenanceMode(config)) {
                    setBlockingScreen('maintenance');
                } else if (needsForceUpdate(config)) {
                    setBlockingScreen('update');
                }

                // Small delay to ensure smooth transition
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (e) {
                console.warn('Error during app preparation:', e);
            } finally {
                setAppIsReady(true);
            }
        }

        prepare();
    }, []);

    useEffect(() => {
        // Register push token when user logs in
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // 1. Fetch Member
                let { data: member } = await supabase
                    .from('members')
                    .select('id, auth_user_id')
                    .eq('email', session.user.email)
                    .single();

                // 2. Self-Heal: If member exists but auth_user_id is missing, link it now.
                if (member && !member.auth_user_id) {
                    console.log('Self-healing member record: Linking auth_user_id');
                    const { error: updateError } = await supabase
                        .from('members')
                        .update({ auth_user_id: session.user.id })
                        .eq('id', member.id);

                    if (!updateError) {
                        member.auth_user_id = session.user.id; // Update local ref
                    } else {
                        console.error('Failed to link auth_user_id:', updateError);
                    }
                }

                if (member) {
                    registerPushToken(member.id);
                }
            }
        });

        // -----------------------------------------------------------------
        // SINGLE DEVICE POLICY ENFORCEMENT
        // Periodically check if the current session is still valid
        // -----------------------------------------------------------------
        const sessionCheckInterval = setInterval(async () => {
            try {
                // Only run check if user is logged in
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const isValid = await checkSessionValidity();

                // If false, it means we have been kicked out by another device
                // (i.e. is_current was set to false by another login)
                if (!isValid) {
                    console.log('Device session invalidated. Logging out.');
                    await supabase.auth.signOut();
                    alert('You have been logged out because this account was logged in on another device.');
                }
            } catch (err) {
                console.error('Session validity check failed:', err);
            }
        }, 60000); // Check every minute

        return () => {
            subscription.unsubscribe();
            clearInterval(sessionCheckInterval);
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    // Show nothing while loading
    if (!appIsReady) {
        return null;
    }

    // Show maintenance screen if enabled
    if (blockingScreen === 'maintenance') {
        return (
            <ErrorBoundary>
                <MaintenanceScreen config={appConfig} />
            </ErrorBoundary>
        );
    }

    // Show update required screen if force update needed
    if (blockingScreen === 'update') {
        return (
            <ErrorBoundary>
                <UpdateRequiredScreen config={appConfig} />
            </ErrorBoundary>
        );
    }

    // Normal app flow
    return (
        <ErrorBoundary>
            <Stack screenOptions={{ headerShown: false }} />
        </ErrorBoundary>
    );
}
