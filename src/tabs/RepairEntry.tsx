// RepairEntry.tsx — Tüm kod eksiksiz

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
    getDoc,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import NotificationService from '../../NotificationService';
import { useUser } from '../UserContext';

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
    createdByName?: string; // ← eklendi
};

/*──────────────── Main Component ────────────────*/
const RepairEntry = () => {
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
    const [showAll, setShowAll] = useState(false);

    const { user } = useUser(); // uid, role, userName, email, shipId

    /*──────── Equipments listener ────────*/
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'equipments'), snap => {
            const list = snap.docs.map(d => ({
                id: d.id,
                name: `${d.data().ship || ''} - ${d.data().type || ''}`.trim() || d.id,
            }));
            setEquipments(list);
            if (list.length && !selectedEq) setSelectedEq(list[0]);
            setLoadingEquip(false);
        });
        return unsub;
    }, []);

    /*──────── Repairs listener (rol-bazlı, tek) ────────*/
    useEffect(() => {
        let unsub = () => {};
        const repairsColl = collection(db, 'repairs');

        const mapDocs = snap => {
            setRepairs(
                snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        equipmentName: data.equipmentName,
                        description: data.description,
                        reportedAt: data.reportedAt,
                        startedAt: data.startedAt || null,
                        resolvedAt: data.resolvedAt || null,
                        status: (data.status as Status) || 'reported',
                        imageUri: data.imageUri || null,
                        createdByName: data.createdByName || data.createdBy, // eski kayıtlarda UID
                    } as Repair;
                }),
            );
            setLoadingList(false);
        };

        const initListener = () => {
            if (user.role === 'gemi-personeli') {
                const q = query(repairsColl, where('createdBy', '==', user.uid));
                unsub = onSnapshot(q, mapDocs);
            } else if (user.role === 'ship-admin') {
                if (!user.shipId) {
                    setRepairs([]);
                    setLoadingList(false);
                    return;
                }
                const q = query(repairsColl, where('shipId', '==', user.shipId));
                unsub = onSnapshot(q, mapDocs);
            } else {
                // main-admin
                unsub = onSnapshot(repairsColl, mapDocs);
            }
        };

        initListener();
        return () => unsub();
    }, [user.role, user.uid, user.shipId]);

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
        if (!perm.granted)
            return Alert.alert('İzin Gerekli', 'Kamerayı kullanmak için izin verin');
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled) setImageUri(result.assets[0].uri);
    };

    /*──────── Submit ────────*/
    const submitRepair = async () => {
        if (!selectedEq) return Alert.alert('Hata', 'Ekipman seçin');
        if (!description.trim()) return Alert.alert('Hata', 'Açıklama girin');

        // Ekipmana ait shipId'yi oku
        const eqSnap = await getDoc(doc(db, 'equipments', selectedEq.id));
        let shipId: string | null = null;
        if (eqSnap.exists()) {
            const raw = eqSnap.data().shipId;
            shipId = typeof raw === 'string' ? raw : raw?.id ?? null;
        }

        setSubmitting(true);
        try {
            const repairData = {
                equipmentId: selectedEq.id,
                equipmentName: selectedEq.name,
                description: description.trim(),
                reportedAt: Timestamp.fromDate(reportedAt),
                status: 'reported' as Status,
                updatedAt: Timestamp.now(),
                imageUri: imageUri ?? null,
                createdBy: user.uid,
                createdByName: user.userName,
                shipId,
            };

            const docRef = await addDoc(collection(db, 'repairs'), repairData);

            await NotificationService.sendRepairNotification(
                { id: docRef.id, ...repairData },
                'reported',
            );

            // Form temizle
            setDescription('');
            setReportedAt(new Date());
            setImageUri(null);
            if (equipments.length) setSelectedEq(equipments[0]);

            Alert.alert('Başarılı', 'Arıza kaydı oluşturuldu');
        } catch (err) {
            console.error('Arıza kaydı oluşturulamadı:', err);
            Alert.alert('Hata', 'Arıza kaydı oluşturulamadı');
        }
        setSubmitting(false);
    };

    /*──────── Durum güncelle ────────*/
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

            const repair = repairs.find(r => r.id === id);
            if (repair) {
                try {
                    await NotificationService.sendRepairNotification(repair, status);
                } catch (err) {
                    console.error('Bildirim gönderilemedi:', err);
                }
            }

            const msg = { inprogress: 'Arıza işleme alındı', resolved: 'Arıza giderildi' }[status];
            Alert.alert('Başarılı', msg || 'Durum güncellendi');
        } catch (e) {
            console.error('Durum güncellenemedi:', e);
            Alert.alert('Hata', 'Durum güncellenemedi');
        }
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
                    : item.reportedAt.toDate?.();

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
                <Text style={styles.reporter}>Bildiren: {item.createdByName}</Text>
                <Text style={styles.desc}>{item.description}</Text>

                <View style={styles.statusRow}>
                    <Ionicons name={info.icon} size={20} color={info.color} />
                    <Text style={styles.statusLabel}>
                        {info.label}: {date ? date.toLocaleDateString('tr-TR') : '—'}
                    </Text>

                    {item.status === 'reported' && (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                updateStatus(item.id, 'inprogress', { startedAt: Timestamp.now() })
                            }
                        >
                            <Text style={styles.actionBtnText}>İşleme Al</Text>
                        </TouchableOpacity>
                    )}

                    {item.status === 'inprogress' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
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
    if (loadingEquip || loadingList) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    const visibleRepairs = repairs.filter(r => showAll || r.status !== 'resolved');

    /*──────── UI ────────*/
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/*──────── Form Card ────────*/}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Yeni Arıza Bildirimi</Text>

                    {/* Ekipman seçim */}
                    <Text style={styles.label}>Ekipman Seçin</Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setEqModalVisible(true)}>
                        <Text style={styles.dropdownText}>{selectedEq?.name || 'Ekipman Seçin'}</Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                    </TouchableOpacity>

                    {/* Açıklama */}
                    <Text style={styles.label}>Arıza Açıklaması</Text>
                    <TextInput
                        style={styles.textArea}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Arıza detaylarını girin..."
                        placeholderTextColor={COLORS.secondary}
                        multiline
                        numberOfLines={4}
                    />

                    {/* Fotoğraf */}
                    <Text style={styles.label}>Fotoğraf Ekle</Text>
                    <View style={styles.photoRow}>
                        <TouchableOpacity style={styles.photoButton} onPress={pickImageFromCamera}>
                            <Ionicons name="camera" size={24} color={COLORS.accent} />
                            <Text style={styles.photoButtonText}>Kamera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoButton} onPress={pickImageFromGallery}>
                            <Ionicons name="image" size={24} color={COLORS.accent} />
                            <Text style={styles.photoButtonText}>Galeri</Text>
                        </TouchableOpacity>
                    </View>
                    {imageUri && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => setImageUri(null)}
                            >
                                <Ionicons name="close-circle" size={24} color={COLORS.warn} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Bildirim tarihi */}
                    <Text style={styles.label}>Bildirim Tarihi</Text>
                    <TouchableOpacity style={styles.dateRow} onPress={openDatePicker}>
                        <Ionicons name="calendar" size={20} color={COLORS.accent} />
                        <Text style={styles.dateValue}>{reportedAt.toLocaleDateString('tr-TR')}</Text>
                    </TouchableOpacity>

                    {/* Kaydet */}
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                        disabled={submitting}
                        onPress={submitRepair}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.bg} />
                        ) : (
                            <>
                                <Ionicons name="save" size={20} color={COLORS.bg} />
                                <Text style={styles.submitText}>Arıza Kaydı Oluştur</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/*──────── Filter Toggle ────────*/}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Arıza Kayıtları</Text>
                    <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowAll(!showAll)}>
                        <Ionicons name={showAll ? 'eye' : 'eye-off'} size={18} color={COLORS.accent} />
                        <Text style={styles.toggleText}>{showAll ? 'Tümü' : 'Açık'}</Text>
                    </TouchableOpacity>
                </View>

                {/*──────── Repair List ────────*/}
                {visibleRepairs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="construct-outline" size={48} color={COLORS.secondary} />
                        <Text style={styles.emptyText}>
                            {showAll ? 'Henüz arıza kaydı yok' : 'Açık arıza kaydı yok'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={visibleRepairs}
                        keyExtractor={r => r.id}
                        renderItem={renderRepair}
                        contentContainerStyle={styles.list}
                        scrollEnabled={false}
                    />
                )}

                {/*──────── Ekipman Modal ────────*/}
                <Modal transparent animationType="slide" visible={eqModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Ekipman Seç</Text>
                                <TouchableOpacity onPress={() => setEqModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
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
                                        {selectedEq?.id === item.id && (
                                            <Ionicons name="checkmark" size={20} color={COLORS.accent} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.modalEmptyText}>Ekipman bulunamadı</Text>
                                }
                            />
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
                            <Ionicons name="close-circle" size={40} color={COLORS.text} />
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
                        maximumDate={new Date()}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default RepairEntry;

/*──────────────── Styles ────────────────*/
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
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

    /*──────── Form Card ────────*/
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        color: COLORS.secondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
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
    dropdownText: {
        color: COLORS.text,
        fontSize: 16,
        flex: 1,
    },
    textArea: {
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        borderRadius: 8,
        padding: 12,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    photoRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    photoButtonText: {
        color: COLORS.accent,
        fontSize: 14,
        fontWeight: '600',
    },
    imagePreviewContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        padding: 14,
        borderRadius: 8,
        marginBottom: 20,
        gap: 10,
    },
    dateValue: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: COLORS.accent,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitText: {
        color: COLORS.bg,
        fontSize: 16,
        fontWeight: '700',
    },

    /*──────── Filter Section ────────*/
    filterSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 6,
    },
    toggleText: {
        color: COLORS.accent,
        fontWeight: '600',
        fontSize: 14,
    },

    /*──────── Empty State ────────*/
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: COLORS.secondary,
        fontSize: 16,
        marginTop: 12,
    },

    /*──────── List & Card ────────*/
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accent,
    },
    photoIcon: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    eqName: {
        color: COLORS.accent,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        paddingRight: 40,
    },
    reporter: {
        color: COLORS.secondary,
        fontSize: 13,
        marginBottom: 8,
    },
    desc: {
        color: COLORS.text,
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    statusLabel: {
        color: COLORS.text,
        marginLeft: 6,
        fontSize: 14,
        flex: 1,
    },
    actionBtn: {
        backgroundColor: COLORS.accent,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
    },
    actionBtnText: {
        color: COLORS.bg,
        fontWeight: '600',
        fontSize: 13,
    },

    /*──────── Modal ────────*/
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.bg,
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.bg,
    },
    modalItemText: {
        color: COLORS.text,
        fontSize: 16,
        flex: 1,
    },
    modalEmptyText: {
        color: COLORS.secondary,
        fontSize: 16,
        textAlign: 'center',
        padding: 40,
    },

    /*──────── Photo Preview Modal ────────*/
    photoModalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoFull: {
        width: '90%',
        height: '80%',
        borderRadius: 12,
    },
    photoClose: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
});
