
/**
 * SCRIPT DE RESGATE ULTRA - MODO FIRESTORE
 * Instruções: 
 * 1. Abra o Ultra Dashboard 2.
 * 2. Pressione F12 -> Console.
 * 3. Copie e cole este código INTEIRO.
 * 4. Pressione Enter.
 */

async function resgatarBackupDoFirestore() {
    console.log("[Rescue] Iniciando resgate via Firestore...");
    
    // O ID que você achou no print: 291jO0zyhCeHAM4RylpwFiSO0C3
    const backupId = "291jO0zyhCeHAM4RylpwFiSO0C3";
    
    try {
        // Tentamos acessar o banco diretamente pela instância ativa no app
        const { db } = await import('./src/services/firebase.js').catch(() => ({ db: window.db }));
        const { doc, getDoc } = await import('firebase/firestore');

        if (!db) {
            throw new Error("Não consegui encontrar a conexão com o banco. O app está aberto?");
        }

        const docRef = doc(db, 'backups', backupId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            throw new Error("Snapshot não encontrado no Firestore. Verifique o ID.");
        }

        const backupData = snap.data();
        console.log("[Rescue] Dados localizados! Tamanho:", JSON.stringify(backupData).length);

        // SMART-DETECTION: Detect if user passed the whole Zustand wrap or just the appState
        let finalAppState = backupData.state?.appState || backupData.appState || backupData;
        
        // Basic validation: appState should have 'contests' or 'activeId'
        if (!finalAppState.contests && !finalAppState.activeId) {
            console.warn("[Rescue] Formato suspeito. Dados podem estar incompletos.");
        }

        // Backup de segurança do que temos agora
        const current = localStorage.getItem('ultra-dashboard-storage');
        localStorage.setItem('ultra-dashboard-storage-OLD-' + Date.now(), current);

        // Injeção Direta no formato esperado pelo Zustand
        const stateToInject = {
            state: { appState: finalAppState },
            version: 1
        };

        localStorage.setItem('ultra-dashboard-storage', JSON.stringify(stateToInject));
        localStorage.setItem('ultra-dashboard-data', JSON.stringify(finalAppState));
        
        console.log("[Rescue] SUCESSO! Dados injetados. Recarregando em 2 segundos...");
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (err) {
        console.error("[Rescue] Falha no resgate:", err);
        alert("Erro no resgate: " + err.message);
    }
}

resgatarBackupDoFirestore();
