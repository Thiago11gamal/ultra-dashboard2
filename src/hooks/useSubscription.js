import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useSubscription(user) {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Coloque seu email aqui para ter acesso grátis vitalício na produção
        const ADMIN_EMAILS = ['thiago11gamal@gmail.com', 'antunest040@gmail.com'];

        // Bypass: Desenvolvimento local OU se o email do usuário for administrador
        const normalizedUserEmail = user?.email?.trim().toLowerCase();
        if (import.meta.env.DEV || (normalizedUserEmail && ADMIN_EMAILS.includes(normalizedUserEmail))) {
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

            // Pega a data atual em segundos
            const now = Math.floor(Date.now() / 1000);
            const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

            let hasValidPayment = false;

            snapshot.forEach((doc) => {
                const data = doc.data();
                // A extensão Stripe normalmente salva o 'created' em segundos (Unix timestamp)
                // ou como um Timestamp nativo do Firestore (data.created.seconds)
                let createdSeconds = 0;

                if (data.created && typeof data.created === 'number') {
                    createdSeconds = data.created;
                } else if (data.created && data.created.seconds) {
                    createdSeconds = data.created.seconds;
                }

                // Se a compra foi feita há menos de 30 dias, o acesso está liberado
                if (createdSeconds > 0 && (now - createdSeconds <= THIRTY_DAYS_IN_SECONDS)) {
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
