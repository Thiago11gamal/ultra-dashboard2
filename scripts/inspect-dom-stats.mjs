import { chromium } from '@playwright/test';

async function inspectStatsDom() {
    console.log("=== INICIANDO INSPEÇÃO PROFUNDA NO DOM REAL DO MENU ESTATÍSTICAS COM DADOS REAIS ===");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });

    // Injetar dados ANTES que a página e o React comecem a executar
    await context.addInitScript(() => {
        sessionStorage.setItem('hasSeenWelcomeScreen', 'true');
        localStorage.setItem('ultra_local_session', JSON.stringify({
            uid: 'local-user',
            email: 'aluno.auditoria@teste.com',
            displayName: 'Aluno Auditoria',
            emailVerified: true
        }));

        const todayStr = new Date().toDateString();

        const dummyData = {
            state: {
                appState: {
                    activeId: "c1",
                    hasSeenTour: true,
                    lastSeenTourDate: todayStr,
                    contests: {
                        "c1": {
                            id: "c1",
                            name: "Concurso Teste Auditoria",
                            user: { name: "Aluno Auditoria", targetProbability: 75, goalDate: "2026-12-31" },
                            categories: [
                                {
                                    id: "cat1",
                                    name: "Matemática Avançada e Raciocínio Lógico",
                                    maxScore: 100,
                                    color: "text-green-400",
                                    bgBorder: "border-green-500/30",
                                    simuladoStats: {
                                        history: [
                                            { date: "2026-07-01", total: 50, correct: 35, score: 70, topics: [{ name: "Álgebra Linear", total: 50, correct: 35 }] },
                                            { date: "2026-07-10", total: 50, correct: 38, score: 76, topics: [{ name: "Álgebra Linear", total: 50, correct: 38 }] },
                                            { date: "2026-07-20", total: 50, correct: 42, score: 84, topics: [{ name: "Álgebra Linear", total: 50, correct: 42 }] },
                                            { date: "2026-07-28", total: 50, correct: 46, score: 92, topics: [{ name: "Álgebra Linear", total: 50, correct: 46 }] }
                                        ]
                                    }
                                },
                                {
                                    id: "cat2",
                                    name: "Direito Constitucional, Administrativo e Processual",
                                    maxScore: 100,
                                    color: "text-blue-400",
                                    bgBorder: "border-blue-500/30",
                                    simuladoStats: {
                                        history: [
                                            { date: "2026-07-01", total: 50, correct: 30, score: 60, topics: [{ name: "Direitos Fundamentais", total: 50, correct: 30 }] },
                                            { date: "2026-07-10", total: 50, correct: 34, score: 68, topics: [{ name: "Direitos Fundamentais", total: 50, correct: 34 }] },
                                            { date: "2026-07-20", total: 50, correct: 37, score: 74, topics: [{ name: "Direitos Fundamentais", total: 50, correct: 37 }] },
                                            { date: "2026-07-28", total: 50, correct: 41, score: 82, topics: [{ name: "Direitos Fundamentais", total: 50, correct: 41 }] }
                                        ]
                                    }
                                }
                            ],
                            studyLogs: [
                                { id: "l1", categoryId: "cat1", date: "2026-07-26", minutes: 120 },
                                { id: "l2", categoryId: "cat2", date: "2026-07-27", minutes: 90 },
                                { id: "l3", categoryId: "cat1", date: "2026-07-28", minutes: 150 },
                                { id: "l4", categoryId: "cat2", date: "2026-07-28", minutes: 60 }
                            ],
                            flashcardDecks: [
                                {
                                    id: "d1",
                                    title: "Deck de Raciocínio",
                                    cards: [
                                        { id: "fc1", front: "Pergunta 1", back: "Resposta 1", nextReview: Date.now() - 3600000, interval: 1, repetition: 1, reviews: 3 },
                                        { id: "fc2", front: "Pergunta 2", back: "Resposta 2", nextReview: Date.now() + 86400000, interval: 6, repetition: 3, reviews: 10 }
                                    ]
                                }
                            ]
                        }
                    }
                }
            },
            version: 1
        };

        localStorage.setItem('ultra_storage_v1', JSON.stringify(dummyData));

        // Injetar nativamente no IndexedDB
        const req = indexedDB.open('keyval-store');
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('keyval')) {
                db.createObjectStore('keyval');
            }
        };
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('keyval', 'readwrite');
            const store = tx.objectStore('keyval');
            store.put(JSON.stringify(dummyData), 'ultra-dashboard-storage');
        };
    });

    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    page.on('pageerror', err => {
        pageErrors.push(err.message);
    });

    try {
        console.log("-> Acessando http://localhost:5173/stats diretamente...");
        await page.goto('http://localhost:5173/stats', { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);

        const bodyTextSnippet = await page.evaluate(() => document.body.innerText.substring(0, 400));
        console.log("-> Trecho da tela renderizada:", bodyTextSnippet.replace(/\n+/g, ' '));

        // Inspecionar o DOM completo da página de Estatísticas COM DADOS
        const domReport = await page.evaluate(() => {
            const report = {
                title: document.title,
                url: window.location.href,
                headings: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()),
                overflowElements: [],
                rechartsCharts: 0,
                svgCount: document.querySelectorAll('svg').length,
                glassCards: document.querySelectorAll('.glass').length,
                tables: document.querySelectorAll('table').length,
                gridRows: document.querySelectorAll('.grid').length,
                statsSectionsFound: [],
                issuesDetected: []
            };

            // Detectar quais títulos de seção de estatística existem no DOM
            ['Estatísticas', 'Previsão IA', 'Consistência', 'Evolução do Foco', 'Concentração por Matéria', 'Análise Semanal', 'Simulação de Monte Carlo'].forEach(sec => {
                if (document.body.innerText.includes(sec)) {
                    report.statsSectionsFound.push(sec);
                }
            });

            // Teste de Overflow Horizontal e Scroll no DOM
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const computed = window.getComputedStyle(el);

                if (rect.width === 0 || rect.height === 0 || ['svg', 'path', 'g', 'circle', 'rect', 'line', 'polygon', 'defs', 'stop', 'linearGradient'].includes(el.tagName.toLowerCase())) return;

                // Estouro além da janela do navegador
                if (rect.right > window.innerWidth + 5 && computed.overflowX !== 'hidden' && computed.overflowX !== 'scroll' && computed.overflowX !== 'auto') {
                    report.overflowElements.push({
                        tag: el.tagName,
                        className: el.className ? String(el.className).substring(0, 60) : '',
                        right: Math.round(rect.right),
                        viewportWidth: window.innerWidth,
                        issue: "RIGHT OVERFLOW"
                    });
                }

                // Conteúdo interno maior que o contêiner sem scroll/truncagem
                if (el.scrollWidth > el.clientWidth + 5 && computed.overflowX === 'visible' && !String(el.className).includes('truncate') && !String(el.className).includes('line-clamp')) {
                    if (['DIV', 'SECTION', 'MAIN', 'TABLE'].includes(el.tagName)) {
                        report.overflowElements.push({
                            tag: el.tagName,
                            className: el.className ? String(el.className).substring(0, 60) : '',
                            scrollWidth: el.scrollWidth,
                            clientWidth: el.clientWidth,
                            issue: "INNER SCROLLOVERFLOW"
                        });
                    }
                }
            });

            // Validar gráficos do Recharts (tamanho Mínimo)
            const svgs = document.querySelectorAll('svg');
            svgs.forEach(svg => {
                if (svg.className && String(svg.className.baseVal || svg.className).includes('recharts')) {
                    report.rechartsCharts++;
                    const rect = svg.getBoundingClientRect();
                    if (rect.width < 50 || rect.height < 30) {
                        report.issuesDetected.push(`Gráfico Recharts colapsado no DOM: width=${Math.round(rect.width)}, height=${Math.round(rect.height)}`);
                    }
                }
            });

            return report;
        });

        console.log("=== RESULTADO DA INSPEÇÃO DETALHADA DO DOM COM DADOS (ADDINITSCRIPT) ===");
        console.log(JSON.stringify(domReport, null, 2));

        if (consoleErrors.length > 0) {
            console.log("=== ERROS CAPTURADOS NO CONSOLE (JS/REACT) ===");
            console.log(consoleErrors);
        } else {
            console.log("-> 0 Erros de Console detectados no DOM!");
        }

        if (pageErrors.length > 0) {
            console.log("=== ERROS NA PÁGINA ===");
            console.log(pageErrors);
        } else {
            console.log("-> 0 Erros Não Tratados de Página!");
        }

        await browser.close();
        process.exit(consoleErrors.length > 0 || pageErrors.length > 0 || domReport.overflowElements.length > 0 || domReport.issuesDetected.length > 0 ? 1 : 0);
    } catch (err) {
        console.error("Erro na inspeção do DOM:", err);
        await browser.close();
        process.exit(1);
    }
}

inspectStatsDom();
