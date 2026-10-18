import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Platform, View, Text } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

// Import screens
import Dashboard from './index';
import MyLearning from './mylearning';
import Explore from './explore';
import Ranking from './ranking';
import Profile from './profile';

const Tab = createMaterialTopTabNavigator();

export default function TabsLayout() {
    const navigation = useNavigation();

    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            swipeEnabled={true}
            screenOptions={{
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#64748b',
                tabBarStyle: {
                    height: Platform.select({ ios: 90, default: 70 }),
                    paddingBottom: Platform.select({ ios: 30, default: 12 }),
                    paddingTop: 3,
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'none',
                    marginTop: 2,
                    marginBottom: 0,
                },
                tabBarItemStyle: {
                    flex: 1, // Distribute evenly
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                tabBarIndicatorStyle: {
                    display: 'none',
                },
                tabBarPressColor: 'transparent',
                tabBarShowIcon: true,
                tabBarShowLabel: true,
                tabBarScrollEnabled: false, // Prevent scrolling, keep all tabs visible
                // Smooth spring animation with directional slide
                transitionSpec: {
                    open: {
                        animation: 'spring',
                        config: {
                            stiffness: 300,
                            damping: 30,
                            mass: 0.8,
                        },
                    },
                    close: {
                        animation: 'spring',
                        config: {
                            stiffness: 300,
                            damping: 30,
                            mass: 0.8,
                        },
                    },
                },
                // Directional slide animation
                cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                        cardStyle: {
                            transform: [
                                {
                                    translateX: current.progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [layouts.screen.width, 0],
                                    }),
                                },
                            ],
                        },
                    };
                },
                swipeDirection: 'horizontal',
                gestureEnabled: true,
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={Dashboard}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "grid" : "grid-outline"} size={20} color={color} />
                    ),
                    tabBarLabel: 'Home',
                }}
            />
            <Tab.Screen
                name="My Courses"
                component={MyLearning}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "book" : "book-outline"} size={20} color={color} />
                    ),
                    tabBarLabel: 'Learn',
                }}
            />
            <Tab.Screen
                name="Store"
                component={Explore}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "cart" : "cart-outline"} size={20} color={color} />
                    ),
                    tabBarLabel: 'Store',
                }}
            />
            <Tab.Screen
                name="Ranking"
                component={Ranking}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "trophy" : "trophy-outline"} size={20} color={color} />
                    ),
                    tabBarLabel: 'Ranking',
                }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} size={20} color={color} />
                    ),
                    tabBarLabel: 'Profile',
                }}
            />
        </Tab.Navigator>
    );
}
