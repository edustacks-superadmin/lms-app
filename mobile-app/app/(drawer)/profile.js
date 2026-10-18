import { View, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function Profile() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    return (
        <View className="flex-1 items-center justify-center bg-white">
            <Text className="text-xl font-bold mb-4">My Profile</Text>
            <TouchableOpacity onPress={handleLogout} className="bg-red-500 px-6 py-2 rounded-full">
                <Text className="text-white font-bold">Logout</Text>
            </TouchableOpacity>
        </View>
    );
}
