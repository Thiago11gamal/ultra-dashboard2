import { useState, useEffect, useRef, useMemo } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { isAdminUser } from '../utils/adminAccess';

export function useSubscription(user) {
    const hasTokenProvider = typeof user?.getIdTokenResult === 'function';
    const isLocalUserSession = Boolean(isLocalMode && user?.uid === 'local-user');
    const isVerifiedIdentity = Boolean(import.meta.env.VITE_DEV_PREMIUM_BYPASS === 'true' || isLocalUserSession || hasTokenProvider);
    const isAdminEmail = isAdminUser(user);

    // G-17 FIX: Recalcular isDevBypass quando user muda (apenas identidades reais ou modo local explícito)
    const isDevBypass = useMemo(() =>
        import.meta.env.VITE_DEV_PREMIUM_BYPASS === 'true' ||
        import.meta.env.VITE_LOCAL_MODE === 'true' ||
        (isVerifiedIdentity && user?.uid === 'local-user') ||
        isAdminEmail,
        [user?.uid, isVerifiedIdentity, isAdminEmail]
    );

    const targetUid = user?.uid || null;
    const [subState, setSubState] = useState(() => ({
        uid: isDevBypass ? targetUid : null,
        isPremium: isDevBypass,
        loading: Boolean(!isDevBypass && targetUid && (db || hasTokenProvider)),
    }));
    const fallbackUnsubRef = useRef(null);

    useEffect(() => {
        if (isDevBypass || isAdminEmail) {
            const t = setTimeout(() => {
                setSubState({ uid: targetUid, isPremium: true, loading: false });
            }, 0);
            return () => clearTimeout(t);
        }

        if (!targetUid) {
            const t = setTimeout(() => {
                setSubState({ uid: null, isPremium: false, loading: false });
            }, 0);
            return () => clearTimeout(t);
        }

        let unsubPayments = null;
        let unsubSubscriptions = null;
        let isMounted = true;
        const pendingTimers = new Set();
        const scheduleTimeout = (fn) => {
            const id = setTimeout(() => {
                pendingTimers.delete(id);
                if (isMounted) fn();
            }, 0);
            pendingTimers.add(id);
            return id;
        };

        try {
            if (typeof user.getIdTokenResult !== 'function') {
                scheduleTimeout(() => {
                    setSubState({ uid: targetUid, isPremium: false, loading: false });
                });
                return () => {
                    isMounted = false;
                    pendingTimers.forEach(clearTimeout);
                    pendingTimers.clear();
                };
            }
            // Ler claims do token JWT (definidas server-side via Cloud Functions)
            user.getIdTokenResult(true).then((tokenResult) => {
                if (!isMounted) return;
                const claims = tokenResult.claims || {};
                const isAdminClaim = Boolean(
                    claims.admin ||
                    claims.premium ||
                    claims.plan === 'vitalicio' ||
                    claims.stripeRole === 'premium' ||
                    claims.stripeRole === 'vitalicio'
                );

                if (isAdminClaim) {
                    setSubState({ uid: targetUid, isPremium: true, loading: false });
                    return;
                }

                // Se não for admin claim, verificar pagamentos únicos e assinaturas ativas (Stripe)
                if (!db) {
                    setSubState({ uid: targetUid, isPremium: false, loading: false });
                    return;
                }

                let hasValidPayment = false;
                let hasActiveSubscription = false;
                let paymentsLoaded = false;
                let subsLoaded = false;

                const publishBillingState = () => {
                    if (!isMounted) return;
                    const isPremiumNow = hasValidPayment || hasActiveSubscription;
                    const stillLoading = !isPremiumNow && (!paymentsLoaded || !subsLoaded);
                    setSubState({ uid: targetUid, isPremium: isPremiumNow, loading: stillLoading });
                };

                const attachProfileFallback = () => {
                    const userRef = doc(db, 'users', targetUid);
                    if (!isMounted) return;
                    if (fallbackUnsubRef.current) {
                        fallbackUnsubRef.current();
                        fallbackUnsubRef.current = null;
                    }
                    fallbackUnsubRef.current = onSnapshot(userRef, (userDoc) => {
                        if (!isMounted) return;
                        const profile = userDoc.exists() ? userDoc.data() : {};
                        const premiumFromProfile = Boolean(
                            profile?.isPremium
                            || profile?.premium
                            || profile?.subscription?.active,
                        );
                        setSubState({ uid: targetUid, isPremium: premiumFromProfile, loading: false });
                    }, (_profileErr) => {
                        if (!isMounted) return;
                        setSubState({ uid: targetUid, isPremium: false, loading: false });
                    });
                    if (!isMounted && fallbackUnsubRef.current) {
                        fallbackUnsubRef.current();
                        fallbackUnsubRef.current = null;
                    }
                };

                const paymentsRef = collection(db, 'customers', targetUid, 'payments');
                const qPayments = query(paymentsRef, where('status', '==', 'succeeded'));

                const subsRef = collection(db, 'customers', targetUid, 'subscriptions');
                const qSubs = query(subsRef, where('status', 'in', ['active', 'trialing']));

                if (!isMounted) return;
                unsubPayments = onSnapshot(qPayments, (snapshot) => {
                    if (!isMounted) return;
                    let validFound = false;
                    snapshot.forEach((paymentDoc) => {
                        const data = paymentDoc.data() || {};
                        const amount = Number(data.amount || 0);
                        const refundedAmount = Number(data.amount_refunded || 0);
                        const isFullyRefunded = Boolean(data.refunded) || (amount > 0 && refundedAmount >= amount);
                        if (data.status === 'succeeded' && !isFullyRefunded) {
                            validFound = true;
                        }
                    });
                    hasValidPayment = validFound;
                    paymentsLoaded = true;
                    publishBillingState();
                }, (error) => {
                    if (!isMounted) return;
                    console.error('[Stripe] Erro ao buscar pagamentos:', error);
                    paymentsLoaded = true;
                    if (error?.code === 'permission-denied') {
                        attachProfileFallback();
                        return;
                    }
                    publishBillingState();
                });

                unsubSubscriptions = onSnapshot(qSubs, (snapshot) => {
                    if (!isMounted) return;
                    let activeFound = false;
                    snapshot.forEach((subDoc) => {
                        const data = subDoc.data() || {};
                        if (data.status === 'active' || data.status === 'trialing') {
                            activeFound = true;
                        }
                    });
                    hasActiveSubscription = activeFound;
                    subsLoaded = true;
                    publishBillingState();
                }, (error) => {
                    if (!isMounted) return;
                    console.error('[Stripe] Erro ao buscar assinaturas:', error);
                    subsLoaded = true;
                    if (error?.code === 'permission-denied' && !fallbackUnsubRef.current) {
                        attachProfileFallback();
                        return;
                    }
                    publishBillingState();
                });

                if (!isMounted) {
                    if (unsubPayments) { unsubPayments(); unsubPayments = null; }
                    if (unsubSubscriptions) { unsubSubscriptions(); unsubSubscriptions = null; }
                }

            }).catch(() => {
                if (!isMounted) return;
                setSubState({ uid: targetUid, isPremium: false, loading: false });
            });
        } catch {
            scheduleTimeout(() => {
                setSubState({ uid: targetUid, isPremium: false, loading: false });
            });
        }

        return () => {
            isMounted = false;
            pendingTimers.forEach(clearTimeout);
            pendingTimers.clear();
            if (unsubPayments) unsubPayments();
            if (unsubSubscriptions) unsubSubscriptions();
            if (fallbackUnsubRef.current) {
                fallbackUnsubRef.current();
                fallbackUnsubRef.current = null;
            }
        };
    }, [user, targetUid, isDevBypass, isAdminEmail]);

    if (isDevBypass) return { isPremium: true, loading: false };
    if (!targetUid) return { isPremium: false, loading: false };
    if (!db && !hasTokenProvider) {
        console.warn('[Stripe] Firestore indisponível. Mantendo modo não premium.');
        return { isPremium: false, loading: false };
    }
    if (subState.uid !== targetUid) {
        return { isPremium: false, loading: true };
    }

    return { isPremium: subState.isPremium, loading: subState.loading };
}

