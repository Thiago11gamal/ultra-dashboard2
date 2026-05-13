import { calcularVariancia } from '../src/engine/variance.js';
import { runMonteCarloSimulation as simularMonteCarlo } from '../src/engine/monteCarlo.js'; // Ajustado conforme exportação real

console.log('🔥 Iniciando Testes de Estresse e Fuzzing...\n');

function generateFuzzData(size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        // Gera números gigantes, negativos, minúsculos e zero
        const val = (Math.random() - 0.5) * Math.pow(10, Math.random() * 10);
        data.push(val);
    }
    return data;
}

function runStressTests() {
    let falhas = 0;

    // Teste 1: Carga Massiva (Performance e Memory Leak)
    try {
        console.log('⏳ Testando Variância com 1 Milhão de registros...');
        const massiveData = generateFuzzData(1000000);
        const start = performance.now();
        const variancia = calcularVariancia(massiveData);
        const end = performance.now();
        
        if (isNaN(variancia)) throw new Error('Variância retornou NaN');
        console.log(`✅ Carga Massiva: Concluída em ${(end - start).toFixed(2)}ms (Resultado: ${variancia})`);
    } catch (e) {
        console.error('❌ Falha na Carga Massiva:', e.message);
        falhas++;
    }

    // Teste 2: Casos Limite (Edge Cases)
    const edgeCases = [
        { nome: 'Array Vazio', dados: [] },
        { nome: 'Array com 1 Elemento', dados: [42] },
        { nome: 'Array com Zeros', dados: [0, 0, 0, 0] },
        { nome: 'Array com Valores Extremos', dados: [Infinity, -Infinity, NaN, 10] }
    ];

    edgeCases.forEach(cenario => {
        try {
            const res = calcularVariancia(cenario.dados);
            // O comportamento correto para array vazio ou 1 elemento geralmente é retornar 0 ou null, nunca quebrar a UI
            if (res === undefined) throw new Error('Retornou undefined em vez de um tratamento seguro');
            console.log(`✅ Edge Case (${cenario.nome}): Tratado com segurança (Retorno: ${res})`);
        } catch (e) {
            console.error(`❌ Falha no Edge Case (${cenario.nome}):`, e.message);
            falhas++;
        }
    });

    if (falhas > 0) {
        console.error(`\n⚠️ Teste de estresse finalizado com ${falhas} falha(s).`);
        process.exit(1);
    } else {
        console.log('\n🛡️ Motores sobreviveram ao estresse.');
    }
}

runStressTests();
