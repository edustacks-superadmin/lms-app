
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SubmissionModal = ({ visible, score, totalMarks, onReview, onGoBack }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onGoBack}
        >
            <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                    {/* Header Gradient / Color */}
                    <View className="bg-green-500 h-32 justify-center items-center relative">
                        {/* Decorative Circles */}
                        <View className="absolute top-[-20] left-[-20] w-24 h-24 bg-white/20 rounded-full" />
                        <View className="absolute bottom-[-10] right-[-10] w-16 h-16 bg-white/20 rounded-full" />

                        <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-lg mb-[-40]">
                            <Ionicons name="checkmark" size={40} color="#22c55e" />
                        </View>
                    </View>

                    {/* Content */}
                    <View className="pt-14 pb-8 px-6 items-center">
                        <Text className="text-2xl font-bold text-slate-800 mb-2">Success!</Text>
                        <Text className="text-slate-500 text-center mb-6 text-base">
                            You have successfully completed the exam.
                        </Text>

                        {/* Score Card */}
                        <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full items-center mb-6">
                            <Text className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Your Score</Text>
                            <Text className="text-4xl font-extrabold text-slate-800">
                                {score} <Text className="text-xl text-slate-400 font-medium">/ {totalMarks || 10}</Text>
                                {/* Note: totalMarks isn't always 10, should be prop if needed, using 10 from user screenshot context or pass it */}
                            </Text>
                        </View>

                        {/* Buttons */}
                        <View className="w-full gap-3">
                            <TouchableOpacity
                                onPress={onReview}
                                activeOpacity={0.8}
                                className="bg-blue-600 py-3.5 rounded-xl flex-row justify-center items-center shadow-blue-200 shadow-lg"
                            >
                                <Ionicons name="eye-outline" size={20} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-base">Review Answers</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onGoBack}
                                activeOpacity={0.8}
                                className="bg-white py-3.5 rounded-xl border border-slate-200 flex-row justify-center items-center"
                            >
                                <Text className="text-slate-600 font-bold text-base">Back to Home</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal >
    );
};

export default SubmissionModal;
