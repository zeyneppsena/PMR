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

const AdminPanel = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('gemi-personeli');
    const [users, setUsers] = useState([]);

    const handleCreateUser = async () => {
        if (!email || !password || !name || !role) {
            Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            await setDoc(doc(db, 'users', uid), {
                name,
                email,
                role,
                createdAt: new Date()
            });

            Alert.alert('Başarılı', 'Kullanıcı oluşturuldu.');
            setEmail('');
            setPassword('');
            setName('');
            setRole('gemi-personeli');
            fetchUsers();
        } catch (err) {
            console.error(err);
            Alert.alert('Hata', 'Kullanıcı oluşturulamadı.');
        }
    };

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(list);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Yeni Kullanıcı Oluştur</Text>

                <View style={styles.inputField}>
                    <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.inputInner}
                        placeholder="Ad Soyad"
                        placeholderTextColor={COLORS.textSecondary}
                        value={name}
                        onChangeText={setName}
                    />
                </View>
                <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.inputInner}
                        placeholder="E-posta"
                        placeholderTextColor={COLORS.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputField}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.inputInner}
                        placeholder="Şifre"
                        placeholderTextColor={COLORS.textSecondary}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <Text style={styles.label}>Yetki Grubu</Text>
                <View style={styles.roleGroup}>
                    {['main-admin', 'ship-admin', 'gemi-personeli'].map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[
                                styles.roleButton,
                                role === r && styles.roleButtonActive
                            ]}
                            onPress={() => setRole(r)}
                        >
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    role === r && styles.roleButtonTextActive
                                ]}
                            >
                                {r === 'main-admin' ? 'Main Admin' : r === 'ship-admin' ? 'Ship Admin' : 'Gemi Personeli'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.btnSave} onPress={handleCreateUser}>
                    <Text style={styles.btnText}>Kullanıcı Oluştur</Text>
                </TouchableOpacity>

                <Text style={styles.subtitle}>Kayıtlı Kullanıcılar</Text>

                {users.map((u) => (
                    <View style={styles.itemCard} key={u.id}>
                        <View style={styles.itemHeader}>
                            <Ionicons name="person-circle-outline" size={20} color={COLORS.accent} />
                            <Text style={styles.itemTitle}>{u.name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Ionicons name="mail-outline" size={16} color={COLORS.accent} />
                            <Text style={styles.itemText}>{u.email}</Text>
                        </View>
                        <View style={styles.row}>
                            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.accent} />
                            <Text style={styles.itemText}>{u.role}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default AdminPanel;

/*──────── Styles ────────*/
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 16, paddingBottom: 100 },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 20,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 6,
        marginTop: 10,
    },
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
    roleGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
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
    roleButtonActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    roleButtonText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    roleButtonTextActive: {
        color: COLORS.textPrimary,
    },
    btnSave: {
        backgroundColor: COLORS.accent,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 30,
    },
    btnText: {
        color: COLORS.textPrimary,
        fontWeight: '600',
        fontSize: 16,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    itemCard: {
        backgroundColor: COLORS.surface,
        padding: 18,
        borderRadius: 14,
        marginBottom: 12,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    itemTitle: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    itemText: { color: COLORS.textSecondary, fontSize: 13 },
});
