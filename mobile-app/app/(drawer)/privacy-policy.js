import React from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicy() {
    const router = useRouter();

    // JavaScript to hide header and footer
    const injectedJavaScript = `
        (function() {
            // Hide header
            const header = document.querySelector('header');
            if (header) header.style.display = 'none';
            
            // Hide footer
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'none';
            
            // Hide navigation bars
            const nav = document.querySelector('nav');
            if (nav) nav.style.display = 'none';
            
            // Remove padding/margin from body for better fit
            document.body.style.paddingTop = '0';
            document.body.style.marginTop = '0';
        })();
        true;
    `;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-3">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <View className="text-lg font-bold text-slate-900">Privacy Policy</View>
                    </View>
                </View>
            </View>

            {/* WebView */}
            <WebView
                source={{ uri: 'https://maheshiesacademy.edustacks.co.in/privacy-policy' }}
                injectedJavaScript={injectedJavaScript}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                )}
                style={{ flex: 1 }}
            />
        </SafeAreaView>
    );
}
