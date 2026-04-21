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
import { useAppStore } from "../store/useAppStore";


export function AuthProvider({ children }) {
    // Diagnóstico de Produção v1.1
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    function signup(email, password, name) {
        if (!auth) return Promise.reject(new Error("Auth service is not available. Please check environment variables."));
        return createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // BUG-FIX: A atualização de perfil é assíncrona no Firebase
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                // Força o reload para que o token reflita o displayName
                await userCredential.user.reload();
                // BUG 4 FIX: Não chamar setCurrentUser manualmente aqui.
                // O listener onAuthStateChanged já vai receber o evento de criação
                // de conta e atualizar o currentUser como single source of truth.
                // Chamar setCurrentUser aqui cria race condition: o estado é setado
                // com um objeto user que pode ficar stale quando o listener dispara.
                return auth.currentUser;
            });
    }

    function login(email, password) {
        if (!auth) return Promise.reject(new Error("Auth service is not available."));
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function logout() {
        if (!auth) return Promise.resolve();
        await signOut(auth);
        
        // 🎯 DATA LEAK PROTECTION: Limpa a memória RAM do app imediatamente após o logout
        useAppStore.getState().resetStore();
    }

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
