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
    // Diagnóstico de Produção v1.1
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    function signup(email, password, name) {
        if (!auth) return Promise.reject(new Error("Auth service is not available. Please check environment variables."));
        return createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                setCurrentUser(userCredential.user);
                return userCredential.user;
            });
    }

    function login(email, password) {
        if (!auth) return Promise.reject(new Error("Auth service is not available."));
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        if (!auth) return Promise.resolve();
        return signOut(auth);
    }

    useEffect(() => {
        let hasResolvedAuth = false;

        const loadingTimeout = setTimeout(() => {
            if (!hasResolvedAuth) {
                console.warn('[Auth] O Firebase está a demorar. Por favor, aguarde...');
                setShowDebug(true);
                // FIX: Removido setLoading(false) para evitar bypass de segurança
            }
        }, 8000);

        if (!auth) {
            console.warn('[Auth] Auth service is missing. Bypassing state listener.');
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            hasResolvedAuth = true;
            clearTimeout(loadingTimeout);

            if (user) {
                console.debug("[Auth] Usuário conectado:", user.email);
            } else {
                console.debug("[Auth] Nenhum usuário conectado.");
            }
            setCurrentUser(user);
            setLoading(false);
        }, (error) => {
            hasResolvedAuth = true;
            clearTimeout(loadingTimeout);
            console.error("[Auth] Erro Crítico no Firebase Auth:", error.code, error.message);
            setLoading(false);
        });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, []);

    const value = {
        currentUser,
        loading,
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
