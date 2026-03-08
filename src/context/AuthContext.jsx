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
                console.warn('[Auth] onAuthStateChanged demorou para responder. Liberando app sem sessão.');
                setShowDebug(true);
                // No longer forcing setLoading(false) here to allow user to see diagnostic info first
            }
        }, 5000);

        if (!auth) {
            console.warn('[Auth] Auth service is missing. Bypassing state listener.');
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
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0f1016] text-white p-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 animate-pulse">Carregando contexto de segurança...</p>
                    </div>

                    {showDebug && (
                        <div className="mt-12 p-6 bg-slate-900/50 border border-white/10 rounded-xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-400 rounded-full animate-ping"></span>
                                Diagnóstico de Produção
                            </h3>
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-slate-500">API_KEY:</span>
                                    <span className={import.meta.env.VITE_API_KEY ? "text-green-400" : "text-red-400"}>
                                        {import.meta.env.VITE_API_KEY ? "CONFIGURADO" : "AUSENTE"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-slate-500">PROJECT_ID:</span>
                                    <span className={import.meta.env.VITE_PROJECT_ID ? "text-green-400" : "text-red-400"}>
                                        {import.meta.env.VITE_PROJECT_ID ? "CONFIGURADO" : "AUSENTE"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-slate-500">APP_ID:</span>
                                    <span className={import.meta.env.VITE_APP_ID ? "text-green-400" : "text-red-400"}>
                                        {import.meta.env.VITE_APP_ID ? "CONFIGURADO" : "AUSENTE"}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 mb-4 italic">
                                Se houver itens "AUSENTES" acima, você precisa configurar as Environment Variables no seu painel de deploy.
                            </p>

                            <button
                                onClick={() => setLoading(false)}
                                className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded text-purple-300 text-xs font-bold transition-all"
                            >
                                Pular Carregamento (Debug Force)
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
