# Auditoria visual — menu Evolução

Data: 2026-05-23

## Bugs visuais encontrados (por inspeção de código)

1. **Cards e estados vazios com quinas retas destoando do restante da UI**  
   Em vários pontos do menu Evolução, há uso de `rounded-none` em containers principais e estados vazios, enquanto o restante da tela adota `rounded-xl/2xl`. Isso cria quebra de consistência visual perceptível.  
   Arquivo: `src/components/EvolutionChart.jsx`

2. **Botão de CTA “Ver Todo o Histórico” sem borda arredondada e hierarquia fraca**  
   O botão aparece com estilo mais “cru” (sem `rounded-*`) que os demais controles na mesma área, parecendo desalinhado do design system.
   Arquivo: `src/components/EvolutionChart.jsx`

3. **Indicador de fade das tabs mobile parcialmente desalinhado**  
   O gradiente usa `top-0 bottom-2`, o que pode deixar um “corte” visual na base do fade enquanto a barra de tabs ocupa toda a altura do bloco.
   Arquivo: `src/components/EvolutionChart.jsx`

4. **Remoção global de foco em `svg` pode gerar percepção de “controle quebrado” no teclado**  
   O bloco de estilo inline remove outline para qualquer `svg:focus`, prejudicando feedback visual de foco em acessibilidade (parece bug visual para usuário de teclado).
   Arquivo: `src/components/EvolutionChart.jsx`

5. **Inconsistência de densidade e escala tipográfica em controles superiores**  
   Botões e labels misturam `text-[9px]`, `text-[10px]`, `text-xs`, gerando ruído e “pulos” de hierarquia visual.
   Arquivo: `src/components/EvolutionChart.jsx`

## Melhorias propostas

### Prioridade alta

- Padronizar containers e estados vazios para `rounded-xl` ou `rounded-2xl`.
- Atualizar CTA “Ver Todo o Histórico” para padrão visual dos demais botões (`rounded-lg`, hover e foco coerentes).
- Ajustar gradiente de fade mobile para cobrir 100% da altura útil do cabeçalho de tabs.
- Preservar `focus-visible` para elementos interativos e evitar reset global em `svg`.

### Prioridade média

- Criar tokens internos para escala de tipografia de microcopy (ex.: `10px` para labels técnicas e `12px` para ações).
- Revisar contraste de textos `text-slate-500/600` sobre fundos escuros para melhorar legibilidade.

### Prioridade baixa

- Revisar excesso de glow/sombra em elementos ativos para reduzir poluição visual em telas pequenas.
- Unificar espaçamentos verticais das seções de engine e estados.

## Plano de execução sugerido

1. Refatorar estilos de borda/raio dos blocos principais e placeholders.
2. Ajustar barra de tabs mobile (fade + overflow + alinhamento).
3. Revisar acessibilidade visual de foco com `:focus-visible`.
4. Rodar checklist visual manual em breakpoints `sm`, `md` e mobile estreito.

