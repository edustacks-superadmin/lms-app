import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Banner ad card component for carousel
 */
export default function BannerCard({ banner, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ width: SCREEN_WIDTH - 40 }}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: banner.image_url || banner.banner_url }}
                style={{ width: '100%', height: 180 }}
                contentFit="cover"
                transition={200}
            />
            {banner.title && (
                <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-3">
                    <Text className="text-white font-bold text-sm">{banner.title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
