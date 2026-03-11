import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useSubscription(user) {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !user.uid) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        // A extensão "Run Payments with Stripe" gerencia a subcoleção 'subscriptions'
        const subscriptionsRef = collection(db, 'customers', user.uid, 'subscriptions');
        // Uma assinatura é válida se estiver 'active' ou em 'trialing'
        const q = query(subscriptionsRef, where('status', 'in', ['trialing', 'active']));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIsPremium(snapshot.docs.length > 0);
            setLoading(false);
        }, (error) => {
            console.error("[Stripe] Erro ao buscar o status de assinatura:", error);
            setIsPremium(false);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { isPremium, loading };
}
