# Configurações de Build e Raiz do Projeto

> Arquivos neste módulo: **8** | Linhas: **648** | Tamanho: **21.3 KB**

## Arquivos:
1. `eslint.config.js` (41 linhas)
2. `firestore.rules` (68 linhas)
3. `index.html` (271 linhas)
4. `package.json` (95 linhas)
5. `tsconfig.json` (30 linhas)
6. `tsconfig.node.json` (12 linhas)
7. `vercel.json` (45 linhas)
8. `vite.config.js` (86 linhas)

---

### Arquivo: `eslint.config.js`
*Linhas: 41 | Tamanho: 1.3 KB*

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'build', 'coverage', 'test-results', 'playwright-report', 'ultra-patched/**', '**/*.min.js', 'scripts/legacy_migrations/**', 'move*.js', 'move*.cjs', 'script.js']),
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node, // RIGOR FIX: Suporte a process e require em scripts de config
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.0.type='TemplateLiteral']",
          message: 'Use parseNoonLocal()/normalizeDate() — nunca concatene timezone manualmente.',
        },
      ],
    },
  },
])


```

---

### Arquivo: `firestore.rules`
*Linhas: 68 | Tamanho: 2.2 KB*

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // O utilizador só pode ler e escrever no SEU PRÓPRIO documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // No Firestore Rules, data.size() retorna a quantidade de campos no documento (Map).
    // Limitamos o número de chaves a 500 para evitar mapas inflados abusivos.
    // O limite de 1MB por documento é garantido nativamente pela infraestrutura do Firestore.
    function withinFieldCountLimit() {
      return request.resource.data.size() < 500;
    }

    match /backups/{userId} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId) && withinFieldCountLimit();
      allow delete: if isOwner(userId);

      match /{document=**} {
        allow read: if isOwner(userId);
        allow create, update: if isOwner(userId) && withinFieldCountLimit();
        allow delete: if isOwner(userId);
      }
    }

    // Regras oficiais da extensão Firebase Stripe Payments (clientes, sessões de checkout, pagamentos, assinaturas e produtos)
    match /customers/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;

      match /checkout_sessions/{id} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /subscriptions/{id} {
        allow read: if request.auth != null && request.auth.uid == userId;
      }
      match /payments/{id} {
        allow read: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /products/{id} {
      allow read: if true;

      match /prices/{id} {
        allow read: if true;
      }

      match /tax_rates/{id} {
        allow read: if true;
      }
    }

    // Permite que o sistema de sincronização salve os dados na nuvem
    
    // Regra global: Proíbe acesso a qualquer outra coleção acidental
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

```

---

### Arquivo: `index.html`
*Linhas: 271 | Tamanho: 9.5 KB*

