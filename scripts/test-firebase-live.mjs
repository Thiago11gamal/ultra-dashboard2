import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    if (key) env[key.trim()] = rest.join('=').trim();
  }
});

console.log('=== VERIFICAÇÃO INTEGRAL DA CONEXÃO FIREBASE ===\n');
console.log('Configurações lidas do .env:');
console.log({
  apiKey: env.VITE_FIREBASE_API_KEY ? `${env.VITE_FIREBASE_API_KEY.slice(0, 10)}...` : null,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  isLocalMode: env.VITE_LOCAL_MODE
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

async function testAuth() {
  console.log('\n[1/3] Testando Autenticação (Firebase Auth)...');
  try {
    const app = initializeApp(firebaseConfig, 'auth-test');
    const auth = getAuth(app);
    // Tentativa de login proposital com credenciais inválidas para ver a resposta do servidor do Google
    try {
      await signInWithEmailAndPassword(auth, 'teste_conexao_diagnostico@example.com', 'senha_invalida_123');
    } catch (authError) {
      if (authError.code === 'auth/invalid-credential' || 
          authError.code === 'auth/user-not-found' || 
          authError.code === 'auth/wrong-password' ||
          authError.code === 'auth/invalid-email') {
        console.log('  ✅ Firebase Auth está OPERACIONAL e respondendo aos serviços de autenticação do Google!');
        console.log(`     Código de retorno esperado recebido: ${authError.code}`);
        return true;
      } else if (authError.code === 'auth/api-key-not-valid' || authError.code === 'auth/project-not-found') {
        console.error(`  ❌ Falha de chave ou projeto no Auth: ${authError.code}`);
        return false;
      } else {
        console.log(`  ℹ️ Resposta do Auth: ${authError.code} - ${authError.message}`);
        return true;
      }
    }
  } catch (err) {
    console.error('  ❌ Erro fatal no Auth:', err.message);
    return false;
  }
}

async function testFirestore() {
  console.log('\n[2/3] Testando Banco de Dados (Cloud Firestore)...');
  try {
    const app = initializeApp(firebaseConfig, 'firestore-test');
    const db = getFirestore(app);
    
    // Tenta ler com timeout
    const testPromise = getDocs(collection(db, 'products'));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE_5S')), 5000));
    
    try {
      const snap = await Promise.race([testPromise, timeoutPromise]);
      console.log(`  ✅ Firestore Conectado com Sucesso! Coleção pública 'products' acessada (${snap.docs.length} docs).`);
      return true;
    } catch (fsErr) {
      if (fsErr.code === 'permission-denied') {
        console.log('  ✅ Firestore Conectado com Sucesso! (Security Rules bloquearam acesso não autorizado - comportamento correto).');
        return true;
      } else if (fsErr.code === 'unavailable') {
        console.warn('  ⚠️ Firestore indisponível no momento ou banco de dados não inicializado no console Firebase.');
        return false;
      } else if (fsErr.code === 'not-found') {
        console.error('  ❌ Banco Firestore não encontrado. Verifique se o Firestore Database foi criado no Console do Firebase.');
        return false;
      } else {
        console.log(`  ℹ️ Resposta do Firestore: code=${fsErr.code}, message=${fsErr.message}`);
        return false;
      }
    }
  } catch (err) {
    console.error('  ❌ Erro ao inicializar Firestore:', err.message);
    return false;
  }
}

async function testEndpointsHttp() {
  console.log('\n[3/3] Testando Endpoints REST / DNS...');
  
  // Teste de resolução do domínio Auth
  try {
    const authRes = await fetch(`https://${env.VITE_FIREBASE_AUTH_DOMAIN}/__/auth/handler`);
    console.log(`  Domínio Auth (${env.VITE_FIREBASE_AUTH_DOMAIN}): Status HTTP ${authRes.status}`);
  } catch (e) {
    console.warn(`  Domínio Auth falha de rede: ${e.message}`);
  }

  // Teste de REST IdentityToolkit
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.VITE_FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_probe@test.com', password: 'probe' })
    });
    const d = await res.json();
    console.log(`  Identity Toolkit API status: ${res.status} (Erro esperado retornado pelo Google: ${d.error?.message || 'OK'})`);
  } catch (e) {
    console.warn(`  Identity Toolkit REST error: ${e.message}`);
  }
}

async function run() {
  const authOk = await testAuth();
  const firestoreOk = await testFirestore();
  await testEndpointsHttp();

  console.log('\n======================================================');
  console.log('STATUS FINAL DA CONEXÃO FIREBASE COM O APP:');
  console.log(`- Firebase Authentication: ${authOk ? '✅ CONECTADO E FUNCIONANDO' : '❌ ERRO'}`);
  console.log(`- Cloud Firestore (DB):    ${firestoreOk ? '✅ CONECTADO E FUNCIONANDO' : '⚠️ ATENÇÃO NECESSÁRIA'}`);
  console.log('======================================================\n');
  process.exit(0);
}

run();
