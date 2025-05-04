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
    FlatList
} from 'react-native';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const PRIMARY_COLOR = '#4CAF50'; // Vurgu rengi (yeşil tonlu)
const DARK_BG = '#121212';
const MODAL_BG = '#1E1E1E';

const AddShip = ({ navigation, route, userRole }) => {
    // Kullanıcı rolü kontrolü
    const isAdmin = userRole === 'main-admin';

    console.error('userRole:', userRole);



    // "Düzenleme" modunda mı, yoksa yeni gemi mi ekleniyor?
    const editingShip = route.params?.ship || null;

    // Gemi bilgileri
    const [name, setName] = useState('');
    const [imo, setImo] = useState('');
    const [port, setPort] = useState('');
    const [captain, setCaptain] = useState('');

    // Personel & Ekipman ID listeleri
    const [users, setUsers] = useState([]);
    const [equipments, setEquipments] = useState([]);

    // Modal görünürlük durumları
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);

    // Firestore'dan çekilen mevcut kullanıcı ve ekipman listeleri
    const [availableUsers, setAvailableUsers] = useState([]);
    const [availableEquipments, setAvailableEquipments] = useState([]);

    // Sayfa açıldığında, eğer düzenleme modundaysak formu doldur
    useEffect(() => {
        if (editingShip) {
            setName(editingShip.name);
            setImo(editingShip.imo);
            setPort(editingShip.port);
            setCaptain(editingShip.captain);
            setUsers(editingShip.users || []);
            setEquipments(editingShip.equipments || []);
        }
    }, [editingShip]);

    // Kullanıcı listesini Firestore'dan çek
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setAvailableUsers(data);
        });
        return () => unsubscribe();
    }, []);

    // Ekipman listesini Firestore'dan çek
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'equipments'), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setAvailableEquipments(data);
        });
        return () => unsubscribe();
    }, []);

    // Gemi kaydetme veya güncelleme
    const handleSave = async () => {
        // Admin değilse kaydet/güncelleme işlemlerini engelliyoruz
        if (!isAdmin) {
            Alert.alert('Yetkisiz işlem', 'Bu işlemi yapmaya yetkiniz yok.');
            return;
        }

        // Zorunlu alanlar boşsa uyarı ver
        if (!name || !imo || !port || !captain) {
            Alert.alert('Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            if (editingShip) {
                // Gemi güncelle
                const shipRef = doc(db, 'ships', editingShip.id);
                await updateDoc(shipRef, {
                    name,
                    imo,
                    port,
                    captain,
                    users,
                    equipments
                });
                Alert.alert('Gemi bilgileri güncellendi!');
            } else {
                // Yeni gemi ekle
                await addDoc(collection(db, 'ships'), {
                    name,
                    imo,
                    port,
                    captain,
                    users: [],       // Yeni gemide başlangıçta boş
                    equipments: []   // Yeni gemide başlangıçta boş
                });
                Alert.alert('Gemi başarıyla eklendi!');
            }
            navigation.goBack();
        } catch (error) {
            console.error('Hata:', error);
            Alert.alert('Bir hata oluştu, tekrar deneyin.');
        }
    };

    // ----- Personel Seçme Fonksiyonları -----
    const openUserModal = () => setUserModalVisible(true);
    const closeUserModal = () => setUserModalVisible(false);

    const toggleSelectUser = (userId) => {
        if (users.includes(userId)) {
            setUsers(users.filter((id) => id !== userId));
        } else {
            setUsers([...users, userId]);
        }
    };

    // ----- Ekipman Seçme Fonksiyonları -----
    const openEquipmentModal = () => setEquipmentModalVisible(true);
    const closeEquipmentModal = () => setEquipmentModalVisible(false);

    const toggleSelectEquipment = (equipmentId) => {
        if (equipments.includes(equipmentId)) {
            setEquipments(equipments.filter((id) => id !== equipmentId));
        } else {
            setEquipments([...equipments, equipmentId]);
        }
    };

    // ----- Seçili Personel / Ekipman Silme -----
    const removeUser = (userId) => {
        setUsers(users.filter((id) => id !== userId));
    };
    const removeEquipment = (equipmentId) => {
        setEquipments(equipments.filter((id) => id !== equipmentId));
    };

    // ID'den isme ulaşma
    const getUserNameById = (id) => {
        const user = availableUsers.find((u) => u.id === id);
        return user ? (user.name || user.email || user.id) : id;
    };
    const getEquipmentNameById = (id) => {
        const eq = availableEquipments.find((e) => e.id === id);
        return eq ? (eq.name || eq.id) : id;
    };

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>
                    {editingShip ? 'Gemi Bilgilerini Görüntüle/Düzenle' : 'Yeni Gemi Ekle'}
                </Text>

                {/* Form Alanları */}
                <Text style={styles.label}>Gemi Adı</Text>
                <TextInput
                    style={styles.input}
                    placeholder="örn. MV Oceanic"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                    editable={isAdmin}
                />

                <Text style={styles.label}>IMO No</Text>
                <TextInput
                    style={styles.input}
                    placeholder="örn. 1234567"
                    placeholderTextColor="#888"
                    value={imo}
                    onChangeText={setImo}
                    keyboardType="numeric"
                    editable={isAdmin}
                />

                <Text style={styles.label}>Liman</Text>
                <TextInput
                    style={styles.input}
                    placeholder="örn. İstanbul"
                    placeholderTextColor="#888"
                    value={port}
                    onChangeText={setPort}
                    editable={isAdmin}
                />

                <Text style={styles.label}>Kaptan</Text>
                <TextInput
                    style={styles.input}
                    placeholder="örn. Ahmet Yılmaz"
                    placeholderTextColor="#888"
                    value={captain}
                    onChangeText={setCaptain}
                    editable={isAdmin}
                />

                {/* ----- Sorumlu Personel ----- */}
                <View style={styles.section}>
                    <Text style={styles.subLabel}>Sorumlu Personeller</Text>
                    {users.length === 0 ? (
                        <Text style={styles.emptyText}>Henüz kimse seçilmedi</Text>
                    ) : (
                        <View style={styles.selectedList}>
                            {users.map((id) => (
                                <View key={id} style={styles.selectedItem}>
                                    <Text style={styles.selectedName}>{getUserNameById(id)}</Text>
                                    {/* Yalnızca Admin silme yapabilsin */}
                                    {isAdmin && (
                                        <TouchableOpacity onPress={() => removeUser(id)}>
                                            <Text style={styles.removeX}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Personel Seç butonu sadece Admin'e görünsün */}
                    {isAdmin && (
                        <TouchableOpacity style={styles.accentButton} onPress={openUserModal}>
                            <Text style={styles.accentButtonText}>Personel Seç</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ----- Ekipmanlar ----- */}
                <View style={styles.section}>
                    <Text style={styles.subLabel}>Ekipmanlar</Text>
                    {equipments.length === 0 ? (
                        <Text style={styles.emptyText}>Henüz ekipman yok</Text>
                    ) : (
                        <View style={styles.selectedList}>
                            {equipments.map((id) => (
                                <View key={id} style={styles.selectedItem}>
                                    <Text style={styles.selectedName}>{getEquipmentNameById(id)}</Text>
                                    {/* Yalnızca Admin silme yapabilsin */}
                                    {isAdmin && (
                                        <TouchableOpacity onPress={() => removeEquipment(id)}>
                                            <Text style={styles.removeX}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                    {/* Ekipman Seç butonu sadece Admin'e görünsün */}
                    {isAdmin && (
                        <TouchableOpacity style={styles.accentButton} onPress={openEquipmentModal}>
                            <Text style={styles.accentButtonText}>Ekipman Seç</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Kaydet/Güncelle butonu da yalnızca Admin’e görünsün */}
                {isAdmin && (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>
                            {editingShip ? 'Güncelle' : 'Gemi Kaydet'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* ------ Personel Seç Modal ------ */}
            {isAdmin && (
                <Modal
                    visible={userModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={closeUserModal}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBG} onPress={closeUserModal} />
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Personel Seç</Text>
                            <FlatList
                                data={availableUsers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const isSelected = users.includes(item.id);
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.listItem,
                                                isSelected && styles.listItemSelected
                                            ]}
                                            onPress={() => toggleSelectUser(item.id)}
                                        >
                                            <Text style={styles.listItemText}>
                                                {item.name || item.email}
                                            </Text>
                                            {isSelected && <Text style={styles.checkMark}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            <TouchableOpacity style={styles.accentButton} onPress={closeUserModal}>
                                <Text style={styles.accentButtonText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ------ Ekipman Seç Modal ------ */}
            {isAdmin && (
                <Modal
                    visible={equipmentModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={closeEquipmentModal}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBG} onPress={closeEquipmentModal} />
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Ekipman Seç</Text>
                            <FlatList
                                data={availableEquipments}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const isSelected = equipments.includes(item.id);
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.listItem,
                                                isSelected && styles.listItemSelected
                                            ]}
                                            onPress={() => toggleSelectEquipment(item.id)}
                                        >
                                            <Text style={styles.listItemText}>
                                                {item.name || 'isimsiz'}
                                            </Text>
                                            {isSelected && <Text style={styles.checkMark}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            <TouchableOpacity style={styles.accentButton} onPress={closeEquipmentModal}>
                                <Text style={styles.accentButtonText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

export default AddShip;

/* ----- Stil Tanımları ----- */

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: DARK_BG
    },
    container: {
        padding: 20,
        paddingBottom: 50
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 15
    },
    label: {
        color: '#ffffff',
        fontWeight: '700',
        marginTop: 15
    },
    input: {
        borderWidth: 1,
        borderColor: '#444',
        backgroundColor: '#1C1C1C',
        padding: 10,
        marginTop: 5,
        borderRadius: 5,
        color: '#fff'
    },
    subLabel: {
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 5,
        color: '#ffffff'
    },
    emptyText: {
        color: '#777',
        marginBottom: 5
    },
    section: {
        marginTop: 25
    },
    // Seçili personel/ekipmanların minik kart görünümü
    selectedList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8
    },
    selectedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
        marginBottom: 8
    },
    selectedName: {
        marginRight: 8,
        color: '#FFFFFF'
    },
    removeX: {
        color: '#FF5555',
        fontWeight: 'bold',
        fontSize: 16
    },
    // Kaydet Butonu
    saveButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 12,
        borderRadius: 6,
        marginTop: 30,
        alignItems: 'center'
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    // Accent Buton (Personel/Ekipman seç butonları vs)
    accentButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginTop: 10,
        alignItems: 'center',
        alignSelf: 'flex-start'
    },
    accentButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600'
    },
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalBG: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    modalContent: {
        width: '85%',
        backgroundColor: MODAL_BG,
        borderRadius: 10,
        padding: 16,
        maxHeight: '70%'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        alignSelf: 'center'
    },
    // Liste item (modal içi)
    listItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    listItemSelected: {
        backgroundColor: '#2f4032'
    },
    listItemText: {
        fontSize: 16,
        color: '#ccc'
    },
    checkMark: {
        fontSize: 18,
        // yeşil onay işareti
        color: '#66ff66'
    }
});
