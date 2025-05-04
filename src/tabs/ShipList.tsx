import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    Dimensions
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const ShipList = ({ navigation, userRole }) => {
    const isAdmin = userRole === 'main-admin';

    const [ships, setShips] = useState([]);
    const [loading, setLoading] = useState(true);

    useLayoutEffect(() => {
        if (isAdmin) {
            navigation.setOptions({
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AddShip', { userRole })}
                        style={{ marginRight: 15 }}
                    >
                        <Ionicons name="add" size={28} color="#4EDCC4" />
                    </TouchableOpacity>
                )
            });
        } else {
            navigation.setOptions({ headerRight: () => null });
        }
    }, [navigation, isAdmin]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'ships'), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setShips(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.cardWrapper}
            onPress={() => navigation.navigate('AddShip', { ship: item, userRole })}
        >
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>IMO No:</Text>
                    <Text style={styles.value}>{item.imo}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Liman:</Text>
                    <Text style={styles.value}>{item.port}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Kaptan:</Text>
                    <Text style={styles.value}>{item.captain}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Gemi Listesi</Text>
            <Text style={styles.headerSubtitle}>
                Kayıtlı gemileri görüntüleyebilir{isAdmin ? ' ve düzenleyebilirsiniz.' : '.'}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4EDCC4" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={ships}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz bir gemi eklenmemiş.</Text>
                    </View>
                }
            />

            {isAdmin && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddShip', { userRole })}
                >
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

export default ShipList;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1c1c1e'
    },
    header: {
        padding: 20
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff'
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 4
    },
    cardWrapper: {
        marginHorizontal: 16,
        marginBottom: 12
    },
    card: {
        padding: 16,
        borderRadius: 14,
        backgroundColor: '#2a2a2d',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
        color: '#fff'
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    label: {
        fontWeight: '600',
        color: '#ccc',
        width: 90
    },
    value: {
        color: '#eee',
        flexShrink: 1
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#4EDCC4',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 4
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1e'
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100
    },
    emptyText: {
        color: '#777',
        fontSize: 16
    }
});
