import React from 'react';
import { View, Text } from 'react-native';

export default function PerformanceDonutChart({ data }) {
    const { correct, incorrect, unanswered, totalQuestions } = data;

    const chartData = [
        {
            name: 'Correct',
            count: correct,
            color: '#22c55e',
            bgColor: '#dcfce7',
            icon: '✓'
        },
        {
            name: 'Incorrect',
            count: incorrect,
            color: '#ef4444',
            bgColor: '#fee2e2',
            icon: '✗'
        },
        {
            name: 'Unanswered',
            count: unanswered,
            color: '#94a3b8',
            bgColor: '#f1f5f9',
            icon: '—'
        }
    ];

    if (totalQuestions === 0) {
        return (
            <View className="items-center justify-center py-10">
                <Text className="text-slate-500 text-base">No exam data available</Text>
            </View>
        );
    }

    return (
        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
            <Text className="text-lg font-bold text-slate-800 mb-5">Overall Performance</Text>

            {/* Summary Stats */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 24,
                backgroundColor: '#f8fafc',
                borderRadius: 12,
                padding: 16
            }}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, fontWeight: '700', color: '#1e293b' }}>
                        {totalQuestions}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Total Questions
                    </Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, fontWeight: '700', color: '#22c55e' }}>
                        {Math.round((correct / totalQuestions) * 100)}%
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Accuracy
                    </Text>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={{ gap: 12 }}>
                {chartData.map((item, index) => {
                    const percentage = totalQuestions > 0
                        ? Math.round((item.count / totalQuestions) * 100)
                        : 0;

                    return (
                        <View
                            key={index}
                            style={{
                                backgroundColor: item.bgColor,
                                borderRadius: 12,
                                padding: 14,
                                borderLeftWidth: 4,
                                borderLeftColor: item.color
                            }}
                        >
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 10
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: '600',
                                        color: item.color,
                                        marginRight: 8
                                    }}>
                                        {item.icon}
                                    </Text>
                                    <Text style={{
                                        fontSize: 15,
                                        fontWeight: '600',
                                        color: '#334155'
                                    }}>
                                        {item.name}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{
                                        fontSize: 24,
                                        fontWeight: '700',
                                        color: item.color
                                    }}>
                                        {percentage}%
                                    </Text>
                                    <Text style={{
                                        fontSize: 12,
                                        color: '#64748b'
                                    }}>
                                        {item.count} question{item.count !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={{
                                height: 6,
                                backgroundColor: 'rgba(255,255,255,0.6)',
                                borderRadius: 3,
                                overflow: 'hidden'
                            }}>
                                <View
                                    style={{
                                        width: `${percentage}%`,
                                        height: '100%',
                                        backgroundColor: item.color
                                    }}
                                />
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
