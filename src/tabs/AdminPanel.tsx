import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

/*──────── Renk Paleti ────────*/
const COLORS = {
    bg: '#121212',
    surface: '#1E1E1E',
    accent: '#4ECDC4',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#313131',
    warn: '#e57373',
};

type Ship = { id: string; name: string; imo?: string };

const AdminPanel = () => {
    /*────────────────── STATE ──────────────────*/
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] =
        useState<'main-admin' | 'ship-admin' | 'gemi-personeli'>('gemi-personeli');

    const [users, setUsers] = useState<any[]>([]);
    const [ships, setShips] = useState<Ship[]>([]);
    const [shipLookup, setShipLookup] = useState<Record<string, Ship>>({});
    const [selectedShip, setSelectedShip] = useState<Ship | null>(null);

    const [shipModalVisible, setShipModalVisible] = useState(false);

    /*────────────────── CRUD ──────────────────*/
    const handleCreateUser = async () => {
        if (!email || !password || !name) {
            return Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
        }
        if (role !== 'main-admin' && !selectedShip) {
            return Alert.alert('Uyarı', 'Lütfen bir gemi seçin.');
        }

        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', cred.user.uid), {
                name,
                email,
                role,
                shipId: selectedShip?.id || null,
                createdAt: new Date(),
            });
            Alert.alert('Başarılı', 'Kullanıcı oluşturuldu.');
            resetForm();
            fetchUsers();
        } catch (err: any) {
            console.error(err);
            Alert.alert('Hata', err?.message || 'Kullanıcı oluşturulamadı.');
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setRole('gemi-personeli');
        setSelectedShip(null);
    };

    /*────────────────── FETCH ──────────────────*/
    const fetchUsers = async () => {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const fetchShips = async () => {
        const snap = await getDocs(collection(db, 'ships'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Ship[];
        setShips(list);

        // id → Ship sözlüğü
        const map: Record<string, Ship> = {};
        list.forEach(s => (map[s.id] = s));
        setShipLookup(map);
    };

    useEffect(() => {
        fetchUsers();
        fetchShips();
    }, []);

    /*────────────────── UI ──────────────────*/
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                {/*──── Başlık ────*/}
                <Text style={styles.title}>Yeni Kullanıcı Oluştur</Text>

                {/*──── Form Alanları ────*/}
                <InputField icon="person-outline" placeholder="Ad Soyad" value={name} onChangeText={setName} />
                <InputField icon="mail-outline" placeholder="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <InputField icon="lock-closed-outline" placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry />

                {/*──── Rol Seçimi ────*/}
                <Text style={styles.label}>Yetki Grubu</Text>
                <View style={styles.roleGroup}>
                    {(['main-admin', 'ship-admin', 'gemi-personeli'] as const).map(r => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.roleButton, role === r && styles.roleButtonActive]}
                            onPress={() => {
                                setRole(r);
                                if (r === 'main-admin') setSelectedShip(null);
                            }}
                        >
                            <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                                {r === 'main-admin' ? 'Main Admin' : r === 'ship-admin' ? 'Ship Admin' : 'Gemi Personeli'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/*──── Gemi Seçimi (main-admin hariç) ────*/}
                {role !== 'main-admin' && (
                    <>
                        <Text style={styles.label}>Gemi</Text>
                        <TouchableOpacity style={styles.inputField} onPress={() => setShipModalVisible(true)}>
                            <Ionicons name="boat-outline" size={18} color={COLORS.textSecondary} />
                            <Text
                                style={[
                                    styles.inputInner,
                                    { color: selectedShip ? COLORS.textPrimary : COLORS.textSecondary },
                                ]}
                            >
                                {selectedShip
                                    ? `${selectedShip.name}${selectedShip.imo ? ` (${selectedShip.imo})` : ''}`
                                    : 'Gemi seçin'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {/*──── Kaydet ────*/}
                <TouchableOpacity style={styles.btnSave} onPress={handleCreateUser}>
                    <Text style={styles.btnText}>Kullanıcı Oluştur</Text>
                </TouchableOpacity>

                {/*──── Kullanıcı Listesi ────*/}
                <Text style={styles.subtitle}>Kayıtlı Kullanıcılar</Text>
                {users.map(u => {
                    const ship = u.shipId ? shipLookup[u.shipId] : undefined;
                    return (
                        <View style={styles.itemCard} key={u.id}>
                            <View style={styles.itemHeader}>
                                <Ionicons name="person-circle-outline" size={20} color={COLORS.accent} />
                                <Text style={styles.itemTitle}>{u.name}</Text>
                            </View>
                            <InfoRow icon="mail-outline" text={u.email} />
                            <InfoRow icon="shield-checkmark-outline" text={u.role} />
                            {ship && (
                                <InfoRow
                                    icon="boat-outline"
                                    text={`Gemi: ${ship.name}`}
                                />
                            )}
                        </View>
                    );
                })}

                {/*──── Gemi Seçim Modali ────*/}
                <Modal visible={shipModalVisible} animationType="slide" transparent onRequestClose={() => setShipModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Gemi Seç</Text>
                            <ScrollView>
                                {ships.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={styles.modalItem}
                                        onPress={() => {
                                            setSelectedShip(s);
                                            setShipModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.modalItemText}>
                                            {s.name}
                                            {s.imo ? ` (${s.imo})` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={styles.modalClose} onPress={() => setShipModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default AdminPanel;

/*──────── Yardımcı Bileşenler ────────*/
const InputField = ({ icon, ...rest }: React.ComponentProps<typeof TextInput> & { icon: any }) => (
    <View style={styles.inputField}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
        <TextInput style={styles.inputInner} placeholderTextColor={COLORS.textSecondary} {...rest} />
    </View>
);
const InfoRow = ({ icon, text }: { icon: any; text: string }) => (
    <View style={styles.row}>
        <Ionicons name={icon} size={16} color={COLORS.accent} />
        <Text style={styles.itemText}>{text}</Text>
    </View>
);

/*──────── Styles ────────*/
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 16, paddingBottom: 100 },
    title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20 },
    label: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 6, marginTop: 10 },
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
    inputInner: { flex: 1, color: COLORS.textPrimary, marginLeft: 10, fontSize: 14 },
    roleGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    roleButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
    },
    roleButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    roleButtonText: { color: COLORS.textSecondary, fontWeight: '600' },
    roleButtonTextActive: { color: COLORS.textPrimary },
    btnSave: {
        backgroundColor: COLORS.accent,
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        marginBottom: 30,
    },
    btnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 16 },
    subtitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
    itemCard: { backgroundColor: COLORS.surface, padding: 18, borderRadius: 14, marginBottom: 12 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    itemTitle: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    itemText: { color: COLORS.textSecondary, fontSize: 13 },
    /* Modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalItemText: { color: COLORS.textPrimary, fontSize: 15 },
    modalClose: { position: 'absolute', top: 8, right: 8 },
});
