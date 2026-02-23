import React, { useState, useEffect } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import { auth } from "../services/firebase";
import { AuthContext } from "./AuthContextValue";


export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function signup(email, password, name) {
        return createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // Update profile with name immediately after signup
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                return userCredential.user;
            });
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        console.log("AuthContext: useEffect mounted, setting up onAuthStateChanged");
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("AuthContext: onAuthStateChanged fired, user:", user?.email || "null");
            setCurrentUser(user);
            setLoading(false);
        }, (error) => {
            console.error("AuthContext: Auth Error", error);
            setLoading(false);
        });

        return () => {
            console.log("AuthContext: useEffect unmounted");
            unsubscribe();
        }
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex h-screen w-full items-center justify-center bg-[#0f1016] text-white">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 animate-pulse">Carregando...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
