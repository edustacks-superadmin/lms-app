import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function ExamViewer({ url }) {
    if (!url) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>No Exam URL provided</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
            <iframe
                src={url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Exam Viewer"
            />
        </View>
    );
}
