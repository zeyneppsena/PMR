import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RepairEntry = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Arıza Girişi Sayfası</Text>
        </View>
    );
};

export default RepairEntry;

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
