import { useState, useCallback, useEffect } from 'react';
import { getLevelFromXP } from '../utils/gamification';

export const useGamification = (showToast) => { // Accept showToast
    const [levelUpData, setLevelUpData] = useState(null);

    useEffect(() => {
        const handleLevelUp = (e) => {
            setLevelUpData(e.detail);
            // Optional: could trigger toast here too if needed
            // if (showToast) showToast(e.detail.title, 'success');
        };
        window.addEventListener('level-up', handleLevelUp);
        return () => window.removeEventListener('level-up', handleLevelUp);
    }, [showToast]);

    const applyGamification = useCallback((currentData, xpAmount) => {
        const oldXp = currentData.user.xp || 0;
        const newXp = Math.max(0, oldXp + xpAmount);

        // ✅ NIVELAMENTO PROGRESSIVO
        const newLevel = getLevelFromXP(newXp);
        const oldLevel = getLevelFromXP(oldXp);

        // NOTE: Side effects (window.dispatchEvent) should ideally not be here 
        // if this is used inside state setters. We rely on the store's 
        // processGamification for events now to avoid race conditions.

        return {
            ...currentData,
            user: {
                ...currentData.user,
                xp: newXp,
                level: newLevel
            }
        };
    }, []);

    const closeLevelUpToast = useCallback(() => {
        setLevelUpData(null);
    }, []);

    return {
        applyGamification,
        levelUpData,
        closeLevelUpToast
    };
};
