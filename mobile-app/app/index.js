import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { recordSession } from '../lib/sessionService';
import { ORG_CONFIG } from '../config/organization';
import { Image } from 'expo-image';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace('/home');
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                // User logged in, navigate to main app
                router.replace('/home');
            }
            // Don't navigate on logout - we're already on login screen
        });

        return () => subscription.unsubscribe();
    }, []);

    async function signInWithEmail() {
        setLoading(true);
        const { error, data } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert("Login Failed", error.message);
            setLoading(false);
        } else {
            // Record session after successful login
            if (data.user) {
                await recordSession(data.user.id);
            }
            setLoading(false);
            router.replace('/home');
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            className="flex-1 bg-white"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <StatusBar style="dark" />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="w-full max-w-sm mx-auto">
                    {/* Brand Logo */}
                    <View className="items-center mb-8">
                        <View className="w-24 h-24 mb-4 items-center justify-center">
                            {ORG_CONFIG.logoUrl ? (
                                <Image
                                    source={{ uri: ORG_CONFIG.logoUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="contain"
                                    transition={200}
                                />
                            ) : (
                                <View className="w-16 h-16 bg-blue-50 rounded-2xl items-center justify-center">
                                    <Text className="text-blue-600 font-bold text-2xl">M</Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-2xl font-bold text-slate-800 text-center">{ORG_CONFIG.name}</Text>
                        <Text className="text-sm text-slate-500 mt-1">Sign in to your student account</Text>
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 text-gray-700 font-medium">Email</Text>
                        <TextInput
                            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-base"
                            onChangeText={(text) => setEmail(text)}
                            value={email}
                            placeholder="student@example.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="mb-2 text-gray-700 font-medium">Password</Text>
                        <TextInput
                            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-base"
                            onChangeText={(text) => setPassword(text)}
                            value={password}
                            secureTextEntry={true}
                            placeholder="Password"
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity
                        className="w-full bg-blue-600 p-4 rounded-lg items-center"
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Signup Link */}
                    <View className="flex-row justify-center mt-6">
                        <Text className="text-gray-500">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text className="text-blue-600 font-semibold">Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
