import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Enhanced horizontal scrolling section with better UI
 */
export default function HorizontalScrollSection({
    icon,
    title,
    data,
    renderItem,
    onSeeAll,
    emptyMessage = "No items available"
}) {
    // Map icon types to color schemes
    const getColorScheme = () => {
        const iconColorMap = {
            'book': { bg: 'bg-blue-50', icon: '#2563eb', emptyBg: 'bg-blue-50/50', emptyIcon: '#93c5fd' },
            'newspaper': { bg: 'bg-purple-50', icon: '#7c3aed', emptyBg: 'bg-purple-50/50', emptyIcon: '#c4b5fd' },
            'megaphone': { bg: 'bg-amber-50', icon: '#f59e0b', emptyBg: 'bg-amber-50/50', emptyIcon: '#fcd34d' },
        };
        return iconColorMap[icon] || { bg: 'bg-blue-50', icon: '#2563eb', emptyBg: 'bg-gray-50', emptyIcon: '#cbd5e1' };
    };

    const colors = getColorScheme();

    return (
        <View className="bg-white p-4 mb-2 shadow-sm border border-gray-100">
            {/* Section Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {icon && (
                        <View className={`w-8 h-8 ${colors.bg} rounded-lg items-center justify-center`} style={{ marginRight: 12 }}>
                            <Ionicons name={icon} size={18} color={colors.icon} />
                        </View>
                    )}
                    <Text className="text-sm font-bold text-slate-900">{title}</Text>
                </View>
                {onSeeAll && data && data.length > 0 && (
                    <TouchableOpacity
                        onPress={onSeeAll}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <Text className="text-blue-600 font-semibold text-xs">See All</Text>
                        <Ionicons name="chevron-forward" size={14} color="#2563eb" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Horizontal Scroll List */}
            {data && data.length > 0 ? (
                <FlatList
                    horizontal
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                    ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                />
            ) : (
                <View className={`px-4 py-8 items-center ${colors.emptyBg} rounded-xl border border-dashed`} style={{ borderColor: colors.emptyIcon }}>
                    <Ionicons name="folder-open-outline" size={40} color={colors.emptyIcon} />
                    <Text className="text-slate-400 text-xs mt-2">{emptyMessage}</Text>
                </View>
            )}
        </View>
    );
}
