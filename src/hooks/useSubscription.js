import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useSubscription(user) {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Bypass: Desenvolvimento local ou Dispositivos Móveis
        if (import.meta.env.DEV || (typeof window !== 'undefined' && window.innerWidth < 768)) {
            setIsPremium(true);
            setLoading(false);
            return;
        }

        if (!user || !user.uid) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        // Alterado para 'payments' para buscar compras únicas (One-Time / PIX)
        const paymentsRef = collection(db, 'customers', user.uid, 'payments');
        // Buscamos apenas os pagamentos confirmados
        const q = query(paymentsRef, where('status', '==', 'succeeded'));

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
            setIsPremium(false);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { isPremium, loading };
}
