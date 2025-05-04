import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Alert,
    FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

const AdminPanel = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('gemi-personeli'); // varsayılan rol
    const [users, setUsers] = useState([]);

    const handleCreateUser = async () => {
        if (!email || !password || !name || !role) {
            Alert.alert('Lütfen tüm alanları doldurun.');
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

            Alert.alert('Kullanıcı başarıyla oluşturuldu!');
            setEmail('');
            setPassword('');
            setName('');
            setRole('gemi-personeli');
            fetchUsers();
        } catch (error) {
            console.error('Hata:', error);
            Alert.alert('Kullanıcı oluşturulurken hata oluştu.');
        }
    };

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const userList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(userList);
        } catch (error) {
            console.error('Kullanıcılar alınamadı:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const renderUser = ({ item }) => (
        <View style={styles.userCard}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userRole}>Yetki: {item.role}</Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Yeni Kullanıcı Oluştur</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Ad Soyad"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="E-posta"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Şifre"
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>Yetki Grubu:</Text>
                    <Picker
                        selectedValue={role}
                        onValueChange={(itemValue) => setRole(itemValue)}
                        style={styles.picker}
                        dropdownIconColor="#fff"
                    >
                        <Picker.Item label="Main Admin" value="main-admin" />
                        <Picker.Item label="Ship Admin" value="ship-admin" />
                        <Picker.Item label="Gemi Personeli" value="gemi-personeli" />
                    </Picker>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleCreateUser}>
                    <Text style={styles.buttonText}>Kullanıcı Oluştur</Text>
                </TouchableOpacity>

                <Text style={styles.subtitle}>Kayıtlı Kullanıcılar</Text>

                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.userList}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default AdminPanel;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scroll: {
        padding: 20,
        paddingBottom: 100
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20
    },
    input: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16
    },
    pickerContainer: {
        marginBottom: 20
    },
    pickerLabel: {
        color: '#ccc',
        marginBottom: 5,
        fontSize: 14
    },
    picker: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        borderRadius: 8
    },
    button: {
        backgroundColor: '#2979FF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 25
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10
    },
    userList: {
        paddingBottom: 100
    },
    userCard: {
        backgroundColor: '#1f1f1f',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10
    },
    userName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    userEmail: {
        color: '#aaa',
        fontSize: 14,
        marginTop: 4
    },
    userRole: {
        color: '#7abaff',
        fontSize: 13,
        marginTop: 6,
        fontStyle: 'italic'
    }
});
