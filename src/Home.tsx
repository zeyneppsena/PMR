import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Sayfa bileşenlerini içe aktar
import MaintenanceEntry from './tabs/MaintenanceEntry';
import RepairEntry from './tabs/RepairEntry';
import MaintenanceList from './tabs/MaintenanceList';
import ShipList from './tabs/ShipList';
import EquipmentList from './tabs/EquipmentList';
import AdminPanel from './tabs/AdminPanel';

const Tab = createBottomTabNavigator();

const Home = ({ userRole }) => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                // ---- ICON AYARLARI ----
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    switch (route.name) {
                        case 'Maintenance':
                            iconName = 'construct-outline';
                            break;
                        case 'Repair':
                            iconName = 'warning-outline';
                            break;
                        case 'MaintenanceList':
                            iconName = 'list-outline';
                            break;
                        case 'Ships':
                            iconName = 'boat-outline';
                            break;
                        case 'Equipments':
                            iconName = 'hardware-chip-outline';
                            break;
                        case 'Admin':
                            iconName = 'shield-checkmark-outline';
                            break;
                        default:
                            iconName = 'ellipse-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },

                // ---- DARK THEME AYARLARI ----
                tabBarStyle: { backgroundColor: '#1c1c1e' },      // Alt sekme bar'ının arkaplanı
                tabBarActiveTintColor: '#4ECDC4',                // Seçili sekme rengi
                tabBarInactiveTintColor: '#999',                 // Seçili olmayan sekme rengi

                headerStyle: { backgroundColor: '#1c1c1e' },     // Üst header'ın arkaplan rengi
                headerTitleStyle: { color: '#fff' },             // Header başlığının rengi
                headerTitleAlign: 'center',
                headerShown: true,
            })}
        >
            <Tab.Screen
                name="Maintenance"
                component={MaintenanceEntry}
                options={{ title: 'Bakım Girişi' }}
            />
            <Tab.Screen
                name="Repair"
                component={RepairEntry}
                options={{ title: 'Arıza Girişi' }}
            />
            <Tab.Screen
                name="MaintenanceList"
                component={MaintenanceList}
                options={{ title: 'Bakım Listesi' }}
            />

            {/* Ships sekmesine userRole gönderiyoruz */}
            <Tab.Screen
                name="Ships"
                options={{ title: 'Gemi Listesi' }}
            >
                {props => <ShipList {...props} userRole={userRole} />}
            </Tab.Screen>

            <Tab.Screen
                name="Equipments"
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
