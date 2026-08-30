import { useState, useEffect, useRef } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

export function useSubscription(user) {
  const isDevBypass = import.meta.env.VITE_DEV_PREMIUM_BYPASS === 'true';

  const [isPremium, setIsPremium] = useState(isDevBypass);
  const [loading, setLoading] = useState(!isDevBypass);
  const fallbackUnsubRef = useRef(null);

  useEffect(() => {
    if (isDevBypass) {
        setIsPremium(true);
        setLoading(false);
        return;
    }
    
    if (!user?.uid) { 
        setIsPremium(false); 
        setLoading(false); 
        return; 
    }
    
    let unsub = null;
    let isMounted = true;

    try {
      // Ler claims do token JWT (definidas server-side via Cloud Functions)
      user.getIdTokenResult(true).then((tokenResult) => {
        if (!isMounted) return;
        const claims = tokenResult.claims || {};
        const isAdminClaim = Boolean(claims.admin || claims.premium || claims.plan === 'vitalicio');
        
        if (isAdminClaim) {
            setIsPremium(true);
            setLoading(false);
            return;
        }

        // Se não for admin claim, verificar pagamentos (Stripe)
        if (!db) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        const paymentsRef = collection(db, 'customers', user.uid, 'payments');
        const q = query(paymentsRef, where('status', '==', 'succeeded'));

        unsub = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
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
            if (!isMounted) return;
            console.error('[Stripe] Erro ao buscar pagamentos:', error);

            if (error?.code === 'permission-denied') {
                const userRef = doc(db, 'users', user.uid);
                fallbackUnsubRef.current = onSnapshot(userRef, (userDoc) => {
                    if (!isMounted) return;
                    const profile = userDoc.exists() ? userDoc.data() : {};
                    const premiumFromProfile = Boolean(
                        profile?.isPremium
                        || profile?.premium
                        || profile?.subscription?.active,
                    );
                    setIsPremium(premiumFromProfile);
                    setLoading(false);
                }, (profileErr) => {
                    if (!isMounted) return;
                    setIsPremium(false);
                    setLoading(false);
                });
                return;
            }

            setIsPremium(false);
            setLoading(false);
        });

      }).catch(() => { 
          if (!isMounted) return;
          setIsPremium(false); 
          setLoading(false); 
      });
    } catch {
      if (!isMounted) return;
      setIsPremium(false);
      setLoading(false);
    }

    return () => { 
        isMounted = false;
        if (unsub) unsub(); 
        if (fallbackUnsubRef.current) {
            fallbackUnsubRef.current();
            fallbackUnsubRef.current = null;
        }
    };
  }, [user?.uid, isDevBypass]);

  if (isDevBypass) return { isPremium: true, loading: false };
  if (!user?.uid) return { isPremium: false, loading: false };
  if (!db) {
      console.warn('[Stripe] Firestore indisponível. Mantendo modo não premium.');
      return { isPremium: false, loading: false };
  }

  return { isPremium, loading };
}

