import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MaintenanceEntry = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Bakım Girişi Sayfası</Text>
        </View>
    );
};

export default MaintenanceEntry;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        fontSize: 18
    }
});
