import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

/**
 * Enhanced content card with better UI/UX
 */
export default function ContentCard({
    image,
    title,
    badge,
    badgeColor = '#3b82f6',
    progress,
    metadata,
    onPress,
    width = 160
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
            style={{ width, marginBottom: 8 }}
        >
            <View style={{ overflow: 'hidden', width: '100%', backgroundColor: 'white' }}>
                {/* Image */}
                <View className="relative">
                    {image ? (
                        <Image
                            source={{ uri: image }}
                            style={{ width: '100%', aspectRatio: 16 / 9 }}
                            contentFit="stretch"
                            transition={200}
                        />
                    ) : (
                        <View className="w-full bg-blue-50 items-center justify-center" style={{ height: 90 }}>
                            <Ionicons name="image-outline" size={32} color="#93c5fd" />
                        </View>
                    )}

                    {/* Badge Overlay */}
                    {badge && (
                        <View
                            className="absolute top-2 right-2 px-2 py-2 rounded-full"
                            style={{
                                backgroundColor: badgeColor,
                                elevation: 2
                            }}
                        >
                            <Text className="text-white font-bold text-[12px] uppercase tracking-wider">
                                {badge}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                <View className="p-3">
                    <Text
                        className="text-sm font-bold text-slate-900 mb-2 leading-tight"
                        numberOfLines={2}
                    >
                        {title}
                    </Text>

                    {/* Progress Bar */}
                    {progress !== undefined && progress !== null && (
                        <View className="mb-3">
                            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </View>
                            <Text className="text-[10px] text-slate-500 mt-1 font-semibold">
                                {progress}% Complete
                            </Text>
                        </View>
                    )}

                    {/* Metadata */}
                    {metadata && metadata.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                            {metadata.map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                    {item.icon && (
                                        <Ionicons
                                            name={item.icon}
                                            size={12}
                                            color="#6366f1"
                                            style={{ marginRight: 4 }}
                                        />
                                    )}
                                    <Text className="text-xs text-slate-700 font-bold">
                                        {item.text}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
