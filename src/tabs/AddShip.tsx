// AddShip.tsx – Ships CRUD (No Equipment Picker) – May 2025

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
    Modal,
    Pressable,
    FlatList,
    SafeAreaView,
} from 'react-native';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
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

const AddShip = ({ navigation, route, userRole }) => {
    const isAdmin = userRole === 'main-admin';
    const editingShip = route.params?.ship || null;

    const [name, setName] = useState('');
    const [imo, setImo] = useState('');
    const [port, setPort] = useState('');
    const [captain, setCaptain] = useState('');
    const [users, setUsers] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [userModalVisible, setUserModalVisible] = useState(false);

    useEffect(() => {
        if (editingShip) {
            setName(editingShip.name);
            setImo(editingShip.imo);
            setPort(editingShip.port);
            setCaptain(editingShip.captain);
            setUsers(editingShip.users || []);
        }
    }, [editingShip]);

    useEffect(
        () =>
            onSnapshot(collection(db, 'users'), snap =>
                setAvailableUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            ),
        [],
    );

    const handleSave = async () => {
        if (!isAdmin) return Alert.alert('Yetkisiz', 'Bu işlemi yapamazsınız.');
        if (!name || !imo || !port || !captain)
            return Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');

        try {
            if (editingShip) {
                await updateDoc(doc(db, 'ships', editingShip.id), {
                    name,
                    imo,
                    port,
                    captain,
                    users,
                });
                Alert.alert('Güncellendi', 'Gemi bilgileri güncellendi.');
            } else {
                await addDoc(collection(db, 'ships'), {
                    name,
                    imo,
                    port,
                    captain,
                    users: [],
                });
                Alert.alert('Kaydedildi', 'Gemi başarıyla eklendi.');
            }
            navigation.goBack();
        } catch (err) {
            console.error(err);
            Alert.alert('Hata', 'İşlem sırasında hata oluştu.');
        }
    };

    const toggleSelect = (
        arr: string[],
        setArr: React.Dispatch<React.SetStateAction<string[]>>,
        id: string,
    ) => {
        arr.includes(id)
            ? setArr(arr.filter(i => i !== id))
            : setArr([...arr, id]);
    };

    const findName = (id: string, list: any[]) =>
        list.find(i => i.id === id)?.name || id;

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>
                    {editingShip ? 'Gemi Bilgileri' : 'Yeni Gemi Ekle'}
                </Text>

                {[
                    ['Gemi Adı', name, setName, 'örn. MV Oceanic', 'default'],
                    ['IMO No', imo, setImo, 'örn. 1234567', 'numeric'],
                    ['Liman', port, setPort, 'örn. İstanbul', 'default'],
                    ['Kaptan', captain, setCaptain, 'örn. Ahmet Yılmaz', 'default'],
                ].map(([label, val, setter, ph, kb]) => (
                    <View key={label as string} style={{ marginTop: 18 }}>
                        <TextInput
                            style={styles.input}
                            value={val as string}
                            onChangeText={setter as any}
                            placeholder={ph as string}
                            placeholderTextColor={COLORS.secondary}
                            keyboardType={kb as any}
                            editable={isAdmin}
                        />
                    </View>
                ))}

                <View style={styles.section}>
                    <Text style={styles.subLabel}>Sorumlu Personeller</Text>
                    {users.length ? (
                        <View style={styles.chipWrap}>
                            {users.map(id => (
                                <View key={id} style={styles.chip}>
                                    <Text style={styles.chipText}>
                                        {findName(id, availableUsers)}
                                    </Text>
                                    {isAdmin && (
                                        <TouchableOpacity
                                            onPress={() =>
                                                toggleSelect(users, setUsers, id)
                                            }>
                                            <Text style={styles.removeX}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Seçilmedi</Text>
                    )}

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.accentBtn}
                            onPress={() => setUserModalVisible(true)}>
                            <Text style={styles.accentBtnText}>Personel Seç</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {isAdmin && (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Text style={styles.saveBtnText}>
                            {editingShip ? 'Güncelle' : 'Kaydet'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/*──────── Users Modal ────────*/}
            {isAdmin && (
                <Modal
                    visible={userModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setUserModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <Pressable
                            style={styles.modalBG}
                            onPress={() => setUserModalVisible(false)}
                        />
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Personel Seç</Text>
                            <FlatList
                                data={availableUsers}
                                keyExtractor={i => i.id}
                                renderItem={({ item }) => {
                                    const selected = users.includes(item.id);
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.listItem,
                                                selected && styles.listItemSel,
                                            ]}
                                            onPress={() =>
                                                toggleSelect(users, setUsers, item.id)
                                            }>
                                            <Text style={styles.listItemTxt}>
                                                {item.name || item.email || item.id}
                                            </Text>
                                            {selected && <Text style={styles.check}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            <TouchableOpacity
                                style={styles.accentBtn}
                                onPress={() => setUserModalVisible(false)}>
                                <Text style={styles.accentBtnText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

export default AddShip;

/*──────────────── Styles ────────────────*/
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    container: { padding: 20, paddingBottom: 60 },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.accent,
        marginBottom: 15,
        textAlign: 'center',
    },
    label: { color: COLORS.secondary, fontWeight: '700', marginBottom: 6 },
    input: {
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    section: { marginTop: 28 },
    subLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    emptyText: { color: COLORS.secondary, marginTop: 4 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 8,
        marginTop: 8,
    },
    chipText: { color: COLORS.text, marginRight: 6 },
    removeX: { color: COLORS.warn, fontSize: 18, fontWeight: '800' },
    accentBtn: {
        backgroundColor: COLORS.accent,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    accentBtnText: { color: COLORS.bg, fontWeight: '700' },
    saveBtn: {
        backgroundColor: COLORS.success,
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 35,
        alignItems: 'center',
    },
    saveBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: '800' },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBG: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay,
    },
    modalContent: {
        width: '85%',
        maxHeight: '75%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 18,
    },
    modalTitle: {
        color: COLORS.accent,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 10,
        textAlign: 'center',
    },
    listItem: {
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.secondary,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    listItemSel: { backgroundColor: '#264C46' },
    listItemTxt: { color: COLORS.text, fontSize: 16 },
    check: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
});
