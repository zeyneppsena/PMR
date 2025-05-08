import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    Timestamp,
    QueryDocumentSnapshot,
    DocumentData,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/*──────────────── Palette ────────────────*/
const COLORS = {
    bg: '#121212',
    surface: '#1E1E1E',
    accent: '#4ECDC4',
    success: '#66BB6A',
    warn: '#e57373',
    text: '#FFFFFF',
    secondary: '#B0B0B0',
    overlay: 'rgba(0,0,0,0.7)',
};

/*──────────────── Types ────────────────*/
type Equipment = { id: string; name: string };
type Status = 'reported' | 'inprogress' | 'resolved';

type Repair = {
    id: string;
    equipmentName: string;
    description: string;
    reportedAt: any;
    startedAt?: any;
    resolvedAt?: any;
    status: Status;
    imageUri?: string | null;
};

/*──────────────── Main Component ────────────────*/
const RepairScreen = () => {
    /*──────── Form & data state ────────*/
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [loadingEquip, setLoadingEquip] = useState(true);
    const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
    const [eqModalVisible, setEqModalVisible] = useState(false);

    const [description, setDescription] = useState('');
    const [reportedAt, setReportedAt] = useState(new Date());
    const [pickerOpen, setPickerOpen] = useState(false);

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [loadingList, setLoadingList] = useState(true);

    /*──────── UI state ────────*/
    const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false); // filtre

    /*──────── Firestore listeners ────────*/
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'equipments'), snap => {
            const list = snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
            setEquipments(list);
            if (list.length && !selectedEq) setSelectedEq(list[0]);
            setLoadingEquip(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'repairs'), snap => {
            const list = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
                id: d.id,
                equipmentName: d.data().equipmentName,
                description: d.data().description,
                reportedAt: d.data().reportedAt,
                startedAt: d.data().startedAt || null,
                resolvedAt: d.data().resolvedAt || null,
                status: (d.data().status as Status) || 'reported',
                imageUri: d.data().imageUri || null,
            }));
            setRepairs(list);
            setLoadingList(false);
        });
        return unsub;
    }, []);

    /*──────── Helpers ────────*/
    const openDatePicker = () => setPickerOpen(true);
    const onDateChange = (_: any, date?: Date) => {
        setPickerOpen(false);
        if (date) setReportedAt(date);
    };

    const pickImageFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled) setImageUri(result.assets[0].uri);
    };

    const pickImageFromCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('İzin Gerekli', 'Kamerayı kullanmak için izin verin');
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled) setImageUri(result.assets[0].uri);
    };

    const updateStatus = async (
        id: string,
        status: Status,
        extra: Partial<Record<'startedAt' | 'resolvedAt', any>> = {},
    ) => {
        try {
            await setDoc(
                doc(db, 'repairs', id),
                { status, updatedAt: Timestamp.now(), ...extra },
                { merge: true },
            );
        } catch {
            Alert.alert('Hata', 'Durum güncellenemedi');
        }
    };

    const submitRepair = async () => {
        if (!selectedEq) return Alert.alert('Hata', 'Ekipman seçin');
        if (!description.trim()) return Alert.alert('Hata', 'Açıklama girin');

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'repairs'), {
                equipmentId: selectedEq.id,
                equipmentName: selectedEq.name,
                description: description.trim(),
                reportedAt: Timestamp.fromDate(reportedAt),
                status: 'reported',
                updatedAt: Timestamp.now(),
                imageUri: imageUri || null,
            });
            // reset
            setDescription('');
            setReportedAt(new Date());
            setImageUri(null);
            Alert.alert('Başarılı', 'Arıza kaydı oluşturuldu');
        } catch {
            Alert.alert('Hata', 'Oluşturulamadı');
        }
        setSubmitting(false);
    };

    /*──────── Status mapping ────────*/
    const statusInfo: Record<
        Status,
        { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
    > = {
        reported: { label: 'Bildirildi', icon: 'alert-circle-outline', color: COLORS.warn },
        inprogress: { label: 'İşlemde', icon: 'refresh-circle', color: COLORS.accent },
        resolved: { label: 'Giderildi', icon: 'checkmark-circle', color: COLORS.success },
    };

    /*──────── Render functions ────────*/
    const renderRepair = ({ item }: { item: Repair }) => {
        const info = statusInfo[item.status];
        const date =
            item.status === 'resolved'
                ? item.resolvedAt?.toDate?.()
                : item.status === 'inprogress'
                    ? item.startedAt?.toDate?.()
                    : item.reportedAt.toDate();

        return (
            <View style={styles.card}>
                {/* Fotoğraf ikonu */}
                <TouchableOpacity
                    style={styles.photoIcon}
                    onPress={() =>
                        item.imageUri
                            ? setPhotoPreviewUri(item.imageUri)
                            : Alert.alert('Fotoğraf Yok', 'Bu kayıt için fotoğraf eklenmemiş')
                    }
                >
                    <Ionicons
                        name="image"
                        size={22}
                        color={item.imageUri ? COLORS.accent : COLORS.secondary}
                    />
                </TouchableOpacity>

                <Text style={styles.eqName}>{item.equipmentName}</Text>
                <Text style={styles.desc}>{item.description}</Text>

                <View style={styles.statusRow}>
                    <Ionicons name={info.icon} size={20} color={info.color} />
                    <Text style={styles.statusLabel}>
                        {info.label}: {date ? date.toLocaleDateString() : '—'}
                    </Text>

                    {item.status === 'reported' && (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                updateStatus(item.id, 'inprogress', { startedAt: Timestamp.now() })
                            }
                        >
                            <Text style={styles.actionBtnText}>İşleme Al</Text>
                        </TouchableOpacity>
                    )}

                    {item.status === 'inprogress' && (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                updateStatus(item.id, 'resolved', { resolvedAt: Timestamp.now() })
                            }
                        >
                            <Text style={styles.actionBtnText}>Giderildi</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    /*──────── Loading screen ────────*/
    if (loadingEquip || loadingList)
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

    const visibleRepairs = repairs.filter(r => showAll || r.status !== 'resolved');

    /*──────── UI ────────*/
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/*──────── Header ────────*/}
                <Text style={styles.sectionTitle}>Arıza Takip Ekranı</Text>

                {/*──────── Form Card ────────*/}
                <View style={styles.formCard}>
                    {/* Ekipman seçim */}
                    <Text style={styles.label}>Ekipman Seçin</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setEqModalVisible(true)}
                    >
                        <Text style={styles.dropdownText}>
                            {selectedEq?.name || 'Seçin'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                    </TouchableOpacity>

                    {/* Açıklama */}
                    <Text style={styles.label}>Arıza Açıklaması</Text>
                    <TextInput
                        style={styles.textArea}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Detay girin..."
                        placeholderTextColor={COLORS.secondary}
                        multiline
                    />

                    {/* Fotoğraf */}
                    <Text style={styles.label}>Fotoğraf</Text>
                    <View style={styles.photoRow}>
                        <TouchableOpacity onPress={pickImageFromCamera}>
                            <Ionicons name="camera" size={28} color={COLORS.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickImageFromGallery}>
                            <Ionicons name="image" size={28} color={COLORS.accent} />
                        </TouchableOpacity>
                    </View>
                    {imageUri && (
                        <Image
                            source={{ uri: imageUri }}
                            style={{ width: '100%', height: 200, borderRadius: 12 }}
                        />
                    )}

                    {/* Bildirim tarihi */}
                    <Text style={styles.label}>Bildirim Tarihi</Text>
                    <TouchableOpacity style={styles.dateRow} onPress={openDatePicker}>
                        <Text style={styles.dateValue}>
                            {reportedAt.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    {/* Kaydet */}
                    <TouchableOpacity
                        style={styles.submitBtn}
                        disabled={submitting}
                        onPress={submitRepair}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.bg} />
                        ) : (
                            <Text style={styles.submitText}>Kaydet</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/*──────── Filter Toggle ────────*/}
                <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowAll(!showAll)}>
                    <Text style={styles.toggleText}>
                        {showAll ? 'Yalnızca Açık Kayıtlar' : 'Tüm Kayıtları Göster'}
                    </Text>
                </TouchableOpacity>

                {/*──────── Repair List ────────*/}
                <FlatList
                    data={visibleRepairs}
                    keyExtractor={r => r.id}
                    renderItem={renderRepair}
                    contentContainerStyle={styles.list}
                />

                {/*──────── Ekipman Modal ────────*/}
                <Modal transparent animationType="slide" visible={eqModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Ekipman Seç</Text>
                            <FlatList
                                data={equipments}
                                keyExtractor={e => e.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => {
                                            setSelectedEq(item);
                                            setEqModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.modalItemText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => setEqModalVisible(false)}
                            >
                                <Text style={styles.modalCloseText}>İptal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/*──────── Photo Preview Modal ────────*/}
                <Modal transparent visible={!!photoPreviewUri}>
                    <View style={styles.photoModalOverlay}>
                        {photoPreviewUri && (
                            <Image
                                source={{ uri: photoPreviewUri }}
                                style={styles.photoFull}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity
                            style={styles.photoClose}
                            onPress={() => setPhotoPreviewUri(null)}
                        >
                            <Ionicons name="close" size={36} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                </Modal>

                {/*──────── Date Picker ────────*/}
                {pickerOpen && (
                    <DateTimePicker
                        value={reportedAt}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default RepairScreen;

/*──────────────── Styles ────────────────*/
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { padding: 20, paddingBottom: 40 },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.accent,
        marginVertical: 20,
        textAlign: 'center',
    },
    /*──────── Form Card ────────*/
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 7,
    },
    label: { color: COLORS.secondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        padding: 14,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    dropdownText: { color: COLORS.text, fontSize: 16 },
    textArea: {
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        borderRadius: 8,
        padding: 16,
        height: 120,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    photoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5, padding:15,backgroundColor: COLORS.bg, },
    dateRow: {
        backgroundColor: COLORS.bg,
        padding: 14,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.warn,
    },
    dateValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    submitBtn: {
        backgroundColor: COLORS.accent,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitText: { color: COLORS.bg, fontSize: 18, fontWeight: '800' },

    /*──────── Toggle ────────*/
    toggleBtn: {
        alignSelf: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: COLORS.accent,
        marginBottom: 20,
    },
    toggleText: { color: COLORS.accent, fontWeight: '700' },

    /*──────── List & Card ────────*/
    list: { paddingBottom: 20 },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.accent,
    },
    photoIcon: { position: 'absolute', top: 12, right: 12 },
    eqName: { color: COLORS.accent, fontSize: 18, fontWeight: '700', marginBottom: 10 },
    desc: { color: COLORS.text, fontSize: 14, marginBottom: 16, lineHeight: 22 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    statusLabel: { color: COLORS.text, marginLeft: 10, fontSize: 14, flex: 1 },
    actionBtn: {
        backgroundColor: COLORS.success,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
    },
    actionBtnText: { color: COLORS.bg, fontWeight: '700' },

    /*──────── Modal (Equipment) ────────*/
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, maxHeight: '75%' },
    modalTitle: {
        color: COLORS.accent,
        fontSize: 18,
        fontWeight: '800',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.secondary,
    },
    modalItem: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.secondary },
    modalItemText: { color: COLORS.text, fontSize: 16 },
    modalClose: { padding: 16, alignItems: 'center' },
    modalCloseText: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },

    /*──────── Photo Preview Modal ────────*/
    photoModalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoFull: { width: '90%', height: '70%', borderRadius: 12 },
    photoClose: { position: 'absolute', top: 40, right: 30 },
});
