
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MaintenanceList = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Bakım Listesi Sayfası</Text>
        </View>
    );
};

export default MaintenanceList;

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
