/**
 * Update Required Screen
 * Displayed when the app version is below minimum required
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAppVersion } from '../lib/configService';

export default function UpdateRequiredScreen({ config }) {
    const { updateMessage, playStoreUrl, current, minimum } = config?.version || {};
    const appVersion = getAppVersion();

    const handleUpdate = () => {
        const url = playStoreUrl ||
            (Platform.OS === 'android'
                ? 'https://play.google.com/store/apps/details?id=com.maheshiesacademy.mobile'
                : 'https://apps.apple.com/app/id0000000000');

        Linking.openURL(url).catch(err => console.error('Error opening store:', err));
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="refresh" size={50} color="#3b82f6" />
                </View>

                <Text style={styles.title}>
                    Update Required
                </Text>

                <Text style={styles.message}>
                    {updateMessage || 'A new version is available. Please update to continue using the app.'}
                </Text>

                <View style={styles.versionInfo}>
                    <Text style={styles.versionText}>
                        Your version: <Text style={styles.versionNumber}>v{appVersion}</Text>
                    </Text>
                    <Text style={styles.versionText}>
                        Required: <Text style={styles.versionNumber}>v{minimum || '1.0.0'}</Text>
                    </Text>
                </View>

                <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                    <Ionicons name="download" size={20} color="white" />
                    <Text style={styles.updateButtonText}>Update Now</Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Update to get the latest features and improvements
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        maxWidth: 320,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e40af',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#3b82f6',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    versionInfo: {
        backgroundColor: '#dbeafe',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24,
    },
    versionText: {
        fontSize: 14,
        color: '#1e40af',
        textAlign: 'center',
        marginBottom: 4,
    },
    versionNumber: {
        fontWeight: 'bold',
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 10,
        width: '100%',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    updateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footerText: {
        marginTop: 24,
        fontSize: 13,
        color: '#60a5fa',
        textAlign: 'center',
    },
});
