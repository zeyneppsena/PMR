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
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

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
    const [equipments, setEquipments] = useState<any[]>([]);
    const [records, setRecords] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [comment, setComment] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // Load equipments
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'equipments'), snap => {
            setEquipments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        });
        return () => unsub();
    }, []);

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

    // Generate schedule
    const generateSchedule = () => {
        const today = new Date();
        const nextYear = new Date(); nextYear.setFullYear(today.getFullYear() + 1);
        const list: any[] = [];
        equipments.forEach(eq => {
            const start = eq.startDate ? new Date(eq.startDate) : null;
            if (!start) return;
            const pd = parseInt(eq.periodicDays) || 0;
            const mh = parseInt(eq.maintenanceHour) || 0;
            const isP = ['Periyodik', 'Her İkisi'].includes(eq.maintenanceType);
            const isH = ['Saatlik', 'Her İkisi'].includes(eq.maintenanceType);

            if (isP && pd > 0) {
                let d = new Date(start);
                while (d <= nextYear) {
                    list.push({ ...eq, scheduledDate: new Date(d), reason: 'Periyodik Bakım' });
                    d.setDate(d.getDate() + pd);
                }
            }
            if (isH && mh > 0 && eq.workingHours >= mh) {
                list.push({ ...eq, scheduledDate: today, reason: 'Saatlik Bakım' });
            }
        });

        // Sort by date
        setSchedule(list.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()));
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
            scheduledDate: dateStr,
            completed: done,
            doneBy: done ? 'Zeynep Sena Özdemir' : '',
            doneAt: done ? Timestamp.now() : null,
            comment: records[key]?.comment || ''
        }, { merge: true });
    };

    // Open comment modal
    const openComment = (item: any) => {
        const key = makeKey(item);
        setSelectedKey(key);
        setComment(records[key]?.comment || '');
        setModalVisible(true);
    };

    // Save comment
    const saveComment = async () => {
        if (!selectedKey) return;
        const data = records[selectedKey] || {};
        const ref = doc(db, 'maintenances', selectedKey);
        await setDoc(ref, { ...data, comment }, { merge: true });
        setModalVisible(false);
        setComment('');
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.refreshBtn} onPress={generateSchedule}>
                    <Ionicons name="refresh" size={20} color={COLORS.bg} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bakım Planı</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Tamamlananlar</Text>
                    <Switch
                        value={showCompleted}
                        onValueChange={setShowCompleted}
                        trackColor={{ false: COLORS.warn, true: COLORS.success }}
                        thumbColor={showCompleted ? COLORS.success : COLORS.warn}
                    />
                </View>
            </View>
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
                    const dateText = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(item.scheduledDate);
                    return (
                        <View style={[styles.card, done && styles.doneBorder]}>
                            <View style={styles.rowTop}>
                                <Text style={styles.title}>{item.ship} - {item.type}</Text>
                                <Switch
                                    value={done}
                                    onValueChange={(val) => toggleDone(item, val)}
                                />
                            </View>
                            <Text style={styles.detail}>📅 {dateText}</Text>
                            <Text style={styles.detail}>✅ Sebep: {item.reason}</Text>
                            {rec.doneBy && <Text style={styles.detail}>Yapıldı: {rec.doneBy}</Text>}
                            {rec.comment && (
                                <View style={styles.commentBox}>
                                    <Ionicons name="chatbox-ellipses" size={16} color={COLORS.accent} />
                                    <Text style={styles.commentText}>{rec.comment}</Text>
                                </View>
                            )}
                            <TouchableOpacity style={styles.commentBtn} onPress={() => openComment(item)}>
                                <Ionicons name="chatbox-outline" size={16} color={COLORS.bg} />
                                <Text style={styles.commentBtnText}>Yorum</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                }
                ListEmptyComponent={() => (
                    <View style={styles.empty}> <Text style={styles.emptyText}>Görev bulunamadı.</Text> </View>
                )}
            />
            {/* Yorum Modalı */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <Pressable style={styles.overlay} onPress={() => setModalVisible(false)} />
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Yorum Ekle</Text>
                        <Pressable onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </Pressable>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder='Yorum...'
                        placeholderTextColor={COLORS.secondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
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
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.surface
    },
    refreshBtn: { padding: 8, backgroundColor: COLORS.accent, borderRadius: 8 },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center' },
    switchLabel: { color: COLORS.text, marginRight: 8 },
    listContent: { padding: 16 },
    sectionHeader: { color: COLORS.accent, fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 4 },
    card: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 12 },
    doneBorder: { borderColor: COLORS.success, borderWidth: 2 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    detail: { color: COLORS.secondary, fontSize: 14, marginBottom: 4 },
    commentBox: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
    commentText: { color: COLORS.accent, fontSize: 14, marginLeft: 6 },
    commentBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.accent, borderRadius: 8 },
    commentBtnText: { color: COLORS.bg, fontWeight: '600', marginLeft: 6 },
    empty: { flex: 1, alignItems: 'center', marginTop: 50 },
    emptyText: { color: COLORS.secondary, fontSize: 16 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
    modal: { position: 'absolute', top: '25%', alignSelf: 'center', width: '85%', backgroundColor: COLORS.surface, padding: 20, borderRadius: 12 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    input: { height: 100, borderColor: COLORS.accent, borderWidth: 1, borderRadius: 10, color: COLORS.text, padding: 10, textAlignVertical: 'top' },
    saveBtn: { marginTop: 12, backgroundColor: COLORS.accent, padding: 12, borderRadius: 10, alignItems: 'center' },
    saveText: { color: COLORS.bg, fontWeight: '600' },
});
