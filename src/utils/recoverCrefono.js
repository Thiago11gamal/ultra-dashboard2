/**
 * ULTRA RESCUE SCRIPT - RECONSTRUÇÃO DO CONCURSO "CREFONO"
 * ---------------------------------------------------------
 * Como usar:
 * 1. Abra o Ultra Dashboard 2 no seu navegador (com o login efetuado).
 * 2. Pressione F12 -> Abra a aba "Console".
 * 3. Cole todo o código abaixo e pressione Enter.
 * 4. O concurso será restaurado e a página irá recarregar automaticamente.
 */

async function recoverCrefonoContest() {
    console.log("%c[Ultra-Rescue] Iniciando resgate do concurso 'CREFONO'...", "color: #a855f7; font-weight: bold;");

    try {
        // Importar as ferramentas necessárias da instância do app
        const { db, auth } = await import('/src/services/firebase.js').catch(() => ({ 
            db: window.db, 
            auth: window.auth 
        }));
        const { doc, getDoc } = await import('firebase/firestore');

        const user = auth?.currentUser;
        if (!user) {
            throw new Error("Usuário não autenticado. Por favor, faça login primeiro no app.");
        }

        console.log(`[Rescue] Buscando backup do Firebase para o UID: ${user.uid}...`);
        const docRef = doc(db, 'backups', user.uid);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            throw new Error("Nenhum backup encontrado no Firebase para este usuário.");
        }

        const cloudData = snap.data();
        
        // 1. Procurar em Contests Ativos no backup
        const contests = cloudData.contests || {};
        let targetId = 'contest-61847801-48db-487e-bc42-171963aa0096';
        let targetData = contests[targetId];

        if (!targetData) {
            // Procurar por nome nos concursos ativos
            const foundActive = Object.entries(contests).find(([id, c]) => 
                c.contestName === 'Concurso do CREFONO' || 
                c.user?.name === 'Concurso do CREFONO'
            );
            if (foundActive) {
                targetId = foundActive[0];
                targetData = foundActive[1];
            }
        }

        // 2. Se não estiver nos ativos, procurar na Lixeira (Trash) do backup
        if (!targetData) {
            console.log("[Rescue] Concurso não encontrado nos ativos. Procurando na Lixeira do Firebase...");
            const trash = cloudData.trash || [];
            const foundTrash = trash.find(t => 
                t.contestId === 'contest-61847801-48db-487e-bc42-171963aa0096' ||
                t.name === 'Concurso do CREFONO' ||
                (t.data && (t.data.contestName === 'Concurso do CREFONO' || t.data.user?.name === 'Concurso do CREFONO'))
            );

            if (foundTrash && foundTrash.data) {
                targetId = foundTrash.contestId || 'contest-61847801-48db-487e-bc42-171963aa0096';
                targetData = foundTrash.data;
                console.log("%c[Rescue] Sucesso! Concurso localizado na Lixeira do Backup na Nuvem.", "color: #eab308; font-weight: bold;");
            }
        }

        if (!targetData) {
            throw new Error("Concurso 'CREFONO' não localizado nos dados ativos nem na Lixeira do backup do Firebase.");
        }

        console.log(`%c[Rescue] SUCESSO! Dados completos do concurso 'CREFONO' recuperados.`, "color: #22c55e; font-weight: bold;");

        // Obter o estado local atual do localStorage
        const localRaw = localStorage.getItem('ultra-dashboard-storage');
        if (!localRaw) {
            throw new Error("Estado local do localStorage não encontrado. O app está rodando localmente?");
        }

        const localWrapped = JSON.parse(localRaw);
        const localState = localWrapped.state.appState;

        // Injetar o concurso 'CREFONO' no estado local ativo
        if (!localState.contests) localState.contests = {};
        localState.contests[targetId] = targetData;
        localState.activeId = targetId; // Tornar o CREFONO o concurso ativo
        localState.lastUpdated = new Date().toISOString();
        localState.version = (localState.version || 0) + 1;

        // Salvar de volta no localStorage do navegador
        localStorage.setItem('ultra-dashboard-storage', JSON.stringify(localWrapped));
        
        // Marcar que o estado local foi alterado para forçar o Firebase a sincronizar as alterações locais de volta
        localStorage.setItem('ultra-sync-dirty', 'true');
        
        console.log("%c[Rescue] Injeção local concluída com sucesso! Atualizando o aplicativo...", "color: #22c55e; font-weight: bold;");
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (err) {
        console.error("[Rescue] Erro crítico no resgate:", err.message);
        alert("Falha no resgate: " + err.message);
    }
}

recoverCrefonoContest();
