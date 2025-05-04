import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Animated,
    Easing,
    Alert,
    Platform,
    StyleSheet
} from 'react-native';
import { getAuth, signInWithEmailAndPassword } from '@firebase/auth';
import { app } from '../firebaseConfig';
import Icon from 'react-native-vector-icons/FontAwesome';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const Login = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Opacity ve scale animasyon değerleri
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    // Bileşen ilk render olduğunda animasyon başlat
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 800,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        try {
            const auth = getAuth(app);
            await signInWithEmailAndPassword(auth, email, password);
            navigation.navigate('Home'); // Giriş başarılıysa yönlendirilecek ekran
        } catch (error) {
            let errorMessage = '';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'User not found. Please check your email.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email. Please provide a valid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Your account has been disabled. Please contact support.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many unsuccessful login attempts. Please try again later.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid credentials. Please check your email and password.';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = 'The email address is already in use by another account.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'The password is too weak. Please choose a stronger password.';
                    break;
                default:
                    errorMessage = `Unexpected error: ${error.code}`;
            }

            Alert.alert('Error', errorMessage);
        }
    };

    return (
        <KeyboardAwareScrollView
            style={styles.flexContainer}
            enableOnAndroid
            enableAutomaticScroll={Platform.OS === 'ios'}
            contentContainerStyle={styles.scrollContainer}
        >
            <View style={styles.darkBackgroundContainer}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity,
                            transform: [{ scale }]
                        },
                    ]}
                >
                    {/* Üst Başlık */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.mainTitle}>PLANNED MAINTENANCE</Text>
                        <Text style={styles.mainTitle}>and REPAIR</Text>
                    </View>

                    {/* Giriş Formu */}
                    <View style={styles.loginContainer}>
                        <Text style={styles.title}>Login</Text>

                        <View style={styles.inputContainer}>
                            <Icon name="envelope" size={20} color="#ccc" style={styles.icon}/>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#666"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Icon name="lock" size={25} color="#ccc" style={styles.icon}/>
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#666"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                            />
                            <TouchableOpacity
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                            >
                                <Icon
                                    name={isPasswordVisible ? 'eye-slash' : 'eye'}
                                    size={20}
                                    color="#ccc"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Giriş Butonu */}
                        <TouchableOpacity
                            style={[styles.button, styles.loginButton]}
                            onPress={handleLogin}
                        >
                            <Text style={styles.buttonText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    flexContainer: {
        flex: 1,
        backgroundColor: '#1c1c1e', // Harici kaydırma arka planı da koyu
    },
    scrollContainer: {
        flexGrow: 1,
    },
    darkBackgroundContainer: {
        flex: 1,
        backgroundColor: '#1c1c1e', // Koyu arka plan
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    headerContainer: {
        marginBottom: 25,
        alignItems: 'center',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#fff',
        letterSpacing: 1,
        marginBottom: 5,
    },
    loginContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '85%',
        marginBottom: 12,
        borderWidth: 1,
        borderRadius: 20,
        borderColor: '#3a3a3c',
        backgroundColor: '#2c2c2e',
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 45,
        fontSize: 16,
        color: '#fff',   // metin rengi beyaz
    },
    button: {
        width: '85%',
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        elevation: 3,
    },
    loginButton: {
        backgroundColor: '#4ECDC4', // vurgu rengi
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default Login;
