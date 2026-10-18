import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

export default function Profile() {
    const router = useRouter();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        photo_url: null,
        joining_date: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            setUser(authUser);

            if (authUser) {
                const { data, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('email', authUser.email)
                    .single();

                if (error) throw error;
                if (data) {
                    setProfile({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        phone_number: data.phone_number || '',
                        email: data.email || authUser.email,
                        photo_url: data.photo_url,
                        joining_date: data.joining_date || new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('members')
                .update({
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone_number: profile.phone_number
                })
                .eq('email', profile.email);

            if (error) throw error;
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile.');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const pickImage = async () => {
        // We removed requestMediaLibraryPermissionsAsync() to comply with Google Play Policy.
        // On Android, launching the image library without permissions will trigger the 
        // system's secure "Photo Picker" which does not require the READ_MEDIA_IMAGES permission.

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0]);
        }
    };

    /**
     * Converts a URI (local or data) to a Blob using XMLHttpRequest.
     * This is more reliable in React Native than fetch().blob().
     */
    const uriToBlob = (uri) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                resolve(xhr.response);
            };
            xhr.onerror = function (e) {
                console.error('XHR Error:', e);
                reject(new Error('Failed to convert image to blob.'));
            };
            xhr.responseType = 'blob';
            xhr.open('GET', uri, true);
            xhr.send(null);
        });
    };

    const uploadImage = async (imageAsset) => {
        if (!user) {
            Alert.alert('Error', 'User session not found. Please log in again.');
            return;
        }

        setSaving(true);
        console.log('--- Upload Started ---');
        console.log('URI:', imageAsset.uri);
        console.log('Has Base64:', !!imageAsset.base64);

        try {
            const ext = imageAsset.uri.substring(imageAsset.uri.lastIndexOf('.') + 1) || 'jpg';
            const fileName = `profiles/${user.id}-${Date.now()}.${ext}`;

            // 1. Prepare Binary Data
            let arrayBuffer;
            try {
                if (imageAsset.base64) {
                    console.log('Processing via Base64...');
                    // Robust base64 to ArrayBuffer conversion (Standard JS)
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                    const lookup = new Uint8Array(256);
                    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

                    const base64 = imageAsset.base64.replace(/[\s=]/g, '');
                    const len = base64.length;
                    const bufferLength = len * 0.75;
                    const bytes = new Uint8Array(bufferLength);

                    for (let i = 0, p = 0; i < len; i += 4) {
                        const encoded1 = lookup[base64.charCodeAt(i)];
                        const encoded2 = lookup[base64.charCodeAt(i + 1)];
                        const encoded3 = lookup[base64.charCodeAt(i + 2)];
                        const encoded4 = lookup[base64.charCodeAt(i + 3)];

                        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
                        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
                        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
                    }
                    arrayBuffer = bytes.buffer;
                } else {
                    console.log('No base64 found, attempting blob fallback...');
                    arrayBuffer = await uriToBlob(imageAsset.uri);
                }
            } catch (bufErr) {
                console.error('Binary conversion failed:', bufErr);
                throw new Error('Could not process image for upload: ' + bufErr.message);
            }

            // 2. Upload to Supabase
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('user-photos')
                .upload(fileName, arrayBuffer, {
                    contentType: imageAsset.mimeType || `image/${ext}`,
                    upsert: true
                });

            if (uploadError) {
                console.error('Supabase Storage Error:', uploadError);
                throw uploadError;
            }

            console.log('Upload successful:', uploadData);

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('user-photos')
                .getPublicUrl(fileName);

            console.log('Updating profile with URL:', publicUrl);

            // 4. Update Profile in DB
            const { error: updateError } = await supabase
                .from('members')
                .update({ photo_url: publicUrl })
                .eq('email', profile.email);

            if (updateError) {
                console.error('DB Update Error:', updateError);
                throw updateError;
            }

            setProfile(prev => ({ ...prev, photo_url: publicUrl }));
            Alert.alert('Success', 'Profile photo updated!');

        } catch (error) {
            console.error('--- Upload Failed ---');
            console.error('Type:', error.name);
            console.error('Message:', error.message);

            let displayMessage = error.message;
            if (displayMessage === 'Network request failed') {
                displayMessage = 'Could not reach server. Please check your internet connection.';
            }

            Alert.alert('Upload Failed', displayMessage);
        } finally {
            setSaving(false);
            console.log('--- Upload Process Finished ---');
        }
    };

    const handleLogout = async () => {
        try {
            console.log('Logging out from profile...');

            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Logout error:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
                return;
            }

            console.log('Sign out successful, navigating to login...');

            // Reset navigation stack to login screen
            setTimeout(() => {
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'index' }],
                    })
                );
            }, 100);
        } catch (err) {
            console.error('Unexpected logout error:', err);
            Alert.alert('Error', 'An unexpected error occurred.');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Header bg */}
                    <View className="bg-blue-600 h-32 w-full absolute top-0 left-0" />

                    <View className="px-5 pt-8">
                        <Text className="text-2xl font-bold text-white mb-6">My Profile</Text>

                        {/* Profile Card */}
                        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5 items-center">
                            <View className="relative -mt-12 mb-3">
                                <View className="w-24 h-24 rounded-full bg-white border-2 border-gray-100 p-1 shadow-md">
                                    <Image
                                        source={{ uri: profile.photo_url || 'https://ui-avatars.com/api/?name=' + (profile.first_name || 'User') + '&background=0D8ABC&color=fff' }}
                                        className="w-full h-full rounded-full"
                                        resizeMode="cover"
                                    />
                                </View>
                                <TouchableOpacity
                                    className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white shadow-sm"
                                    onPress={pickImage}
                                >
                                    <Ionicons name="camera" size={16} color="white" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-xl font-bold text-slate-800">
                                {profile.first_name} {profile.last_name}
                            </Text>
                            <Text className="text-slate-500 text-sm">Student Account</Text>
                        </View>

                        {/* Edit Form */}
                        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <Text className="text-lg font-bold text-slate-800 mb-4">Personal Information</Text>

                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-slate-500 mb-1 ml-1">FIRST NAME</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800"
                                    value={profile.first_name}
                                    onChangeText={text => setProfile({ ...profile, first_name: text })}
                                    placeholder="First Name"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-slate-500 mb-1 ml-1">LAST NAME</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800"
                                    value={profile.last_name}
                                    onChangeText={text => setProfile({ ...profile, last_name: text })}
                                    placeholder="Last Name"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-slate-500 mb-1 ml-1">PHONE NUMBER</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800"
                                    value={profile.phone_number}
                                    onChangeText={text => setProfile({ ...profile, phone_number: text })}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-xs font-semibold text-slate-500 mb-1 ml-1">EMAIL (Read Only)</Text>
                                <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
                                    <Text className="text-slate-500">{profile.email}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                className={`flex-row items-center justify-center py-3.5 rounded-xl ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-white font-bold text-base">Save Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogout}
                            className="mt-6 flex-row items-center justify-center p-4 bg-red-50 rounded-xl border border-red-100 mb-8"
                        >
                            <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
                            <Text className="text-red-600 font-bold text-base">Sign Out</Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
