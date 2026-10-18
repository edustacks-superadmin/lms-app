import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';

import CustomDrawerContent from '../../components/CustomDrawerContent';

export default function DrawerLayout() {
    console.log('[DrawerLayout] Rendering...');
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                    headerShown: false,
                    drawerStyle: {
                        backgroundColor: '#fff',
                        width: 280,
                    },
                    drawerType: 'front'
                }}
            >
                <Drawer.Screen
                    name="home" // Matches app/(drawer)/home path
                    options={{
                        drawerLabel: 'Home',
                        title: 'LMS Student',
                    }}
                />
                <Drawer.Screen
                    name="profile" // We will create this
                    options={{
                        drawerLabel: 'Profile',
                        title: 'My Profile',
                    }}
                />
                <Drawer.Screen
                    name="bookmarks"
                    options={{
                        drawerLabel: 'Bookmarks',
                        title: 'Bookmarks',
                    }}
                />
            </Drawer>
        </GestureHandlerRootView>
    );
}
