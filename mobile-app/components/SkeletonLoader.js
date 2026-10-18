import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

// Simple pulse animation skeleton
const SkeletonPulse = ({ width, height, style, borderRadius = 8 }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#e5e7eb',
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Course Card Skeleton for Dashboard/My Courses
export const CourseCardSkeleton = () => (
    <View className="bg-white rounded-2xl shadow-sm mb-3 mx-4 p-4 border border-gray-100">
        <SkeletonPulse width="100%" height={160} borderRadius={12} style={{ marginBottom: 12 }} />
        <SkeletonPulse width="80%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonPulse width="60%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        <View className="flex-row justify-between">
            <SkeletonPulse width={80} height={28} borderRadius={8} />
            <SkeletonPulse width={80} height={28} borderRadius={8} />
        </View>
    </View>
);

// Product Card Skeleton for Store (List View)
export const ProductCardSkeleton = () => (
    <View className="bg-white rounded-xl shadow-sm border border-gray-100 mb-3 overflow-hidden flex-row h-28">
        <SkeletonPulse width={160} height="100%" borderRadius={0} />
        <View className="flex-1 p-3 justify-center">
            <SkeletonPulse width="90%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonPulse width="70%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
            <SkeletonPulse width={80} height={24} borderRadius={6} />
        </View>
    </View>
);

// Leaderboard Item Skeleton for Ranking
export const LeaderboardSkeleton = () => (
    <View className="flex-row items-center p-4 mb-2 bg-white rounded-xl border border-gray-100">
        <SkeletonPulse width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
        <View className="flex-1">
            <SkeletonPulse width="70%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <SkeletonPulse width="40%" height={12} borderRadius={4} />
        </View>
        <SkeletonPulse width={50} height={28} borderRadius={6} />
    </View>
);

export default SkeletonPulse;
