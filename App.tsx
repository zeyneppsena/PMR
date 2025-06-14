import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    Text,
    ScrollView,
    Pressable,
    Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';

import { UserProvider, useUser } from './src/UserContext';
import Login from './src/Login';
import Home from './src/Home';
import AddShip from './src/tabs/AddShip';
import NotificationService from './NotificationService';

// Kendi dark tema ayarımız (DefaultTheme üzerinde bazı renkleri değiştiriyoruz)
const MyDarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: '#1c1c1e',  // ana arkaplan
        card: '#2c2c2e',        // header veya kartların arkaplan rengi
        text: '#ffffff',
        border: '#3a3a3c',
        primary: '#4ECDC4'      // vurgulamak istediğimiz renk
    },
};

const Stack = createNativeStackNavigator();

const RootApp = () => {
    return (
        <UserProvider>
            {/* NavigationContainer'a dark temamızı veriyoruz */}
            <NavigationContainer theme={MyDarkTheme}>
                <AppNavigator />
            </NavigationContainer>
        </UserProvider>
    );
};

export default RootApp;

const AppNavigator = () => {
    const { user, setUser } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [aboutModalVisible, setAboutModalVisible] = useState(false);
    const [profileModalVisible, setProfileModalVisible] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        const firestore = getFirestore();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userRef = doc(firestore, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(userRef);

                    if (!docSnap.exists()) {
                        // Yeni kaydolduysa varsayılan rol "gemi-personeli"
                        const defaultName = firebaseUser.email.split('@')[0];
                        await setDoc(userRef, {
                            name: defaultName,
                            email: firebaseUser.email,
                            role: 'gemi-personeli',
                            createdAt: new Date()
                        });

                        setUser({
                            isUserLoggedIn: true,
                            uid: firebaseUser.uid,
                            userName: defaultName,
                            email: firebaseUser.email,
                            role: 'gemi-personeli'
                        });
                    } else {
                        // Mevcut kullanıcı
                        const data = docSnap.data();
                        setUser({
                            isUserLoggedIn: true,
                            uid: firebaseUser.uid,
                            userName: data.name,
                            email: data.email,
                            role: data.role || 'gemi-personeli'
                        });
                    }
                } catch (error) {
                    console.error('Firestore user fetch error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Çıkış yapıldıysa veya hiç oturum yoksa
                setUser({
                    isUserLoggedIn: false,
                    uid: '',
                    userName: '',
                    email: '',
                    role: ''
                });
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Bildirim sistemi başlatma
    useEffect(() => {
        if (user?.isUserLoggedIn && user?.uid) {
            // Push token al ve kaydet
            NotificationService.registerForPushNotifications(user.uid)
                .then(token => {
                    if (token) {
                        console.log('Push token alındı:', token);
                    }
                })
                .catch(error => {
                    console.error('Push token alınamadı:', error);
                });

            // Bildirim dinleyicilerini başlat
            NotificationService.initializeListeners();

            // Bakım hatırlatmalarını kontrol et
            NotificationService.checkAndScheduleMaintenances();

            // Her 24 saatte bir bakım kontrolü yap
            const interval = setInterval(() => {
                NotificationService.checkAndScheduleMaintenances();
            }, 24 * 60 * 60 * 1000);

            return () => {
                clearInterval(interval);
                NotificationService.removeListeners();
            };
        }
    }, [user?.isUserLoggedIn, user?.uid]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
            </View>
        );
    }

    // Test bildirimi gönder (admin için)
    const sendTestNotification = async () => {
        try {
            await NotificationService.sendTestNotification();
            Alert.alert('Başarılı', 'Test bildirimi gönderildi! 3 saniye içinde görünecek.');
        } catch (error) {
            Alert.alert('Hata', 'Bildirim gönderilemedi');
        }
    };

    // Profil Modal
    const renderProfileModal = () => (
        <Modal
            animationType="fade"
            transparent
            visible={profileModalVisible}
            onRequestClose={() => setProfileModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <Pressable
                    style={styles.modalBackground}
                    onPress={() => setProfileModalVisible(false)}
                />
                <View style={styles.darkModalContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setProfileModalVisible(false)}
                    >
                        <Ionicons name="close-circle" size={26} color="#888" />
                    </TouchableOpacity>
                    <Text style={styles.modalHeader}>Profil</Text>
                    <Text style={styles.modalText}>Kullanıcı: {user?.userName}</Text>
                    <Text style={styles.modalText}>E-mail: {user?.email}</Text>
                    <Text style={styles.modalText}>Yetki: {user?.role}</Text>

                    {/* Admin için test bildirimi butonu */}
                    {user?.role === 'main-admin' && (
                        <TouchableOpacity
                            style={styles.testNotificationButton}
                            onPress={sendTestNotification}
                        >
                            <Ionicons name="notifications-outline" size={20} color="#fff" />
                            <Text style={styles.testNotificationText}>Test Bildirimi Gönder</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );

    // Hakkında Modal
    const renderAboutModal = () => (
        <Modal
            animationType="fade"
            transparent
            visible={aboutModalVisible}
            onRequestClose={() => setAboutModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <Pressable
                    style={styles.modalBackground}
                    onPress={() => setAboutModalVisible(false)}
                />
                <View style={styles.darkModalContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setAboutModalVisible(false)}
                    >
                        <Ionicons name="close-circle" size={26} color="#888" />
                    </TouchableOpacity>
                    <Text style={styles.modalHeader}>Hakkında</Text>
                    <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
                        <Text style={styles.modalText}>
                            PMR - Planned Maintenance and Repair Uygulaması{'\n'}
                            Sürüm: 1.0.0{'\n'}
                            Gemi bakım ve arıza takibi için geliştirildi.{'\n\n'}
                            📱 Özellikler:{'\n'}
                            • Planlı bakım takibi{'\n'}
                            • Arıza yönetimi{'\n'}
                            • Ekipman yönetimi{'\n'}
                            • Bildirim sistemi{'\n'}
                            • Fotoğraflı arıza kaydı
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <>
            {renderProfileModal()}
            {renderAboutModal()}

            <Stack.Navigator
                screenOptions={{
                    headerTitleAlign: 'center',
                    // Karanlık başlık
                    headerStyle: { backgroundColor: '#2c2c2e' },
                    headerTitleStyle: { color: '#fff' },
                    headerTintColor: '#fff', // Geri butonu vs. ikon rengi
                }}
            >
                {/* Eğer kullanıcı giriş yapmamışsa Login ekranı */}
                {!user?.isUserLoggedIn ? (
                    <Stack.Screen
                        name="Login"
                        component={Login}
                        options={{ headerShown: false }}
                    />
                ) : (
                    /* Kullanıcı giriş yaptıysa Home ve diğer ekranlar */
                    <>
                        <Stack.Screen
                            name="Home"
                            options={{
                                title: 'PMR System',
                                headerLeft: () => (
                                    <TouchableOpacity
                                        style={styles.profileButton}
                                        onPress={() => setProfileModalVisible(true)}
                                    >
                                        <Ionicons
                                            name="person-circle-outline"
                                            size={25}
                                            style={styles.icon}
                                        />
                                        <Text style={styles.userName}>{user?.userName}</Text>
                                    </TouchableOpacity>
                                ),
                                headerRight: () => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity
                                            onPress={() => setAboutModalVisible(true)}
                                            style={{ marginRight: 12 }}
                                        >
                                            <Ionicons
                                                name="information-circle-outline"
                                                size={25}
                                                color="#aaa"
                                            />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Çıkış Yap',
                                                    'Çıkış yapmak istediğinize emin misiniz?',
                                                    [
                                                        {
                                                            text: 'İptal',
                                                            style: 'cancel'
                                                        },
                                                        {
                                                            text: 'Çıkış Yap',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                const auth = getAuth();
                                                                signOut(auth)
                                                                    .then(() => console.log('Çıkış yapıldı'))
                                                                    .catch((error) =>
                                                                        console.error('Çıkış hatası:', error)
                                                                    );
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Ionicons
                                                name="log-out-outline"
                                                size={25}
                                                color="#cc4444"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                )
                            }}
                        >
                            {/*
                              Home ekranına userRole'u böyle prop olarak geçiyoruz
                            */}
                            {(props) => <Home {...props} userRole={user?.role} />}
                        </Stack.Screen>

                        <Stack.Screen
                            name="AddShip"
                            options={{ title: 'Gemi İşlemleri' }}
                        >
                            {(props) => <AddShip {...props} userRole={user?.role} />}
                        </Stack.Screen>
                    </>
                )}
            </Stack.Navigator>
        </>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1c1c1e'
    },
    profileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 6,
        backgroundColor: '#2c2c2e',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#3a3a3c',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3
    },
    userName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 11,
        marginHorizontal: 4
    },
    icon: {
        color: '#bbb'
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    darkModalContainer: {
        width: '75%',
        backgroundColor: '#2c2c2e',
        borderRadius: 8,
        padding: 16,
        alignItems: 'flex-start'
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10
    },
    modalHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        alignSelf: 'center',
        marginTop: 5,
        color: '#fff'
    },
    modalText: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 5
    },
    testNotificationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4ECDC4',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginTop: 12,
        alignSelf: 'center'
    },
    testNotificationText: {
        color: '#fff',
        marginLeft: 6,
        fontWeight: '600',
        fontSize: 13
    }
});
