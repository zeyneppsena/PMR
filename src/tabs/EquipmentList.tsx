import React, {
    useEffect,
    useState,
    useMemo,
    useCallback,
    Fragment,
} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    TextInput,
    SectionList,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
    query,
    where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebaseConfig';
import { useUser } from '../UserContext';

/*──────────────── Palette ────────────────*/
const COLORS = {
    bg: '#121212',
    surface: '#1E1E1E',
    border: '#313131',
    accent: '#4ECDC4',
    warn: '#e57373',
    textPrimary: '#FFFFFF',
    textSecondary: '#9E9E9E',
    overlay: 'rgba(0,0,0,0.7)',
    chipBg: '#263238',
    chipSelected: '#37474F',
};

/*──────────────── Util: Input w/ icon ───*/
const InputField = ({
                        icon,
                        placeholder,
                        value,
                        onChangeText,
                        keyboardType = 'default',
                    }) => (
    <View style={styles.inputField}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
        <TextInput
            style={styles.inputInner}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textSecondary}
            value={value}
            onChangeText={onChangeText}
        />
    </View>
);

/*──────────────── Util: ChipSelect ──────*/
const ChipSelect = ({ options, value, onChange }) => (
    <View style={styles.chipRow}>
        {options.map((opt) => {
            const selected = opt === value;
            return (
                <TouchableOpacity
                    key={opt}
                    style={[
                        styles.chip,
                        { backgroundColor: selected ? COLORS.accent : COLORS.chipBg },
                    ]}
                    onPress={() => onChange(opt)}
                >
                    <Text
                        style={{
                            color: selected ? COLORS.bg : COLORS.textPrimary,
                            fontWeight: '600',
                        }}
                    >
                        {opt}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

/*──────────────── Mini Dropdown ─────────*/
const DropdownSelect = ({
                            label,
                            value,
                            placeholder = '-- Seçiniz --',
                            options = [],
                            onChange,
                        }) => {
    const [visible, setVisible] = useState(false);
    const current =
        options.find((o) => o.value === value)?.label || placeholder;

    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>
                {label} <Text style={{ color: COLORS.accent }}>✱</Text>
            </Text>

            <TouchableOpacity
                style={styles.dropdownField}
                activeOpacity={0.8}
                onPress={() => setVisible(true)}
            >
                <Text
                    style={{
                        color: value ? COLORS.textPrimary : COLORS.textSecondary,
                        flex: 1,
                    }}
                >
                    {current}
                </Text>
                <Ionicons name="chevron-down" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                animationType="fade"
                transparent
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.modalBG} onPress={() => setVisible(false)} />
                <View style={styles.dropdownModalContainer}>
                    <SectionList
                        sections={[{ title: '', data: options }]}
                        keyExtractor={(_, i) => i.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    onChange(item.value);
                                    setVisible(false);
                                }}
                            >
                                <Text style={{ color: COLORS.textPrimary }}>{item.label}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

/*──────────────── Delete helper ─────────*/
const handleDelete = async (item) => {
    Alert.alert('Silmek istediğine emin misin?', '', [
        { text: 'İptal', style: 'cancel' },
        {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
                try {
                    await deleteDoc(doc(db, 'equipments', item.id));
                    Alert.alert('Başarılı', 'Ekipman silindi');
                } catch (err) {
                    console.error(err);
                    Alert.alert('Hata', 'Silme sırasında sorun oluştu.');
                }
            },
        },
    ]);
};

/*──────────────── Main ────────────────*/
const EquipmentList = () => {
    const { user } = useUser(); // UserContext'ten kullanıcı bilgisi
    const [equipments, setEquipments] = useState([]);
    const [ships, setShips] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    /* form / modal state */
    const [formVisible, setFormVisible] = useState(false);
    const [updateHoursVisible, setUpdateHoursVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);

    /* form fields */
    const [selectedShipId, setSelectedShipId] = useState('');
    const [selectedShipName, setSelectedShipName] = useState('');
    const [type, setType] = useState('');
    const [brand, setBrand] = useState('');
    const [serialNo, setSerialNo] = useState('');
    const [selectedResponsible, setSelectedResponsible] = useState('');
    const [workingHours, setWorkingHours] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [maintenanceType, setMaintenanceType] = useState('');
    const [periodicDays, setPeriodicDays] = useState('');
    const [maintenanceHour, setMaintenanceHour] = useState('');
    const [startDate, setStartDate] = useState('');

    /* datetime pickers */
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);

    /* hours-update modal */
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [newWorkingHours, setNewWorkingHours] = useState('');

    /* constants */
    const equipmentTypes = [
        'Güverte Ekipmanları',
        'Jeneratör',
        'Havalandırma',
        'Ana Makina',
        'Diğer',
        'İskele Ana Makina Sensör',
        'Pompa',
        'Sancak Ana Makina Sensör',
        'Separatör',
    ];
    const maintenanceTypes = ['Periyodik', 'Saatlik', 'Her İkisi'];

    /*──────── Permission helpers ────────*/
    const isAdmin = user?.role === 'main-admin';
    const isShipAdmin = user?.role === 'ship-admin';
    const isCrewMember = user?.role === 'gemi-personeli';

    /*──────── Firestore listeners ────────*/
    useEffect(() => {
        let unsubEquip;

        // Rol bazlı ekipman sorgulama
        if (isAdmin) {
            // Admin tüm ekipmanları görür
            unsubEquip = onSnapshot(collection(db, 'equipments'), (snap) => {
                setEquipments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            });
        } else if (isShipAdmin && user?.shipId) {
            // Ship admin kendi gemisindeki tüm ekipmanları görür
            const q = query(collection(db, 'equipments'), where('shipId', '==', user.shipId));
            unsubEquip = onSnapshot(q, (snap) => {
                setEquipments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            });
        } else if (isCrewMember) {
            // Gemi personeli sadece sorumlu olduğu ekipmanları görür
            const q = query(
                collection(db, 'equipments'),
                where('responsible', 'in', [user?.email, user?.userName, user?.name])
            );
            unsubEquip = onSnapshot(q, (snap) => {
                setEquipments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            });
        } else {
            setEquipments([]);
            setLoading(false);
        }

        const unsubShips = onSnapshot(collection(db, 'ships'), (snap) =>
            setShips(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        );
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) =>
            setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        );

        return () => {
            if (unsubEquip) unsubEquip();
            unsubShips();
            unsubUsers();
        };
    }, [user?.role, user?.shipId, user?.email, user?.userName]);

    /*──────── Can user edit/delete ────────*/
    const canEdit = useCallback(
        (eq) => {
            if (isAdmin) return true;
            if (isShipAdmin && eq.shipId === user?.shipId) return true;
            return (
                eq.responsible === user?.email ||
                eq.responsible === user?.userName ||
                eq.responsible === user?.name
            );
        },
        [isAdmin, isShipAdmin, user]
    );

    /*──────── Grouped sections ────────*/
    const sections = useMemo(() => {
        const grouped = {};
        equipments.forEach((eq) => {
            if (!grouped[eq.ship]) grouped[eq.ship] = [];
            grouped[eq.ship].push(eq);
        });
        return Object.keys(grouped).map((ship) => ({
            title: ship,
            data: grouped[ship].sort((a, b) => a.type.localeCompare(b.type)),
        }));
    }, [equipments]);

    /*──────── Form helpers ────────*/
    const resetForm = () => {
        setSelectedShipId('');
        setSelectedShipName('');
        setType('');
        setBrand('');
        setSerialNo('');
        setSelectedResponsible('');
        setWorkingHours('');
        setLastUpdated('');
        setStartDate('');
        setMaintenanceType('');
        setPeriodicDays('');
        setMaintenanceHour('');
        setIsEditing(false);
        setEditingItemId(null);
    };

    const openCreate = () => {
        resetForm();
        // Ship admin ise otomatik olarak kendi gemisini seç
        if (isShipAdmin && user?.shipId) {
            const userShip = ships.find(s => s.id === user.shipId);
            if (userShip) {
                setSelectedShipId(user.shipId);
                setSelectedShipName(userShip.name);
            }
        }
        setFormVisible(true);
    };

    const openEdit = (item) => {
        setIsEditing(true);
        setEditingItemId(item.id);
        setSelectedShipId(item.shipId);
        setSelectedShipName(item.ship);
        setType(item.type);
        setBrand(item.brand);
        setSerialNo(item.serialNo);
        setSelectedResponsible(item.responsible);
        setWorkingHours(String(item.workingHours ?? ''));
        setLastUpdated(item.lastUpdated);
        setMaintenanceType(item.maintenanceType);
        setMaintenanceHour(item.maintenanceHour);
        setPeriodicDays(item.periodicDays || '');
        setStartDate(item.startDate || '');
        setFormVisible(true);
    };

    /*──────── Save logic ────────*/
    const handleSave = async () => {
        if (
            !selectedShipId ||
            !type ||
            !brand ||
            !serialNo ||
            !maintenanceType
        ) {
            Alert.alert('Uyarı', 'Lütfen zorunlu alanları doldurun');
            return;
        }

        const payload = {
            shipId: selectedShipId,
            ship: selectedShipName,
            type,
            brand,
            serialNo,
            responsible: selectedResponsible,
            workingHours: Number(workingHours) || null,
            maintenanceHour:
                ['Saatlik', 'Her İkisi'].includes(maintenanceType)
                    ? maintenanceHour
                    : null,
            lastUpdated: lastUpdated || new Date().toISOString().slice(0, 10),
            startDate: startDate || new Date().toISOString().slice(0, 10),
            maintenanceType,
            periodicDays:
                maintenanceType === 'Periyodik' ? periodicDays : null,
        };

        try {
            if (isEditing && editingItemId) {
                await updateDoc(doc(db, 'equipments', editingItemId), payload);
                Alert.alert('Başarılı', 'Ekipman güncellendi');
            } else {
                await addDoc(collection(db, 'equipments'), {
                    ...payload,
                    createdAt: Timestamp.fromDate(new Date()),
                });
                Alert.alert('Başarılı', 'Ekipman eklendi');
            }
            setFormVisible(false);
            resetForm();
        } catch (err) {
            console.error(err);
            Alert.alert('Hata', 'İşlem sırasında sorun oluştu.');
        }
    };

    /*──────── List item renderer ────────*/
    const renderItem = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
                <Ionicons name="boat-outline" size={20} color={COLORS.accent} />
                <Text style={styles.itemTitle}>
                    {item.ship} – {item.type}
                </Text>

                {canEdit(item) && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedEquipment(item);
                                setNewWorkingHours(String(item.workingHours ?? ''));
                                setUpdateHoursVisible(true);
                            }}
                        >
                            <Ionicons name="time-outline" size={18} color={COLORS.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEdit(item)}>
                            <Ionicons name="create-outline" size={18} color={COLORS.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.warn} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.row}>
                <Ionicons name="time-outline" size={16} color={COLORS.accent} />
                <Text style={styles.itemText}>{item.workingHours ?? '-'} saat</Text>
            </View>
            <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
                <Text style={styles.itemText}>{item.lastUpdated}</Text>
            </View>
            {item.responsible && (
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.itemText}>{item.responsible}</Text>
                </View>
            )}
        </View>
    );

    /*──────── Modal form UI ────────*/
    function renderForm() {
        // Ship admin için gemi seçim listesini filtrele
        const availableShips = isShipAdmin && user?.shipId
            ? ships.filter(s => s.id === user.shipId)
            : ships;

        return (
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable
                    style={styles.modalBG}
                    onPress={() => setFormVisible(false)}
                />

                <ScrollView
                    style={styles.modalContainer}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Ekipmanı Düzenle' : 'Yeni Ekipman'}
                        </Text>
                        <TouchableOpacity onPress={() => setFormVisible(false)}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Fields */}
                    <DropdownSelect
                        label="Gemi"
                        value={selectedShipId}
                        onChange={(shipId) => {
                            setSelectedShipId(shipId);
                            const name =
                                ships.find((s) => s.id === shipId)?.name || '';
                            setSelectedShipName(name);
                        }}
                        options={availableShips.map((s) => ({
                            label: s.name,
                            value: s.id,
                        }))}
                    />

                    <DropdownSelect
                        label="Ekipman Türü"
                        value={type}
                        onChange={setType}
                        options={equipmentTypes.map((t) => ({
                            label: t,
                            value: t,
                        }))}
                    />

                    <InputField
                        icon="pricetag-outline"
                        placeholder="Marka"
                        value={brand}
                        onChangeText={setBrand}
                    />
                    <InputField
                        icon="barcode-outline"
                        placeholder="Seri No"
                        value={serialNo}
                        onChangeText={setSerialNo}
                    />

                    {/* Start Date */}
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                        <InputField
                            icon="calendar-outline"
                            placeholder="Başlangıç Tarihi"
                            value={startDate}
                            onChangeText={setStartDate}
                        />
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate ? new Date(startDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            maximumDate={new Date()}
                            onChange={(_, date) => {
                                setShowStartDatePicker(false);
                                if (date)
                                    setStartDate(date.toISOString().slice(0, 10));
                            }}
                        />
                    )}

                    <DropdownSelect
                        label="Sorumlu"
                        value={selectedResponsible}
                        onChange={setSelectedResponsible}
                        options={users.map((u) => ({
                            label: u.name || u.email,
                            value: u.name || u.email,
                        }))}
                    />

                    <InputField
                        icon="time-outline"
                        placeholder="Çalışma Saati"
                        value={workingHours}
                        onChangeText={setWorkingHours}
                        keyboardType="numeric"
                    />

                    {/* Last updated */}
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <InputField
                            icon="calendar-outline"
                            placeholder="Son Güncellenme"
                            value={lastUpdated}
                            onChangeText={setLastUpdated}
                        />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={
                                lastUpdated ? new Date(lastUpdated) : new Date()
                            }
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            maximumDate={new Date()}
                            onChange={(_, date) => {
                                setShowDatePicker(false);
                                if (date)
                                    setLastUpdated(date.toISOString().slice(0, 10));
                            }}
                        />
                    )}

                    {/* Maintenance type chips */}
                    <Text
                        style={[styles.label, { marginTop: 12 }]}
                    >
                        Bakım Türü <Text style={{ color: COLORS.accent }}>✱</Text>
                    </Text>
                    <ChipSelect
                        options={maintenanceTypes}
                        value={maintenanceType}
                        onChange={setMaintenanceType}
                    />

                    {['Periyodik', 'Her İkisi'].includes(maintenanceType) && (
                        <InputField
                            icon="repeat-outline"
                            placeholder="Periyodik Bakım (gün)"
                            value={periodicDays}
                            onChangeText={setPeriodicDays}
                            keyboardType="numeric"
                        />
                    )}
                    {['Saatlik', 'Her İkisi'].includes(maintenanceType) && (
                        <InputField
                            icon="repeat-outline"
                            placeholder="Bakım Saat"
                            value={maintenanceHour}
                            onChangeText={setMaintenanceHour}
                            keyboardType="numeric"
                        />
                    )}

                    {/* Buttons */}
                    <View style={styles.rowBetween}>
                        <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                            <Text style={styles.btnText}>
                                {isEditing ? 'Güncelle' : 'Kaydet'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.btnCancel}
                            onPress={() => {
                                resetForm();
                                setFormVisible(false);
                            }}
                        >
                            <Text style={styles.btnText}>Vazgeç</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    /*──────── JSX ────────*/
    if (!user) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    stickySectionHeadersEnabled={false}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Ionicons
                                name="boat"
                                size={18}
                                color={COLORS.accent}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>{title}</Text>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.center}>
                            <Text style={{ color: COLORS.textSecondary }}>
                                {isCrewMember
                                    ? 'Size atanmış ekipman bulunmuyor.'
                                    : 'Görüntülenecek ekipman bulunamadı.'}
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* FAB - Sadece admin ve ship admin görebilir */}
            {(isAdmin || isShipAdmin) && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={openCreate}
                    activeOpacity={0.9}
                >
                    <Ionicons name="add" size={30} color={COLORS.textPrimary} />
                </TouchableOpacity>
            )}

            {/* Add/Edit Modal */}
            <Modal
                visible={formVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setFormVisible(false)}
            >
                {renderForm()}
            </Modal>

            {/* Hours Update Modal */}
            <Modal
                visible={updateHoursVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setUpdateHoursVisible(false)}
            >
                <Pressable
                    style={styles.modalBG}
                    onPress={() => setUpdateHoursVisible(false)}
                />
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Çalışma Saati Güncelle</Text>
                        <TouchableOpacity onPress={() => setUpdateHoursVisible(false)}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Yeni Çalışma Saati:</Text>
                    <InputField
                        icon="time-outline"
                        placeholder="örn. 1200"
                        value={newWorkingHours}
                        onChangeText={setNewWorkingHours}
                        keyboardType="numeric"
                    />

                    <View style={styles.rowBetween}>
                        <TouchableOpacity
                            style={styles.btnSave}
                            onPress={async () => {
                                if (!newWorkingHours || isNaN(Number(newWorkingHours))) {
                                    Alert.alert('Uyarı', 'Geçerli bir sayı girin.');
                                    return;
                                }
                                try {
                                    await updateDoc(
                                        doc(db, 'equipments', selectedEquipment.id),
                                        {
                                            workingHours: Number(newWorkingHours),
                                            lastUpdated: new Date()
                                                .toISOString()
                                                .slice(0, 10),
                                        }
                                    );
                                    Alert.alert('Başarılı', 'Çalışma saati güncellendi.');
                                    setUpdateHoursVisible(false);
                                } catch (err) {
                                    console.error(err);
                                    Alert.alert('Hata', 'Güncelleme sırasında sorun oluştu.');
                                }
                            }}
                        >
                            <Text style={styles.btnText}>Güncelle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.btnCancel}
                            onPress={() => setUpdateHoursVisible(false)}
                        >
                            <Text style={styles.btnText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default EquipmentList;


/*──────────────── Styles ────────────────*/
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    /* list */
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    itemCard: {
        backgroundColor: COLORS.surface,
        padding: 18,
        borderRadius: 14,
        marginBottom: 12,
        gap: 4,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    headerActions: { flexDirection: 'row', marginLeft: 'auto', gap: 14 },
    itemTitle: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '600',
        flexShrink: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    itemText: { color: COLORS.textSecondary, fontSize: 13 },

    /* fab */
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        backgroundColor: COLORS.accent,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },

    /* modal (shared) */
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalBG: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay,
    },
    modalContainer: {
        width: '93%',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        maxHeight: '92%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },

    /* dropdown */
    dropdownField: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 14,
    },
    dropdownModalContainer: {
        alignSelf: 'center',
        width: '85%',
        maxHeight: '80%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: '30%',
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
    },

    /* inputs */
    label: { color: COLORS.textSecondary, marginBottom: 6, fontSize: 14 },
    inputField: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 14,
    },
    inputInner: {
        flex: 1,
        color: COLORS.textPrimary,
        marginLeft: 10,
        fontSize: 14,
    },

    /* chips */
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },

    /* buttons */
    btnSave: {
        backgroundColor: COLORS.accent,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 30,
    },
    btnCancel: {
        backgroundColor: '#444',
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 30,
    },
    btnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 16 },
});
