import { useState, useEffect } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

const ADMIN_UIDS = [
    'F4Py5tJoRjQmXTSPE6vQUX3th662',
];

export function useSubscription(user) {
    const isAdmin = Boolean(user?.uid && ADMIN_UIDS.includes(user.uid));
    const shouldBypassBilling = isLocalMode || isAdmin;

    const [isPremium, setIsPremium] = useState(shouldBypassBilling);
    const [loading, setLoading] = useState(!shouldBypassBilling);

    useEffect(() => {
        if (shouldBypassBilling || !user?.uid || !db) return;

        const paymentsRef = collection(db, 'customers', user.uid, 'payments');
        const q = query(paymentsRef, where('status', '==', 'succeeded'));

        let unsubscribeFallback = null;
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setIsPremium(false);
                setLoading(false);
                return;
            }

            let hasValidPayment = false;
            snapshot.forEach((paymentDoc) => {
                const data = paymentDoc.data();
                if (data.status === 'succeeded') {
                    hasValidPayment = true;
                }
            });

            setIsPremium(hasValidPayment);
            setLoading(false);
        }, (error) => {
            console.error('[Stripe] Erro ao buscar pagamentos:', error);

            if (error?.code === 'permission-denied') {
                const userRef = doc(db, 'users', user.uid);
                unsubscribeFallback = onSnapshot(userRef, (userDoc) => {
                    const profile = userDoc.exists() ? userDoc.data() : {};
                    const premiumFromProfile = Boolean(
                        profile?.isPremium
                        || profile?.premium
                        || profile?.subscription?.active,
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
    }, [shouldBypassBilling, user?.uid]);

    if (shouldBypassBilling) return { isPremium: true, loading: false };
    if (!user?.uid) return { isPremium: false, loading: false };
    if (!db) {
        console.warn('[Stripe] Firestore indisponível. Mantendo modo não premium.');
        return { isPremium: false, loading: false };
    }

    return { isPremium, loading };
}
