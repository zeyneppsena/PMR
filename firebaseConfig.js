import { initializeApp, getApps } from '@firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyAX-xhM64rYYlfPp-6xuibmzD6fo0o74E0",
    authDomain: "pmar-33256.firebaseapp.com",
    projectId: "pmar-33256",
    storageBucket: "pmar-33256.firebasestorage.app",
    messagingSenderId: "906068760844",
    appId: "1:906068760844:web:261d9c16dd4a9dd844d129",
    measurementId: "G-W7C6JV6Q57"
};

// Firebase uygulaması zaten başlatıldıysa tekrar başlatma
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth zaten varsa tekrar initialize etme
let auth;
try {
    auth = getAuth(app);
} catch (e) {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
}

const db = getFirestore(app);

export { app, auth, db };
