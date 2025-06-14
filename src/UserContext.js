import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState({
        isUserLoggedIn: false,
        userName: '',
        shipId: '',
        email: '',
        uid: '',
        role: '', // 🔥 role alanı eklendi
    });

    useEffect(() => {
        const auth = getAuth();
        const firestore = getFirestore();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userRef = doc(firestore, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(userRef);

                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        setUser({
                            isUserLoggedIn: true,
                            userName: userData.name,
                            shipId: userData.shipId,
                            email: userData.email,
                            uid: firebaseUser.uid,
                            role: userData.role || 'gemi-personeli', // 🔒 varsayılan role
                        });
                    } else {
                        console.error("Kullanıcı dokümanı bulunamadı.");
                    }
                } catch (error) {
                    console.error("Kullanıcı verisi alınamadı:", error);
                }
            } else {
                setUser({
                    isUserLoggedIn: false,
                    userName: '',
                    email: '',
                    uid: '',
                    role: '',
                    shipId: '',
                });
            }
        });

        return () => unsubscribe(); // cleanup
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
