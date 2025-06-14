import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from './UserContext';
import NotificationService from '../NotificationService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/*──────────────── Palette ────────────────*/
const COLORS = {
    bg: '#121212',
    surface: '#1E1E1E',
    accent: '#4ECDC4',
    success: '#66BB6A',
    warn: '#e57373',
    text: '#FFFFFF',
    secondary: '#B0B0B0',
    unread: '#2A2A2A',
    badge: '#FF4444',
};

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    icon: string;
    type: string;
    status?: string;
    createdAt: any;
    read: boolean;
    equipmentName?: string;
    repairId?: string;
};

const NotificationsScreen = ({ navigation }) => {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Firestore'dan bildirimleri dinle
    useEffect(() => {
        if (!user?.uid) return;

        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notificationList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as NotificationItem[];

            setNotifications(notificationList);
            setUnreadCount(notificationList.filter(n => !n.read).length);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Sayfayı yenile
    const onRefresh = async () => {
        setRefreshing(true);
        // Firestore listener otomatik güncelleme yapacak
        setTimeout(() => setRefreshing(false), 1000);
    };

    // Bildirime tıklandığında
    const handleNotificationPress = async (notification: NotificationItem) => {
        // Okundu olarak işaretle
        if (!notification.read && user?.uid) {
            await NotificationService.markAsRead(user.uid, notification.id);
        }

        // İlgili sayfaya yönlendir
        if (notification.type === 'repair' && notification.repairId) {
            // Arıza detay sayfasına git (eğer varsa)
            navigation.navigate('RepairEntry');
        } else if (notification.type === 'maintenance') {
            navigation.navigate('MaintenanceList');
        }
    };

    // Tümünü okundu yap
    const markAllAsRead = async () => {
        if (!user?.uid || unreadCount === 0) return;

        Alert.alert(
            'Tümünü Okundu Yap',
            'Tüm bildirimleri okundu olarak işaretlemek istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Evet',
                    onPress: async () => {
                        await NotificationService.markAllAsRead(user.uid);
                    }
                }
            ]
        );
    };

    // Tarih formatla
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} dakika önce`;
        } else if (hours < 24) {
            return `${hours} saat önce`;
        } else if (days < 7) {
            return `${days} gün önce`;
        } else {
            return date.toLocaleDateString('tr-TR');
        }
    };

    // İkon rengini belirle
    const getIconColor = (status?: string) => {
        switch (status) {
            case 'reported': return COLORS.warn;
            case 'inprogress': return COLORS.accent;
            case 'resolved': return COLORS.success;
            default: return COLORS.accent;
        }
    };

    // Bildirim kartı
    const renderNotification = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            style={[
                styles.notificationCard,
                !item.read && styles.unreadCard
            ]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.status) + '20' }]}>
                <Ionicons
                    name={item.icon as any || 'notifications'}
                    size={24}
                    color={getIconColor(item.status)}
                />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, !item.read && styles.unreadText]}>
                        {item.title}
                    </Text>
                    {!item.read && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                </Text>

                <Text style={styles.time}>
                    {formatDate(item.createdAt)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Loading durumu
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    // Boş durum
    const EmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={64} color={COLORS.secondary} />
            <Text style={styles.emptyText}>Henüz bildirim yok</Text>
            <Text style={styles.emptySubtext}>
                Yeni arıza ve bakım bildirimleri burada görünecek
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bildirimler</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        style={styles.markAllButton}
                        onPress={markAllAsRead}
                    >
                        <Ionicons name="checkmark-done" size={20} color={COLORS.accent} />
                        <Text style={styles.markAllText}>Tümünü Okundu Yap</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Okunmamış sayısı */}
            {unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Text style={styles.unreadBannerText}>
                        {unreadCount} okunmamış bildirim
                    </Text>
                </View>
            )}

            {/* Bildirim listesi */}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderNotification}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.accent}
                    />
                }
                ListEmptyComponent={EmptyComponent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.bg,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: COLORS.bg,
        borderRadius: 20,
    },
    markAllText: {
        color: COLORS.accent,
        fontSize: 13,
        fontWeight: '600',
    },
    unreadBanner: {
        backgroundColor: COLORS.accent,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    unreadBannerText: {
        color: COLORS.bg,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    listContent: {
        flexGrow: 1,
        paddingVertical: 8,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: COLORS.surface,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: COLORS.unread,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    unreadText: {
        fontWeight: '700',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.badge,
        marginLeft: 8,
    },
    body: {
        fontSize: 14,
        color: COLORS.secondary,
        marginBottom: 6,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        color: COLORS.secondary,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.bg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.secondary,
        textAlign: 'center',
    },
});
