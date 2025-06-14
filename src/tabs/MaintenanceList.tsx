import React, { useEffect, useState, useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SectionList,
    TouchableOpacity,
    Modal,
    Pressable,
    TextInput,
    Switch,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    onSnapshot,
    setDoc,
    doc,
    Timestamp,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useUser } from '../UserContext';

const COLORS = {
    bg: '#121212',
    surface: '#1E1E1E',
    accent: '#4ECDC4',
    warn: '#e57373',
    success: '#66BB6A',
    text: '#FFFFFF',
    secondary: '#9E9E9E',
    overlay: 'rgba(0,0,0,0.6)',
};

const makeKey = (item: any) => `${item.id}_${item.scheduledDate.toISOString().slice(0,10)}`;

const MaintenanceList = () => {
    const { user } = useUser();
    const [equipments, setEquipments] = useState<any[]>([]);
    const [records, setRecords] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [comment, setComment] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // Load equipments based on user role
    useEffect(() => {
        let unsub;
        const equipmentsColl = collection(db, 'equipments');

        if (user?.role === 'main-admin') {
            // Admin tüm ekipmanları görür
            unsub = onSnapshot(equipmentsColl, snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEquipments(data);
                setLoading(false);
            });
        } else if (user?.role === 'ship-admin' && user?.shipId) {
            // Ship admin kendi gemisindeki ekipmanları görür
            const q = query(equipmentsColl, where('shipId', '==', user.shipId));
            unsub = onSnapshot(q, snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEquipments(data);
                setLoading(false);
            });
        } else if (user?.role === 'gemi-personeli') {
            // Gemi personeli sorumlu olduğu ekipmanları görür
            const q = query(equipmentsColl, where('responsible', 'in', [user?.email, user?.userName, user?.name]));
            unsub = onSnapshot(q, snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEquipments(data);
                setLoading(false);
            });
        } else {
            setEquipments([]);
            setLoading(false);
        }

        return () => unsub?.();
    }, [user?.role, user?.shipId, user?.email, user?.userName]);

    // Subscribe maintenance records
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'maintenances'), snap => {
            const rec: Record<string, any> = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.equipmentId && data.scheduledDate) {
                    const key = `${data.equipmentId}_${data.scheduledDate}`;
                    rec[key] = data;
                }
            });
            setRecords(rec);
        });
        return () => unsub();
    }, []);

    // Generate schedule - DÜZELTME: Ekipmanlar yüklendiğinde otomatik çalışacak
    useEffect(() => {
        if (equipments.length > 0) {
            generateSchedule();
        }
    }, [equipments]); // equipments değiştiğinde otomatik olarak schedule oluştur

    // Generate schedule function
    const generateSchedule = () => {
        console.log('Generating schedule for', equipments.length, 'equipments');

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Günün başlangıcına ayarla

        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const list: any[] = [];

        equipments.forEach(eq => {
            // Başlangıç tarihini kontrol et
            const start = eq.startDate ? new Date(eq.startDate) : null;
            if (!start) {
                console.log(`Equipment ${eq.type} has no start date`);
                return;
            }

            const periodicDays = parseInt(eq.periodicDays) || 0;
            const maintenanceHour = parseInt(eq.maintenanceHour) || 0;
            const currentWorkingHours = parseInt(eq.workingHours) || 0;

            const isPeriyodik = ['Periyodik', 'Her İkisi'].includes(eq.maintenanceType);
            const isSaatlik = ['Saatlik', 'Her İkisi'].includes(eq.maintenanceType);

            console.log(`Equipment: ${eq.type}, Type: ${eq.maintenanceType}, Periodic: ${periodicDays}, Hour: ${maintenanceHour}`);

            // Periyodik bakımlar
            if (isPeriyodik && periodicDays > 0) {
                let nextMaintenanceDate = new Date(start);

                // İlk bakım tarihini bul (bugünden sonraki ilk bakım)
                while (nextMaintenanceDate < today) {
                    nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + periodicDays);
                }

                // Gelecek 1 yıl içindeki bakımları ekle
                while (nextMaintenanceDate <= nextYear) {
                    list.push({
                        ...eq,
                        scheduledDate: new Date(nextMaintenanceDate),
                        reason: `Periyodik Bakım (${periodicDays} gün)`,
                        maintenanceType: 'periodic'
                    });
                    nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + periodicDays);
                }
            }

            // Saatlik bakımlar
            if (isSaatlik && maintenanceHour > 0) {
                // Çalışma saati bakım saatini geçmişse
                if (currentWorkingHours >= maintenanceHour) {
                    // Son bakımdan bu yana kaç saat geçtiğini hesapla
                    const hoursSinceLastMaintenance = currentWorkingHours % maintenanceHour;
                    const maintenanceCount = Math.floor(currentWorkingHours / maintenanceHour);

                    list.push({
                        ...eq,
                        scheduledDate: new Date(today),
                        reason: `Saatlik Bakım (${maintenanceHour} saat - ${maintenanceCount + 1}. bakım)`,
                        maintenanceType: 'hourly',
                        currentHours: currentWorkingHours
                    });
                }

                // Gelecekteki saatlik bakımlar için tahmin
                const dailyWorkingHours = 8; // Günlük ortalama çalışma saati (ayarlanabilir)
                const hoursUntilNextMaintenance = maintenanceHour - (currentWorkingHours % maintenanceHour);
                const daysUntilNextMaintenance = Math.ceil(hoursUntilNextMaintenance / dailyWorkingHours);

                const nextHourlyMaintenance = new Date(today);
                nextHourlyMaintenance.setDate(today.getDate() + daysUntilNextMaintenance);

                if (nextHourlyMaintenance <= nextYear && currentWorkingHours < maintenanceHour) {
                    list.push({
                        ...eq,
                        scheduledDate: nextHourlyMaintenance,
                        reason: `Saatlik Bakım Tahmini (${maintenanceHour} saat)`,
                        maintenanceType: 'hourly',
                        estimatedHours: maintenanceHour
                    });
                }
            }
        });

        // Tarihe göre sırala
        const sortedList = list.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
        console.log('Generated', sortedList.length, 'maintenance tasks');

        setSchedule(sortedList);
        setRefreshing(false);
    };

    // Pull-to-refresh handler
    const onRefresh = () => {
        setRefreshing(true);
        generateSchedule();
    };

    // Filter and optionally hide completed
    const filteredSchedule = useMemo(() => {
        return schedule.filter(item => {
            const key = makeKey(item);
            const done = records[key]?.completed;
            return showCompleted ? true : !done;
        });
    }, [schedule, records, showCompleted]);

    // Group by month-year
    const sections = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredSchedule.forEach(item => {
            const title = new Intl.DateTimeFormat('tr-TR', { year: 'numeric', month: 'long' }).format(item.scheduledDate);
            if (!groups[title]) groups[title] = [];
            groups[title].push(item);
        });
        return Object.keys(groups).map(title => ({ title, data: groups[title] }));
    }, [filteredSchedule]);

    // Toggle completion
    const toggleDone = async (item: any, done: boolean) => {
        const dateStr = item.scheduledDate.toISOString().slice(0,10);
        const key = makeKey(item);
        const ref = doc(db, 'maintenances', key);

        await setDoc(ref, {
            equipmentId: item.id,
            equipmentName: `${item.ship} - ${item.type}`,
            scheduledDate: dateStr,
            completed: done,
            completedBy: done ? user?.userName || user?.email : '',
            completedAt: done ? Timestamp.now() : null,
            comment: records[key]?.comment || '',
            maintenanceType: item.maintenanceType,
            reason: item.reason
        }, { merge: true });
    };

    // Open comment modal
    const openComment = (item: any) => {
        const key = makeKey(item);
        setSelectedKey(key);
        setSelectedItem(item);
        setComment(records[key]?.comment || '');
        setModalVisible(true);
    };

    // Save comment
    const saveComment = async () => {
        if (!selectedKey || !selectedItem) return;

        const data = records[selectedKey] || {};
        const ref = doc(db, 'maintenances', selectedKey);

        await setDoc(ref, {
            ...data,
            comment,
            equipmentId: selectedItem.id,
            scheduledDate: selectedItem.scheduledDate.toISOString().slice(0,10),
            commentBy: user?.userName || user?.email,
            commentAt: Timestamp.now()
        }, { merge: true });

        setModalVisible(false);
        setComment('');
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Bakım planı yükleniyor...</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                    <Ionicons name="refresh" size={20} color={COLORS.bg} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bakım Planı</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Tamamlananlar</Text>
                    <Switch
                        value={showCompleted}
                        onValueChange={setShowCompleted}
                        trackColor={{ false: COLORS.secondary, true: COLORS.success }}
                        thumbColor={showCompleted ? COLORS.text : COLORS.secondary}
                    />
                </View>
            </View>

            {schedule.length === 0 && !loading ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color={COLORS.secondary} />
                    <Text style={styles.emptyTitle}>Planlı bakım bulunamadı</Text>
                    <Text style={styles.emptySubtext}>
                        Ekipmanlarınız için bakım planı oluşturmak için ekipman eklemeyi unutmayın.
                    </Text>
                    <TouchableOpacity style={styles.refreshBtnLarge} onPress={onRefresh}>
                        <Ionicons name="refresh" size={20} color={COLORS.bg} />
                        <Text style={styles.refreshBtnText}>Yenile</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => makeKey(item)}
                    renderSectionHeader={({ section: { title } }) => (
                        <Text style={styles.sectionHeader}>{title}</Text>
                    )}
                    renderItem={({ item }) => {
                        const key = makeKey(item);
                        const rec = records[key] || {};
                        const done = rec.completed;
                        const dateText = new Intl.DateTimeFormat('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        }).format(item.scheduledDate);

                        // Tarihe göre renk belirleme
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const itemDate = new Date(item.scheduledDate);
                        itemDate.setHours(0, 0, 0, 0);
                        const isOverdue = itemDate < today && !done;
                        const isToday = itemDate.getTime() === today.getTime();

                        return (
                            <View style={[
                                styles.card,
                                done && styles.doneBorder,
                                isOverdue && styles.overdueBorder,
                                isToday && styles.todayBorder
                            ]}>
                                <View style={styles.rowTop}>
                                    <View style={styles.titleContainer}>
                                        <Text style={styles.title}>{item.ship} - {item.type}</Text>
                                        {item.brand && (
                                            <Text style={styles.subtitle}>{item.brand} • {item.serialNo}</Text>
                                        )}
                                    </View>
                                    <Switch
                                        value={done}
                                        onValueChange={(val) => toggleDone(item, val)}
                                        trackColor={{ false: COLORS.secondary, true: COLORS.success }}
                                    />
                                </View>

                                <View style={styles.detailsContainer}>
                                    <Text style={styles.detail}>
                                        <Ionicons name="calendar" size={14} color={COLORS.secondary} /> {dateText}
                                    </Text>
                                    <Text style={styles.detail}>
                                        <Ionicons name="build" size={14} color={COLORS.secondary} /> {item.reason}
                                    </Text>
                                    {item.responsible && (
                                        <Text style={styles.detail}>
                                            <Ionicons name="person" size={14} color={COLORS.secondary} /> {item.responsible}
                                        </Text>
                                    )}
                                    {item.currentHours && (
                                        <Text style={styles.detail}>
                                            <Ionicons name="time" size={14} color={COLORS.secondary} /> Çalışma: {item.currentHours} saat
                                        </Text>
                                    )}
                                </View>

                                {rec.completedBy && (
                                    <View style={styles.completedInfo}>
                                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                        <Text style={styles.completedText}>
                                            {rec.completedBy} tarafından tamamlandı
                                        </Text>
                                    </View>
                                )}

                                {rec.comment && (
                                    <View style={styles.commentBox}>
                                        <Ionicons name="chatbox-ellipses" size={16} color={COLORS.accent} />
                                        <Text style={styles.commentText}>{rec.comment}</Text>
                                    </View>
                                )}

                                <TouchableOpacity style={styles.commentBtn} onPress={() => openComment(item)}>
                                    <Ionicons name="chatbox-outline" size={16} color={COLORS.bg} />
                                    <Text style={styles.commentBtnText}>
                                        {rec.comment ? 'Yorumu Düzenle' : 'Yorum Ekle'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>
                                {showCompleted ? 'Tamamlanmış bakım yok' : 'Bekleyen bakım yok'}
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* Yorum Modalı */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <Pressable style={styles.overlay} onPress={() => setModalVisible(false)} />
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Bakım Notu</Text>
                        <Pressable onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </Pressable>
                    </View>

                    {selectedItem && (
                        <View style={styles.modalInfo}>
                            <Text style={styles.modalInfoText}>
                                {selectedItem.ship} - {selectedItem.type}
                            </Text>
                            <Text style={styles.modalInfoDate}>
                                {new Intl.DateTimeFormat('tr-TR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                }).format(selectedItem.scheduledDate)}
                            </Text>
                        </View>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder='Bakım hakkında not ekleyin...'
                        placeholderTextColor={COLORS.secondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={4}
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={saveComment}>
                        <Text style={styles.saveText}>Kaydet</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default MaintenanceList;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
    },
    loadingText: {
        color: COLORS.text,
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.bg,
    },
    refreshBtn: {
        padding: 8,
        backgroundColor: COLORS.accent,
        borderRadius: 8
    },
    refreshBtnLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.accent,
        borderRadius: 8,
        marginTop: 20,
    },
    refreshBtnText: {
        color: COLORS.bg,
        marginLeft: 8,
        fontWeight: '600',
    },
    headerTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700'
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    switchLabel: {
        color: COLORS.text,
        marginRight: 8,
        fontSize: 14,
    },
    listContent: {
        padding: 16
    },
    sectionHeader: {
        color: COLORS.accent,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.surface,
    },
    doneBorder: {
        borderLeftColor: COLORS.success,
        opacity: 0.8,
    },
    overdueBorder: {
        borderLeftColor: COLORS.warn,
    },
    todayBorder: {
        borderLeftColor: COLORS.accent,
    },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    titleContainer: {
        flex: 1,
        marginRight: 10,
    },
    title: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    subtitle: {
        color: COLORS.secondary,
        fontSize: 13,
    },
    detailsContainer: {
        marginBottom: 8,
    },
    detail: {
        color: COLORS.secondary,
        fontSize: 14,
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    completedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.bg,
    },
    completedText: {
        color: COLORS.success,
        fontSize: 13,
        marginLeft: 6,
    },
    commentBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 8,
        backgroundColor: COLORS.bg,
        padding: 10,
        borderRadius: 8,
    },
    commentText: {
        color: COLORS.text,
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    commentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: COLORS.accent,
        borderRadius: 8
    },
    commentBtnText: {
        color: COLORS.bg,
        fontWeight: '600',
        marginLeft: 6
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50
    },
    emptyText: {
        color: COLORS.secondary,
        fontSize: 16
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        color: COLORS.secondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay
    },
    modal: {
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
        width: '100%',
        backgroundColor: COLORS.surface,
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700'
    },
    modalInfo: {
        backgroundColor: COLORS.bg,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    modalInfoText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    modalInfoDate: {
        color: COLORS.secondary,
        fontSize: 13,
        marginTop: 4,
    },
    input: {
        minHeight: 100,
        borderColor: COLORS.accent,
        borderWidth: 1,
        borderRadius: 10,
        color: COLORS.text,
        padding: 12,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    saveBtn: {
        marginTop: 16,
        backgroundColor: COLORS.accent,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center'
    },
    saveText: {
        color: COLORS.bg,
        fontWeight: '600',
        fontSize: 16,
    },
});
