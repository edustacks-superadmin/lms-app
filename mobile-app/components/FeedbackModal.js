
import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
    Animated, ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getApiUrl } from '../config/organization';

const FeedbackModal = ({
    form,
    onClose,
    onSuccess,
    visible,
    courseId
}) => {
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Animation Values
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            setAnswers({}); // Reset on close
            setIsSuccess(false);
            scaleAnim.setValue(0.9);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!form || !visible) return null;

    const handleSubmit = async () => {
        // Validate
        const missingRequired = form.questions.some(q => q.is_required && !answers[q.id]);
        if (missingRequired) {
            Alert.alert('Required', 'Please answer all required questions.');
            return;
        }

        setSubmitting(true);

        try {
            const endpoint = getApiUrl(`/api/courses/${courseId}/feedback/submit`);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: form.id,
                    answers: answers
                })
            });

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
                // Call onSuccess callback after a short delay or let user close
            } else {
                Alert.alert('Error', data.error || 'Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRating = (questionId, rating) => {
        setAnswers(prev => ({ ...prev, [questionId]: rating }));
    };

    const handleText = (questionId, text) => {
        setAnswers(prev => ({ ...prev, [questionId]: text }));
    };

    const handleClose = () => {
        onClose();
    };

    // Success View
    if (isSuccess) {
        return (
            <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
                <View style={styles.overlay}>
                    <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.successContent}>
                            <View style={styles.successIconContainer}>
                                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                            </View>
                            <Text style={styles.successTitle}>Thank You!</Text>
                            <Text style={styles.successMessage}>Your feedback helps us improve.</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => {
                                handleClose();
                                if (onSuccess) onSuccess();
                            }}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

                    {/* Header */}
                    <LinearGradient
                        colors={['#f8fafc', '#ffffff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.header}
                    >
                        <View>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>We'd love your input</Text>
                            </View>
                            <Text style={styles.title} numberOfLines={1}>
                                {form.name || 'Course Feedback'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
                            <Ionicons name="close" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Body */}
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {form.questions.map((q, index) => (
                            <View key={q.id} style={styles.questionContainer}>
                                <Text style={styles.questionText}>
                                    {q.question_text}
                                    {q.is_required && <Text style={{ color: '#ef4444' }}> *</Text>}
                                </Text>

                                {q.question_type === 'rating' ? (
                                    <View style={styles.ratingContainer}>
                                        {[1, 2, 3, 4, 5].map(star => {
                                            const isSelected = (answers[q.id] || 0) >= star;
                                            return (
                                                <TouchableOpacity
                                                    key={star}
                                                    onPress={() => handleRating(q.id, star)}
                                                    activeOpacity={0.7}
                                                    style={styles.starButton}
                                                >
                                                    <Ionicons
                                                        name={isSelected ? "star" : "star-outline"}
                                                        size={32}
                                                        color={isSelected ? "#fbbf24" : "#e5e7eb"}
                                                    />
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                ) : (
                                    <TextInput
                                        multiline
                                        numberOfLines={4}
                                        value={answers[q.id] || ''}
                                        onChangeText={(text) => handleText(q.id, text)}
                                        placeholder="Share your thoughts..."
                                        style={styles.textArea}
                                        textAlignVertical="top"
                                    />
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Feedback</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '100%',
        maxHeight: '80%',
        maxWidth: 500,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10, // Android shadow
        overflow: 'hidden',
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    badge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    badgeText: {
        color: '#2563eb',
        fontSize: 10,
        fontWeight: '600',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeIcon: {
        padding: 6,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    scrollView: {
        maxHeight: 400,
    },
    scrollContent: {
        padding: 24,
    },
    questionContainer: {
        marginBottom: 24,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    ratingContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    starButton: {
        padding: 2,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#f9fafb',
        fontSize: 14,
        minHeight: 100,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: 'white',
    },
    cancelButtonText: {
        color: '#4b5563',
        fontWeight: '600',
    },
    submitButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#93c5fd',
    },
    successContent: {
        padding: 40,
        alignItems: 'center',
    },
    successIconContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#ecfdf5',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    successMessage: {
        color: '#6b7280',
        marginBottom: 32,
        textAlign: 'center',
    },
    closeButton: {
        backgroundColor: '#10b981',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 10,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default FeedbackModal;
