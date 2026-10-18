import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PdfViewer({ url }) {
    if (!url) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>No PDF URL provided</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0f172a', borderWeight: 10, borderColor: 'red', borderWidth: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#10b981" style={{ marginBottom: 20 }} />
            <Text style={{ color: '#60a5fa', fontSize: 12, marginBottom: 10, textAlign: 'center', fontWeight: 'bold' }}>
                BUILD VERSION: V5 (Web Sync)
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 20, textAlign: 'center' }}>
                Mode: Web Preview | Source: {url}
            </Text>
            <Text style={{ textAlign: 'center', color: '#94a3b8', marginBottom: 30, maxWidth: 400 }}>
                This is a secure preview. Clicking the button below will open the proxied PDF content in a new tab.
            </Text>
            <TouchableOpacity
                onPress={() => Linking.openURL(url)}
                style={{ backgroundColor: '#2563EB', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>View PDF Securely</Text>
            </TouchableOpacity>
        </View>
    );
}
