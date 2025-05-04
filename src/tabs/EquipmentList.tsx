import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    TextInput,
    FlatList,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    onSnapshot,
    addDoc,
    Timestamp,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Picker } from '@react-native-picker/picker';

const EquipmentList = () => {
    const [equipments, setEquipments] = useState([]);
    const [ships, setShips] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);

    const [selectedShip, setSelectedShip] = useState('');
    const [type, setType] = useState('');
    const [brand, setBrand] = useState('');
    const [serialNo, setSerialNo] = useState('');
    const [selectedResponsible, setSelectedResponsible] = useState('');
    const [workingHours, setWorkingHours] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [maintenanceType, setMaintenanceType] = useState('');

    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [newWorkingHours, setNewWorkingHours] = useState('');

    useEffect(() => {
        const unsubEquipments = onSnapshot(collection(db, 'equipments'), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setEquipments(data);
            setLoading(false);
        });
        return () => unsubEquipments();
    }, []);

    useEffect(() => {
        const unsubShips = onSnapshot(collection(db, 'ships'), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setShips(data);
        });
        return () => unsubShips();
    }, []);

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(data);
        });
        return () => unsubUsers();
    }, []);

    const openModal = () => setModalVisible(true);
    const closeModal = () => {
        setModalVisible(false);
        clearForm();
    };

    const clearForm = () => {
        setSelectedShip('');
        setType('');
        setBrand('');
        setSerialNo('');
        setSelectedResponsible('');
        setWorkingHours('');
        setLastUpdated('');
        setMaintenanceType('');
    };

    const handleAddEquipment = async () => {
        if (!selectedShip || !type || !brand || !serialNo) {
            Alert.alert('Uyarı', 'Lütfen zorunlu alanları doldurun');
            return;
        }
        try {
            await addDoc(collection(db, 'equipments'), {
                ship: selectedShip,
                type,
                brand,
                serialNo,
                responsible: selectedResponsible,
                workingHours,
                lastUpdated: lastUpdated || new Date().toISOString().slice(0, 10),
                maintenanceType,
                createdAt: Timestamp.fromDate(new Date())
            });
            Alert.alert('Başarılı', 'Ekipman eklendi!');
            closeModal();
        } catch (error) {
            console.error('Ekipman ekleme hatası:', error);
            Alert.alert('Hata', 'Ekipman eklenirken bir sorun oluştu.');
        }
    };

    const handleUpdateWorkingHours = async () => {
        if (!newWorkingHours || isNaN(newWorkingHours)) {
            Alert.alert('Uyarı', 'Geçerli bir sayı girin.');
            return;
        }
        try {
            const equipmentRef = doc(db, 'equipments', selectedEquipment.id);
            await updateDoc(equipmentRef, {
                workingHours: newWorkingHours,
                lastUpdated: new Date().toISOString().slice(0, 10)
            });
            Alert.alert('Başarılı', 'Çalışma saati güncellendi.');
            setUpdateModalVisible(false);
            setSelectedEquipment(null);
            setNewWorkingHours('');
        } catch (error) {
            console.error('Güncelleme hatası:', error);
            Alert.alert('Hata', 'Güncelleme sırasında sorun oluştu.');
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>{item.brand} - {item.type}</Text>
            <Text style={styles.itemText}>Gemi: {item.ship}</Text>
            <Text style={styles.itemText}>Seri No: {item.serialNo}</Text>
            <Text style={styles.itemText}>Sorumlu: {item.responsible || '-'}</Text>
            <Text style={styles.itemText}>Çalışma Saati: {item.workingHours || '-'}</Text>
            <Text style={styles.itemText}>Son Güncelleme: {item.lastUpdated}</Text>
            <Text style={styles.itemText}>Bakım Tipi: {item.maintenanceType || '-'}</Text>

            <TouchableOpacity
                style={{ marginTop: 6, alignSelf: 'flex-end' }}
                onPress={() => {
                    setSelectedEquipment(item);
                    setNewWorkingHours(item.workingHours || '');
                    setUpdateModalVisible(true);
                }}
            >
                <Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Çalışma Saatini Güncelle</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={equipments}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 80, padding: 16 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz bir ekipman eklenmemiş.</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={openModal}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            {/* Yeni Ekipman Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBG} onPress={closeModal} />
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Yeni Ekipman Ekle</Text>

                        <Text style={styles.label}>Gemi (Zorunlu):</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={selectedShip} onValueChange={setSelectedShip} style={styles.picker}>
                                <Picker.Item label="-- Gemi Seç --" value="" />
                                {ships.map((ship) => (
                                    <Picker.Item key={ship.id} label={ship.name} value={ship.name} />
                                ))}
                            </Picker>
                        </View>

                        <TextInput style={styles.input} placeholder="Tür - Zorunlu" value={type} onChangeText={setType} placeholderTextColor="#888" />
                        <TextInput style={styles.input} placeholder="Marka - Zorunlu" value={brand} onChangeText={setBrand} placeholderTextColor="#888" />
                        <TextInput style={styles.input} placeholder="Seri No - Zorunlu" value={serialNo} onChangeText={setSerialNo} placeholderTextColor="#888" />

                        <Text style={styles.label}>Sorumlu:</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={selectedResponsible} onValueChange={setSelectedResponsible} style={styles.picker}>
                                <Picker.Item label="-- Sorumlu Seç --" value="" />
                                {users.map((user) => (
                                    <Picker.Item key={user.id} label={user.name || user.email} value={user.name || user.email} />
                                ))}
                            </Picker>
                        </View>

                        <TextInput style={styles.input} placeholder="Çalışma Saati" value={workingHours} onChangeText={setWorkingHours} keyboardType="numeric" placeholderTextColor="#888" />
                        <TextInput style={styles.input} placeholder="Son Güncellenme (yyyy-mm-dd)" value={lastUpdated} onChangeText={setLastUpdated} placeholderTextColor="#888" />
                        <TextInput style={styles.input} placeholder="Bakım Tipi" value={maintenanceType} onChangeText={setMaintenanceType} placeholderTextColor="#888" />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity style={styles.btnSave} onPress={handleAddEquipment}>
                                <Text style={styles.btnText}>Kaydet</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnCancel} onPress={closeModal}>
                                <Text style={styles.btnText}>Vazgeç</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Çalışma Saati Güncelleme Modal */}
            <Modal visible={updateModalVisible} transparent animationType="fade" onRequestClose={() => setUpdateModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBG} onPress={() => setUpdateModalVisible(false)} />
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Çalışma Saati Güncelle</Text>
                        <Text style={styles.label}>Yeni Çalışma Saati:</Text>
                        <TextInput
                            style={styles.input}
                            value={newWorkingHours}
                            onChangeText={setNewWorkingHours}
                            keyboardType="numeric"
                            placeholder="örn. 1200"
                            placeholderTextColor="#888"
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity style={styles.btnSave} onPress={handleUpdateWorkingHours}>
                                <Text style={styles.btnText}>Güncelle</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => setUpdateModalVisible(false)}>
                                <Text style={styles.btnText}>İptal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default EquipmentList;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1c1c1e'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1e'
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center'
    },
    emptyText: {
        color: '#aaa',
        fontSize: 16
    },
    itemCard: {
        backgroundColor: '#2c2c2e',
        padding: 16,
        borderRadius: 10,
        marginBottom: 12
    },
    itemTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 6
    },
    itemText: {
        color: '#ccc',
        marginBottom: 2
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#4ECDC4',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalBG: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    modalContainer: {
        width: '85%',
        backgroundColor: '#2c2c2e',
        borderRadius: 10,
        padding: 16
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        alignSelf: 'center'
    },
    label: {
        color: '#ccc',
        marginTop: 6,
        marginBottom: 2
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#3a3a3c',
        backgroundColor: '#1c1c1e',
        borderRadius: 6,
        marginBottom: 8
    },
    picker: {
        color: '#fff',
        width: '100%'
    },
    input: {
        borderWidth: 1,
        borderColor: '#3a3a3c',
        backgroundColor: '#1c1c1e',
        color: '#fff',
        borderRadius: 6,
        padding: 10,
        marginBottom: 8
    },
    btnSave: {
        backgroundColor: '#4ECDC4',
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 8
    },
    btnCancel: {
        backgroundColor: '#666',
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 8
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
