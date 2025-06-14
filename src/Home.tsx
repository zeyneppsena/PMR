import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, Text } from 'react-native';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from './UserContext';

import Dashboard from './tabs/Dashboard';       // ← YENİ
import RepairEntry from './tabs/RepairEntry';
import MaintenanceList from './tabs/MaintenanceList';
import ShipList from './tabs/ShipList';
import EquipmentList from './tabs/EquipmentList';
import AdminPanel from './tabs/AdminPanel';
import NotificationsScreen from './NotificationsScreen';

const Tab = createBottomTabNavigator();

const Home = ({ userRole }) => {
    const { user } = useUser();
    const [unreadCount, setUnreadCount] = useState(0);

    /* ---- Okunmamış bildirim sayısı ---- */
    useEffect(() => {
        if (!user?.uid) return;
        const ref = collection(db, 'users', user.uid, 'notifications');
        const q = query(ref, where('read', '==', false));
        const unsubscribe = onSnapshot(q, snap => setUnreadCount(snap.size));
        return unsubscribe;
    }, [user?.uid]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                /* ---- İKONLAR ---- */
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    switch (route.name) {
                        case 'Bildirimler':
                            iconName = focused ? 'notifications' : 'notifications-outline';
                            break;
                        case 'Gösterge':
                            iconName = 'speedometer-outline';
                            break;
                        case 'Arıza':
                            iconName = 'warning-outline';
                            break;
                        case 'Bakım Listesi':
                            iconName = 'list-outline';
                            break;
                        case 'Gemiler':
                            iconName = 'boat-outline';
                            break;
                        case 'Ekipmanlar':
                            iconName = 'hardware-chip-outline';
                            break;
                        case 'Admin':
                            iconName = 'shield-checkmark-outline';
                            break;
                        default:
                            iconName = 'ellipse-outline';
                    }

                    /* Bildirim sayacı */
                    if (route.name === 'Bildirimler' && unreadCount > 0) {
                        return (
                            <View>
                                <Ionicons name={iconName} size={size} color={color} />
                                <View
                                    style={{
                                        position: 'absolute',
                                        right: -6,
                                        top: -3,
                                        backgroundColor: '#FF4444',
                                        borderRadius: 8,
                                        width: 16,
                                        height: 16,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            </View>
                        );
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },

                /* ---- KOYU TEMA ---- */
                tabBarStyle: { backgroundColor: '#1c1c1e' },
                tabBarActiveTintColor: '#4ECDC4',
                tabBarInactiveTintColor: '#999',
                headerStyle: { backgroundColor: '#1c1c1e' },
                headerTitleStyle: { color: '#fff' },
                headerTitleAlign: 'center',
                headerShown: true,
            })}
        >
            <Tab.Screen
                name="Bildirimler"
                component={NotificationsScreen}
                options={{
                    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#FF4444', fontSize: 10 },
                }}
            />

            <Tab.Screen
                name="Gösterge"
                component={Dashboard}
                options={{ title: 'Gösterge' }}
            />

            <Tab.Screen
                name="Arıza"
                component={RepairEntry}
                options={{ title: 'Arıza Girişi' }}
            />

            <Tab.Screen
                name="Bakım Listesi"
                component={MaintenanceList}
                options={{ title: 'Bakım Listesi' }}
            />

            {userRole === 'main-admin' && (
                <Tab.Screen name="Gemiler" options={{ title: 'Gemi Listesi' }}>
                    {props => <ShipList {...props} userRole={userRole} />}
                </Tab.Screen>
            )}

            <Tab.Screen
                name="Ekipmanlar"
                component={EquipmentList}
                options={{ title: 'Ekipmanlar' }}
            />

            {userRole === 'main-admin' && (
                <Tab.Screen
                    name="Admin"
                    component={AdminPanel}
                    options={{ title: 'Admin Paneli' }}
                />
            )}
        </Tab.Navigator>
    );
};

export default Home;
