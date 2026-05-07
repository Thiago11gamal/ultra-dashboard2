# Auditoria de bugs por menu (2026-05-07)

## Escopo
- Inspeção estática das rotas/menu em `Sidebar` e `App`.
- Verificação rápida de testes/lint disponíveis no repositório.

## Bugs encontrados

1. **Menu não indica ativo para subrotas com query/hash em casos específicos de igualdade estrita (`/`)**
   - O item "Meu Painel" usa igualdade estrita `location.pathname === '/'`.
   - Em cenários com roteamento que preserve basename/sufixos, o estado ativo pode falhar para homepage alternativa.
   - Arquivo: `src/components/Sidebar.jsx`.

2. **Concursos podem exibir nome incorreto no menu lateral**
   - Quando `Sidebar` recebe objeto de concurso, usa `contestData?.user?.name` (nome do usuário) em vez do nome do concurso.
   - Isso pode rotular itens com nome de pessoa e não nome do painel/concurso.
   - Arquivo: `src/components/Sidebar.jsx`.

3. **Dependência de teste unitário inconsistente com lockfile**
   - `npm run test:unit` falha com `vitest: not found`.
   - Há divergência entre `package.json` e `package-lock.json`, quebrando `npm ci` e execução de teste.
   - Arquivos: `package.json`, `package-lock.json`.

4. **Lint não executa em ambiente limpo sem instalação completa**
   - `npm run lint` falha por não resolver `@eslint/js` quando o lockfile está inconsistente.
   - Impacta validação de qualidade em CI/CD e revisão por menu.
   - Arquivos: `eslint.config.js`, `package-lock.json`.

## Evidências de comando
- `npm run test:all` -> falha no passo unitário (`vitest: not found`).
- `npm ci` -> recusa instalar por dessincronização entre manifest/lock.
- `npm run lint` -> falha de resolução de dependência (`@eslint/js`).

## Prioridade sugerida
1. Corrigir lockfile/dependências (bloqueia qualquer validação automática).
2. Ajustar origem do rótulo de concursos no sidebar.
3. Revisar regra de ativo do dashboard para garantir robustez em subcenários de rota.
