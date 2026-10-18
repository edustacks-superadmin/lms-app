import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ORG_CONFIG, getApiUrl } from '../config/organization';
import { CITY_STATE_MAP } from '../utils/cityStateMap';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function SignupScreen() {
    const router = useRouter();
    const [fields, setFields] = useState([]);
    const [formData, setFormData] = useState({});
    const [countryCodes, setCountryCodes] = useState({});
    const [loading, setLoading] = useState(false);
    const [fieldsLoading, setFieldsLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [photo, setPhoto] = useState(null);

    // Date Picker State
    const [datePickerState, setDatePickerState] = useState({ show: false, fieldKey: null, mode: 'date' });

    // Dropdown State
    const [dropdownState, setDropdownState] = useState({ show: false, fieldKey: null, options: [] });

    const DEFAULT_COUNTRY_CODE = '+91';

    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace('/(drawer)/(tabs)');
            }
        });

        fetchRegistrationFields();
    }, []);

    const fetchRegistrationFields = async () => {
        try {
            setFieldsLoading(true);
            const { data, error } = await supabase
                .from('registration_fields')
                .select('*')
                .eq('is_enabled', true)
                .order('display_order');

            if (error) throw error;

            if (data) {
                setFields(data);
                // Initialize form data
                const initialData = {};
                const initialCountryCodes = {};
                data.forEach(field => {
                    if (field.field_key !== 'photo') {
                        initialData[field.field_key] = '';
                    }
                    if (field.field_type === 'tel') {
                        initialCountryCodes[field.field_key] = DEFAULT_COUNTRY_CODE;
                    }
                });
                initialData.password = '';
                initialData.confirmPassword = '';
                setFormData(initialData);
                setCountryCodes(initialCountryCodes);
            }
        } catch (error) {
            console.error('Error fetching fields:', error);
            Alert.alert('Error', 'Failed to load registration form');
        } finally {
            setFieldsLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Auto-populate State if City changes
            if (field === 'city' && CITY_STATE_MAP[value]) {
                newData.state = CITY_STATE_MAP[value];
            }

            return newData;
        });
    };

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true, // Request base64 for upload
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPhoto(result.assets[0]);
        }
    };

    const uploadPhoto = async (userId, photoAsset) => {
        if (!photoAsset || !photoAsset.uri) return null;

        try {
            const formData = new FormData();
            const fileExt = photoAsset.uri.split('.').pop() || 'jpg';
            const fileName = `${userId}.${fileExt}`;

            // React Native FormData expects an object for files
            formData.append('file', {
                uri: Platform.OS === 'ios' ? photoAsset.uri.replace('file://', '') : photoAsset.uri,
                name: fileName,
                type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            });
            formData.append('folder', 'profiles');

            const uploadUrl = getApiUrl('/api/upload');

            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            console.log('Mobile photo uploaded to R2 successfully:', result.url);
            return result.url;
        } catch (error) {
            console.error('Error uploading photo to R2:', error);
            // Alert.alert('Upload Error', 'Failed to upload profile photo.');
            return null;
        }
    };

    const validateForm = () => {
        // Password validation (Always required)
        if (!formData.password || formData.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        // Dynamic validation
        for (const field of fields) {
            // Photo validation
            if (field.field_type === 'file' && field.is_required) {
                if (!photo) {
                    Alert.alert('Error', `${field.field_label} is required`);
                    return false;
                }
                continue;
            }

            // Other fields validation (Skip password fields here as checked above)
            if (field.is_required && !formData[field.field_key]) {
                Alert.alert('Error', `${field.field_label} is required`);
                return false;
            }

            // Email format
            if (field.field_key === 'email' && !/\S+@\S+\.\S/.test(formData[field.field_key])) {
                Alert.alert('Error', 'Please enter a valid email address');
                return false;
            }
        }
        return true;
    };

    const sendWelcomeEmail = async (email, firstName, lastName) => {
        try {
            await fetch(getApiUrl('/api/student/welcome'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    institute_name: ORG_CONFIG.name,
                    login_url: ORG_CONFIG.webUrl + '/login'
                })
            });
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const email = formData.email;
            const firstName = formData.first_name || '';
            const lastName = formData.last_name || '';

            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: formData.password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        role: 'student'
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Upload photo if provided
                let photo_url = null;
                if (photo) {
                    photo_url = await uploadPhoto(authData.user.id, photo);
                }

                // 3. Prepare custom data
                const standardKeys = ['first_name', 'last_name', 'email', 'password', 'confirmPassword'];
                const custom_data = {};

                Object.keys(formData).forEach(key => {
                    if (!standardKeys.includes(key) && formData[key]) {
                        // Handle phone with country code
                        if (fields.find(f => f.field_key === key)?.field_type === 'tel' && countryCodes[key]) {
                            custom_data[key] = `${countryCodes[key]} ${formData[key]}`;
                        } else {
                            custom_data[key] = formData[key];
                        }
                    }
                });

                // 4. Update members table
                const updates = {};
                if (photo_url) updates.photo_url = photo_url;
                if (Object.keys(custom_data).length > 0) updates.custom_data = custom_data;

                if (Object.keys(updates).length > 0) {
                    await supabase
                        .from('members')
                        .update(updates)
                        .eq('email', email);
                }

                // 5. Send welcome email
                await sendWelcomeEmail(email, firstName, lastName);

                Alert.alert(
                    'Account Created!',
                    'Please check your email to confirm your account before logging in.',
                    [{ text: 'Go to Login', onPress: () => router.replace('/') }]
                );
            }
        } catch (error) {
            console.error('Signup error:', error);
            Alert.alert('Signup Failed', error.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    // === UI Render Logic ===

    // Handle Date Selection
    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date(); // If dismissed, keep current logic or ignore
        // If user cancelled, event.type === 'dismissed' (Android)
        setDatePickerState(prev => ({ ...prev, show: Platform.OS === 'ios' })); // Keep open on iOS if needed, or close

        if (event.type === 'set' || Platform.OS === 'ios') {
            // Basic format YYYY-MM-DD
            const formattedDate = currentDate.toISOString().split('T')[0];
            handleChange(datePickerState.fieldKey, formattedDate);
        }

        if (Platform.OS === 'android') {
            setDatePickerState(prev => ({ ...prev, show: false }));
        }
    };

    // Simple Modal Dropdown
    const renderDropdownModal = () => (
        <Modal
            visible={dropdownState.show}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDropdownState(prev => ({ ...prev, show: false }))}
        >
            <TouchableWithoutFeedback onPress={() => setDropdownState(prev => ({ ...prev, show: false }))}>
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <TouchableWithoutFeedback>
                        <View className="bg-white w-full max-h-[50%] rounded-2xl overflow-hidden p-4">
                            <Text className="text-lg font-bold mb-4 text-center border-b border-gray-100 pb-2">Select an option</Text>
                            <FlatList
                                data={dropdownState.options}
                                keyExtractor={(item) => item.value}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        className="py-4 border-b border-gray-100"
                                        onPress={() => {
                                            handleChange(dropdownState.fieldKey, item.value);
                                            setDropdownState(prev => ({ ...prev, show: false }));
                                        }}
                                    >
                                        <Text className="text-base text-center text-slate-800 font-medium">{item.label}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderField = (field) => {
        if (field.field_type === 'file') {
            return (
                <View key={field.id} className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">
                        {field.field_label} {field.is_required && <Text className="text-red-500">*</Text>}
                    </Text>
                    <TouchableOpacity
                        onPress={pickImage}
                        className="h-32 bg-gray-50 border border-gray-200 border-dashed rounded-xl items-center justify-center overflow-hidden"
                    >
                        {photo ? (
                            <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="items-center">
                                <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                                <Text className="text-gray-400 text-xs mt-2">Tap to upload photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }

        if (field.field_type === 'tel') {
            return (
                <View key={field.id} className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">
                        {field.field_label} {field.is_required && <Text className="text-red-500">*</Text>}
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                        <View className="bg-gray-100 px-3 py-3 border-r border-gray-200">
                            <Text className="text-slate-600">{countryCodes[field.field_key] || DEFAULT_COUNTRY_CODE}</Text>
                        </View>
                        <TextInput
                            className="flex-1 py-3 px-3 text-slate-800"
                            placeholder={field.placeholder || '1234567890'}
                            placeholderTextColor="#9ca3af"
                            value={formData[field.field_key]}
                            onChangeText={(text) => handleChange(field.field_key, text)}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>
            );
        }

        // Date Picker Field
        if (field.field_type === 'date') {
            return (
                <View key={field.id} className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">
                        {field.field_label} {field.is_required && <Text className="text-red-500">*</Text>}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setDatePickerState({ show: true, fieldKey: field.field_key, mode: 'date' })}
                        className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                    >
                        <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                        <Text className={`flex-1 ml-2 ${formData[field.field_key] ? 'text-slate-800' : 'text-gray-400'}`}>
                            {formData[field.field_key] || field.placeholder || 'Select Date'}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Dropdown (Select) Field
        if (field.field_type === 'select') {
            return (
                <View key={field.id} className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">
                        {field.field_label} {field.is_required && <Text className="text-red-500">*</Text>}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setDropdownState({
                            show: true,
                            fieldKey: field.field_key,
                            options: field.field_options || []
                        })}
                        className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                    >
                        <Ionicons name="list-outline" size={20} color="#9ca3af" />
                        <Text className={`flex-1 ml-2 ${formData[field.field_key] ? 'text-slate-800' : 'text-gray-400'}`}>
                            {/* Find label for value if possible, else show value */}
                            {field.field_options?.find(o => o.value === formData[field.field_key])?.label
                                || formData[field.field_key]
                                || field.placeholder
                                || 'Select an option'
                            }
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
            );
        }

        if (field.field_type === 'textarea') {
            return (
                <View key={field.id} className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">
                        {field.field_label} {field.is_required && <Text className="text-red-500">*</Text>}
                    </Text>
                    <View className="flex-row items-start bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                        <Ionicons name="document-text-outline" size={20} color="#9ca3af" style={{ marginTop: 4 }} />
                        <TextInput
                            className="flex-1 px-3 text-slate-800 min-h-[80px]"
                            placeholder={field.placeholder}
                            placeholderTextColor="#9ca3af"
                            value={formData[field.field_key]}
                            onChangeText={(text) => handleChange(field.field_key, text)}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                </View>
            );
        }

        // Default Text Input
        let iconName = 'pencil-outline';
        if (field.field_key.includes('email')) iconName = 'mail-outline';
        else if (field.field_key.includes('name')) iconName = 'person-outline';
        else if (field.field_key.includes('city') || field.field_key.includes('state') || field.field_key.includes('address')) iconName = 'location-outline';

        return (
            <View key={field.id} className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">
                    {field.field_label} {field.is_required && <Text className="text-red-500">*</Text>}
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                    <Ionicons name={iconName} size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-3 px-3 text-slate-800"
                        placeholder={field.placeholder}
                        placeholderTextColor="#9ca3af"
                        value={formData[field.field_key]}
                        onChangeText={(text) => handleChange(field.field_key, text)}
                        autoCapitalize={field.field_key === 'email' ? 'none' : 'sentences'}
                        keyboardType={field.field_key === 'email' ? 'email-address' : 'default'}
                    />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="items-center mb-8">
                        <View className="w-16 h-16 bg-blue-50 rounded-2xl items-center justify-center mb-4">
                            <Ionicons name="person-add" size={32} color="#2563EB" />
                        </View>
                        <Text className="text-2xl font-bold text-slate-900 text-center">{ORG_CONFIG.name}</Text>
                        <Text className="text-sm text-slate-500 mt-1">Create your student account</Text>
                    </View>

                    {fieldsLoading ? (
                        <View className="py-10">
                            <ActivityIndicator size="large" color="#2563EB" />
                        </View>
                    ) : (
                        <View className="space-y-4">
                            {/* Dynamic Fields */}
                            {fields
                                .filter(f => !['password', 'confirm_password'].includes(f.field_key))
                                .map(field => renderField(field))}

                            {/* Password Fields (Always present) */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-slate-700 mb-2">Password <Text className="text-red-500">*</Text></Text>
                                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                                    <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                                    <TextInput
                                        className="flex-1 py-3 px-3 text-slate-800"
                                        placeholder="Create a password"
                                        placeholderTextColor="#9ca3af"
                                        value={formData.password}
                                        onChangeText={(text) => handleChange('password', text)}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9ca3af" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-sm font-medium text-slate-700 mb-2">Confirm Password <Text className="text-red-500">*</Text></Text>
                                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                                    <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                                    <TextInput
                                        className="flex-1 py-3 px-3 text-slate-800"
                                        placeholder="Confirm your password"
                                        placeholderTextColor="#9ca3af"
                                        value={formData.confirmPassword}
                                        onChangeText={(text) => handleChange('confirmPassword', text)}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9ca3af" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Signup Button */}
                            <TouchableOpacity
                                className="bg-blue-600 py-4 rounded-xl items-center shadow-sm"
                                onPress={handleSignup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Create Account</Text>
                                )}
                            </TouchableOpacity>

                            {/* Login Link */}
                            <View className="flex-row justify-center mt-6">
                                <Text className="text-slate-500">Already have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/')}>
                                    <Text className="text-blue-600 font-semibold">Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Modals and DatePickers */}
                {datePickerState.show && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={new Date()}
                        mode="date"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                    />
                )}

                {renderDropdownModal()}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