```html
<!doctype html>
<html lang="pt-BR" translate="no">

<head>
  <meta charset="UTF-8" />
  <meta name="app-version" content="%VITE_APP_VERSION%" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/1157/1157077.png" />
  <title>MÉTODO ARRAIA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;800&family=Outfit:wght@300;400;500;600;700&display=swap"
    rel="stylesheet">
  <style>
    /* Loading Screen Styles - Shown while React loads */
    body {
      margin: 0;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .initial-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      color: white;
    }

    .loader-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(139, 92, 246, 0.3);
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loader-text {
      margin-top: 1rem;
      font-size: 1.1rem;
      color: #94a3b8;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes pulse {

      0%,
      100% {
        opacity: 0.6;
      }

      50% {
        opacity: 1;
      }
    }
  </style>
  <script>
    // ── FIX C01/C02/C03 ──────────────────────────────────────────────
    // 1. Vite não substitui __APP_VERSION__ em scripts inline do HTML.
    //    Usamos import.meta.env via módulo auxiliar injetado pelo Vite.
    // 2. window.__BUILD_VERSION__ nunca era definido — agora é derivado
    //    do meta tag ou do fallback 'dev'.
    // 3. allowedPrefixes era declarada mas nunca usada — removida e
    //    a lógica de filtro foi corrigida para usar o array corretamente.
    // ─────────────────────────────────────────────────────────────────
    // Mecanismo de auto-recuperação contra cache desatualizado / chunk 404 após novo deploy
    function handleChunkOrScriptError(reason) {
      console.warn('[AutoRecovery] Falha ao carregar script/módulo:', reason);
      let alreadyAttempted = false;
      try {
        alreadyAttempted = sessionStorage.getItem('ultra_auto_reloaded') === 'true';
      } catch { /* ignore */ }

      if (!alreadyAttempted) {
        try {
          sessionStorage.setItem('ultra_auto_reloaded', 'true');
        } catch { /* ignore */ }

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            for (const r of regs) r.unregister();
            window.location.reload();
          }).catch(() => {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
        return true;
      }
      return false;
    }

    window.addEventListener('error', (event) => {
      const isScriptElement = event.target && event.target.tagName === 'SCRIPT';
      const msg = event.message || (isScriptElement ? 'Falha ao carregar script do bundle' : '');

      if (
        msg.includes('module script') ||
        msg.includes('MIME type') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch') ||
        isScriptElement
      ) {
        if (handleChunkOrScriptError(msg)) return;
      }

      const loaderText = document.querySelector('.loader-text');
      if (!loaderText) return;
      loaderText.textContent = 'Erro de carregamento: ' + (msg || 'Erro desconhecido');
      loaderText.style.color = '#f87171';
      loaderText.style.animation = 'none';
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.message || String(event.reason || '');
      if (
        reason.includes('Loading chunk') ||
        reason.includes('module script') ||
        reason.includes('MIME type') ||
        reason.includes('Failed to fetch dynamically imported module')
      ) {
        if (handleChunkOrScriptError(reason)) return;
      }

      const loaderText = document.querySelector('.loader-text');
      if (!loaderText) return;
      loaderText.textContent = 'Erro de inicialização: ' + (reason || 'Rejeição de promessa');
      loaderText.style.color = '#f87171';
      loaderText.style.animation = 'none';
    });

    // FIX C02/C03: Versão resolvida de forma confiável.
    // O Vite injeta VITE_APP_VERSION no bundle JS; aqui usamos o meta
    // tag como fonte primária e 'dev' como fallback.
    const BUILD_VERSION = (() => {
      try {
        const meta = document.querySelector('meta[name="app-version"]');
        if (meta?.content) return meta.content;
      } catch { /* ignore */ }
      return 'dev';
    })();

    // FIX C03: Definir window.__BUILD_VERSION__ para uso em outros scripts
    window.__BUILD_VERSION__ = BUILD_VERSION;

    console.log("[Build] Versão:", BUILD_VERSION);

    setTimeout(() => {
      const loaderText = document.querySelector('.loader-text');
      if (!loaderText) return;
      const currentText = loaderText.textContent || "";
      if (!currentText.includes("Carregando")) return;
      loaderText.textContent = "";

      const title = document.createElement("div");
      title.textContent = "Carregamento lento detectado...";

      const version = document.createElement("small");
      version.style.opacity = "0.5";
      version.textContent = `Versão: ${BUILD_VERSION}`;

      const btn = document.createElement("button");
      btn.textContent = "Limpar dados e reiniciar";
      btn.style.marginTop = "20px";
      btn.style.background = "rgba(248, 113, 113, 0.2)";
      btn.style.border = "1px solid #f87171";
      btn.style.color = "#f87171";
      btn.style.padding = "8px 16px";
      btn.style.borderRadius = "8px";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "12px";

      async function clearAllLocalData() {
        try {
          localStorage.clear();
          sessionStorage.clear();

          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            } catch (swErr) {
              console.error('Erro ao remover Service Worker:', swErr);
            }
          }

          if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
            const dbs = await indexedDB.databases();
            if (Array.isArray(dbs)) {
              // FIX C01: Usar allowedPrefixes corretamente no filtro
              const allowedPrefixes = ['ultra-dashboard', 'firestore/'];
              const projectId = (typeof window.__FIREBASE_PROJECT_ID__ === 'string')
                ? window.__FIREBASE_PROJECT_ID__
                : null;
              const firestorePrefix = projectId
                ? `firestore/${projectId}`
                : 'firestore/';

              const deletePromises = dbs
                .filter(db => {
                  if (!db.name) return false;
                  // FIX C01: Agora usa allowedPrefixes corretamente
                  return allowedPrefixes.some(prefix => {
                    if (prefix === 'firestore/') {
                      return String(db.name).startsWith(firestorePrefix);
                    }
                    return String(db.name).startsWith(prefix);
                  });
                })
                .map(db => new Promise((resolve) => {
                  const req = indexedDB.deleteDatabase(db.name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                }));

              await Promise.all(deletePromises);
            }
          }
        } catch (error) {
          console.error('Erro ao limpar dados locais:', error);
        } finally {
          location.reload();
        }
      }

      btn.addEventListener("click", async () => {
        const ok = window.confirm(
          "Isso apagará os dados locais deste navegador. Deseja continuar?"
        );
        if (ok) {
          await clearAllLocalData();
        }
      });

      loaderText.appendChild(title);
      loaderText.appendChild(document.createElement("br"));
      loaderText.appendChild(version);
      loaderText.appendChild(document.createElement("br"));
      loaderText.appendChild(btn);
    }, 8000);
  </script>
</head>

<body>
  <div id="root">
    <!-- Initial loader - replaced by React when app loads -->
    <div class="initial-loader">
      <div class="loader-spinner"></div>
      <p class="loader-text">Carregando...</p>
    </div>
  </div>
  <script type="module" src="/src/main.jsx"></script>
</body>

</html>

```

---

### Arquivo: `package.json`
*Linhas: 95 | Tamanho: 3.8 KB*

