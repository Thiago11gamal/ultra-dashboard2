import React from 'react';

export const RescueButton = ({ currentUid }) => {
    const handleRescue = async () => {
        if (!currentUid) {
            alert("Erro: Você não está logado no firebase neste dispositivo.");
            return;
        }
        try {
            const { db } = await import('../services/firebase.js');
            const { doc, getDoc } = await import('firebase/firestore');
            
            const backupId = currentUid;
            const docRef = doc(db, 'backups', backupId);
            const snap = await getDoc(docRef);
            
            if (!snap.exists()) {
                // Try from 'users' collection instead as fallback
                const userRef = doc(db, 'users', backupId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    injectData(userSnap.data());
                    return;
                }
                alert("Nenhum dado encontrado no Firestore para o UID fornecido.");
                return;
            }
            
            injectData(snap.data());
        } catch (err) {
            console.error(err);
            alert("Erro ao tentar resgatar: " + err.message);
        }
    };

    const injectData = (backupData) => {
        const finalAppState = backupData.state?.appState || backupData.appState || backupData;
        const current = localStorage.getItem('ultra-dashboard-storage');
        localStorage.setItem('ultra-dashboard-storage-OLD-' + Date.now(), current);
        
        const stateToInject = {
            state: { appState: finalAppState },
            version: 1
        };
        
        localStorage.setItem('ultra-dashboard-storage', JSON.stringify(stateToInject));
        localStorage.setItem('ultra-dashboard-data', JSON.stringify(finalAppState));
        alert("DADOS RESGATADOS COM SUCESSO! A página vai recarregar.");
        window.location.reload();
    };

    return (
        <button 
            onClick={handleRescue}
            style={{
                position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
                padding: '12px 24px', backgroundColor: '#ef4444', color: 'white',
                fontWeight: 'bold', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer'
            }}
        >
            🚨 CLIQUE AQUI PARA RESGATAR DADOS AGORA 🚨
        </button>
    );
};
