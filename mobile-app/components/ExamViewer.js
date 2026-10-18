import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, ActivityIndicator, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

import { ORG_CONFIG } from '../config/organization';

export default function ExamViewer({ url, examId }) {
    const webViewRef = React.useRef(null);
    const [finalUrl, setFinalUrl] = useState(null);
    const [status, setStatus] = useState('initializing'); // initializing, ready, error
    const [key, setKey] = useState(0); // Key to force re-render/reload
    const [lastError, setLastError] = useState(null);

    useEffect(() => {
        setupUrl();
    }, [url, examId]);

    const setupUrl = async () => {
        setStatus('initializing');
        try {
            // 1. Get Authentication Token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || '';

            // 2. Determine Host IP
            const expoConfig = Constants.expoConfig;
            const manifest = Constants.manifest;
            // hostUri is typically "192.168.x.x:8081"
            const hostUri = expoConfig?.hostUri || manifest?.hostUri || manifest?.debuggerHost;

            let ip = '192.168.0.101';
            if (hostUri) {
                ip = hostUri.split(':')[0];
            }

            // Construct the exam URL
            // Using organization's production URL
            const baseUrl = ORG_CONFIG.webUrl;

            // For local development (when testing with local Next.js server):
            // const baseUrl = `http://${ip}:3000`;

            // 3. Construct URL
            // If a direct URL is provided, use it (and append token if needed)
            // Otherwise, construct the localhost URL
            let targetUrl = url;

            if (!targetUrl || targetUrl.trim() === '') {
                if (!examId) throw new Error("No Exam ID provided");
                targetUrl = `${baseUrl}/student/exam/${examId}/take`;
            }

            // Append params
            const url = new URL(targetUrl);
            url.searchParams.set('mobile', 'true');

            // Re-enabled - database issue fixed with .maybeSingle()
            if (session?.access_token) {
                url.searchParams.set('token', session.access_token);
            }

            console.log('[ExamViewer v3-FINAL] URL:', url.toString());
            console.log('[Cache-Bust-' + Date.now() + '] Token enabled, database fixed');
            setFinalUrl(url.toString());
            setStatus('ready');

        } catch (error) {
            console.error('Exam URL Setup Error:', error);
            setStatus('error');
        }
    };

    const reload = () => {
        setKey(prev => prev + 1);
    };

    if (status === 'initializing' || !finalUrl) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Preparing Exam Environment...</Text>
            </View>
        );
    }

    if (status === 'error') {
        return (
            <View style={[styles.container, styles.center, { padding: 20 }]}>
                <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
                <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 10 }]}>
                    Unable to load exam.
                </Text>
                <TouchableOpacity onPress={setupUrl} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={{ flex: 1 }}>
                <WebView
                    key={key}
                    ref={webViewRef}
                    source={{
                        uri: finalUrl,
                        headers: {
                            'X-Client-Platform': 'mobile' // Identify as mobile app
                        }
                    }}
                    style={styles.webview}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowFileAccess={true}
                    scalesPageToFit={true}
                    mixedContentMode="always"
                    onLoadStart={() => console.log('WebView: Load Start')}
                    onLoadEnd={() => console.log('WebView: Load End')}
                    onHttpError={(e) => {
                        console.warn('WebView: HTTP Error', e.nativeEvent);
                        setLastError(`HTTP Error: ${e.nativeEvent.statusCode}`);
                    }}
                    onError={(e) => {
                        console.warn('WebView: Error', e.nativeEvent);
                        setLastError(`Error: ${e.nativeEvent.description} (${e.nativeEvent.code})`);
                    }}
                />

                {lastError && (
                    <View style={[styles.absoluteFill, styles.center, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                        <Ionicons name="warning" size={48} color="#ef4444" />
                        <Text style={{ color: 'white', marginTop: 10, textAlign: 'center', padding: 20 }}>
                            {lastError}
                        </Text>
                        <TouchableOpacity onPress={reload} style={{ marginTop: 20, backgroundColor: '#2563EB', padding: 10, borderRadius: 8 }}>
                            <Text style={{ color: 'white' }}>Retry Connection</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    reloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        padding: 8,
        borderRadius: 6,
        marginRight: 10,
    },
    reloadText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 12,
    },
    urlText: {
        color: '#94a3b8',
        fontSize: 10,
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    absoluteFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 999,
    },
    loadingText: {
        color: '#94a3b8',
        marginTop: 10,
        fontSize: 14,
    },
    retryBtn: {
        marginTop: 20,
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
