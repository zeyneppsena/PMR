import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    SectionList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/*──────── Palette ────────*/
const COLORS = {
    bg: '#121212',
    surface: '#1E1E1E',
    accent: '#4ECDC4',
    warn: '#e57373',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#313131',
    overlay: 'rgba(0,0,0,0.7)',
};

const ShipList = ({ navigation, userRole }) => {
    const isAdmin = userRole === 'main-admin';
    const [ships, setShips] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);


    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'ships'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setShips(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const buildSections = useCallback(() => {
        const filtered = ships.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
        const grouped = filtered.reduce((acc, ship) => {
            const key = ship.port || 'Diğer';
            if (!acc[key]) acc[key] = [];
            acc[key].push(ship);
            return acc;
        }, {});
        const secs = Object.keys(grouped).map(port => ({
            title: port,
            data: grouped[port].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        setSections(secs);
    }, [ships, search]);

    useEffect(() => {
        buildSections();
    }, [ships, search]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    };

    const deleteShip = async (id) => {
        Alert.alert('Emin misiniz?', 'Bu gemi silinecek.', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'ships', id));
                        Alert.alert('Silindi', 'Gemi silindi.');
                    } catch (err) {
                        console.error(err);
                        Alert.alert('Hata', 'Silme sırasında hata oluştu.');
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
                <Ionicons name="boat-outline" size={20} color={COLORS.accent} />
                <Text style={styles.itemTitle}>{item.name}</Text>
                {isAdmin && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => navigation.navigate('AddShip', { ship: item, userRole })}>
                            <Ionicons name="create-outline" size={18} color={COLORS.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteShip(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.warn} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.row}>
                <Ionicons name="barcode-outline" size={16} color={COLORS.accent} />
                <Text style={styles.itemText}>IMO: {item.imo}</Text>
            </View>
        </View>
    );

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={16} color={COLORS.accent} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TextInput
                placeholder="Gemi ara..."
                placeholderTextColor={COLORS.textSecondary}
                style={styles.searchBar}
                value={search}
                onChangeText={setSearch}
            />
            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: COLORS.textSecondary }}>Eşleşen gemi bulunamadı.</Text>
                    </View>
                }
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            />
            {isAdmin && (
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddShip', { userRole })}>
                    <Ionicons name="add" size={30} color={COLORS.textPrimary} />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

export default ShipList;

/*──────── Styles ────────*/
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchBar: {
        backgroundColor: COLORS.surface,
        color: COLORS.textPrimary,
        margin: 16,
        borderRadius: 10,
        paddingHorizontal: 16,
        height: 44,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
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
    itemTitle: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '600',
        flexShrink: 1,
    },
    headerActions: {
        flexDirection: 'row',
        marginLeft: 'auto',
        gap: 14,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    itemText: { color: COLORS.textSecondary, fontSize: 13 },
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
});
