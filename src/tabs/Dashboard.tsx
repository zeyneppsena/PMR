// ./tabs/Dashboard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Dashboard = () => (
    <View style={styles.container}>
        <Text style={styles.text}>Dashboard İçeriği Buraya</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1c1c1e' },
    text: { color: '#fff', fontSize: 18 },
});

export default Dashboard;
