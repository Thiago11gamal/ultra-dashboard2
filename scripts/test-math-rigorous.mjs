import { calcularMedia, calcularDesvioPadrao } from '../src/engine/stats.js';
import assert from 'assert';

// Utilitário crucial para contornar problemas de ponto flutuante no JavaScript
function assertCloseTo(actual, expected, tolerance = 0.0001, message) {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        throw new Error(`❌ FALHA | ${message}\nEsperado: ${expected}\nObtido: ${actual}\nDiferença: ${diff} (Tolerância: ${tolerance})`);
    }
}

async function runRigorousTests() {
    console.log('🧪 Iniciando Testes Rigorosos de Precisão Matemática...\n');

    try {
        // Cenário 1: Cálculo de Média com dízimas e precisão
        const dadosMedia = [0.1, 0.2, 0.3, 0.4, 0.5];
        const resultadoMedia = calcularMedia(dadosMedia);
        // Em JS normal 0.1 + 0.2 pode dar 0.30000000000000004
        assertCloseTo(resultadoMedia, 0.3, 0.0001, 'Cálculo de média com números decimais falhou');
        console.log('✅ Cálculo de Média: OK');

        // Cenário 2: Desvio Padrão Populacional (Ground Truth gerado via NumPy)
        const dadosDesvio = [10, 12, 23, 23, 16, 23, 21, 16];
        const resultadoDesvio = calcularDesvioPadrao(dadosDesvio);
        // Valor exato esperado (populacional): 4.898979485566356
        assertCloseTo(resultadoDesvio, 4.8989, 0.001, 'Cálculo de desvio padrão divergiu da fonte da verdade');
        console.log('✅ Cálculo de Desvio Padrão: OK');

        // Adicione aqui testes para percentis e funções gaussianas do src/engine/math/
        
        console.log('\n🚀 Todos os testes rigorosos passaram com sucesso.');
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

runRigorousTests();
