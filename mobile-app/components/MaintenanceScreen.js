/**
 * Maintenance Screen
 * Displayed when the app is under maintenance
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MaintenanceScreen({ config }) {
    const { title, message, estimatedTime } = config?.maintenance || {};

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="warning" size={60} color="#ef4444" />
                </View>

                <Text style={styles.title}>
                    {title || 'Under Maintenance'}
                </Text>

                <Text style={styles.message}>
                    {message || 'We are upgrading our servers. Please check back soon.'}
                </Text>

                {estimatedTime ? (
                    <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={16} color="#991b1b" />
                        <Text style={styles.timeText}>
                            Estimated time: {estimatedTime}
                        </Text>
                    </View>
                ) : null}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        We apologize for the inconvenience
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fef2f2',
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
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#991b1b',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#b91c1c',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fecaca',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 8,
    },
    timeText: {
        fontSize: 14,
        color: '#991b1b',
        fontWeight: '500',
    },
    footer: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#fecaca',
    },
    footerText: {
        fontSize: 14,
        color: '#dc2626',
        textAlign: 'center',
    },
});
