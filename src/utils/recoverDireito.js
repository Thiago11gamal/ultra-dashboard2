
/**
 * ULTRA RESCUE SCRIPT - RECONSTRUÇÃO DO CONCURSO "DIREITO"
 * ---------------------------------------------------------
 * Como usar:
 * 1. Abra o Ultra Dashboard 2 no seu navegador.
 * 2. Pressione F12 -> Aba "Console".
 * 3. Cole o código abaixo e pressione Enter.
 */

async function recoverDireitoContest() {
    console.log("%c[Ultra-Rescue] Iniciando resgate do concurso 'Direito'...", "color: #a855f7; font-weight: bold;");

    try {
        // Importar as ferramentas necessárias da instância do app
        const { db, auth } = await import('/src/services/firebase.js').catch(() => ({ 
            db: window.db, 
            auth: window.auth 
        }));
        const { doc, getDoc } = await import('firebase/firestore');

        const user = auth?.currentUser;
        if (!user) {
            throw new Error("Usuário não autenticado. Por favor, faça login primeiro.");
        }

        console.log(`[Rescue] Buscando backup para UID: ${user.uid}...`);
        const docRef = doc(db, 'backups', user.uid);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            throw new Error("Nenhum backup encontrado no Firebase para este usuário.");
        }

        const cloudData = snap.data();
        const contests = cloudData.contests || {};
        
        // Localizar o concurso "Direito" (pela chave ou pelo nome do usuário no concurso)
        const entries = Object.entries(contests);
        const targetEntry = entries.find(([id, c]) => 
            id === 'Direito' || 
            (c.user && c.user.name === 'Direito') ||
            (c.name === 'Direito')
        );

        if (!targetEntry) {
            console.warn("[Rescue] Concurso 'Direito' não encontrado no backup da nuvem.");
            const available = entries.map(([id, c]) => c.user?.name || id).join(", ");
            throw new Error(`Concurso 'Direito' não localizado. Concursos disponíveis: ${available}`);
        }

        const [direitoId, direitoData] = targetEntry;
        console.log(`%c[Rescue] SUCESSO! Concurso 'Direito' localizado (ID: ${direitoId}).`, "color: #22c55e; font-weight: bold;");

        // Obter o estado local atual
        const localRaw = localStorage.getItem('ultra-dashboard-storage');
        if (!localRaw) {
            throw new Error("Estado local não encontrado. O app está configurado?");
        }

        const localWrapped = JSON.parse(localRaw);
        const localState = localWrapped.state.appState;

        // Injetar o concurso "Direito" no estado local
        if (!localState.contests) localState.contests = {};
        localState.contests[direitoId] = direitoData;
        localState.activeId = direitoId; // Tornar o Direito o concurso ativo
        localState.lastUpdated = new Date().toISOString();

        // Salvar de volta
        localStorage.setItem('ultra-dashboard-storage', JSON.stringify(localWrapped));
        
        console.log("%c[Rescue] Injeção concluída! Reiniciando o app...", "color: #22c55e; font-weight: bold;");
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (err) {
        console.error("[Rescue] Erro crítico no resgate:", err.message);
        alert("Falha no resgate: " + err.message);
    }
}

recoverDireitoContest();
