import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Bildirim ayarları
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class NotificationService {
    private notificationListener: any;
    private responseListener: any;

    // Push token alma
    async registerForPushNotifications(userId: string) {
        if (!Device.isDevice) {
            console.log('Bildirimler sadece fiziksel cihazlarda çalışır');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Bildirim izni verilmedi');
            return null;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;

        // Token'ı Firebase'e kaydet
        if (token && userId) {
            await setDoc(doc(db, 'users', userId), {
                pushToken: token,
                tokenUpdatedAt: new Date()
            }, { merge: true });
        }

        // Android için kanal oluştur
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('maintenance', {
                name: 'Bakım Hatırlatmaları',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4ECDC4',
            });
        }

        return token;
    }

    // Bildirim dinleyicilerini başlat
    initializeListeners() {
        // Bildirim geldiğinde
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('Bildirim alındı:', notification);
        });

        // Bildirime tıklandığında
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Bildirime tıklandı:', response);
            // Navigation işlemleri burada yapılabilir
        });
    }

    // Dinleyicileri temizle
    removeListeners() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }

    // Lokal bildirim gönder
    async scheduleLocalNotification(title: string, body: string, data?: any, seconds: number = 1) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                seconds,
                channelId: Platform.OS === 'android' ? 'maintenance' : undefined,
            },
        });
    }

    // Bakım hatırlatması planla
    async scheduleMaintenance(equipment: any, maintenanceDate: Date) {
        const now = new Date();
        const timeDiff = maintenanceDate.getTime() - now.getTime();

        // 1 gün önceden hatırlat
        const oneDayBefore = timeDiff - (24 * 60 * 60 * 1000);

        if (oneDayBefore > 0) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⚠️ Bakım Hatırlatması',
                    body: `${equipment.ship} - ${equipment.type} için yarın bakım zamanı!`,
                    data: { equipmentId: equipment.id, type: 'maintenance' },
                    sound: true,
                },
                trigger: {
                    seconds: Math.floor(oneDayBefore / 1000),
                    channelId: Platform.OS === 'android' ? 'maintenance' : undefined,
                },
            });
        }

        // Bakım günü hatırlat
        if (timeDiff > 0) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🔧 Bakım Zamanı!',
                    body: `${equipment.ship} - ${equipment.type} için bakım zamanı geldi.`,
                    data: { equipmentId: equipment.id, type: 'maintenance' },
                    sound: true,
                },
                trigger: {
                    seconds: Math.floor(timeDiff / 1000),
                    channelId: Platform.OS === 'android' ? 'maintenance' : undefined,
                },
            });
        }
    }

    // Tüm bakımları kontrol et ve hatırlatmaları planla
    async checkAndScheduleMaintenances() {
        try {
            // Tüm zamanlanmış bildirimleri iptal et
            await Notifications.cancelAllScheduledNotificationsAsync();

            // Ekipmanları al
            const equipmentSnapshot = await getDocs(collection(db, 'equipments'));
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setMonth(today.getMonth() + 1);

            equipmentSnapshot.forEach(async (doc) => {
                const equipment = { id: doc.id, ...doc.data() };
                const startDate = equipment.startDate ? new Date(equipment.startDate) : null;

                if (!startDate) return;

                const periodicDays = parseInt(equipment.periodicDays) || 0;
                const maintenanceHour = parseInt(equipment.maintenanceHour) || 0;
                const isPeriyodik = ['Periyodik', 'Her İkisi'].includes(equipment.maintenanceType);
                const isSaatlik = ['Saatlik', 'Her İkisi'].includes(equipment.maintenanceType);

                // Periyodik bakımlar
                if (isPeriyodik && periodicDays > 0) {
                    let nextMaintenance = new Date(startDate);

                    while (nextMaintenance <= today) {
                        nextMaintenance.setDate(nextMaintenance.getDate() + periodicDays);
                    }

                    if (nextMaintenance <= nextMonth) {
                        await this.scheduleMaintenance(equipment, nextMaintenance);
                    }
                }

                // Saatlik bakımlar
                if (isSaatlik && maintenanceHour > 0 && equipment.workingHours >= maintenanceHour) {
                    await this.scheduleLocalNotification(
                        '⏰ Saatlik Bakım Gerekli',
                        `${equipment.ship} - ${equipment.type} için saatlik bakım zamanı geldi!`,
                        { equipmentId: equipment.id, type: 'hourly-maintenance' },
                        5 // 5 saniye sonra bildirim
                    );
                }
            });

            console.log('Bakım hatırlatmaları planlandı');
        } catch (error) {
            console.error('Hatırlatmaları planlarken hata:', error);
        }
    }

    // Arıza bildirimi gönder
    async sendRepairNotification(repair: any, status: string) {
        let title = '';
        let body = '';
        let icon = '';

        switch (status) {
            case 'reported':
                title = '🚨 Yeni Arıza Bildirimi';
                body = `${repair.equipmentName} için yeni arıza kaydı oluşturuldu`;
                icon = 'alert-circle';
                break;
            case 'inprogress':
                title = '🔧 Arıza İşleme Alındı';
                body = `${repair.equipmentName} arızası işleme alındı`;
                icon = 'construct';
                break;
            case 'resolved':
                title = '✅ Arıza Giderildi';
                body = `${repair.equipmentName} arızası başarıyla giderildi`;
                icon = 'checkmark-circle';
                break;
        }

        // Admin kullanıcılara bildirim gönder ve kaydet
        const adminQuery = query(collection(db, 'users'), where('role', 'in', ['main-admin', 'ship-admin']));
        const adminSnapshot = await getDocs(adminQuery);

        const notificationData = {
            title,
            body,
            icon,
            type: 'repair',
            status,
            repairId: repair.id,
            equipmentName: repair.equipmentName,
            createdAt: new Date(),
            read: false,
        };

        // Her admin için bildirim kaydet
        adminSnapshot.forEach(async (userDoc) => {
            const adminData = userDoc.data();

            // Firebase'e bildirim kaydet
            await this.saveNotificationToFirebase(userDoc.id, notificationData);

            // Push bildirim gönder
            if (adminData.pushToken) {
                await this.scheduleLocalNotification(title, body, { repairId: repair.id }, 1);
            }
        });
    }

    // Bildirimi Firebase'e kaydet
    async saveNotificationToFirebase(userId: string, notificationData: any) {
        try {
            const userNotificationsRef = collection(db, 'users', userId, 'notifications');
            await setDoc(doc(userNotificationsRef), {
                ...notificationData,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Bildirim kaydedilemedi:', error);
        }
    }

    // Kullanıcının bildirimlerini getir
    async getUserNotifications(userId: string) {
        try {
            const notificationsRef = collection(db, 'users', userId, 'notifications');
            const q = query(notificationsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Bildirimler alınamadı:', error);
            return [];
        }
    }

    // Bildirimi okundu olarak işaretle
    async markAsRead(userId: string, notificationId: string) {
        try {
            const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
            await setDoc(notificationRef, { read: true }, { merge: true });
        } catch (error) {
            console.error('Bildirim güncellenemedi:', error);
        }
    }

    // Tüm bildirimleri okundu yap
    async markAllAsRead(userId: string) {
        try {
            const notificationsRef = collection(db, 'users', userId, 'notifications');
            const unreadQuery = query(notificationsRef, where('read', '==', false));
            const snapshot = await getDocs(unreadQuery);

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });

            await batch.commit();
        } catch (error) {
            console.error('Bildirimler güncellenemedi:', error);
        }
    }

    // Test bildirimi
    async sendTestNotification() {
        await this.scheduleLocalNotification(
            '🔔 Test Bildirimi',
            'Bildirimler başarıyla çalışıyor!',
            { test: true },
            3
        );
    }
}

export default new NotificationService();
