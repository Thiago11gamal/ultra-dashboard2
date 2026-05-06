# Auditoria de Matemática por Menu — 2026-05-06

## Escopo e método

Esta auditoria cobre os módulos matemáticos e os menus de navegação do app.

- Leitura estática de arquivos de engine e utilitários matemáticos.
- Revisão da estrutura de menus no `Sidebar` e rotas/páginas associadas.
- Execução da suíte de testes matemáticos/regressões.

> Observação: auditar "cada linha" do sistema de forma manual, com rigor formal, não é realista em uma única iteração manual; esta revisão combina inspeção de pontos críticos + testes automatizados para detectar risco matemático real.

## Menus auditados (visão funcional)

Com base no `Sidebar`, os menus principais são:

1. **Navegação**: Meu Painel, Cronômetro, Sessões, Tarefas.
2. **Dados & Análise**: Estatísticas, Evolução, Atividade, Retenção, Simulados IA, Histórico.
3. **Inteligência**: Coach IA, Notas.
4. **Configurações**: Lixeira, Ajuda, Sair da Conta.
5. **Meus Concursos**: troca de contexto e criação de novo painel.

## Avaliação matemática por áreas

### 1) Motores matemáticos centrais

Arquivos críticos identificados:

- `src/engine/math/gaussian.js`
- `src/engine/math/percentile.js`
- `src/engine/projection.js`
- `src/engine/variance.js`
- `src/engine/monteCarlo.js`
- `src/utils/adaptiveMath.js`
- `src/utils/calibration.js`

**Resultado atual:** sem falhas visíveis nos testes de regressão executados.

### 2) Menus de análise (onde há mais matemática)

#### Estatísticas / Evolução / Retenção / Simulados IA / Coach IA

- Dependem de agregações, normalizações, projeções e/ou simulações.
- Pelos testes atuais, os principais invariantes estão protegidos:
  - probabilidades em faixa válida;
  - intervalos ordenados;
  - clamps de valores extremos;
  - correlação negativa preservada quando aplicável.

**Conclusão:** matemática funcionalmente estável para uso normal.

### 3) Menus operacionais (Cronômetro, Sessões, Tarefas, Notas, Lixeira etc.)

- Menor densidade matemática; maior foco em estado/UI.
- Risco principal é consistência de unidades (minutos/horas) e arredondamento na apresentação.

## Melhorias recomendadas

Mesmo com testes passando, **há espaço para melhoria**:

1. **Contrato matemático por função crítica**
   - Documentar pré/pós-condições (faixas, unidade, tratamento de `NaN/Infinity`).
2. **Testes property-based**
   - Gerar entradas aleatórias para Monte Carlo, projeção e calibração.
3. **Padronizar precisão de exibição**
   - Centralizar regra de arredondamento por tipo de métrica (tempo, %, score).
4. **Telemetria de anomalias numéricas em produção**
   - Contadores para clamp acionado, divisão por quase-zero evitada, fallback estatístico.
5. **Checklist de revisão por menu analítico**
   - Para cada release, validar: domínio de entrada, monotonicidade esperada, saturação e limites.

## Veredito objetivo

- **Precisa de melhorias?** Sim, em robustez e observabilidade.
- **Há bug matemático crítico confirmado nesta rodada?** Não.
- **Prioridade recomendada:** média (hardening preventivo), sem bloqueio imediato de release.
