import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SubjectAccordion({ subject }) {
    const [expanded, setExpanded] = useState(false);
    const [animation] = useState(new Animated.Value(0));

    const toggleExpand = () => {
        setExpanded(!expanded);
        Animated.timing(animation, {
            toValue: expanded ? 0 : 1,
            duration: 300,
            useNativeDriver: false
        }).start();
    };

    const heightInterpolate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (subject.children?.length || 0) * 120]
    });

    const rotateInterpolate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    const hasChildren = subject.children && subject.children.length > 0;

    // Get score color based on performance
    const getScoreColor = (score) => {
        if (score >= 75) return '#22c55e';
        if (score >= 50) return '#f59e0b';
        if (score >= 25) return '#ef4444';
        return '#94a3b8';
    };

    return (
        <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
        }}>
            {/* Parent Subject Header */}
            <TouchableOpacity
                onPress={toggleExpand}
                disabled={!hasChildren}
                style={{ padding: 16 }}
                activeOpacity={0.7}
            >
                {/* Header Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1e293b' }}>
                            {subject.name}
                        </Text>
                        {hasChildren && (
                            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                {subject.children.length} topic{subject.children.length !== 1 ? 's' : ''}
                            </Text>
                        )}
                    </View>

                    {hasChildren && (
                        <Animated.View style={{
                            transform: [{ rotate: rotateInterpolate }],
                            backgroundColor: '#f8fafc',
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <Ionicons name="chevron-down" size={18} color="#64748b" />
                        </Animated.View>
                    )}
                </View>

                {/* Score Display */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12
                }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                            Overall Score
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{
                                fontSize: 36,
                                fontWeight: '800',
                                color: getScoreColor(subject.overallScore),
                                letterSpacing: -1
                            }}>
                                {subject.overallScore}
                            </Text>
                            <Text style={{
                                fontSize: 20,
                                fontWeight: '700',
                                color: getScoreColor(subject.overallScore),
                                marginLeft: 2
                            }}>
                                %
                            </Text>
                        </View>
                    </View>

                    {/* Performance Tag */}
                    {subject.tag && (
                        <View style={{
                            backgroundColor: subject.tag.bgColor,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: subject.tag.color + '20'
                        }}>
                            <Text style={{
                                color: subject.tag.color,
                                fontSize: 12,
                                fontWeight: '700'
                            }}>
                                {subject.tag.label}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Multi-segment Progress Bar */}
                <View style={{
                    height: 8,
                    backgroundColor: '#f1f5f9',
                    borderRadius: 4,
                    overflow: 'hidden',
                    flexDirection: 'row'
                }}>
                    {subject.total > 0 && (
                        <>
                            <View style={{
                                width: `${(subject.correct / subject.total) * 100}%`,
                                backgroundColor: '#22c55e'
                            }} />
                            <View style={{
                                width: `${(subject.incorrect / subject.total) * 100}%`,
                                backgroundColor: '#ef4444'
                            }} />
                            <View style={{
                                width: `${(subject.unanswered / subject.total) * 100}%`,
                                backgroundColor: '#cbd5e1'
                            }} />
                        </>
                    )}
                </View>

                {/* Stats Row */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9'
                }}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#22c55e' }}>
                            {subject.correct}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Correct
                        </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#ef4444' }}>
                            {subject.incorrect}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Wrong
                        </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#94a3b8' }}>
                            {subject.unanswered}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Skipped
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Child Subjects (Collapsible) */}
            {hasChildren && (
                <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                    <View style={{
                        backgroundColor: '#f8fafc',
                        paddingHorizontal: 12,
                        paddingVertical: 8
                    }}>
                        {subject.children.map((child, index) => (
                            <View
                                key={child.id}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 8,
                                    borderLeftWidth: 3,
                                    borderLeftColor: getScoreColor(child.accuracy)
                                }}
                            >
                                {/* Child Header */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: '#334155',
                                        flex: 1
                                    }}>
                                        {child.name}
                                    </Text>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: '800',
                                        color: getScoreColor(child.accuracy),
                                        marginLeft: 8
                                    }}>
                                        {child.accuracy}%
                                    </Text>
                                </View>

                                {/* Child Progress Bar */}
                                <View style={{
                                    height: 5,
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                    flexDirection: 'row',
                                    marginBottom: 8
                                }}>
                                    {child.total > 0 && (
                                        <>
                                            <View style={{
                                                width: `${child.accuracy}%`,
                                                backgroundColor: '#22c55e'
                                            }} />
                                            <View style={{
                                                width: `${child.incorrectPct}%`,
                                                backgroundColor: '#ef4444'
                                            }} />
                                            <View style={{
                                                width: `${child.unansweredPct}%`,
                                                backgroundColor: '#cbd5e1'
                                            }} />
                                        </>
                                    )}
                                </View>

                                {/* Child Stats & Tag */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 4 }} />
                                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                                                {child.correct}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 4 }} />
                                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                                                {child.incorrect}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1', marginRight: 4 }} />
                                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                                                {child.unanswered}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Child Tag */}
                                    {child.tag && (
                                        <View style={{
                                            backgroundColor: child.tag.bgColor,
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 6
                                        }}>
                                            <Text style={{
                                                color: child.tag.color,
                                                fontSize: 10,
                                                fontWeight: '700'
                                            }}>
                                                {child.tag.label}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            )}
        </View>
    );
}