```json
{
  "name": "ultra-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "kill-port": "npx kill-port 5173 5174",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:math": "node scripts/test-math-engines.mjs",
    "test:unit": "node scripts/test-unit-safe.mjs",
    "test:all": "npm run test:math && npm run test:rigorous-math && npm run test:unit",
    "test:math-rigor": "node scripts/test-math-rigorous.mjs",
    "test:rigorous-math": "node scripts/test-math-rigorous.mjs",
    "test:bootstrap": "node scripts/test-bootstrap-ci.mjs",
    "test:integration-math": "node scripts/test-math-integration.mjs",
    "test:math-stress": "node scripts/test-math-stress.mjs",
    "test:coach-regression": "vitest run tests/coach-math-regressions.test.js",
    "test:all-math": "npm run test:math-rigor && npm run test:math-stress && npm run test:coach-regression",
    "audit:math": "node scripts/run-math-audit.mjs",
    "test:mc-scenarios": "node scripts/test-mc-scenarios.mjs",
    "mc:parallel": "node scripts/run-mc-parallel.mjs",
    "test:heatmap-aggregation": "node scripts/test-heatmap-aggregation.mjs",
    "test:weekly-insights": "node scripts/test-weekly-insights.mjs",
    "test:evolution-suite": "node scripts/test-evolution-suite.mjs",
    "test:projection-scenario": "node scripts/test-projection-scenario.mjs",
    "test:evolution-all": "npm run test:unit && npm run test:evolution-suite",
    "test:evolution-ui": "node scripts/test-evolution-ui-contracts.mjs",
    "test:evolution-components": "vitest run src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx",
    "test:evolution-e2e": "node scripts/test-evolution-e2e.mjs",
    "test:unit:safe": "node scripts/test-unit-safe.mjs",
    "lint:safe": "node scripts/lint-safe.mjs",
    "build:safe": "node scripts/build-safe.mjs",
    "verify:evolution": "node scripts/verify-evolution-stack.mjs",
    "test:coach-unit": "vitest run tests/coach-math-regressions.test.js src/utils/__tests__/coachLogic.regression.test.js src/utils/__tests__/coachBacktest.test.js",
    "test:coach-integration": "vitest run tests/coach-logic.integration.test.js",
    "test:coach-suite": "node scripts/test-coach-suite.mjs"
  },
  "dependencies": {
    "@hello-pangea/dnd": "^18.0.1",
    "@stripe/stripe-js": "^8.9.0",
    "date-fns": "^4.1.0",
    "dompurify": "^3.4.12",
    "firebase": "^12.6.0",
    "framer-motion": "^12.23.25",
    "html-to-image": "^1.11.13",
    "idb-keyval": "^6.2.2",
    "immer": "^11.1.4",
    "jspdf": "^4.2.1",
    "lucide-react": "^0.556.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-is": "^19.2.4",
    "react-joyride": "^2.9.3",
    "react-router-dom": "^7.13.0",
    "recharts": "^3.5.1",
    "zundo": "^2.3.0",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@playwright/test": "^1.58.1",
    "@tailwindcss/vite": "^4.1.17",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^26.1.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "@vitest/coverage-v8": "^4.1.6",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4.1.17",
    "typescript": "^7.0.2",
    "vite": "^7.2.4",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^4.1.10"
  },
  "allowScripts": {
    "@firebase/util": true,
    "core-js": true,
    "esbuild": true,
    "@playwright/test": true,
    "protobufjs": true,
    "fsevents": true
  }
}

```

---

### Arquivo: `tsconfig.json`
*Linhas: 30 | Tamanho: 0.7 KB*

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    
    /* Allow JS */
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

```

---

### Arquivo: `tsconfig.node.json`
*Linhas: 12 | Tamanho: 0.2 KB*

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.js"]
}

```

---

### Arquivo: `vercel.json`
*Linhas: 45 | Tamanho: 0.9 KB*

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    },
    {
      "source": "/(index.html|sw.js|manifest.webmanifest|registerSW.js)?",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/assets/(.*)",
      "destination": "/assets/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

### Arquivo: `vite.config.js`
*Linhas: 86 | Tamanho: 2.7 KB*

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

process.env.VITE_APP_VERSION = process.env.VITE_APP_VERSION || '1.0.0';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || 'dev'),
  },
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'Ultra Dashboard 2',
        short_name: 'Ultra',
        description: 'Plataforma inteligente de estudos e simulados',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ]
      }
    })
  ],
  envPrefix: ['VITE_'],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          charts: ['recharts'],
          pdf: ['html-to-image', 'jspdf'],
          motion: ['framer-motion'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
        },
      },
    },
  },

  // ─── VITEST ───────────────────────────────────────────────────────────────
  test: {
    // FIX 6: Transição para jsdom, libertando o acesso a APIs de browser (window, document)
    // requeridas imperativamente por ficheiros 'src/**/*.test.jsx' que testam componentes React.
    environment: 'jsdom',        
    globals: true,              
    include: ['src/**/*.test.js', 'src/**/*.test.jsx', 'src/**/*.spec.js', 'tests/**/*.test.js'],
    globalTeardown: './tests/teardown.js',
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/utils/coachLogic.js'],
    },
  },
  // ──────────────────────────────────────────────────────────────────────────
})


```

---

