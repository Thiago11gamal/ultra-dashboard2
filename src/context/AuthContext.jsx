import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import { auth, isLocalMode } from "../services/firebase";
import { AuthContext } from "./AuthContextValue";
import { useAppStore } from "../store/useAppStore";


export function AuthProvider({ children }) {
    // Diagnóstico de Produção v1.1
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    // BUG-04 FIX: Wrap auth functions in useCallback to stabilize context value
    const signup = useCallback((email, password, name) => {
        if (!auth || isLocalMode) return Promise.reject(new Error("Auth service is not available. Please check environment variables."));
        return createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // BUG-FIX: A atualização de perfil é assíncrona no Firebase
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                // Força o reload para que o token reflita o displayName
                await userCredential.user.reload();
                // BUG 4 FIX: A race condition do onAuthStateChanged exige o set manual aqui
                // após o profile update e reload para garantir displayName imediato.
                setCurrentUser({ ...auth.currentUser });
                return auth.currentUser;
            });
    }, []);

    const login = useCallback((email, password) => {
        if (isLocalMode) {
            const fakeUser = {
                uid: 'local-user',
                email: email || 'local@example.com',
                displayName: 'Usuário Local',
                emailVerified: true
            };
            setCurrentUser(fakeUser);
            return Promise.resolve(fakeUser);
        }
        if (!auth) return Promise.reject(new Error("Auth service is not available."));
        return signInWithEmailAndPassword(auth, email, password);
    }, []);

    const logout = useCallback(async () => {
        if (!auth || isLocalMode) return Promise.resolve();
        await signOut(auth);
        
        // 🎯 DATA LEAK PROTECTION: Limpa a memória RAM do app imediatamente após o logout
        useAppStore.getState().resetStore();
        if (useAppStore.temporal) {
            useAppStore.temporal.getState().clear();
        }
    }, []);

    useEffect(() => {
        let hasResolvedAuth = false;

        const loadingTimeout = setTimeout(() => {
            if (!hasResolvedAuth) {
                console.warn('[Auth] Timeout de rede detectado.');
                setShowDebug(true);
                // FIX: Permite que a app renderize mesmo em erro para mostrar feedback ao user
                setLoading(false);
            }
        }, 10000);

        if (!auth || isLocalMode) {
            console.warn('[Auth] Auth service is missing or in Local Mode. Bypassing state listener.');
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            hasResolvedAuth = true;
            clearTimeout(loadingTimeout);
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

    // BUG-04 FIX: Memoize context value to prevent re-rendering all consumers
    // when AuthProvider re-renders for unrelated reasons.
    const value = useMemo(() => ({
        currentUser,
        loading,
        signup,
        login,
        logout,
        showDebug
    }), [currentUser, loading, signup, login, logout, showDebug]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
