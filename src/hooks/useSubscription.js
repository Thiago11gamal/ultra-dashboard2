import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

export function useSubscription(user) {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Opção 2: Lista de Administradores com acesso vitalício garantido
        const ADMIN_UIDS = [
            'F4Py5tJoRjQmXTSPE6vQUX3th662',
        ];

        const isAdmin = user && ADMIN_UIDS.includes(user.uid);

        if (isAdmin) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsPremium(true);
            setLoading(false);
            return;
        }

        if (!user || !user.uid) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        if (!db) {
            console.warn('[Stripe] Firestore indisponível. Mantendo modo não premium.');
            setIsPremium(false);
            setLoading(false);
            return;
        }

        // Alterado para 'payments' para buscar compras únicas (One-Time / PIX)
        const paymentsRef = collection(db, 'customers', user.uid, 'payments');
        // Buscamos apenas os pagamentos confirmados
        const q = query(paymentsRef, where('status', '==', 'succeeded'));

        let unsubscribeFallback = null;
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setIsPremium(false);
                setLoading(false);
                return;
            }

            // BIZ-01 fix: produto é compra única (PIX/one-time), não assinatura recorrente.
            // Qualquer pagamento confirmado concede acesso vitalício.
            let hasValidPayment = false;

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'succeeded') {
                    hasValidPayment = true;
                }
            });

            setIsPremium(hasValidPayment);
            setLoading(false);
        }, (error) => {
            console.error("[Stripe] Erro ao buscar pagamentos:", error);

            // Fallback defensivo: se a coleção de pagamentos estiver bloqueada por regras,
            // tenta ler o perfil do usuário com uma flag de premium no próprio documento.
            if (error?.code === 'permission-denied') {
                const userRef = doc(db, 'users', user.uid);
                unsubscribeFallback = onSnapshot(userRef, (userDoc) => {
                    const profile = userDoc.exists() ? userDoc.data() : {};
                    const premiumFromProfile = Boolean(
                        profile?.isPremium ||
                        profile?.premium ||
                        profile?.subscription?.active
                    );
                    setIsPremium(premiumFromProfile);
                    setLoading(false);
                }, (profileErr) => {
                    console.error('[Stripe] Falha no fallback de perfil:', profileErr);
                    setIsPremium(false);
                    setLoading(false);
                });
                return;
            }

            setIsPremium(false);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (unsubscribeFallback) unsubscribeFallback();
        };
    }, [user]);

    return { isPremium, loading };
}
