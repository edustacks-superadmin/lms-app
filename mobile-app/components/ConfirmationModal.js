import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ConfirmationModal = ({ visible, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "warning" }) => {

    const getIcon = () => {
        switch (type) {
            case 'danger': return { name: 'alert-circle', color: '#EF4444', bg: 'bg-red-100' };
            case 'success': return { name: 'checkmark-circle', color: '#10B981', bg: 'bg-green-100' };
            default: return { name: 'help-circle', color: '#3B82F6', bg: 'bg-blue-100' };
        }
    };

    const iconData = getIcon();

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <View className="bg-white rounded-3xl w-full max-w-sm p-6 items-center shadow-2xl">
                    {/* Icon */}
                    <View className={`w-16 h-16 rounded-full ${iconData.bg} items-center justify-center mb-4`}>
                        <Ionicons name={iconData.name} size={32} color={iconData.color} />
                    </View>

                    {/* Content */}
                    <Text className="text-xl font-bold text-slate-800 text-center mb-2">{title}</Text>
                    <Text className="text-slate-500 text-center mb-8 px-2 leading-5">{message}</Text>

                    {/* Buttons */}
                    <View className="flex-row w-full gap-3">
                        <TouchableOpacity
                            onPress={onCancel}
                            activeOpacity={0.8}
                            className="flex-1 bg-slate-100 py-3.5 rounded-xl border border-slate-200 items-center justify-center"
                        >
                            <Text className="text-slate-600 font-bold text-base">{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            activeOpacity={0.8}
                            className={`flex-1 py-3.5 rounded-xl items-center justify-center shadow-md ${type === 'danger' ? 'bg-red-500 shadow-red-200' : 'bg-blue-600 shadow-blue-200'}`}
                        >
                            <Text className="text-white font-bold text-base">{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal >
    );
};

export default ConfirmationModal;
