import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendMessage } from '../../lib/geminiService';

export default function AIChat() {
    const router = useRouter();
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: "Hi! I'm your AI learning assistant. I'm here to help you with your studies, answer questions, and provide guidance. How can I help you today?",
            role: 'ai',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const flatListRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Handle keyboard show/hide
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage = inputText.trim();
        setInputText('');

        // Add user message
        const newUserMessage = {
            id: Date.now().toString(),
            text: userMessage,
            role: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);

        try {
            // Get conversation history (last 10 messages for context)
            const conversationHistory = messages.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'ai',
                text: msg.text
            }));

            // Send to Gemini API
            const aiResponse = await sendMessage(userMessage, conversationHistory);

            // Add AI response
            const newAIMessage = {
                id: (Date.now() + 1).toString(),
                text: aiResponse,
                role: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, newAIMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            Alert.alert('Error', error.message || 'Failed to get response. Please try again.');

            // Add error message
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: "I'm having trouble connecting right now. Please check your internet connection and try again.",
                role: 'ai',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        Alert.alert(
            'Clear Chat',
            'Are you sure you want to clear the conversation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        setMessages([{
                            id: '1',
                            text: "Hi! I'm your AI learning assistant. How can I help you today?",
                            role: 'ai',
                            timestamp: new Date()
                        }]);
                    }
                }
            ]
        );
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';

        return (
            <View className={`px-4 mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
                <View className={`max-w-[80%] rounded-2xl p-3 ${isUser
                    ? 'bg-blue-600'
                    : item.isError
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-100'
                    }`}>
                    <Text className={`text-sm ${isUser ? 'text-white' : item.isError ? 'text-red-700' : 'text-slate-800'
                        }`}>
                        {item.text}
                    </Text>
                </View>
                <Text className="text-xs text-slate-400 mt-1">
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar style="dark" />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View className="bg-white border-b border-gray-200 px-4 py-3">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="mr-3"
                            >
                                <Ionicons name="arrow-back" size={24} color="#1e293b" />
                            </TouchableOpacity>
                            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <Ionicons name="sparkles" size={20} color="#2563eb" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-slate-900">AI Assistant</Text>
                                <Text className="text-xs text-slate-500">Always here to help</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={clearChat}>
                            <Ionicons name="trash-outline" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingVertical: 16, paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                />

                {/* Loading indicator */}
                {isLoading && (
                    <View className="px-4 pb-2 flex-row items-center">
                        <View className="bg-gray-100 rounded-2xl p-3 flex-row items-center">
                            <ActivityIndicator size="small" color="#2563eb" />
                            <Text className="text-slate-600 text-sm ml-2">Thinking...</Text>
                        </View>
                    </View>
                )}

                {/* Input */}
                <View
                    className="bg-white border-t border-gray-200 px-4 py-3"
                    style={{ marginBottom: keyboardHeight }}
                >
                    <View className="flex-row items-center">
                        <TextInput
                            className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-slate-800"
                            placeholder="Ask me anything..."
                            placeholderTextColor="#94a3b8"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            editable={!isLoading}
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!inputText.trim() || isLoading}
                            className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${inputText.trim() && !isLoading ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                        >
                            <Ionicons
                                name="send"
                                size={20}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
