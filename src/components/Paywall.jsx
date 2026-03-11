import React, { useState } from 'react';
import { Lock, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

// Insira a chave pública que você forneceu
const stripePromise = loadStripe("pk_live_51T9dWWFOUB7khZQdScYwgc2kgKeH0gs6kQYqmJN79PHNQoGEWtD6W9yGSQBBrfzZFPfv00lbmZn7n5jhq8vNoYJ800JcXlq3qQ");

export default function Paywall({ user, onLogout }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubscribe = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("[Stripe] Criando sessão para:", user.uid);
            
            // Se estiver usando o Firebase Stripe Extension, criamos um documento de sessão:
            const checkoutRefs = collection(db, 'customers', user.uid, 'checkout_sessions');
            const docRef = await addDoc(checkoutRefs, {
                line_items: [
                    {
                        price: 'price_1T9ewlFOUB7khZQdnFYtD0g2',
                        quantity: 1,
                    },
                ],
                success_url: window.location.origin,
                cancel_url: window.location.origin,
                mode: 'payment' // 👈 Garante o suporte ao Pagamento Único
            });

            console.log("[Stripe] Documento criado com ID:", docRef.id);

            let isResolved = false;

            // Timer de segurança: Se a extensão não funcionar em 12s, desarma a tela.
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    console.error("[Stripe] Timeout atingido. A extensão não respondeu.");
                    setError("O servidor de pagamentos não respondeu. Verifique se a extensão 'Run Payments with Stripe' está instalada e configurada para observar a coleção 'customers'.");
                    setLoading(false);
                }
            }, 12000);

            // Aguardar a extensão popular a sessão
            onSnapshot(docRef, async (snap) => {
                const data = snap.data();
                if (!data) return;

                console.log("[Stripe] Atualização do Firebase:", data);

                const { error, sessionId, url } = data;

                if (error) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    setError(`Erro da Stripe: ${error.message}`);
                    setLoading(false);
                }
                
                if (url) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    console.log("[Stripe] Redirecionando via URL...");
                    window.location.assign(url);
                } else if (sessionId) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    console.log("[Stripe] Redirecionando via SessionId...");
                    const stripe = await stripePromise;
                    stripe.redirectToCheckout({ sessionId });
                }
            });
        } catch (err) {
            console.error("[Stripe] Erro Crítico:", err);
            setError(`Falha local: ${err.message || 'Erro de conexão com Firebase.'}`);
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-200 z-[9999]"
            style={{
                backgroundImage: `url('/bg-criador.webp')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Dark Overlay Escuro Sobre a Foto - Mantém a leitura 100% nítida */}
            <div className="absolute inset-0 bg-[#0a0f1e]/85 backdrop-blur-[2px]" />

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none z-0" />

            <div className="relative z-10 max-w-lg w-full">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_-15px_rgba(99,102,241,0.3)] text-center">
                    
                    <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Lock className="w-10 h-10 text-indigo-400" />
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                        Acesso Ultra <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Premium</span>
                    </h1>
                    
                    <p className="text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">
                        O seu período gratuito terminou ou o passe anterior venceu. Adquira 30 dias de acesso completo e turbine a sua aprovação agora mesmo.
                    </p>

                    <div className="space-y-4 mb-8 text-left bg-slate-950/50 rounded-2xl p-5 border border-slate-800">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-300">Inteligência Artificial (Motor Bayesiano)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-300">Simulação Monte Carlo com Previsão</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-300">Sincronização na Nuvem em Tempo Real</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-300">Relatórios Ilimitados (Vazamentos & Curva)</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all outline-none flex items-center justify-center gap-2 group relative overflow-hidden"
                    >
                        {loading ? (
                            <span className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full"></span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>Liberar Acesso (30 Dias)</span>
                            </span>
                        )}
                    </button>
                    {loading && <p className="mt-4 text-xs text-indigo-400 animate-pulse">Preparando ambiente seguro na nuvem...</p>}
                    
                    <div className="mt-4">
                        <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold tracking-wider">
                            <span>Sair da Conta</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
