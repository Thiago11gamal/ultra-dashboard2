import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// 1. Otimização da função clean
const clean = (val) => {
    if (!val || typeof val !== 'string') return null; // Retorna nulo se for vazio
    const cleaned = val.trim().replace(/['";]/g, '');
    if (cleaned === 'undefined' || cleaned === 'null' || cleaned === '') return null;
    return cleaned;
};

// 2. Extração limpa via Regex (Substitui os múltiplos IFs)
const deriveProjectId = (rawConfig) => {
    let id = clean(rawConfig.projectId);
    if (id) return id;

    const sources = [rawConfig.authDomain, rawConfig.storageBucket];
    for (let source of sources) {
        const cleanedSource = clean(source);
        if (cleanedSource) {
            // Pega tudo antes do primeiro ponto caso pertença aos domínios do Firebase
            const match = cleanedSource.match(/^([^.]+)\.(?:firebaseapp\.com|firebasestorage\.app|appspot\.com|web\.app)$/);
            if (match && match[1]) return match[1];
        }
    }
    return null;
};

const rawConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_MEASUREMENT_ID
};

const derivedProjectId = deriveProjectId(rawConfig);
if (!clean(rawConfig.projectId) && derivedProjectId) {
    console.warn(`[Firebase] VITE_FIREBASE_PROJECT_ID missing. Derived: ${derivedProjectId}`);
}

const firebaseConfig = {
    apiKey: clean(rawConfig.apiKey),
    authDomain: clean(rawConfig.authDomain),
    projectId: derivedProjectId,
    storageBucket: clean(rawConfig.storageBucket),
    messagingSenderId: clean(rawConfig.messagingSenderId),
    appId: clean(rawConfig.appId),
    measurementId: clean(rawConfig.measurementId)
};

let app = null;
let db = null;
let auth = null;

// 3. Blindagem contra ausência de variáveis e objetos "Nulos" vazando para a aplicação
export const isLocalMode = !firebaseConfig.apiKey || !firebaseConfig.projectId;

if (isLocalMode) {
    console.warn(`%c[Firebase] Chaves ausentes. O Ultra Dashboard funcionará apenas em modo LOCAL (Offline).`, "color: #fbbf24; font-weight: bold;");
    
    // Evita crashes criando objetos ocos (Mocks)
    // Se algum componente chamar db.collection("..."), ele não vai travar a tela inteira.
    const createMock = (name) => new Proxy({}, {
        get: (target, prop) => {
            // Permite que o SDK modular acesse certas propriedades sem quebrar
            if (prop === 'INTERNAL') return {};
            if (prop === 'app') return { name: '[MOCK]' };
            
            console.debug(`[Local Mode] Chamada ignorada no serviço ${name}.${String(prop)}.`);
            return () => createMock(name); // Retorna uma função que retorna outro mock
        }
    });
    
    db = createMock('Firestore');
    auth = createMock('Auth');
    
} else {
    try {
        // 4. Prevenção de erro "duplicate-app" no Vite/React Strict Mode
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        auth = getAuth(app);
        console.log(`%c[Firebase] Inicializado: ${firebaseConfig.projectId}`, "color: #10b981;");
    } catch (err) {
        console.error("[Firebase] Erro na inicialização:", err);
    }
}

const getAppAnalytics = async () => {
    if (typeof window === "undefined" || !app) return null;
    try {
        const supported = await isAnalyticsSupported();
        if (supported) return getAnalytics(app);
    } catch (err) {
        console.error("[Firebase] Analytics não suportado no ambiente atual:", err);
    }
    return null;
};

export { db, auth, getAppAnalytics };
