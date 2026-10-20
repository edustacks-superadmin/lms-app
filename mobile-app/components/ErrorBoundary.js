import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('Error caught by ErrorBoundary:', error);
        console.error('Error info:', errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // TODO: Send to error tracking service (e.g., Sentry)
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleGoHome = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
        // Navigate to home - using router if available
        if (this.props.router) {
            this.props.router.replace('/home');
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView className="flex-1 bg-gray-50">
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                        <View className="items-center">
                            {/* Error Icon */}
                            <View className="bg-red-100 w-20 h-20 rounded-full items-center justify-center mb-6">
                                <Ionicons name="alert-circle" size={48} color="#dc2626" />
                            </View>

                            {/* Error Message */}
                            <Text className="text-2xl font-bold text-slate-900 mb-2 text-center">
                                Oops! Something went wrong
                            </Text>
                            <Text className="text-slate-600 text-center mb-8 px-4">
                                We encountered an unexpected error. Don't worry, your data is safe. Try refreshing or go back to the home screen.
                            </Text>

                            {/* Error Details (Development) */}
                            {__DEV__ && this.state.error && (
                                <View className="bg-red-50 p-4 rounded-xl mb-6 w-full border border-red-200">
                                    <Text className="text-red-800 font-bold text-xs mb-2">Error Details (Dev Only):</Text>
                                    <Text className="text-red-700 text-xs font-mono">
                                        {this.state.error.toString()}
                                    </Text>
                                    {this.state.errorInfo?.componentStack && (
                                        <Text className="text-red-600 text-[10px] font-mono mt-2" numberOfLines={5}>
                                            {this.state.errorInfo.componentStack.substring(0, 200)}...
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Action Buttons */}
                            <View className="w-full space-y-3">
                                <TouchableOpacity
                                    onPress={this.handleReset}
                                    className="bg-blue-600 py-4 rounded-xl flex-row items-center justify-center shadow-md"
                                >
                                    <Ionicons name="refresh" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text className="text-white font-bold text-base">Try Again</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={this.handleGoHome}
                                    className="bg-white border-2 border-gray-200 py-4 rounded-xl flex-row items-center justify-center"
                                >
                                    <Ionicons name="home-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
                                    <Text className="text-slate-600 font-bold text-base">Go to Home</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Support Info */}
                            <Text className="text-slate-400 text-xs text-center mt-8">
                                If this problem persists, please contact support
                            </Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
