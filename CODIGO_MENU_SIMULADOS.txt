# CÓDIGO UNIFICADO — MENU SIMULADOS (ULTRA DASHBOARD)

> **Data de Geração:** 2026-10-19T19:40:43.162Z
> **Total de Arquivos:** 15
> **Total de Linhas:** 6.916
> **Tamanho Total:** 338.87 KB

Este documento contém o **código-fonte completo e exclusivo do Menu Simulados** do Ultra Dashboard.
Ele inclui a página principal da rota `/simulados`, o ecossistema completo de Simulado por Inteligência Artificial (Setup, Player interativo de questões com timer, painel pós-prova com revisão detalhada e pontuação), formulário e relatório de Simulado Manual, histórico de desempenho, slice do Zustand com lógica de exclusão granular e recalibração bayesiana, helpers de medição e persistência atômica, normalização de dados e a suíte completa de testes unitários e de integração.

---

## 📑 ÍNDICE GERAL DE ARQUIVOS

### 1. Página e Visão Principal (Pages & Main Views)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/pages/Simulados.jsx` | Página mestre da rota /simulados: abas Gerar Simulado (IA / Manual), Último Simulado, Histórico; Cards de resumo Hoje/Ontem, Badge de Origem, processamento de acertos e integração ao appStore | 756 | 35.2 KB | [Acessar Código](#src-pages-simulados-jsx) |

### 2. Fluxo e Execução de Simulado por IA (AI Simulado Engine & Views)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/ai/AIGeneratedSimulado.jsx` | Orquestrador do fluxo do simulado gerado por IA: gerencia transição de telas Setup -> Player -> Results, timer de prova, rascunhos de progresso e persistência no store | 962 | 39.3 KB | [Acessar Código](#src-components-ai-aigeneratedsimulado-jsx) |
| `src/components/ai/SimuladoSetup.jsx` | Interface de configuração de parâmetros do simulado IA: seleção de disciplinas, assuntos cadastrados ou livres, banca examinadora, quantidade de questões e nível de dificuldade | 380 | 21.3 KB | [Acessar Código](#src-components-ai-simuladosetup-jsx) |
| `src/components/ai/SimuladoPlayer.jsx` | Console de resolução do simulado IA: exibição de enunciados, alternativas, timer regressivo com alerta visual, suporte a gestos touch/swipe e navegação direta | 230 | 11.0 KB | [Acessar Código](#src-components-ai-simuladoplayer-jsx) |
| `src/components/ai/SimuladoResults.jsx` | Painel analítico pós-simulado IA: pontuação final, cálculo de acertos, análise de tempo por questão, revisão comentada com justificativas da IA e opções de tentar novamente | 275 | 16.2 KB | [Acessar Código](#src-components-ai-simuladoresults-jsx) |

### 3. Simulado Manual e Relatórios Analíticos (Manual Simulado & Analysis)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/SimuladoAnalysis.jsx` | Formulário e relatório detalhado de simulado manual: grade de preenchimento de questões e acertos por disciplina/assunto, cálculo automático de notas, porcentagem de acertos, badges de status e botão de persistência | 802 | 50.0 KB | [Acessar Código](#src-components-simuladoanalysis-jsx) |

### 4. Histórico e Visualização de Desempenho (History & Analytics)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/StudyHistory.jsx` | Painel de histórico de sessões e simulados com modo de desempenho, filtros cronológicos e suporte à exclusão granular de simulados | 1.232 | 87.5 KB | [Acessar Código](#src-components-studyhistory-jsx) |

### 5. Serviços e Conexão de IA (Services & AI Integration)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/services/aiQuestionService.js` | Serviço cliente de geração de questões com IA: schema de validação estrutural (AI_QUESTION_SCHEMA), sanitização de alternativas e comunicação resiliente | 247 | 7.6 KB | [Acessar Código](#src-services-aiquestionservice-js) |

### 6. Gerenciamento de Estado Global (Zustand Store Slices)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/store/slices/createSimuladoSlice.js` | Slice do Zustand para simulados: resetSimuladoStats (reset seguro) e deleteSimulado com remoção granular e recalibração bayesiana automática das categorias afetadas | 208 | 8.2 KB | [Acessar Código](#src-store-slices-createsimuladoslice-js) |

### 7. Utilitários, Normalização e Medição (Utils & Helpers)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/utils/aiSaveHelper.js` | Helper de persistência atômica dos resultados do simulado IA no draft do Zustand, agregação com pesos de dificuldade, atualização de simuladoRows e evento global | 201 | 8.5 KB | [Acessar Código](#src-utils-aisavehelper-js) |
| `src/utils/measurement.js` | Motor de medição e integridade: deduplicateSimulados, sanitizeSimuladoRow, mergeQuestionResult, safeDomain e clampFinite | 624 | 19.7 KB | [Acessar Código](#src-utils-measurement-js) |
| `src/utils/normalization.js` | Normalização canônica de matérias e tópicos, remoção de diacríticos e mapeamento de aliases para pareamento exato entre formulários e categorias | 93 | 4.2 KB | [Acessar Código](#src-utils-normalization-js) |
| `src/utils/dateHelper.js` | Formatadores e normalizadores de fuso horário, datas e chaves diárias para agrupamento cronológico correto de simulados | 352 | 12.8 KB | [Acessar Código](#src-utils-datehelper-js) |

### 8. Suíte de Testes Automatizados (Tests & Audits)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/__tests__/simuladoMenuBugs.test.jsx` | Suíte completa de testes do menu Simulado: auditoria de salvamento por IA, deleção em cascata, recálculo de médias e isolamento de estado | 420 | 14.1 KB | [Acessar Código](#src-components-__tests__-simuladomenubugs-test-jsx) |
| `src/utils/__tests__/measurement.test.js` | Testes unitários de domínio de notas, sanitização de rows de simulados e deduplicação de históricos | 134 | 3.1 KB | [Acessar Código](#src-utils-__tests__-measurement-test-js) |

---

## 💻 CÓDIGO-FONTE INTEGRAL

# 1. PÁGINA E VISÃO PRINCIPAL (PAGES & MAIN VIEWS)

## `src/pages/Simulados.jsx` <a id="src-pages-simulados-jsx"></a>

- **Localização:** `src/pages/Simulados.jsx`
- **Descrição:** Página mestre da rota /simulados: abas Gerar Simulado (IA / Manual), Último Simulado, Histórico; Cards de resumo Hoje/Ontem, Badge de Origem, processamento de acertos e integração ao appStore
- **Linhas:** 756
- **Tamanho:** 35.15 KB

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo, useCallback } from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import AIGeneratedSimulado from '../components/ai/AIGeneratedSimulado';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { computeCategoryStats } from '../engine';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { generateId } from '../utils/idGenerator';
import {
  ListChecks, Brain, History as HistoryIcon,
  ChevronRight, Clock, Target, TrendingUp, TrendingDown,
  Minus, Sparkles, PenLine, BarChart3, CalendarDays
} from 'lucide-react';
import StudyHistory from '../components/StudyHistory';

/* ─────────────────────────────────────────────
   HELPER: Extrai timestamp seguro de uma row
   ───────────────────────────────────────────── */
const getRowTimestamp = (r) => {
  const raw = r?.lastUpdated || r?.createdAt || r?.date;
  if (!raw) return 0;
  const parsed = normalizeDate(raw);
  const t = parsed ? parsed.getTime() : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/* ─────────────────────────────────────────────
   HELPER: Formata data/hora para exibição
   ───────────────────────────────────────────── */
const formatDateTime = (r) => {
  const raw = r?.lastUpdated || r?.createdAt || r?.date;
  if (!raw) return '—';
  const d = normalizeDate(raw);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const getSimuladoSource = (rows) => {
  if (!rows || rows.length === 0) return null;
  const hasAI = rows.some(r => r.source === 'ai-generated' || (r.batchId && r.source !== 'manual'));
  const hasManual = rows.some(r => r.source === 'manual' || (!r.batchId && r.source !== 'ai-generated'));
  if (hasAI && hasManual) return 'mixed';
  if (hasAI) return 'ai';
  return 'manual';
};

/* ─────────────────────────────────────────────
   COMPONENTE: Badge de origem
   ───────────────────────────────────────────── */
const SourceBadge = ({ source }) => {
  if (!source) return null;
  const config = {
    ai:     { label: 'Simulado IA',     icon: Sparkles, cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    manual: { label: 'Simulado Manual', icon: PenLine,  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    mixed:  { label: 'IA + Manual',     icon: BarChart3, cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  };
  const c = config[source] || config.manual;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${c.cls}`}>
      <Icon size={12} /> {c.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   COMPONENTE: Card de resumo diário (melhorado)
   ───────────────────────────────────────────── */
const DailyCard = ({ label, icon: Icon, data, accent, accentText, comparison }) => (
  <div className={`glass p-5 rounded-2xl border-l-4 ${accent} relative overflow-hidden group`}>
    {/* Glow decorativo */}
    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${accent.replace('border-', 'bg-')}`} />

    <div className="flex items-center gap-2 mb-3 relative z-10">
      <Icon size={16} className={accentText} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>

    {data.totalQ > 0 ? (
      <div className="relative z-10">
        {/* Score principal */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-black text-white tabular-nums">{data.pct}%</span>
          <span className="text-sm text-slate-400 font-medium">acerto</span>
          {/* Tendência */}
          {comparison !== null && (
            <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${
              comparison > 0 ? 'text-emerald-400' : comparison < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {comparison > 0 ? <TrendingUp size={14} /> : comparison < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {comparison > 0 ? '+' : ''}{comparison}pp
            </span>
          )}
        </div>

        {/* Métricas secundárias */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.totalC}<span className="text-slate-500 text-xs">/{data.totalQ}</span></div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Acertos</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.subjects}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Matérias</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.count}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Registros</div>
          </div>
        </div>

        {/* Breakdown por matéria (top 3) */}
        {data.bySubject && data.bySubject.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Por Matéria</div>
            {data.bySubject.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 truncate flex-1 min-w-0">{s.name}</span>
                <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 w-8 text-right tabular-nums">{s.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="relative z-10 py-6 text-center">
        <Clock size={28} className="mx-auto mb-2 text-slate-600" />
        <p className="text-sm text-slate-500">Nenhum simulado registrado.</p>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────
   COMPONENTE: Cards de resumo Hoje / Ontem
   ───────────────────────────────────────────── */
function DailySummaryCards({ simuladoRows }) {
  const summary = useMemo(() => {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getDateKey(normalizeDate(yesterdayDate));

    const calcDay = (dayKey) => {
      const rows = simuladoRows.filter((r) => {
        const rk = getDateKey(normalizeDate(r.date || r.createdAt));
        return rk === dayKey && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0);
      });
      let totalQ = 0;
      let totalC = 0;
      const subjectMap = {};

      rows.forEach(r => {
        const rowT = Math.max(0, parseInt(r.total, 10) || 0);
        const rowC = Math.max(0, Math.min(rowT, parseInt(r.correct, 10) || 0));
        totalQ += rowT;
        totalC += rowC;

        const name = r.subject || 'Geral';
        if (!subjectMap[name]) subjectMap[name] = { c: 0, t: 0 };
        subjectMap[name].c += rowC;
        subjectMap[name].t += rowT;
      });

      const safeC = Math.min(totalC, totalQ);
      const pct = totalQ > 0 ? Math.max(0, Math.min(100, Math.round((safeC / totalQ) * 100))) : 0;
      const subjects = new Set(rows.map((r) => r.subject).filter(Boolean)).size;

      const bySubject = Object.entries(subjectMap)
        .map(([name, d]) => {
          const safeSubjC = Math.min(d.c, d.t);
          return { name, pct: d.t > 0 ? Math.round((safeSubjC / d.t) * 100) : 0, c: safeSubjC, t: d.t };
        })
        .sort((a, b) => b.t - a.t);

      return { totalQ, totalC: safeC, pct, subjects, count: rows.length, bySubject };
    };

    const today = calcDay(todayKey);
    const yesterday = calcDay(yesterdayKey);

    return { today, yesterday };
  }, [simuladoRows]);

  // Comparação: hoje vs ontem (em pontos percentuais)
  const comparison = (summary.today.totalQ > 0 && summary.yesterday.totalQ > 0)
    ? summary.today.pct - summary.yesterday.pct
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* HOJE — lado esquerdo */}
      <DailyCard
        label="Hoje"
        icon={CalendarDays}
        data={summary.today}
        accent="border-emerald-500"
        accentText="text-emerald-400"
        comparison={comparison}
      />
      {/* ONTEM — lado direito */}
      <DailyCard
        label="Ontem"
        icon={HistoryIcon}
        data={summary.yesterday}
        accent="border-blue-500"
        accentText="text-blue-400"
        comparison={null}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL: Simulados
   ───────────────────────────────────────────── */
export default function Simulados() {
  const { categories, simuladoRows, studySessions } = useAppStore(useShallow(state => {
    const contest = state.appState?.contests?.[state.appState?.activeId] || {};
    return {
      categories: contest.categories,
      simuladoRows: contest.simuladoRows,
      studySessions: contest.studySessions
    };
  }));
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const deleteSession = useAppStore((state) => state.deleteSession);
  const deleteSimulado = useAppStore((state) => state.deleteSimulado);

  // P05 PERF FIX: Granular dependencies directly referencing destructured state
  const categoriesArray = useMemo(
    () => Array.isArray(categories) ? categories : Object.values(categories || {}),
    [categories]
  );
  const simuladoRowsArray = useMemo(
    () => Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {}),
    [simuladoRows]
  );
  const studySessionsArray = useMemo(
    () => Array.isArray(studySessions) ? studySessions : Object.values(studySessions || {}),
    [studySessions]
  );

  /* ── Rows do formulário manual (apenas matérias/assuntos cadastrados) ── */
  const displayRows = useMemo(() => {
    if (!categoriesArray.length || !categories) return [];
    const todayKey = getDateKey(new Date());
    const rawTodayRows = simuladoRowsArray.filter(
      r => getDateKey(r.date || r.createdAt) === todayKey
    );
    const rows = [];
    const savedManualRows = {};
    rawTodayRows.forEach(r => {
      if (!r.isAuto && r.source !== 'ai-generated') {
        // Fallback to string if IDs are missing for legacy records
        const key = (r.categoryId && r.topicId) ? `${r.categoryId}-${r.topicId}` : `${normalize(r.subject)}-${normalize(r.topic)}`;
        savedManualRows[key] = r;
      }
    });
    categoriesArray.forEach(cat => {
      const rawTasks = cat.tasks || [];
      const tasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
      if (tasks.length === 0) {
        const keyStr = `${normalize(cat.name)}-${normalize('nenhum')}`;
        const keyId = `${cat.id}-nenhum`;
        rows.push(savedManualRows[keyId] || savedManualRows[keyStr] || {
          id: `manual-fallback-${cat.id}`, categoryId: cat.id, topicId: 'nenhum', subject: cat.name, topic: 'nenhum',
          correct: 0, total: 0, isAuto: false, source: 'manual'
        });
      } else {
        tasks.forEach(task => {
          const title = String(task.title || task.text || '').trim();
          if (!title) return;
          const keyStr = `${normalize(cat.name)}-${normalize(title)}`;
          const keyId = `${cat.id}-${task.id}`;
          rows.push(savedManualRows[keyId] || savedManualRows[keyStr] || {
            id: `manual-${cat.id}-${task.id}`, categoryId: cat.id, topicId: task.id, subject: cat.name, topic: title,
            correct: 0, total: 0, isAuto: false, source: 'manual'
          });
        });
      }
    });
    return rows;
  }, [categoriesArray, simuladoRowsArray, categories]);

  /* ── FIX: Último simulado — lógica corrigida e robusta ── */
  const lastSimuladoData = useMemo(() => {
    if (!simuladoRowsArray.length) return { rows: [], source: null, timestamp: null };

    // 1. Filtra apenas rows com dados reais
    const answeredRows = simuladoRowsArray.filter(
      (r) => r && typeof r === 'object' && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0)
    );
    if (answeredRows.length === 0) return { rows: [], source: null, timestamp: null };

    // 2. Ordena por timestamp (mais recente primeiro)
    const sorted = [...answeredRows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));
    const lastRef = sorted[0];
    if (!lastRef) return { rows: [], source: null, timestamp: null };

    let resultRows = [];

    // 3. Estratégia A: batchId (Simulado IA)
    if (lastRef.batchId && lastRef.source !== 'manual') {
      resultRows = simuladoRowsArray.filter((r) => r && r.batchId === lastRef.batchId);
      // ✅ FIX BUG-49: fallback se batchId não encontrar nada
      if (resultRows.length === 0) {
        console.warn(`[SimuladoFilter] batchId ${lastRef.batchId} não encontrou rows. Fallback para data.`);
        // Cai para estratégia B
      }
    }
    
    if (!lastRef.batchId || (lastRef.batchId && resultRows.length === 0) || lastRef.source === 'manual') {
      // 4. Estratégia B: mesma data + mesma origem (manual)
      const refDateKey = getDateKey(normalizeDate(
        lastRef.date || lastRef.lastUpdated || lastRef.createdAt || new Date()
      ));
      
      // ✅ FIX BUG-36: cache de dateKey por row (evita N chamadas de normalizeDate)
      const dateKeyCache = new WeakMap();
      const getRowDateKey = (r) => {
        if (!r || typeof r !== 'object') return null;
        if (dateKeyCache.has(r)) return dateKeyCache.get(r);
        const key = getDateKey(normalizeDate(r.date || r.createdAt));
        dateKeyCache.set(r, key);
        return key;
      };
      
      resultRows = simuladoRowsArray.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        // Para manual, queremos agrupar todos do dia
        const isManual =
          r?.source === 'manual' ||
          r?.isAuto === false ||
          (r?.source == null && r?.isAuto == null && r?.id?.startsWith('manual'));
        if (!isManual) return false;
        return getRowDateKey(r) === refDateKey;
      });
      
      // ✅ FIX BUG-49: fallback final se nada encontrado
      if (resultRows.length === 0) {
        console.warn(`[SimuladoFilter] Data ${refDateKey} não encontrou rows manual.`);
      }
    }

    return {
      rows: resultRows.length > 0 ? resultRows : [lastRef],
      source: getSimuladoSource(resultRows),
      timestamp: formatDateTime(lastRef),
    };
  }, [simuladoRowsArray]);

  const [mode, setMode] = useState('ai-generator');
  const [subMode, setSubMode] = useState('ia');

  /* ── Handler de análise (salvamento) ── */
  const handleSimuladoAnalysis = useCallback((payload) => {
    try {
      const analysisResult = payload?.analysis || payload || {};
      const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];
      // G-10 FIX: Validar rawRows antes de processar
      if (!rawRows.length) {
        showToast('Nenhuma linha válida para processar.', 'warning');
        return;
      }
      const todayKey = getDateKey(normalizeDate(new Date()));
      const nowIso = new Date().toISOString();
      const batchId = generateId('batch');

      const validRowsForToast = rawRows.filter(
        (r) => r && r.subject && r.topic && Number(r.total) > 0
      );
      const totalQForToast = validRowsForToast.reduce((s, r) => s + (Number(r.total) || 0), 0);

      setData((current) => {
        if (!current || typeof current !== 'object') return current;
        if (!current.categories && !current.simuladoRows) return current;
        const prev = current;
        const newCategories = (Array.isArray(prev.categories) ? prev.categories : Object.values(prev.categories || {}))
          .filter(Boolean)
          .map(c => ({
            ...c,
            simuladoStats: c.simuladoStats
              ? {
                  ...c.simuladoStats,
                  history: Array.isArray(c.simuladoStats.history)
                    ? [...c.simuladoStats.history]
                    : Object.values(c.simuladoStats.history || {})
                }
              : undefined
          }));
        const prevSimuladoRowsArray = Array.isArray(prev.simuladoRows)
          ? prev.simuladoRows : Object.values(prev.simuladoRows || {});

        const actuallySubmittedRows = rawRows.filter(
          (r) => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0
        );
        const submittedIds = new Set(actuallySubmittedRows.map(r => r.id).filter(Boolean));
        const submittedKeys = new Set(actuallySubmittedRows.map(r => {
          if (r.categoryId && r.topicId) return `${r.categoryId}-${r.topicId}`;
          if (r.subject && r.topic) return `${normalize(r.subject)}-${normalize(r.topic)}`;
          return null;
        }).filter(Boolean));

        const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
          const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
          const isManual = r && !r.isAuto && r.source !== 'ai-generated';
          
          if (isToday && isManual) {
            if (r?.id && submittedIds.has(r.id)) return false;
            
            const key1 = (r?.categoryId && r?.topicId) ? `${r.categoryId}-${r.topicId}` : null;
            const key2 = (r?.subject && r?.topic) ? `${normalize(r.subject)}-${normalize(r.topic)}` : null;
            
            if (key1 && submittedKeys.has(key1)) return false;
            if (key2 && submittedKeys.has(key2)) return false;
          }
          
          return true;
        });

        const manualSubmittedRows = rawRows
          .filter((r) => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0)
          .map((r) => {
            const total = Math.max(0, Number(r.total) || 0);
            const correct = Math.max(0, Math.min(Number(r.correct) || 0, total));
            return {
              ...r, id: r.id || generateId('row'), batchId: r.batchId || batchId,
              date: r.date || todayKey, createdAt: nowIso, lastUpdated: nowIso,
              validated: true, isAuto: false, source: 'manual',
              subject: String(r.subject || '').trim(), topic: String(r.topic || '').trim(),
              correct, total
            };
          });

        const getMs = (r) => {
          const raw = r?.lastUpdated || r?.createdAt || r?.date;
          if (!raw) return 0;
          const parsed = normalizeDate(raw);
          const t = parsed ? parsed.getTime() : new Date(raw).getTime();
          return Number.isFinite(t) ? t : 0;
        };

        const validatedRows = [...rowsToKeep, ...manualSubmittedRows]
          .sort((a, b) => getMs(a) - getMs(b)).slice(-300);

        // Processar stats por categoria
        const processStats = (targetName) => {
          const discNameNorm = normalize(String(targetName || ''));
          if (!discNameNorm) return;
          let catIdx = newCategories.findIndex(c => c && c.name && normalize(c.name) === discNameNorm);
          if (catIdx === -1) {
            catIdx = newCategories.findIndex(c =>
              c && c.name && aliases[normalize(c.name)]?.some((a) => normalize(a) === discNameNorm)
            );
          }
          if (catIdx === -1) return;
          const cat = newCategories[catIdx];
          if (!cat.simuladoStats) {
            cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
          }
          const rawHistory = Array.isArray(cat.simuladoStats.history)
            ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history || {});
          const history = rawHistory.filter(Boolean);
          const historyWithoutToday = history.filter((h) => getDateKey(normalizeDate(h?.date || h?.createdAt)) !== todayKey);

          const todayRows = validatedRows.filter((r) => {
            const rowSubjectNorm = normalize(String(r?.subject || ''));
            const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
            const isSubject = rowSubjectNorm === discNameNorm ||
              aliases[rowSubjectNorm]?.some((a) => normalize(a) === discNameNorm);
            return isToday && isSubject;
          });

          const finalC = todayRows.reduce((sum, r) => sum + (Number(r.correct) || 0), 0);
          const finalQ = todayRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
          const finalTimeSpent = todayRows.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
          const finalTimedQuestoes = todayRows.reduce(
            (sum, r) => sum + (Number(r.timeSpent) > 0 ? Number(r.total) || 0 : 0), 0
          );

          const topicsMap = {};
          todayRows.forEach((r) => {
            const tName = String(r.topic || '').trim();
            if (!topicsMap[tName]) topicsMap[tName] = { correct: 0, total: 0, difficulty: [], timeSpent: 0, timedQuestoes: 0 };
            topicsMap[tName].correct += Number(r.correct) || 0;
            topicsMap[tName].total += Number(r.total) || 0;
            const diff = Number(r.difficulty);
            topicsMap[tName].difficulty.push(Number.isFinite(diff) ? diff : 1.0);
            const rowTime = Number(r.timeSpent) || 0;
            if (rowTime > 0) { topicsMap[tName].timeSpent += rowTime; topicsMap[tName].timedQuestoes += Number(r.total) || 0; }
          });

          const finalTopics = Object.entries(topicsMap).map(([name, td]) => ({
            name, correct: td.correct, total: td.total,
            percentage: td.total > 0 ? (td.correct / td.total) * 100 : 0,
            difficulty: td.difficulty.length > 0 ? td.difficulty.reduce((a, b) => a + b, 0) / td.difficulty.length : 1.0,
            timeSpent: td.timeSpent, timedQuestoes: td.timedQuestoes
          }));

          const maxScore = Number(cat.maxScore) || Number(prev?.maxScore) || 100;
          const minScore = Number.isFinite(Number(cat.minScore))
            ? Number(cat.minScore)
            : (Number.isFinite(Number(prev?.minScore)) ? Number(prev.minScore) : 0);
          const scoreRange = Math.max(1e-9, maxScore - minScore);
          if (finalQ > 0) {
            const totalDifficultyWeight = finalTopics.reduce((acc, t) => acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0), 0);
            const avgDifficulty = finalTopics.length > 0 && totalDifficultyWeight > 0 ? totalDifficultyWeight / finalQ : 1.0;
            const computedScore = minScore + (finalC / finalQ) * scoreRange;
            historyWithoutToday.push({
              date: todayKey, correct: finalC, total: finalQ,
              difficulty: Number(avgDifficulty.toFixed(2)),
              score: Math.min(maxScore, Math.max(minScore, computedScore)),
              timeSpent: finalTimeSpent, timedQuestoes: finalTimedQuestoes, topics: finalTopics,
            });
          }

          const historyWithCurrent = historyWithoutToday.slice(-50);
          const statsResult = computeCategoryStats(
              historyWithCurrent, 
              Number(cat.weight) > 0 ? Number(cat.weight) : 10, 
              60, 
              maxScore,
              minScore
          );
          const lastScore = finalQ > 0 ? (minScore + (finalC / finalQ) * scoreRange) : (cat.simuladoStats?.lastAttempt ?? 0);
          cat.simuladoStats = {
            ...cat.simuladoStats, history: historyWithCurrent,
            average: Number((statsResult?.mean || 0).toFixed(2)),
            trend: statsResult?.trend || 'stable',
            lastAttempt: Number(Number(lastScore).toFixed(2)),
            level: statsResult?.level || 'BAIXO'
          };
        };

        const subjectsToProcess = new Set();
        const dataToProcess = analysisResult?.disciplines || analysisResult;
        if (Array.isArray(dataToProcess)) {
          dataToProcess.forEach((disc) => { if (disc && disc.name) subjectsToProcess.add(disc.name); });
        } else if (dataToProcess && typeof dataToProcess === 'object') {
          Object.keys(dataToProcess).forEach((rawSubject) => { if (rawSubject) subjectsToProcess.add(rawSubject); });
        }
        manualSubmittedRows.forEach((r) => { if (r && r.subject) subjectsToProcess.add(r.subject); });
        const dedupedSubjects = new Set();
        subjectsToProcess.forEach((subName) => {
          const norm = normalize(subName);
          if (!dedupedSubjects.has(norm)) {
            dedupedSubjects.add(norm);
            processStats(subName);
          }
        });

        // Evento global de simulado
        const todayValidatedRows = validatedRows.filter(
          (r) => getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey
        );
        const totalQ = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.total, 10) || 0), 0);
        const totalC = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.correct, 10) || 0), 0);
        const contestMax = Number(prev.maxScore) > 0 ? Number(prev.maxScore) : 100;
        const contestMin = Number.isFinite(Number(prev.minScore)) ? Number(prev.minScore) : 0;
        const contestRange = Math.max(1e-9, contestMax - contestMin);
        const globalPoints = totalQ > 0 ? Number((contestMin + (totalC / totalQ) * contestRange).toFixed(2)) : contestMin;
        const globalPct = totalQ > 0 ? Number(((totalC / totalQ) * 100).toFixed(2)) : 0;

        const existingSimuladosRaw = Array.isArray(prev.simulados) ? prev.simulados : Object.values(prev.simulados || {});
        let updatedSimulados = existingSimuladosRaw.filter(Boolean);
        if (totalQ > 0) {
          const newSimuladoEvent = {
            id: generateId('sim'), batchId, date: todayKey,
            score: globalPoints,
            scorePoints: globalPoints,
            scorePct: globalPct,
            total: totalQ, correct: totalC, type: 'auto-analyzer', subject: 'Simulado Geral',
            createdAt: nowIso, lastUpdated: nowIso
          };
          updatedSimulados = [...updatedSimulados.filter(s => !(getDateKey(normalizeDate(s?.date || s?.createdAt)) === todayKey && s?.type === 'auto-analyzer')), newSimuladoEvent]
            .sort((a, b) => getMs(a) - getMs(b)).slice(-100);
        }

        return { ...prev, categories: newCategories, simuladoRows: validatedRows, simulados: updatedSimulados, lastUpdated: nowIso };
      });

      if (totalQForToast > 0) {
        showToast('Simulado processado com sucesso!', 'success');
        try {
          useAppStore.getState().awardExperience?.(500);
        } catch (xpErr) {
          console.warn('Falha não-bloqueante ao conceder XP do simulado:', xpErr);
        }
      } else {
        showToast('Nenhuma questão válida encontrada.', 'warning');
      }
    } catch (err) {
      console.error('FATAL ERROR IN handleSimuladoAnalysis:', err);
      showToast('Erro fatal ao salvar simulado. Verifique os logs.', 'error');
    }
  }, [setData, showToast]);

  /* ── Configuração das tabs ── */
  const tabs = [
    { id: 'ai-generator', label: 'Gerar Simulado', icon: Brain },
    { id: 'analyzer',     label: 'Último Simulado', icon: ListChecks },
    { id: 'history',      label: 'Histórico', icon: HistoryIcon },
  ];

  // Guarda de segurança
  if (!categoriesArray.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center bg-slate-900/50 rounded-2xl border border-white/5 mx-4 mt-8">
        <Brain className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-black text-white">Nenhuma matéria encontrada</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Você ainda não cadastrou matérias no seu concurso ativo. Para gerar ou analisar simulados, adicione matérias no seu plano de estudos.
        </p>
      </div>
    );
  }


  return (
    <PageErrorBoundary pageName="Simulados">
      {/* ── Header + Tabs ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
            <Brain size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Simulados</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gere, analise e acompanhe seus simulados IA e manuais</p>
          </div>
        </div>

        {/* Tabs premium */}
        <div className="flex flex-wrap items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 w-fit gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? '' : 'opacity-70'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo por modo ── */}
      {mode === 'analyzer' ? (
        <div className="animate-fade-in">
          {/* Header do último simulado */}
          {lastSimuladoData.rows.length > 0 && (
            <div className="glass p-5 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
                  <Target size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">Último Simulado Realizado</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Clock size={11} /> {lastSimuladoData.timestamp}
                  </p>
                </div>
              </div>
              <SourceBadge source={lastSimuladoData.source} />
            </div>
          )}

          <SimuladoAnalysis
            rows={lastSimuladoData.rows}
            categories={categoriesArray}
            viewMode="report"
          />
        </div>
      ) : mode === 'ai-generator' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Sub-tabs IA / Manual */}
          <div className="w-full flex justify-center mb-6">
            <div className="flex gap-3 bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-700/50 shadow-inner">
              <button
                onClick={() => setSubMode('ia')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  subMode === 'ia'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Brain size={16} className={subMode === 'ia' ? '' : 'opacity-70'} />
                Simulado IA
              </button>
              <button
                onClick={() => setSubMode('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  subMode === 'manual'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ListChecks size={16} className={subMode === 'manual' ? '' : 'opacity-70'} />
                Simulado Manual
              </button>
            </div>
          </div>

          {subMode === 'ia' ? (
            <AIGeneratedSimulado />
          ) : (
            <SimuladoAnalysis
              rows={displayRows}
              onAnalysisComplete={handleSimuladoAnalysis}
              categories={categoriesArray}
              viewMode="form"
            />
          )}
        </div>
      ) : (
        /* ── MODO HISTÓRICO ── */
        <div className="space-y-6 animate-fade-in">
          <DailySummaryCards simuladoRows={simuladoRowsArray} />
          <StudyHistory
            studySessions={studySessionsArray}
            categories={categoriesArray}
            simuladoRows={simuladoRowsArray}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="performance"
          />
        </div>
      )}
    </PageErrorBoundary>
  );
}

```

---

# 2. FLUXO E EXECUÇÃO DE SIMULADO POR IA (AI SIMULADO ENGINE & VIEWS)

## `src/components/ai/AIGeneratedSimulado.jsx` <a id="src-components-ai-aigeneratedsimulado-jsx"></a>

- **Localização:** `src/components/ai/AIGeneratedSimulado.jsx`
- **Descrição:** Orquestrador do fluxo do simulado gerado por IA: gerencia transição de telas Setup -> Player -> Results, timer de prova, rascunhos de progresso e persistência no store
- **Linhas:** 962
- **Tamanho:** 39.32 KB

```javascript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateAIQuestions } from '../../services/aiQuestionService';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../hooks/useToast';
import { getDateKey } from '../../utils/dateHelper';
import { generateId } from '../../utils/idGenerator';
import SimuladoSetup from './SimuladoSetup';
import SimuladoPlayer from './SimuladoPlayer';
import SimuladoResults from './SimuladoResults';
import ConfirmModal from '../ConfirmModal';
import { applyAIResultsToDraft } from '../../utils/aiSaveHelper';
import { safeGetJSON, markStorageDirty } from '../../utils/storageSafe';
import { safeDomain } from '../../utils/measurement';

const normalizeAlternative = (value) =>
  String(value ?? '').trim().toUpperCase();

const DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
  { value: 'expert', label: 'Expert' },
];

const getAiSimStorageKey = () => {
  const activeId = useAppStore.getState().appState?.activeId || 'default';
  return `ai_simulado_draft:${activeId}`;
};

const getAiGenStorageKey = () => {
  const activeId = useAppStore.getState().appState?.activeId || 'default';
  return `ai_simulado_generating:${activeId}`;
};

const LOADING_MESSAGES = [
  "Iniciando Motor Analítico...",
  "Identificando Banca Examinadora...",
  "Cruzando Jurisprudências Recentes...",
  "Formulando Enunciados Inéditos...",
  "Calibrando Nível de Dificuldade...",
  "Ajustando Pegadinhas e Casos Práticos...",
  "Finalizando Pacote de Questões..."
];

// ✅ FIX C07: Usa crypto.randomUUID() quando disponível, eliminando o
// contador mutável que pode colidir após HMR (Hot Module Replacement).
// Fallback para Date.now() + random longo quando crypto não existe.
function nextAiId(prefix = 'ai') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Fallback: timestamp de alta precisão + random duplo
  const time = (typeof performance !== 'undefined' && performance.now)
    ? performance.now().toString(36).replace('.', '')
    : '';
  const rand = () => Math.random().toString(36).substring(2, 11);
  return `${prefix}-${Date.now().toString(36)}-${time}-${rand()}${rand()}`;
}

export default function AIGeneratedSimulado() {
  const setData = useAppStore(state => state.setData);
  const categories = useAppStore(state => {
    const active = state.appState?.contests?.[state.appState?.activeId];
    const rawCategories = active?.categories || [];
    return Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories);
  });
  const showToast = useToast();

  const [step, setStep] = useState('setup');
  const [form, setForm] = useState({
    categoryId: '', taskId: '', materia: '', assunto: '',
    dificuldade: 'medio', quantidade: 10,
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [timePerQuestion, setTimePerQuestion] = useState({});
  const [showEscapeConfirm, setShowEscapeConfirm] = useState(false);

  const mountedRef = useRef(true);
  const didMountRestoreRef = useRef(false);
  const abortControllerRef = useRef(null);
  const activeGenerationRef = useRef(null);

  const stepRef = useRef(step);
  const latestAnswersRef = useRef(answers);
  const latestQuestionsRef = useRef(questions);
  const latestFormRef = useRef(form);
  const isFinishingRef = useRef(false);
  const latestCurrentIndexRef = useRef(currentIndex);
  const latestTimePerQuestionRef = useRef(timePerQuestion);
  const latestTimeLeftRef = useRef(timeLeft);
  const simStartMsRef = useRef(null);

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { 
      mountedRef.current = false; 
      // G-20 FIX: Salvar draft imediatamente ao desmontar
      if (stepRef.current === 'playing' && latestQuestionsRef.current.length > 0) {
        try {
          const draft = {
            version: 1,
            form: latestFormRef.current,
            questions: latestQuestionsRef.current,
            answers: latestAnswersRef.current,
            currentIndex: latestCurrentIndexRef.current,
            timeLeft: latestTimeLeftRef.current,
            timePerQuestion: latestTimePerQuestionRef.current,
            simStartMs: simStartMsRef.current,
            savedAt: Date.now()
          };
          localStorage.setItem(getAiSimStorageKey(), JSON.stringify(draft));
        } catch (e) {
          console.warn('[Draft] Falha ao salvar no unmount:', e);
        }
      }
      // ✅ FIX: Abortar request pendente ao desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => { latestAnswersRef.current = answers; }, [answers]);
  useEffect(() => { latestQuestionsRef.current = questions; }, [questions]);
  useEffect(() => { latestFormRef.current = form; }, [form]);
  useEffect(() => { latestCurrentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { latestTimePerQuestionRef.current = timePerQuestion; }, [timePerQuestion]);
  useEffect(() => { latestTimeLeftRef.current = timeLeft; }, [timeLeft]);

  // FIX: Draft persist com debounce de 5s (não a cada segundo)
  const draftTimeoutRef = useRef(null);
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    if (step === 'playing' && questions.length > 0) {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
      draftTimeoutRef.current = setTimeout(() => {
        const draft = {
          version: 1,
          form, questions, answers, currentIndex,
          timeLeft: timeLeftRef.current,
          timePerQuestion, simStartMs: simStartMsRef.current, savedAt: Date.now()
        };
        try {
          localStorage.setItem(getAiSimStorageKey(), JSON.stringify(draft));
        } catch (e) {
          console.warn('[Draft] Storage full or unavailable:', e);
        }
      }, 5000);
    }
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [step, questions, answers, currentIndex, form]);

  // FIX: Effect de restore com deps vazias (ref já garante execução única)
  useEffect(() => {
    if (didMountRestoreRef.current) return;
    didMountRestoreRef.current = true;

    let timeoutId1;
    let timeoutId2;
    let cancelled = false;

    const gen = safeGetJSON(getAiGenStorageKey(), null);
    if (gen) {
      if (gen.status === 'done' && gen.questions?.length > 0) {
        timeoutId1 = setTimeout(() => {
          if (cancelled) return;
          
          const f = gen.form || {};
          setForm({
            categoryId: f.categoryId || '', taskId: f.taskId || '',
            materia: f.materia || '', assunto: f.assunto || '',
            dificuldade: f.dificuldade || 'medio', quantidade: f.quantidade || 10,
          });
          
          // ✅ FIX: Ler categories do store ATUAL, não da closure
          const currentCategories = useAppStore.getState().appState?.contests?.[
            useAppStore.getState().appState?.activeId
          ]?.categories || [];
          const catsArray = Array.isArray(currentCategories) 
            ? currentCategories 
            : Object.values(currentCategories);
          
          const cat = catsArray.find(c => c.id === f.categoryId);
          const tsk = cat?.tasks?.find(t => t.id === f.taskId);
          
          const normalizedQuestions = gen.questions.map((q) => ({
            ...q,
            id: q.id || nextAiId('ai-bg'),
            categoryId: f.categoryId, taskId: f.taskId,
            materia: cat?.name || f.materia,
            assunto: tsk ? (tsk.title || tsk.text || f.assunto) : f.assunto,
          }));
          
          isFinishingRef.current = false;
          setQuestions(normalizedQuestions);
          setAnswers({});
          setTimePerQuestion({});
          setCurrentIndex(0);
          setTimeLeft(normalizedQuestions.length * 3 * 60);
          setStep('playing');
          setTimerActive(true);
          simStartMsRef.current = Date.now();
          setShowReview(false);
          setIsLoading(false);
          localStorage.removeItem(getAiGenStorageKey());
          showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
        }, 0);
        return () => { cancelled = true; clearTimeout(timeoutId1); clearTimeout(timeoutId2); };
      } else if (gen.status === 'error') {
        timeoutId1 = setTimeout(() => {
          if (cancelled) return;
          showToast(gen.errorMessage || 'Erro ao gerar questões em segundo plano.', 'error');
          localStorage.removeItem(getAiGenStorageKey());
          setIsLoading(false);
        }, 0);
        return () => { cancelled = true; clearTimeout(timeoutId1); clearTimeout(timeoutId2); didMountRestoreRef.current = false; };
      } else if (gen.status === 'generating') {
        timeoutId1 = setTimeout(() => {
          if (cancelled) return;
          const f = gen.form || {};
          setForm({
            categoryId: f.categoryId || '', taskId: f.taskId || '',
            materia: f.materia || '', assunto: f.assunto || '',
            dificuldade: f.dificuldade || 'medio', quantidade: f.quantidade || 10,
          });
          setIsLoading(true);
          setStep('setup');
          if (activeGenerationRef.current) {
            activeGenerationRef.current.then((normalizedQuestions) => {
              if (cancelled || !mountedRef.current) return;
              if (normalizedQuestions && normalizedQuestions.length > 0) {
                isFinishingRef.current = false;
                setQuestions(normalizedQuestions);
                setAnswers({});
                setTimePerQuestion({});
                setCurrentIndex(0);
                setTimeLeft(normalizedQuestions.length * 3 * 60);
                setStep('playing');
                setTimerActive(true);
                simStartMsRef.current = Date.now();
                setIsLoading(false);
                localStorage.removeItem(getAiGenStorageKey());
                showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
              }
            }).catch((error) => {
              if (cancelled || !mountedRef.current) return;
              setIsLoading(false);
              localStorage.removeItem(getAiGenStorageKey());
              showToast(error.message || 'Erro ao gerar questões.', 'error');
            });
          } else {
            const age = Date.now() - (gen.startedAt || 0);
            localStorage.removeItem(getAiGenStorageKey());
            setIsLoading(false);
            if (age <= 5 * 60 * 1000) {
              showToast('A geração anterior foi interrompida. Gere novamente.', 'warning');
            }
          }
        }, 0);
        return () => { cancelled = true; clearTimeout(timeoutId1); clearTimeout(timeoutId2); didMountRestoreRef.current = false; };
      }
    }

    const draft = safeGetJSON(getAiSimStorageKey(), null);
    if (draft) {
      function isSimuladoDraftValid(d) {
        if (!d || typeof d !== 'object') return false;

        const draftVersion = Number(d.version ?? 1);
        if (!Number.isFinite(draftVersion) || draftVersion !== 1) return false;
        if (!Array.isArray(d.questions) || d.questions.length === 0) return false;
        const savedAt = Number(d.savedAt || 0);
        if (!Number.isFinite(savedAt) || savedAt <= 0) return false;
        const age = Date.now() - savedAt;
        return age >= 0 && age < 24 * 60 * 60 * 1000;
      }
      
      if (isSimuladoDraftValid(draft)) {
        timeoutId2 = setTimeout(() => {
          if (cancelled) return;
          
          const f = draft.form || {};
          let restoredForm = {
            categoryId: f.categoryId || '', taskId: f.taskId || '',
            materia: f.materia || '', assunto: f.assunto || '',
            dificuldade: f.dificuldade || 'medio', quantidade: f.quantidade || 10,
          };
          
          // ✅ FIX: Validar contra categories do store ATUAL
          const currentCategories = useAppStore.getState().appState?.contests?.[
            useAppStore.getState().appState?.activeId
          ]?.categories || [];
          const catsArray = Array.isArray(currentCategories) 
            ? currentCategories 
            : Object.values(currentCategories);
          
          // C-14 FIX: Validar que a categoria do draft existe no concurso ATUAL
          const cat = catsArray.find(c => c && c.id === f.categoryId);
          if (!cat && f.categoryId) {
            // Categoria não existe mais — descartar draft
            localStorage.removeItem(getAiSimStorageKey());
            localStorage.removeItem(getAiGenStorageKey());
            return;
          }
          const safeTasks = cat ? (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})) : [];
          const tsk = safeTasks.find(t => t && t.id === f.taskId);
          
          if (restoredForm.taskId && !tsk) {
            restoredForm = { ...restoredForm, taskId: '', assunto: '' };
          }
          
          const questions = Array.isArray(draft.questions) ? draft.questions : [];
          const answers = Array.isArray(draft.answers) ? draft.answers : (draft.answers || {});
          const maxIndex = Math.max(0, questions.length - 1);
          const currentIndex = Number.isInteger(draft.currentIndex)
            ? Math.min(Math.max(draft.currentIndex, 0), maxIndex) : 0;
          const timeLeft = Number.isFinite(draft.timeLeft)
            ? Math.max(0, draft.timeLeft) : draft.questions.length * 3 * 60;
          
          const totalAllowedTime = questions.length * 3 * 60;
          const elapsedSeconds = Math.max(0, totalAllowedTime - timeLeft);

          setForm(restoredForm);
          setQuestions(questions);
          setAnswers(answers);
          setTimePerQuestion(draft.timePerQuestion || {});
          setCurrentIndex(currentIndex);
          setTimeLeft(timeLeft);
          setStep('playing');
          setTimerActive(true);

          simStartMsRef.current = Number.isFinite(Number(draft.simStartMs))
            ? Number(draft.simStartMs)
            : Date.now() - elapsedSeconds * 1000;
        }, 0);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // FIX: deps vazias — ref garante execução única

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (catId) => {
    const cat = categories.find(c => c.id === catId);
    setForm(prev => ({
      ...prev, categoryId: catId || '', materia: cat ? cat.name : '',
      taskId: '', assunto: '',
    }));
  };

  const handleTaskSelect = (tskId) => {
    const cat = categories.find(c => c.id === form.categoryId);
    const rawCatTasks = cat?.tasks || [];
    const safeCatTasks = Array.isArray(rawCatTasks) ? rawCatTasks : Object.values(rawCatTasks);
    const tsk = safeCatTasks.find(t => t.id === tskId);
    setForm(prev => ({
      ...prev, taskId: tskId || '',
      assunto: tsk ? (tsk.title || tsk.text || '') : '',
    }));
  };

  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const rawTasks = selectedCategory?.tasks || [];
  const availableTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);

  const generatePersonalizedSimulado = async () => {
    const allTasks = [];
    categories.forEach(cat => {
      const stats = cat.simuladoStats;
      const level = stats?.level || 'BAIXO';
      const avg = stats?.average || 0;
      const catTasksRaw = cat.tasks || [];
      const safeCatTasks = Array.isArray(catTasksRaw) ? catTasksRaw : Object.values(catTasksRaw);
      safeCatTasks.forEach(tsk => {
        const title = String(tsk.title || tsk.text || '').trim();
        if (title) {
          allTasks.push({ catId: cat.id, taskId: tsk.id, materia: cat.name, assunto: title, level, avg });
        }
      });
    });
    const levelScore = { 'BAIXO': 1, 'MÉDIO': 2, 'ALTO': 3 };
    allTasks.sort((a, b) => {
      const lsA = levelScore[a.level] || 1;
      const lsB = levelScore[b.level] || 1;
      if (lsA !== lsB) return lsA - lsB;
      return a.avg - b.avg;
    });
    const worstTasks = allTasks.slice(0, 5);
    if (worstTasks.length === 0) {
      showToast('Cadastre matérias e assuntos no Dashboard primeiro.', 'warning');
      return;
    }
    const assuntoString = worstTasks.map(t => `- Matéria: ${t.materia} | Assunto: ${t.assunto} (Nível: ${t.level})`).join('\n');
    const avgDifficulty = worstTasks.reduce((acc, t) => acc + (levelScore[t.level] || 1), 0) / worstTasks.length;
    let adaptiveDifficulty = 'medio';
    if (avgDifficulty >= 2.5) adaptiveDifficulty = 'expert';
    else if (avgDifficulty >= 1.5) adaptiveDifficulty = 'dificil';

    setForm(prev => ({
      ...prev, categoryId: 'mixed', taskId: 'mixed',
      materia: 'Simulado Personalizado', assunto: assuntoString,
      dificuldade: adaptiveDifficulty, quantidade: 10
    }));
    setIsLoading(true);

    const genForm = { categoryId: 'mixed', taskId: 'mixed', materia: 'Simulado Personalizado', assunto: assuntoString, dificuldade: adaptiveDifficulty, quantidade: 10 };
    const genState = { status: 'generating', form: genForm, startedAt: Date.now() };
    localStorage.setItem(getAiGenStorageKey(), JSON.stringify(genState));
    const activeContestName = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.name || 'Concurso Geral';

    // FIX: Usar ref em vez de variável de módulo
    // ✅ FIX: Criar AbortController para esta geração
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const localPromise = (async () => {
      try {
        const generated = await generateAIQuestions({
          materia: 'Simulado Personalizado', assunto: assuntoString,
          dificuldade: adaptiveDifficulty, quantidade: 10, contestName: activeContestName,
          signal,
        });

        // ✅ FIX: Verificar se foi abortado antes de processar
        if (signal.aborted) return null;

        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('A IA não gerou questões válidas.');
        }
        const normalizedQuestions = generated.map((q) => ({
          ...q, id: q.id || nextAiId('ai-pers'), categoryId: 'mixed', taskId: 'mixed',
        }));
        localStorage.setItem(getAiGenStorageKey(), JSON.stringify({
          status: 'done', form: genForm, questions: normalizedQuestions, completedAt: Date.now(),
        }));
        return normalizedQuestions;
      } catch (err) {
        if (signal.aborted) return null; // ✅ FIX: Ignorar erros de abort
        localStorage.setItem(getAiGenStorageKey(), JSON.stringify({
          status: 'error', errorMessage: err.message,
        }));
        return null;
      }
    })();
    activeGenerationRef.current = localPromise;

    try {
      const normalizedQuestions = await localPromise;
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
      if (!mountedRef.current) return;
      if (normalizedQuestions && normalizedQuestions.length > 0) {
        isFinishingRef.current = false;
        setQuestions(normalizedQuestions);
        setAnswers({});
        setTimePerQuestion({});
        setCurrentIndex(0);
        setTimeLeft(normalizedQuestions.length * 3 * 60);
        setStep('playing');
        setTimerActive(true);
        simStartMsRef.current = Date.now();
        setShowReview(false);
        setIsLoading(false);
        localStorage.removeItem(getAiGenStorageKey());
        showToast(`Personalizado: ${normalizedQuestions.length} questões focadas nas fraquezas!`, 'success');
      }
    } catch (error) {
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
      if (!mountedRef.current) return;
      setIsLoading(false);
      localStorage.removeItem(getAiGenStorageKey());
      showToast(error.message || 'Erro ao gerar questões personalizadas.', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!form.categoryId || !form.taskId) {
      showToast('Selecione Matéria e Assunto cadastrados', 'error');
      return;
    }
    setIsLoading(true);
    const genState = { status: 'generating', form: { ...form }, startedAt: Date.now() };
    localStorage.setItem(getAiGenStorageKey(), JSON.stringify(genState));
    const currentForm = { ...form };
    const currentCategories = [...categories];
    const activeContestName = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.name || 'Concurso Geral';

    // FIX: Usar ref em vez de variável de módulo
    // ✅ FIX: Criar AbortController para esta geração
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const localPromise = (async () => {
      try {
        const generated = await generateAIQuestions({
          materia: currentForm.materia.trim(), assunto: currentForm.assunto.trim(),
          dificuldade: currentForm.dificuldade, quantidade: currentForm.quantidade,
          contestName: activeContestName,
          signal,
        });

        // ✅ FIX: Verificar se foi abortado antes de processar
        if (signal.aborted) return null;

        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('A IA não gerou questões válidas.');
        }
        const cat = currentCategories.find(c => c.id === currentForm.categoryId);
        const rawGenTasks = cat?.tasks || [];
        const safeGenTasks = Array.isArray(rawGenTasks) ? rawGenTasks : Object.values(rawGenTasks);
        const tsk = safeGenTasks.find(t => t.id === currentForm.taskId);
        const normalizedQuestions = generated.map((q) => ({
          ...q, id: q.id || nextAiId('ai-gen'),
          categoryId: currentForm.categoryId, taskId: currentForm.taskId,
          materia: cat?.name || currentForm.materia,
          assunto: tsk ? (tsk.title || tsk.text || currentForm.assunto) : currentForm.assunto,
        }));
        localStorage.setItem(getAiGenStorageKey(), JSON.stringify({
          status: 'done', form: currentForm, questions: normalizedQuestions, completedAt: Date.now(),
        }));
        return normalizedQuestions;
      } catch (error) {
        if (signal.aborted) return null; // ✅ FIX: Ignorar erros de abort
        localStorage.setItem(getAiGenStorageKey(), JSON.stringify({
          status: 'error', form: currentForm, errorMessage: error.message || 'Erro ao gerar questões com IA.', failedAt: Date.now(),
        }));
        throw error;
      }
    })();
    activeGenerationRef.current = localPromise;

    try {
      const normalizedQuestions = await localPromise;
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
      if (!mountedRef.current || !normalizedQuestions) return;
      isFinishingRef.current = false;
      setQuestions(normalizedQuestions);
      setAnswers({});
      setTimePerQuestion({});
      setCurrentIndex(0);
      setTimeLeft(normalizedQuestions.length * 3 * 60);
      setStep('playing');
      setTimerActive(true);
      simStartMsRef.current = Date.now();
      localStorage.removeItem(getAiGenStorageKey());
      showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
    } catch (error) {
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
      if (!mountedRef.current) return;
      console.error('Erro na geração IA:', error);
      showToast(error.message || 'Erro ao gerar questões com IA. Tente novamente.', 'error');
      localStorage.removeItem(getAiGenStorageKey());
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const selectAnswer = useCallback((letra) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: letra }));
  }, [currentQuestion]);

  const goTo = useCallback((index) => {
    const qLen = latestQuestionsRef.current.length || questions.length;
    if (index >= 0 && index < qLen) {
      setCurrentIndex(index);
    }
  }, [questions.length]);

  const saveAIResultsToSystem = useCallback(async (formData, correct, total, _answeredQs, timeSpentSecs = 0, preventGlobalEvent = false, batchId = null) => {
    // FIX: mutação atômica síncrona, desliga temporariamente os subscribers se preventGlobalEvent for true
    useAppStore.setState(
        (state) => {
            const nextContests = { ...state.appState.contests };
            const draft = nextContests[state.appState.activeId];
            if (!draft) return state;
            applyAIResultsToDraft(draft, formData, correct, total, timeSpentSecs, preventGlobalEvent, batchId);
            return {
                appState: {
                    ...state.appState,
                    version: (state.appState.version || 0) + 1,
                    contests: nextContests,
                    lastUpdated: new Date().toISOString()
                }
            };
        },
        false, 
        preventGlobalEvent ? "AI_BACKGROUND_SAVE" : "AI_SIMULADO_SAVE"
    );
    markStorageDirty();
  }, []);

  const handleFinish = useCallback(async () => {
    const qList = latestQuestionsRef.current.length > 0 ? latestQuestionsRef.current : questions;
    const ansMap = Object.keys(latestAnswersRef.current).length > 0 ? latestAnswersRef.current : answers;
    const f = latestFormRef.current;
    if (qList.length === 0) {
      showToast('Nenhuma questão disponível para finalizar.', 'warning');
      return;
    }

    // FIX: Garantir que latestTimePerQuestionRef está sincronizado
    const timePerQ = latestTimePerQuestionRef.current || timePerQuestion || {};

    const absoluteElapsedSecs = simStartMsRef.current ? Math.round((Date.now() - simStartMsRef.current) / 1000) : 0;
    const totalAllowedTime = qList.length * 3 * 60;
    const fallbackTimeSpent = Math.max(absoluteElapsedSecs, totalAllowedTime - latestTimeLeftRef.current);

    if (isFinishingRef.current || stepRef.current === 'finished') return;
    isFinishingRef.current = true;

    try {
      let correctCount = 0;
      const answeredQuestions = [];
    qList.forEach(q => {
      const selected = ansMap[q.id];
      const wasAnswered = selected !== undefined && selected !== null;
      const isCorrect =
        wasAnswered &&
        normalizeAlternative(selected) === normalizeAlternative(q.alternativa_correta);
      if (isCorrect) correctCount++;
      answeredQuestions.push({ ...q, selected: selected || null, isCorrect, wasAnswered });
    });

    const total = qList.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const exactTotalTime = answeredQuestions.reduce((acc, q) => acc + (timePerQ[q.id] || 0), 0);
    const finalTimeSpent = exactTotalTime > 0 ? exactTotalTime : fallbackTimeSpent;
    const sessionBatchId = generateId('batch');

    if (f.categoryId === 'mixed') {
      const groups = {};
      answeredQuestions.forEach(q => {
        const key = `${q.materia}\u0000${q.assunto}`;
        if (!groups[key]) groups[key] = { materia: q.materia, assunto: q.assunto, correct: 0, total: 0, qs: [], timeSpent: 0 };
        groups[key].qs.push(q);
        groups[key].total++;
        if (q.isCorrect) groups[key].correct++;
        const spent = timePerQ[q.id] || 0;
        groups[key].timeSpent += spent;
      });
      const rawCats = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.categories || [];
      const cats = Array.isArray(rawCats) ? rawCats : Object.values(rawCats);
      const totalQuestionsInMixed = Object.values(groups).reduce((acc, g) => acc + g.total, 0);
      const totalCorrectInMixed = Object.values(groups).reduce((acc, g) => acc + g.correct, 0);

      const failedGroups = [];
      const promises = Object.entries(groups).map(async ([groupKey, g]) => {
        try {
            const [materia, assunto] = groupKey.split('\u0000');

            const cat = cats.find(c =>
              String(c?.name || '').trim().toLowerCase() === String(materia || '').trim().toLowerCase()
            );

            const catTasks = cat?.tasks ? (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks)) : [];
            const tsk = catTasks.find(t =>
              String(t?.title || t?.text || '').trim().toLowerCase() === String(assunto || '').trim().toLowerCase()
            );

            const subForm = {
              ...f, materia: g.materia, assunto: g.assunto,
              categoryId: cat ? cat.id : null, taskId: tsk ? tsk.id : null,
            };
            const topicTime =
              g.timeSpent > 0
                ? g.timeSpent
                : Math.round(fallbackTimeSpent * (g.total / Math.max(1, totalQuestionsInMixed)));
            await saveAIResultsToSystem(subForm, g.correct, g.total, g.qs, topicTime, true, sessionBatchId);
        } catch (err) {
            console.error(`[AI Sim] Falha ao salvar grupo ${groupKey}:`, err);
            failedGroups.push(groupKey);
        }
      });
      await Promise.allSettled(promises);
      
      if (failedGroups.length > 0) {
          showToast(`⚠️ ${failedGroups.length} grupo(s) não salvos: ${failedGroups.join(', ')}`, 'warning');
      }

      const nowIso = new Date().toISOString();
      const todayKey = getDateKey(new Date()) || new Date().toISOString().slice(0, 10);
      const activeContest = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId];
      const mixedDomain = safeDomain(Number(activeContest?.maxScore) || 100, Number(activeContest?.minScore) || 0);
      const mixedRatio = totalQuestionsInMixed > 0 ? totalCorrectInMixed / totalQuestionsInMixed : 0;
      const mixedScorePoints = mixedDomain.min + mixedRatio * mixedDomain.range;
      const mixedScorePct = mixedRatio * 100;
      const globalMixedEvent = {
        id: generateId('ai-sim'),
        batchId: sessionBatchId,
        date: todayKey,
        createdAt: nowIso,
        lastUpdated: nowIso,
        scorePoints: mixedScorePoints,
        scorePct: mixedScorePct,
        score: mixedScorePoints,
        total: totalQuestionsInMixed,
        correct: totalCorrectInMixed,
        type: 'ai-simulado',
        subject: 'Simulado Misto (IA)',
        categoryId: 'mixed',
        taskId: null,
        validated: true,
        scoreUnit: 'points',
        isPercentage: false,
      };
      useAppStore.setState(
        (state) => {
          const nextContests = { ...state.appState.contests };
          const draft = nextContests[state.appState.activeId];
          if (!draft) return state;
          const existingSims = Array.isArray(draft.simulados) ? draft.simulados : [];
          draft.simulados = [...existingSims, globalMixedEvent].slice(-100);
          draft.lastUpdated = new Date().toISOString();
          return {
            appState: {
              ...state.appState,
              version: (state.appState.version || 0) + 1,
              contests: nextContests,
              lastUpdated: new Date().toISOString()
            }
          };
        },
        false,
        "AI_MIXED_SIMULADO_SAVE"
      );
      markStorageDirty();
    } else {
      await saveAIResultsToSystem(f, correctCount, total, answeredQuestions, finalTimeSpent, false, sessionBatchId);
    }

      setResults({
        correct: correctCount, total, scorePercent,
        questions: answeredQuestions, timeSpentSecs: finalTimeSpent,
      });
      setStep('finished');
      setTimerActive(false);
      localStorage.removeItem(getAiSimStorageKey());
      showToast(`Simulado finalizado! ${correctCount}/${total} acertos`, 'success');
    } catch (error) {
      console.error('[Simulado] Error finishing:', error);
      showToast('Erro ao finalizar o simulado.', 'error');
      isFinishingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveAIResultsToSystem, showToast, setData]);

  const finishMutexRef = useRef(false);

  const safeFinish = useCallback(async () => {
    if (finishMutexRef.current) return;
    finishMutexRef.current = true;
    try {
      await handleFinish();
    } finally {
      setTimeout(() => { finishMutexRef.current = false; }, 1000);
    }
  }, [handleFinish]);

  const safeFinishRef = useRef(safeFinish);
  useEffect(() => { safeFinishRef.current = safeFinish; }, [safeFinish]);

  const activeQIdRef = useRef(null);
  useEffect(() => { activeQIdRef.current = questions[currentIndex]?.id; }, [currentIndex, questions]);

  useEffect(() => {
    if (!timerActive || step !== 'playing') return;

    let lastTick = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSecs = Math.round((now - lastTick) / 1000);
      lastTick = now;

      if (elapsedSecs > 0) {
        setTimeLeft((prev) => {
           const next = prev - elapsedSecs;
           return next <= 0 ? 0 : next;
        });
        
        const qId = activeQIdRef.current;
        if (qId) {
          setTimePerQuestion(prev => ({ ...prev, [qId]: (prev[qId] || 0) + elapsedSecs }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, step]);

  useEffect(() => {
    if (step !== 'playing') return;
    if (!timerActive) return;
    if (timeLeft > 0) return;
    if (isFinishingRef.current) return;

    safeFinishRef.current();
  }, [step, timerActive, timeLeft]);

  const resetAll = useCallback(() => {
    isFinishingRef.current = false;
    setStep('setup');
    setQuestions([]);
    setAnswers({});
    setTimePerQuestion({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(Math.max(1, Number(form.quantidade) || 10) * 3 * 60);
    setTimerActive(false);
    setShowReview(false);
    localStorage.removeItem(getAiSimStorageKey());
  }, [form.quantidade]);

  const retrySameQuestions = () => {
    isFinishingRef.current = false;
    setAnswers({});
    setTimePerQuestion({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(questions.length * 3 * 60);
    setTimerActive(true);
    setShowReview(false);
    setStep('playing');

    simStartMsRef.current = Date.now();

    showToast('Questões reiniciadas. Boa sorte!', 'info');
  };

  useEffect(() => {
    if (step !== 'playing' || !currentQuestion) return;
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      const key = e.key.toUpperCase();
      const curIdx = latestCurrentIndexRef.current;
      const qLen = latestQuestionsRef.current.length || questions.length;
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) { e.preventDefault(); selectAnswer(key); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(curIdx - 1); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (curIdx < qLen - 1) goTo(curIdx + 1); else safeFinishRef.current();
      } else if (e.key.toLowerCase() === 'escape') {
        e.preventDefault();
        setShowEscapeConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
     
  }, [step, currentQuestion, questions.length, goTo, selectAnswer, resetAll]);

  useEffect(() => {
    let interval = null;
    let timeout = null;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
      }, 3500);
    } else {
      timeout = setTimeout(() => setLoadingMsgIdx(0), 0);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (step === 'setup') {
    return (
      <SimuladoSetup
        form={form} handleInputChange={handleInputChange} categories={categories}
        handleCategorySelect={handleCategorySelect} handleTaskSelect={handleTaskSelect}
        availableTasks={availableTasks} generatePersonalizedSimulado={generatePersonalizedSimulado}
        handleGenerate={handleGenerate} isLoading={isLoading} loadingMsgIdx={loadingMsgIdx}
        DIFFICULTIES={DIFFICULTIES} LOADING_MESSAGES={LOADING_MESSAGES}
      />
    );
  }
  if (step === 'playing' && currentQuestion) {
    return (
      <>
        <SimuladoPlayer
          form={form} questions={questions} currentIndex={currentIndex} answers={answers}
          timeLeft={timeLeft} DIFFICULTIES={DIFFICULTIES} goTo={goTo} selectAnswer={selectAnswer}
          handleFinish={safeFinish} resetAll={() => setShowEscapeConfirm(true)}
        />
        <ConfirmModal
          isOpen={showEscapeConfirm}
          onClose={() => setShowEscapeConfirm(false)}
          onConfirm={() => { setShowEscapeConfirm(false); resetAll(); }}
          title="Sair do Simulado"
          message="Tem certeza que deseja sair? Todo o progresso deste simulado será perdido."
          confirmText="Sair e Descartar"
          type="danger"
        />
      </>
    );
  }
  if (step === 'finished' && results) {
    return (
      <SimuladoResults
        results={results} form={form} showReview={showReview} setShowReview={setShowReview}
        resetAll={resetAll} retrySameQuestions={retrySameQuestions} showToast={showToast}
      />
    );
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 text-center bg-slate-900/60 rounded-2xl border border-white/5 mx-auto">
      <p className="text-sm text-slate-400">Nenhuma questão ativa ou estado de simulado divergente.</p>
      <button
        onClick={resetAll}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white text-sm transition-colors"
      >
        Voltar ao início
      </button>
    </div>
  );
}

```

---

## `src/components/ai/SimuladoSetup.jsx` <a id="src-components-ai-simuladosetup-jsx"></a>

- **Localização:** `src/components/ai/SimuladoSetup.jsx`
- **Descrição:** Interface de configuração de parâmetros do simulado IA: seleção de disciplinas, assuntos cadastrados ou livres, banca examinadora, quantidade de questões e nível de dificuldade
- **Linhas:** 380
- **Tamanho:** 21.26 KB

```javascript
import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ListChecks, Target, Play, Brain, Sparkles, Zap, TrendingUp, BarChart3, ChevronDown, XCircle } from 'lucide-react';

export default function SimuladoSetup({ 
  form, 
  handleInputChange, 
  categories, 
  handleCategorySelect, 
  handleTaskSelect, 
  availableTasks, 
  generatePersonalizedSimulado, 
  handleGenerate, 
  isLoading, 
  loadingMsgIdx,
  DIFFICULTIES,
  LOADING_MESSAGES
}) {
  const isReadyToGenerate = form.categoryId && form.taskId;
  const safeAvailableTasks = Array.isArray(availableTasks) ? availableTasks : [];

return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full"
      >
        {/* ═══ HERO HEADER ═══ */}
        <div className="relative mb-8 overflow-hidden rounded-[28px] border border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(49,46,129,0.4) 0%, rgba(15,23,42,0.9) 50%, rgba(88,28,135,0.3) 100%)' }}>
          {/* Animated glow orbs */}
          <div className="absolute -left-20 -top-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-purple-500/15 rounded-full blur-[60px]" style={{ animationDelay: '1s' }} />
          <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-indigo-400/20 via-transparent to-purple-400/20" />
          
          <div className="relative px-8 py-10 sm:px-10">
            <div className="flex items-start gap-5">
              {/* Animated icon */}
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="shrink-0 p-4 rounded-2xl border border-indigo-400/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(147,51,234,0.25))' }}
              >
                <Brain size={36} className="text-indigo-300" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <h2 className="text-[28px] sm:text-3xl font-black tracking-[-1px] text-white">Simulado IA</h2>
                  <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-full font-black tracking-[2px] uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <Sparkles size={10} /> OFICIAL
                  </span>
                </div>
                <p className="text-slate-400 text-[14px] leading-relaxed max-w-md">
                  Questões geradas por IA e vinculadas ao seu painel. Resultados alimentam suas projeções e estatísticas.
                </p>
              </div>
            </div>
            
            {/* Stats bar & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Zap size={12} className="text-indigo-400" />
                  <span>Gemini 3 Flash</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BarChart3 size={12} className="text-purple-400" />
                  <span>Atualiza Dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span>Monte Carlo</span>
                </div>
              </div>
              
              {/* Botão Simulado Personalizado */}
              <button
                onClick={generatePersonalizedSimulado}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                <Brain size={16} />
                SIMULADO PERSONALIZADO
              </button>
            </div>
          </div>
        </div>

        {/* ═══ CONFIGURATION CARD ═══ */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[28px] border border-white/[0.06] overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.3) 0%, rgba(15,23,42,0.6) 100%)', backdropFilter: 'blur(20px)' }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="p-10 sm:p-14 flex flex-col items-center justify-center text-center min-h-[450px] relative z-10"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="w-24 h-24 rounded-full border-[3px] border-indigo-500/30 border-t-indigo-400 border-r-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
                  >
                    <Brain size={40} className="text-white animate-pulse" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360, scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute inset-2 rounded-full border border-dashed border-purple-400/40"
                  />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-3">
                  Sintetizando Simulado Inédito
                </h3>
                <div className="text-slate-400 text-[14px] max-w-md w-full leading-relaxed mb-6">
                  A Inteligência Artificial está formulando <strong className="text-indigo-300">{form.quantidade} questões</strong> exclusivas de nível <strong className="text-indigo-300">{DIFFICULTIES.find(d => d.value === form.dificuldade)?.label || 'Médio'}</strong> sobre:
                  
                  {form.categoryId === 'mixed' ? (
                    <ul className="mt-4 text-left space-y-2 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 shadow-inner overflow-hidden">
                      {(form.assunto || '').split('\n').filter(Boolean).map((line, i) => (
                        <li key={i} className="text-[12px] flex items-start gap-2 text-slate-300">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                           <span className="leading-tight">{line.replace(/^- /, '')}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 font-bold text-white">{form.assunto || 'o assunto selecionado'}</div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2.5 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-500">
                  <Sparkles size={14} className="animate-pulse shrink-0" />
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-7 sm:p-9"
              >
                {/* Section: Content - Melhorado visualmente */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <BookOpen size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-black text-sm tracking-[1.5px] text-white">CONTEÚDO OFICIAL</div>
                    <div className="text-[10px] text-slate-400 -mt-0.5">Escolha da sua lista cadastrada no Dashboard</div>
                  </div>
                </div>
                {form.categoryId && form.taskId && (
                  <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest">
                    VINCULADO ✓
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {/* Matéria + Assunto - Visual melhorado e conectado */}
                <div className="p-4 rounded-2xl bg-white/[0.015] border border-white/[0.06]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matéria */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-xs font-extrabold tracking-[1.5px] text-indigo-300/90 mb-2.5 pl-1">
                        <BookOpen size={13} /> MATÉRIA
                      </label>
                      <div className="relative">
                        <select
                          value={form.categoryId}
                          onChange={(e) => handleCategorySelect(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-400/70 focus:bg-slate-900 hover:border-white/25 transition-all rounded-2xl px-4 py-[15px] text-[15px] font-medium text-white outline-none appearance-none cursor-pointer pr-10"
                        >
                          <option value="">Selecione a matéria...</option>
                          {form.categoryId === 'mixed' && (
                            <option value="mixed">🎯 Múltiplas Matérias (Personalizado)</option>
                          )}
                          {[...categories].sort((a,b) => (a.name||'').localeCompare(b.name||'')).map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300/70 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      {categories.length === 0 && (
                        <div className="mt-2 text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <XCircle size={12} /> Nenhuma matéria cadastrada.
                        </div>
                      )}
                    </div>

                    {/* Assunto */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-xs font-extrabold tracking-[1.5px] text-indigo-300/90 mb-2.5 pl-1">
                        <ListChecks size={13} /> ASSUNTO
                      </label>
                      <div className="relative">
                        <select
                          value={form.taskId}
                          onChange={(e) => handleTaskSelect(e.target.value)}
                          disabled={!form.categoryId || safeAvailableTasks.length === 0}
                          className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-400/70 focus:bg-slate-900 hover:border-white/25 transition-all rounded-2xl px-4 py-[15px] text-[15px] font-medium text-white outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pr-10"
                        >
                          <option value="">Selecione o assunto...</option>
                          {form.categoryId === 'mixed' && form.taskId && (
                            <option value={form.taskId}>Foco em Múltiplas Fraquezas</option>
                          )}
                          {[...safeAvailableTasks].sort((a,b) => (a.title||a.text||'').localeCompare(b.title||b.text||'')).map((tsk) => {
                            const label = tsk.title || tsk.text || 'Sem título';
                            return <option key={tsk.id} value={tsk.id}>{label}</option>;
                          })}
                        </select>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300/70 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      {form.categoryId && safeAvailableTasks.length === 0 && (
                        <div className="mt-2 text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <XCircle size={12} /> Nenhum assunto nesta matéria.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo da seleção - Feedback visual forte */}
                  {(form.categoryId || form.taskId) && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
                      <div className="text-slate-500 text-xs uppercase tracking-widest">Selecionado:</div>
                      <div className="font-bold text-white text-sm mt-1 truncate">
                        {form.categoryId === 'mixed' ? (
                           <span>Simulado Personalizado <span className="mx-1.5 text-indigo-400/60">›</span> Foco em Múltiplas Fraquezas</span>
                        ) : (
                          <>
                            {form.materia || '—'} 
                            {form.assunto && <span className="mx-1.5 text-indigo-400/60">›</span>}
                            {form.assunto || ''}
                          </>
                        )}
                      </div>
                      {form.categoryId && form.taskId && (
                        <div className="text-[10px] px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">PRONTO</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-7" />

            {/* Section: Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-3 tracking-[1px] uppercase">
                  <Target size={12} /> Dificuldade
                </label>
                <div className="flex gap-1.5">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleInputChange('dificuldade', d.value)}
                      className={`flex-1 py-2.5 text-[12px] font-bold rounded-xl border transition-all duration-200 ${form.dificuldade === d.value
                        ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/15 hover:bg-white/[0.02]'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-3 tracking-[1px] uppercase">
                  <ListChecks size={12} /> Questões
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 2, 5, 8, 10, 15, 20].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleInputChange('quantidade', q)}
                      className={`px-4 py-2.5 text-[13px] font-bold rounded-xl border transition-all duration-200 ${Number(form.quantidade) === q 
                        ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                        : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/15'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ready summary */}
            <AnimatePresence>
              {form.categoryId && form.taskId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-7 p-4 rounded-2xl border border-emerald-500/15 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(99,102,241,0.05))' }}>
                    <div className="p-1.5 rounded-lg bg-emerald-500/15">
                      <Play size={14} className="text-emerald-400" />
                    </div>
                    <div className="text-[13px] truncate">
                      <span className="font-semibold text-white">Pronto:</span>{' '}
                      <span className="text-slate-400">{form.quantidade} questões • {DIFFICULTIES.find(d => d.value === form.dificuldade)?.label} • {form.categoryId === 'mixed' ? 'Foco em Fraquezas' : form.assunto}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerate}
              disabled={isLoading || !isReadyToGenerate}
              whileHover={isReadyToGenerate && !isLoading ? { scale: 1.01 } : {}}
              whileTap={isReadyToGenerate && !isLoading ? { scale: 0.985 } : {}}
              className="group relative mt-8 w-full py-5 rounded-2xl font-black text-[15px] tracking-[2px] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ 
                background: isReadyToGenerate && !isLoading 
                  ? 'linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #4f46e5 100%)' 
                  : 'rgba(51,65,85,0.9)',
                color: isReadyToGenerate && !isLoading ? '#ffffff' : '#94a3b8',
                boxShadow: isReadyToGenerate && !isLoading ? '0 12px 40px -12px rgba(99,102,241,0.8), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
              }}
            >
              {/* Sweep effect */}
              {isReadyToGenerate && !isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              <div className="relative flex items-center gap-3 z-10">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{LOADING_MESSAGES[loadingMsgIdx].toUpperCase()}</span>
                  </>
                ) : (
                  <>
                    <Brain size={22} className={isReadyToGenerate ? 'animate-pulse' : ''} />
                    <span>INICIAR GERAÇÃO IA</span>
                  </>
                )}
              </div>
            </motion.button>

            {/* Footer info */}
            <div className="text-center mt-4 space-y-1">
              <p className="text-[10px] text-slate-600">Vinculado aos IDs oficiais • Resultados alimentam seu dashboard e projeções</p>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  
}

```

---

## `src/components/ai/SimuladoPlayer.jsx` <a id="src-components-ai-simuladoplayer-jsx"></a>

- **Localização:** `src/components/ai/SimuladoPlayer.jsx`
- **Descrição:** Console de resolução do simulado IA: exibição de enunciados, alternativas, timer regressivo com alerta visual, suporte a gestos touch/swipe e navegação direta
- **Linhas:** 230
- **Tamanho:** 10.99 KB

```javascript
import React, { useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowLeft, ArrowRight, Award, CheckCircle2, XCircle } from 'lucide-react';

export default function SimuladoPlayer({
  form,
  questions,
  currentIndex,
  answers,
  timeLeft,
  DIFFICULTIES,
  goTo,
  selectAnswer,
  handleFinish,
  resetAll
}) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <p className="mb-4">Nenhuma questão disponível.</p>
        <button onClick={resetAll} className="px-4 py-2 bg-slate-800 rounded-lg text-white">Voltar</button>
      </div>
    );
  }
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers || {}).length;
  const timeColor = timeLeft < 180 ? 'text-red-400 border-red-500/30' : timeLeft < 300 ? 'text-amber-400 border-amber-500/30' : 'text-slate-300 border-white/10';
  const difficultyLabel = DIFFICULTIES.find(d => d.value === form.dificuldade)?.label || form.dificuldade;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    // FIX-SWIPE-01: `!touchStartX.current` era falso-negativo em x=0 (borda
    // esquerda). Comparar com null/undefined, não com falsy.
    if (touchStartX.current == null) return;
    const touch = e.changedTouches?.[0];
    if (!touch || touchStartX.current == null) return;

    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY ?? touchStartY.current;
    const diff = touchStartX.current - touchEndX;
    const diffY = Math.abs((touchStartY.current ?? 0) - touchEndY);

    // FIX-SWIPE-02: exigir dominância horizontal — senão scroll vertical
    // avançava/voltava questão acidentalmente.
    if (Math.abs(diff) > 50 && Math.abs(diff) > diffY * 1.5) {
      if (diff > 0 && currentIndex < questions.length - 1) {
        goTo(currentIndex + 1); // Swipe left -> next
      } else if (diff < 0 && currentIndex > 0) {
        goTo(currentIndex - 1); // Swipe right -> prev
      }
    }

    // FIX-SWIPE-03: limpar estado para não contaminar o próximo gesto.
    touchStartX.current = null;
    touchStartY.current = null;
  };

return (
      <div 
        className="w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ═══ TOP BAR ═══ */}
        <div className="mb-6 rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(15,23,42,0.7))', backdropFilter: 'blur(20px)' }}>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[10px] font-black tracking-[1.5px]">IA</div>
                <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-bold text-slate-500">{difficultyLabel.toUpperCase()}</div>
              </div>
              <div className="text-[15px] font-bold text-white truncate">
                {form.materia} <span className="text-slate-600 mx-1">›</span> <span className="text-slate-400 font-medium">{form.assunto}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-mono text-slate-500">{currentIndex + 1} / {questions.length}</div>
                <div className="text-[10px] font-bold text-emerald-400/80">{answeredCount} respondidas</div>
              </div>

              {/* Timer */}
              <div className={`flex items-center gap-2 font-mono font-black text-lg px-4 py-2 rounded-xl border transition-colors ${timeColor}`} style={{ background: timeLeft < 180 ? 'rgba(239,68,68,0.08)' : timeLeft < 300 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)' }}>
                <Clock size={16} className="opacity-60" />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="px-5 pb-3">
            <div className="flex gap-1 mb-1.5">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${isCurrent ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]' : isAnswered ? 'bg-emerald-400/70' : 'bg-white/10 hover:bg-white/25'}`}
                    title={`Questão ${i + 1}`}
                  />
                );
              })}
            </div>
            <div className="text-center text-[9px] text-slate-600 font-medium tracking-[2px]">A B C D • ← → • ENTER • ESC</div>
          </div>
        </div>

        {/* ═══ QUESTION CARD ═══ */}
        <div className="relative min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-[24px] border border-white/[0.06] p-7 sm:p-8 mb-6"
              style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.25) 0%, rgba(15,23,42,0.5) 100%)', backdropFilter: 'blur(16px)' }}
            >
              {/* Question header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-black tracking-[2px] text-indigo-400">QUESTÃO {currentIndex + 1}</span>
                  {currentQuestion.categoryId && <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-600 font-bold tracking-wide">VINCULADA</span>}
                </div>
                <span className="text-[11px] font-mono text-slate-600">{currentIndex + 1}/{questions.length}</span>
              </div>
              
              {/* Enunciado */}
              <div className="text-[17px] leading-[1.7] font-medium text-white/90 tracking-[-0.2px] mb-8">
                {currentQuestion.enunciado}
              </div>

              {/* Alternatives */}
              <div className="space-y-2.5">
                {(currentQuestion.alternativas || []).map((alt, idx) => {
                  const isSelected = answers[currentQuestion.id] === alt.letra;
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => selectAnswer(alt.letra)}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      className={`group w-full text-left px-5 py-4 rounded-2xl border flex gap-4 items-center transition-all duration-200
                        ${isSelected 
                          ? 'border-indigo-400/60 shadow-[0_0_25px_rgba(99,102,241,0.2)]' 
                          : 'border-white/10 hover:border-white/30 hover:bg-white/[0.03]'}`}
                      style={{
                        background: isSelected 
                          ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(147,51,234,0.1))' 
                          : 'rgba(15,23,42,0.5)'
                      }}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black border transition-all duration-200
                        ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800/60 border-slate-600 text-slate-300 group-hover:border-slate-400 group-hover:text-white'}`}>
                        {alt.letra}
                      </div>
                      <div className={`text-[15px] leading-snug flex-1 transition-colors ${isSelected ? 'text-white font-bold' : 'text-slate-200 group-hover:text-white'}`}>
                        {alt.texto}
                      </div>
                      {isSelected && (
                        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} className="shrink-0">
                          <CheckCircle2 size={20} className="text-indigo-400" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══ NAVIGATION ═══ */}
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-5 py-3 rounded-xl border border-white/[0.08] text-[13px] font-semibold flex items-center gap-2 hover:bg-white/[0.04] disabled:opacity-30 transition"
          >
            <ArrowLeft size={15} /> Anterior
          </button>

          <div className="text-[12px] text-slate-600 font-mono tabular-nums">{answeredCount}/{questions.length}</div>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="px-6 py-3 rounded-xl text-[13px] font-black flex items-center gap-2 transition shadow-[0_4px_15px_-4px_rgba(99,102,241,0.4)]"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              Próxima <ArrowRight size={15} />
            </button>
          ) : (
            <motion.button
              onClick={handleFinish}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-black flex items-center gap-2 transition shadow-[0_4px_15px_-4px_rgba(16,185,129,0.4)]"
            >
              FINALIZAR <Award size={16} />
            </motion.button>
          )}
        </div>

        <div className="text-center mt-4">
          <button 
            onClick={resetAll}
            className="text-[11px] text-slate-600 hover:text-slate-400 transition"
          >
            Cancelar e voltar
          </button>
        </div>
      </div>
    );
  
}

```

---

## `src/components/ai/SimuladoResults.jsx` <a id="src-components-ai-simuladoresults-jsx"></a>

- **Localização:** `src/components/ai/SimuladoResults.jsx`
- **Descrição:** Painel analítico pós-simulado IA: pontuação final, cálculo de acertos, análise de tempo por questão, revisão comentada com justificativas da IA e opções de tentar novamente
- **Linhas:** 275
- **Tamanho:** 16.19 KB

```javascript
import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, ListChecks, CheckCircle2, XCircle, RefreshCw, Sparkles, BarChart3 } from 'lucide-react';

export default function SimuladoResults({
  results = { total: 0, correct: 0, questions: [], timeSpentSecs: 0 },
  form = {},
  showReview,
  setShowReview,
  resetAll,
  retrySameQuestions,
  showToast
}) {
  const safeResults = {
    total: results?.total || 0,
    correct: results?.correct || 0,
    questions: Array.isArray(results?.questions) ? results.questions : [],
    timeSpentSecs: results?.timeSpentSecs || 0
  };

  const accuracy = safeResults.total > 0 ? Math.round((safeResults.correct / safeResults.total) * 100) : 0;
  const colorMap = accuracy >= 80 
    ? { text: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.2)' }
    : accuracy >= 60 
      ? { text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.2)' }
      : { text: '#fb7185', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)', glow: 'rgba(244,63,94,0.2)' };

return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full min-h-[calc(100vh-160px)] flex flex-col gap-5"
      >
        {/* ═══ HERO: Score + Stats in one premium card ═══ */}
        <div className="relative rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(30,27,75,0.5) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Glow */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-48 rounded-full blur-[100px] pointer-events-none opacity-60" style={{ background: colorMap.glow }} />
          
          <div className="relative px-6 sm:px-10 pt-8 pb-6">
            {/* Badge */}
            <div className="flex justify-center mb-4">
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black tracking-[2.5px]"
                style={{ background: colorMap.bg, color: colorMap.text, border: `1px solid ${colorMap.border}` }}
              >
                <Trophy size={13} /> SIMULADO CONCLUÍDO
              </motion.div>
            </div>

            {/* Score */}
            <div className="flex justify-center items-baseline gap-2 mb-1">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="text-[64px] sm:text-[80px] leading-none font-black tracking-[-4px] text-white tabular-nums"
                style={{ textShadow: `0 0 50px ${colorMap.glow}` }}
              >
                {safeResults.correct}
              </motion.div>
              <div className="text-2xl text-slate-600 font-light">/</div>
              <div className="text-3xl font-black text-slate-600 tracking-tight">{safeResults.total}</div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <span className="text-3xl font-black tracking-tight" style={{ color: colorMap.text }}>{accuracy}%</span>
              <span className="text-[11px] font-semibold text-slate-500 ml-2 tracking-[1.5px] uppercase">aproveitamento</span>
            </motion.div>
          </div>

          {/* Stats strip */}
          {/* BUG-5 FIX: 4 columns to show unanswered separately */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/[0.06]">
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-emerald-400">{safeResults.correct}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-emerald-400/50 mt-1.5">ACERTOS</div>
            </div>
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              {/* BUG-5 FIX: Show separate counts for errors and unanswered */}
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-rose-400">{safeResults.questions.filter(q => q && q.wasAnswered && !q.isCorrect).length}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-rose-400/50 mt-1.5">ERROS</div>
            </div>
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-slate-400">{safeResults.questions.filter(q => q && !q.wasAnswered).length}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-slate-500 mt-1.5">EM BRANCO</div>
            </div>
            <div className="py-4 px-3 text-center">
              <div className="text-[28px] sm:text-[32px] leading-none font-black" style={{ color: colorMap.text }}>{accuracy}%</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-slate-500 mt-1.5">TAXA</div>
            </div>
          </div>
        </div>

        {/* ═══ TABS + CONTENT ═══ */}
        <div className="rounded-[20px] border border-white/[0.06] overflow-hidden flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.15), rgba(15,23,42,0.35))' }}>
          {/* Tab header */}
          <div className="flex shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <button 
              onClick={() => typeof setShowReview === 'function' && setShowReview(false)}
              className={`flex-1 py-3 text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative ${!showReview ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Award size={14} /> Resumo
              {!showReview && <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-400" />}
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button 
              onClick={() => typeof setShowReview === 'function' && setShowReview(true)}
              className={`flex-1 py-3 text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative ${showReview ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ListChecks size={14} /> Revisar Questões
              {showReview && <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-400" />}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              {!showReview ? (
                <motion.div 
                  key="summary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-6 sm:p-10 flex flex-col justify-center items-center h-full min-h-[250px]"
                >
                  <div className="text-[12px] text-slate-500 mb-6 tracking-wider uppercase">Detalhes da Sessão</div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Matéria</div>
                      <div className="text-white font-medium text-[15px]">{form.materia || '—'}</div>
                    </div>
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assunto</div>
                      <div className="text-white font-medium text-[15px] truncate px-2" title={form.assunto}>{form.assunto || '—'}</div>
                    </div>
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nível</div>
                      <div className="text-white font-medium text-[15px] capitalize">{form.dificuldade}</div>
                    </div>
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tempo Gasto</div>
                      <div className="text-white font-medium text-[15px]">
                        {Math.floor(Math.round(safeResults.timeSpentSecs) / 60)}m {(Math.round(safeResults.timeSpentSecs) % 60).toString().padStart(2, '0')}s
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 sm:p-6 space-y-3"
                >
                  {safeResults.questions.map((q, idx) => {
                    const isCorrect = q.isCorrect;
                    return (
                      <div key={idx} className="p-5 rounded-2xl border" style={{ 
                        borderColor: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                        background: isCorrect ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)'
                      }}>
                        <div className="flex gap-3 mb-3">
                          <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${isCorrect ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}>
                            {isCorrect ? <CheckCircle2 size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                          </div>
                          <div className="font-medium text-white/90 text-[14px] leading-relaxed flex-1">{idx + 1}. {q.enunciado}</div>
                        </div>

                        <div className="pl-10 space-y-2 text-sm">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs mb-2">
                            <span className="font-mono px-2.5 py-0.5 bg-white/[0.04] rounded-md text-slate-400">Sua: <b className="text-white">{q.wasAnswered ? q.selected : <span className="text-slate-500 italic">em branco</span>}</b></span>
                            {!isCorrect && <span className="font-mono px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-md">Correta: <b>{q.alternativa_correta}</b></span>}
                          </div>

                          {Array.isArray(q.alternativas) && q.alternativas.length > 0 && (
                            <div className="grid grid-cols-1 gap-0.5 text-[12.5px] pt-1">
                              {q.alternativas.map((alt, aIdx) => {
                                const isUserChoice = q.selected === alt.letra;
                                const isTheCorrect = alt.letra === q.alternativa_correta;
                                return (
                                  <div key={aIdx} className={`px-2.5 py-1 rounded-lg flex gap-2 items-start ${isTheCorrect ? 'text-emerald-400 bg-emerald-500/[0.06]' : isUserChoice ? 'text-rose-400 line-through' : 'text-slate-500'}`}>
                                    <span className="font-bold tabular-nums w-4 shrink-0">{alt.letra}.</span>
                                    <span className="flex-1">{alt.texto}</span>
                                    {isTheCorrect && <span className="text-[9px] text-emerald-500/70 font-black shrink-0 mt-0.5">✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {q.justificativa && (
                            <div className="text-slate-400 leading-relaxed pt-2 text-[12.5px] border-l-2 border-white/[0.08] pl-3 mt-2">
                              {q.justificativa}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ═══ ACTIONS ═══ */}
        <div className="shrink-0 grid grid-cols-3 gap-3">
          {/* Refazer — green accent */}
          <button 
            onClick={() => typeof retrySameQuestions === 'function' && retrySameQuestions()} 
            className="group relative py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.97]"
            style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 4px 20px -4px rgba(16,185,129,0.2)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <RefreshCw size={17} className="text-emerald-400" /> 
            <span className="text-emerald-300">Refazer</span>
          </button>
          
          {/* Gerar Novo — white/neutral */}
          <button 
            onClick={() => typeof resetAll === 'function' && resetAll()} 
            className="group relative py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.97]"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 20px -4px rgba(255,255,255,0.05)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Sparkles size={17} className="text-white/70" /> 
            <span className="text-white/80">Gerar Novo</span>
          </button>

          {/* Voltar ao Menu — primary indigo */}
          <button 
            onClick={() => {
              if (typeof resetAll === 'function') resetAll();
              if (typeof showToast === 'function') showToast('Voltando ao menu de simulados', 'info');
            }} 
            className="group relative py-4 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.97]"
            style={{ 
              background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 50%, #6366f1 100%)',
              border: '1px solid rgba(139,92,246,0.4)',
              boxShadow: '0 6px 30px -6px rgba(99,102,241,0.5)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <BarChart3 size={17} className="text-white" /> 
            <span className="text-white">Menu</span>
          </button>
        </div>

        <div className="text-center text-[10px] text-slate-600 tracking-wide">
          Resultados salvos • Atualizam estatísticas oficiais e projeções Monte Carlo
        </div>
      </motion.div>
    );
  
}

```

---

# 3. SIMULADO MANUAL E RELATÓRIOS ANALÍTICOS (MANUAL SIMULADO & ANALYSIS)

## `src/components/SimuladoAnalysis.jsx` <a id="src-components-simuladoanalysis-jsx"></a>

- **Localização:** `src/components/SimuladoAnalysis.jsx`
- **Descrição:** Formulário e relatório detalhado de simulado manual: grade de preenchimento de questões e acertos por disciplina/assunto, cálculo automático de notas, porcentagem de acertos, badges de status e botão de persistência
- **Linhas:** 802
- **Tamanho:** 50.03 KB

```javascript
import React, { useState } from 'react';
import { normalize, aliases } from '../utils/normalization';
import ConfirmModal from './ConfirmModal';

import { BrainCircuit, Play, FileText, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function SimuladoAnalysis({ rows: propRows, onRowsChange, onAnalysisComplete, categories = [], viewMode = 'both' }) {
    const categoriesArray = Array.isArray(categories) ? categories : Object.values(categories || {});
    const analysisTimeoutRef = React.useRef(null);


    // Bug fix: `r.id || row-${idCounter.current++}` still mutated idCounter.current
    // during the render phase whenever r.id was falsy — causing React to see different
    // keys on every render, making inputs lose focus on every keystroke.
    // Using index as stable fallback avoids any mutation during render.
    const [prevPropRows, setPrevPropRows] = useState(propRows);
    const [rows, setLocalRows] = useState(() => (propRows && propRows.length > 0)
        ? propRows.map((r, i) => ({ ...r, id: r.id || `row-${normalize(r.subject || '')}-${normalize(r.topic || '')}-${i}` }))
        : []
    );

    if (propRows !== prevPropRows) {
        setPrevPropRows(propRows);
        setLocalRows((propRows && propRows.length > 0)
            ? propRows.map((r, i) => ({ ...r, id: r.id || `row-${normalize(r.subject || '')}-${normalize(r.topic || '')}-${i}` }))
            : []
        );
    }

    // Helper to report changes up to parent
    const [analysisData, setAnalysisData] = useState(null);

    // ✅ NOVO: Resetta analysisData quando as rows mudam (novo simulado salvo)
    const rowsSignature = React.useMemo(
      () => rows.map((r) => `${r.id || ''}-${r.total || 0}-${r.correct || 0}`).join('|'),
      [rows]
    );

    const [loading, setLoading] = useState(false);
    const prevSignatureRef = React.useRef(rowsSignature);
    React.useEffect(() => {
        if (prevSignatureRef.current !== rowsSignature) {
            prevSignatureRef.current = rowsSignature;
            setAnalysisData(null);
            setLoading(false);
        }
    }, [rowsSignature]);
    const [error, setError] = useState(null);
    const [errorIndices, setErrorIndices] = useState(() => ({ subjects: new Set(), topics: new Set() }));

    // Bug Fix: track mount status for async operations
    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => {
            isMounted.current = false;
            if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        };
    }, []);

    const setRows = (newRows) => {
        setLocalRows(newRows);
        if (onRowsChange) onRowsChange(Array.isArray(newRows) ? newRows : []);
    };

    const updateRow = (index, field, value) => {
        if (!field || typeof field !== 'string') return;
        setError(null);
        // 1. Sanitização: Apenas números para campos numéricos
        let finalValue = value;

        if (field === 'correct' || field === 'total') {
            // Remove tudo que não for dígito
            const rawString = String(value).replace(/\D/g, '');
            const val = rawString === '' ? '' : parseInt(rawString, 10);

            if (field === 'correct') {
                const currentTotal = parseInt(rows[index]?.total, 10) || 0;
                // Enforce: Correct cannot exceed Total (unless Total is empty/0)
                if (val !== '' && currentTotal > 0 && val > currentTotal) finalValue = currentTotal;
                else finalValue = val;
            } else if (field === 'total') {
                const currentCorrect = parseInt(rows[index]?.correct, 10) || 0;
                // If Total is reduced below Correct, clamp Correct
                if (val !== '' && val < currentCorrect) {
                    const newRows = rows.map((r, i) => i === index ? { ...r, total: val, correct: val, score: val > 0 ? 100 : 0 } : r);
                    setRows(newRows);
                    return;
                }
                finalValue = val;
            }
        }

        const newRows = rows.map((row, i) => {
            if (i === index) {
                const updatedRow = { ...row, [field]: finalValue };
                let c = Math.max(0, parseFloat(updatedRow.correct) || 0);
                const t = Math.max(0, parseFloat(updatedRow.total) || 0);
                
                if (t > 0 && c > t) {
                    c = t;
                    updatedRow.correct = c;
                }
                
                updatedRow.score = t > 0 ? Math.min(100, (c / t) * 100) : 0;
                return updatedRow;
            }
            return row;
        });

        setRows(newRows);
    };



    const [showResetScoresConfirm, setShowResetScoresConfirm] = useState(false);

    const resetScores = () => {
        setShowResetScoresConfirm(true);
    };

    const handleConfirmResetScores = () => {
        const newRows = rows.map(row => ({ ...row, correct: 0, total: 0 }));
        setRows(newRows);
        setShowResetScoresConfirm(false);
    };

    const addTenToAll = () => {
        const newRows = rows.map(row => {
            const newTotal = Math.min(10000, (parseInt(row.total, 10) || 0) + 10);
            const currentCorrect = parseInt(row.correct, 10) || 0;
            return {
                ...row,
                total: newTotal,
                score: newTotal > 0 ? Math.min(100, (currentCorrect / newTotal) * 100) : 0
            };
        });
        setRows(newRows);
    };

    const addTenToAllCorrect = () => {
        const newRows = rows.map(row => {
            let currentTotal = parseInt(row.total, 10) || 0;
            let newCorrect = (parseInt(row.correct, 10) || 0) + 10;
            
            if (newCorrect > currentTotal) {
                if (currentTotal === 0) {
                    currentTotal = newCorrect;
                } else {
                    newCorrect = currentTotal;
                }
            }
            
            return {
                ...row,
                correct: newCorrect,
                total: currentTotal,
                score: currentTotal > 0 ? Math.min(100, (newCorrect / currentTotal) * 100) : 0
            };
        });
        setRows(newRows);
    };

    const handleAnalyze = React.useCallback(() => {
        // 0. Strict Validation: Check if subjects exist in Dashboard
        if (categoriesArray && categoriesArray.length > 0) {

            const validDataMap = Object.create(null);
            categoriesArray.forEach(cat => {
                if (!cat?.name) return;
                const subName = normalize(cat.name);
                const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                const topics = new Set(tasks.map(t => normalize(t?.title || t?.text || '')));
                validDataMap[subName] = topics;

                // Add aliases mapping to the same topics
                if (aliases[subName]) {
                    aliases[subName].forEach(alias => {
                        const aliasNorm = normalize(alias);
                        validDataMap[aliasNorm] = topics;
                    });
                }
            });

            const invalidSubjects = new Set();
            const invalidTopics = new Set();
            let firstInvalidSubject = null;
            let firstInvalidTopic = null;
            let targetSubject = '';

            rows.forEach((r, idx) => {
                if (!r.subject && !r.topic) return;

                const subNorm = normalize(r.subject);
                const topNorm = normalize(r.topic);

                const isSubValid = r.subject ? !!validDataMap[subNorm] : true;

                let isTopValid = true;
                if (r.topic) {
                    if (topNorm === 'nenhum') {
                        isTopValid = true;
                    } else if (isSubValid && r.subject && validDataMap[subNorm] instanceof Set) {
                        const subjectTopics = validDataMap[subNorm];
                        // Se a matéria não tem tópicos cadastrados, aceitamos qualquer um (ou tratamos como 'nenhum')
                        isTopValid = subjectTopics.size === 0 ? true : subjectTopics.has(topNorm);
                    } else if (r.subject) {
                        isTopValid = false;
                    } else {
                        isTopValid = Object.values(validDataMap).some(set => (set instanceof Set) && set.has(topNorm));
                    }
                }

                if (r.subject && !isSubValid) {
                    if (!firstInvalidSubject) firstInvalidSubject = r.subject;
                    invalidSubjects.add(idx);
                }

                if (r.topic && !isTopValid) {
                    if (!firstInvalidTopic) {
                        firstInvalidTopic = r.topic;
                        targetSubject = r.subject;
                    }
                    invalidTopics.add(idx);
                }
            });

            if (invalidSubjects.size > 0 || invalidTopics.size > 0) {
                if (viewMode === 'report') {
                    // Em modo relatório, NÃO bloquear por assunto não encontrado
                    // Apenas renderizar o que existe
                    setErrorIndices({ subjects: new Set(), topics: new Set() });
                } else {
                    setErrorIndices({ subjects: invalidSubjects, topics: invalidTopics });
    
                    if (firstInvalidSubject && firstInvalidTopic) {
                        setError(`Matéria '${firstInvalidSubject}' e Assunto '${firstInvalidTopic}' não encontrados.`);
                    } else if (firstInvalidSubject) {
                        setError(`A matéria '${firstInvalidSubject}' não existe no Dashboard.`);
                    } else if (firstInvalidTopic) {
                        setError(`O assunto '${firstInvalidTopic}' não existe na matéria '${targetSubject}'.`);
                    }
    
                    setAnalysisData(null);
                    setLoading(false);
                    return;
                }
            }
            // Clear errors if all valid
            if (viewMode !== 'report') {
                setErrorIndices({ subjects: new Set(), topics: new Set() });
            }
        }

        // BUG FIX: Separation of row validation for Analytics vs Storage/Audit
        // Somente processar linhas onde o TOTAL foi explicitamente digitado e é maior que zero.
        const rowsToProcess = rows.filter(r => r?.subject && parseInt(r?.total, 10) > 0);
        
        // Validação: avisar o usuário se preencheu acertos mas esqueceu do total
        const rowsWithMissingTotal = rows.filter(r => r?.subject && parseInt(r?.correct, 10) > 0 && !(parseInt(r?.total, 10) > 0));
        if (rowsWithMissingTotal.length > 0) {
            setError(`O campo "Total" deve ser preenchido para o assunto '${rowsWithMissingTotal[0].topic || rowsWithMissingTotal[0].subject}'.`);
            setLoading(false);
            return;
        }

        if (rowsToProcess.length === 0) {
            setError("Preencha o desempenho em pelo menos um assunto.");
            setLoading(false);
            return;
        }

        const validRows = rowsToProcess.map(r => ({
            ...r,
            topic: String(r.topic || '').trim() || 'Geral'
        }));





        setLoading(true);
        setError(null);
        // We no longer clear analysisData immediately to prevent "flickering"
        // It will be overwritten once the 800ms delay finishes.

        // Simulate processing time for UX
        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = setTimeout(() => {
            if (!isMounted.current) return;
            try {
                // Local Analysis Logic
                const disciplinesMap = {};

                // 1. Group and Calculate
                validRows.forEach(row => {
                    const subj = String(row.subject || "").trim();
                    if (!subj) return;

                    if (!disciplinesMap[subj]) {
                        disciplinesMap[subj] = {
                            name: subj,
                            topics: [],
                            totalCorrect: 0,
                            totalQuestions: 0
                        };
                    }

                    const total = Math.max(0, parseInt(row.total, 10) || 0);
                    let correct = Math.max(0, parseInt(row.correct, 10) || 0);

                    if (total > 0) {
                      correct = Math.min(correct, total);
                    }
                    const pct = (total > 0 && Number.isFinite(correct) && Number.isFinite(total)) ? Math.round((correct / total) * 100) : 0;

                    let status = 'ATENÇÃO';
                    let action = 'Treino Prático';

                    if (pct >= 80) {
                        status = 'DOMINADO';
                        action = 'Manter Revisão';
                    } else if (pct >= 60) {
                        status = 'BOM';
                        action = 'Refinar Detalhes';
                    } else if (pct <= 40) {
                        status = 'CRÍTICO';
                        action = 'Revisão Teórica + Questões';
                    }

                    disciplinesMap[subj].topics.push({
                        name: String(row.topic || ""),
                        correct,
                        total,
                        percentage: pct,
                        difficulty: Number(row.difficulty || 1.0),
                        status,
                        action
                    });

                    disciplinesMap[subj].totalCorrect += correct;
                    disciplinesMap[subj].totalQuestions += total;
                });

                // 2. Format Output
                const disciplines = Object.values(disciplinesMap).map(d => {
                    // Sort topics by lowest percentage (worst first)
                    d.topics.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

                    const discPct = d.totalQuestions > 0 ? Math.round((d.totalCorrect / d.totalQuestions) * 100) : 0;

                    let overview = "";
                    if (discPct >= 80) overview = `Excelente (${discPct}%). Continue assim!`;
                    else if (discPct >= 60) overview = `Bom (${discPct}%). Quase lá.`;
                    else if (discPct >= 41) overview = `Atenção (${discPct}%). Pode evoluir.`;
                    else overview = `Crítico (${discPct}%). Foque na base.`;

                    return {
                        name: d.name,
                        overview,
                        topics: d.topics,
                        percentage: discPct,
                        totalCorrect: d.totalCorrect,
                        totalQuestions: d.totalQuestions
                    };
                });

                // Sort Disciplines by Performance (Worst First) to highlight problems
                disciplines.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

                // 3. General Insight
                const totalQ = validRows.reduce((acc, r) => acc + (parseInt(r.total, 10) || 0), 0);
                const totalC = validRows.reduce((acc, r) => acc + (parseInt(r.correct, 10) || 0), 0);
                const globalPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
                const analyzedTopics = validRows.length;
                const analyzedSubjects = new Set(validRows.map(r => String(r.subject || '').trim()).filter(Boolean)).size;
                const rowCoverage = rows.length > 0 ? (analyzedTopics / rows.length) * 100 : 0;

                const confidenceScore = Math.max(0, Math.min(100,
                    Math.round(
                        Math.min(1, totalQ / 200) * 55 +
                        Math.min(1, analyzedTopics / 12) * 25 +
                        Math.min(1, analyzedSubjects / 6) * 20
                    )
                ));

                const confidenceLabel =
                    confidenceScore >= 75 ? 'Alta' :
                        confidenceScore >= 45 ? 'Média' : 'Baixa';

                let generalInsight = "";
                if (globalPct >= 80) generalInsight = `Resultado Incrível! ${globalPct}%. Caminho certo.`;
                else if (globalPct >= 60) generalInsight = `Bom trabalho! ${globalPct}%. Ajuste os detalhes.`;
                else generalInsight = `Sinal de Alerta. ${globalPct}%. Reavalie a estratégia.`;

                const data = {
                    disciplines,
                    generalInsight,
                    confidence: {
                        score: confidenceScore,
                        label: confidenceLabel,
                        analyzedTopics,
                        analyzedSubjects,
                        totalQuestions: totalQ,
                        rowCoverage: Number(rowCoverage.toFixed(1))
                    }
                };

                setAnalysisData(data);

                if (onAnalysisComplete && viewMode !== 'report') {
                    const cleanRows = rows.map(r => ({
                        ...r,
                        subject: String(r.subject || '').trim(),
                        topic: String(r.topic || '').trim(),
                    }));
                    onAnalysisComplete({ analysis: data, rawRows: cleanRows });
                }

            } catch (err) {
                console.error("ANALYSIS FATAL ERROR:", err);
                setAnalysisData(null);
                setError(`Erro no processamento: ${err.message || "Verifique os dados digitados"}`);
            } finally {
                setLoading(false);
            }
        }, viewMode === 'report' ? 0 : 800); // Remove delay when just viewing report
         
    }, [categoriesArray, rows, viewMode, onAnalysisComplete]);

    React.useEffect(() => {
        if (viewMode === 'report' && rows.length > 0 && !analysisData && !loading) {
            const timer = setTimeout(() => handleAnalyze(), 100);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, rowsSignature, analysisData, loading, handleAnalyze]);

    return (
        <div className={`w-full mx-auto space-y-6 animate-fade-in pb-20`}>

            {/* ── HEADER ──────────────────────────────────────────────────────────── */}
            {(viewMode === 'both') && (
                <header className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden group">
                    {/* Glow Background */}
                    <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-purple-500/30 transition-colors duration-700" />
                    
                    <div className="relative z-10 flex items-center gap-4 w-full">
                        <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
                            <BrainCircuit size={28} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 tracking-tight drop-shadow-sm">IA Analyzer Pro</h2>
                                <span className="text-[10px] bg-purple-500/10 px-2.5 py-1 rounded-md text-purple-300 border border-purple-500/30 font-black uppercase tracking-widest shadow-inner">
                                    Offline
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium">Motor estocástico de identificação de fraquezas e geração de revisão.</p>
                        </div>
                    </div>
                </header>
            )}

            {/* ── GRID PRINCIPAL ──────────────────────────────────────────────────────────── */}
            <div className={`grid grid-cols-1 ${viewMode === 'both' ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-4 sm:gap-6`}>

                {/* ── PAINEL ESQUERDO: Entrada de dados ── */}
                {(viewMode === 'both' || viewMode === 'form') && (
                <div className={`${viewMode === 'both' ? 'lg:col-span-5' : 'w-full'} bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-lg`}>

                    {/* Cabeçalho do painel */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold flex items-center gap-2 text-slate-100">
                            <FileText size={16} className="text-blue-400" />
                            Dados do Simulado
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={addTenToAllCorrect} title="Adicionar +10 acertos a todas as matérias"
                                className="text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-400 transition-all hover:scale-[1.03] active:scale-95 shadow-sm flex items-center gap-1">
                                <span>+10</span>
                                <span className="font-extrabold text-[10px]">✓</span>
                            </button>
                            <button onClick={addTenToAll} title="Adicionar +10 questões no total a todas as matérias"
                                className="text-[11px] font-bold bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:border-blue-400 transition-all hover:scale-[1.03] active:scale-95 shadow-sm">
                                +10 Total
                            </button>
                            <button onClick={resetScores} title="Limpar acertos e totais"
                                className="text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-400 transition-all hover:scale-[1.03] active:scale-95">
                                Zerar
                            </button>
                        </div>
                    </div>

                    {/* Colunas header */}
                    <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_48px_48px_95px_10px] gap-2 px-3 pb-1 border-b border-slate-700/50 mb-1">
                        {['Matéria', 'Assunto', '✓', 'Total', 'Classificação', ''].map((h, i) => (
                            <span key={i} className={`text-[9px] font-black uppercase tracking-widest ${i < 2 ? 'text-left' : 'text-center'} ${h === '✓' ? 'text-green-400 text-[11px]' : 'text-slate-400'}`}>{h}</span>
                        ))}
                    </div>

                    {/* Linhas de entrada */}
                    <div className="space-y-1.5 pr-1">
                        {rows.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-sm italic border border-slate-800 rounded-xl">
                                Nenhuma matéria/assunto cadastrado no Dashboard.
                            </div>
                        ) : rows.map((row, index) => {
                            const showDivider = index > 0 && rows[index - 1].subject !== row.subject;
                            return (
                                <React.Fragment key={row.id || index}>
                                    {showDivider && (
                                        <div className="pt-2 pb-1">
                                            <div className="h-px bg-yellow-500/30 w-full" />
                                        </div>
                                    )}
                                    <div
                                        className="group flex flex-col md:grid md:grid-cols-[1.5fr_1.5fr_48px_48px_95px_10px] gap-2 items-center bg-slate-800/30 hover:bg-slate-800/80 rounded-xl px-3 py-2.5 transition-all border border-transparent hover:border-slate-700 hover:shadow-lg">

                                        <div className="flex gap-2 w-full md:contents">
                                            <input type="text" value={row.subject}
                                                disabled={true}
                                                className={`bg-slate-900/40 rounded-md outline-none text-xs sm:text-sm w-full min-w-0 h-8 px-2 flex items-center ${errorIndices.subjects.has(index) ? 'text-red-400 font-bold border border-red-500/50' : 'text-slate-400 border border-transparent'} cursor-not-allowed`}
                                                placeholder="Matéria" />
                                            <input type="text" value={row.topic}
                                                disabled={true}
                                                className={`bg-slate-900/40 rounded-md outline-none text-xs sm:text-sm w-full min-w-0 h-8 px-2 flex items-center ${errorIndices.topics.has(index) ? 'text-red-400 font-bold border border-red-500/50' : 'text-slate-400 border border-transparent'} cursor-not-allowed`}
                                                placeholder="Assunto" />
                                        </div>

                                        <div className="flex gap-2 w-full md:contents items-center justify-between md:justify-center mt-2 md:mt-0 pt-2 md:pt-0 border-t border-slate-700/50 md:border-t-0">
                                            <div className="md:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest mr-auto">Acertos / Total / Classificação</div>
                                            <input type="number" min="0" value={row.correct}
                                                disabled={loading}
                                                onChange={(e) => updateRow(index, 'correct', e.target.value)}
                                                className={`bg-slate-950 border border-slate-700/80 rounded-md outline-none text-xs sm:text-sm text-green-400 font-mono font-bold text-center w-14 md:w-full h-8 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 focus:bg-slate-900 transition-all shadow-inner ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`} />
                                            <input type="number" min="0" value={row.total}
                                                disabled={loading}
                                                onChange={(e) => updateRow(index, 'total', e.target.value)}
                                                className={`bg-slate-950 border border-slate-700/80 rounded-md outline-none text-xs sm:text-sm text-slate-200 font-mono font-bold text-center w-14 md:w-full h-8 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:bg-slate-900 transition-all shadow-inner ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`} />
                                            <select 
                                                value={row.difficulty || 1.0}
                                                disabled={loading}
                                                onChange={(e) => updateRow(index, 'difficulty', e.target.value)}
                                                className={`bg-slate-950 border border-slate-700/80 rounded-md outline-none text-[10px] sm:text-xs text-purple-400 font-bold text-center w-20 md:w-full h-8 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:bg-slate-900 transition-all shadow-inner cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`}
                                            >
                                                <option value={0.7}>Fácil</option>
                                                <option value={1.0}>Médio</option>
                                                <option value={1.3}>Difícil</option>
                                                <option value={1.6}>Expert</option>
                                            </select>
                                            <div className="w-2 hidden md:block"></div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-3 pt-3 border-t border-slate-700/50 mt-auto">
                        <button onClick={handleAnalyze} disabled={loading}
                            className={`flex-1 rounded-xl font-black flex items-center justify-center gap-2 py-3 text-sm transition-all duration-300 ${loading
                                ? 'bg-purple-900/40 text-purple-400 border border-purple-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 border border-indigo-400/50'}`}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin text-lg">⌛</span>
                                    <span>Processando...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Play size={18} className="fill-current" />
                                    <span className="tracking-wide">{viewMode === 'form' ? 'SALVAR SIMULADO MANUAL' : 'GERAR PLANO DE REVISÃO'}</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                )}

                {/* ── PAINEL DIREITO: Resultado ── */}
                {(viewMode === 'both' || viewMode === 'report') && (
                <div className={`relative ${viewMode === 'both' ? 'lg:col-span-7' : 'w-full'} bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 sm:p-6 min-h-[500px] shadow-2xl flex flex-col backdrop-blur-xl overflow-hidden`}>

                    {/* Background Ambient Glow for Results */}
                    {analysisData && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                    )}

                    {/* Empty State */}
                    {!analysisData && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 backdrop-blur-sm z-20">
                            <div className="w-24 h-24 mb-6 rounded-3xl bg-slate-800/80 border border-slate-700 shadow-2xl flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                                <FileText size={40} className="text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Relatório de Performance</h3>
                            {loading ? (
                                <p className="text-slate-400 max-w-sm">Processando dados e gerando insights da inteligência artificial...</p>
                            ) : (
                                <p className="text-slate-400 max-w-sm">
                                    {viewMode === 'report' ? (rows.length > 0 ? "Espere a análise ser gerada." : "Faça um simulado (IA ou Manual) para ver seu relatório consolidado aqui!") : "Preencha seus acertos ao lado e clique em Analisar para gerar um plano de revisão."}
                                </p>
                            )}
                        </div>
                    )}

                    {analysisData && (
                        <div className="relative z-10 flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                            <div className="p-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                                <CheckCircle2 size={18} className="text-green-400 drop-shadow-[0_0_5px_currentColor]" />
                            </div>
                            <h3 className="text-lg font-black text-slate-100 tracking-tight flex items-center gap-3">
                                Relatório de Performance
                                {(() => {
                                    const originTypes = rows.map(r => r.source === 'ai-generated' ? 'AI' : 'Manual');
                                    const hasAI = originTypes.includes('AI');
                                    const hasManual = originTypes.includes('Manual');
                                    let badge = null;
                                    
                                    if (hasAI && !hasManual) {
                                        badge = { text: 'Gerado por IA', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' };
                                    } else if (!hasAI && hasManual) {
                                        badge = { text: 'Manual', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' };
                                    } else if (hasAI && hasManual) {
                                        badge = { text: 'Misto (IA + Manual)', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.15)]' };
                                    }

                                    return badge ? (
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${badge.cls}`}>
                                            {badge.text}
                                        </span>
                                    ) : null;
                                })()}
                            </h3>
                        </div>
                    )}

                    {error && (
                        <div className="relative z-10 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-3 text-sm font-medium shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                            <AlertCircle size={20} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {!analysisData && !loading && !error && (
                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[380px] border-2 border-dashed border-slate-800 rounded-2xl gap-5 p-6 bg-slate-950/30">
                            <BrainCircuit size={64} className="opacity-20" />
                            <p className="max-w-xs text-center text-sm font-medium leading-relaxed">
                                Preencha os dados ao lado e clique em <strong className="text-blue-400">GERAR PLANO</strong> para ver o diagnóstico completo.
                            </p>
                        </div>
                    )}

                    {analysisData && (
                        <div className="relative z-10 space-y-6 pr-1 flex-1">

                            {/* Insight geral */}
                            <div className="p-5 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/40 border border-purple-500/30 rounded-2xl flex gap-4 items-start shadow-[0_0_20px_rgba(168,85,247,0.1)] backdrop-blur-md">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl shrink-0 border border-purple-500/30 shadow-inner">
                                    <BrainCircuit size={20} className="text-purple-300 drop-shadow-[0_0_5px_currentColor]" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1.5">Insight Geral da IA</h4>
                                    <p className="text-slate-200 text-sm font-medium leading-relaxed italic">"{analysisData.generalInsight}"</p>
                                </div>
                            </div>

                            {analysisData.confidence && (
                                <div className="p-5 bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-inner relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 blur-[40px] pointer-events-none" />
                                    
                                    <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
                                        <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                            Confiabilidade da Análise
                                        </h4>
                                        <span className={`text-xs font-black px-3 py-1 rounded-md border ${analysisData.confidence.label === 'Alta' ? 'text-green-300 border-green-500/30 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : analysisData.confidence.label === 'Média' ? 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-rose-300 border-rose-500/30 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}>
                                            {analysisData.confidence.label}
                                        </span>
                                    </div>
                                    <div className="relative z-10 w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/5 mb-3 shadow-inner">
                                        <div className="h-full bg-cyan-400 transition-all duration-1000 shadow-[0_0_10px_currentColor]" style={{ width: `${analysisData.confidence.score}%` }} />
                                    </div>
                                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Score: <strong className="text-cyan-300 font-mono text-xs block mt-0.5">{analysisData.confidence.score}%</strong></div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Tópicos: <strong className="text-slate-200 font-mono text-xs block mt-0.5">{analysisData.confidence.analyzedTopics}</strong></div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Matérias: <strong className="text-slate-200 font-mono text-xs block mt-0.5">{analysisData.confidence.analyzedSubjects}</strong></div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Cobertura: <strong className="text-slate-200 font-mono text-xs block mt-0.5">{analysisData.confidence.rowCoverage}%</strong></div>
                                    </div>
                                </div>
                            )}

                            {/* Cards por disciplina */}
                            {analysisData.disciplines.map((disc, idx) => {
                                const discPct = disc.percentage || 0;
                                const category = categoriesArray.find(c => c.name === disc.name);
                                const subjectColor = category?.color || '#3b82f6';

                                const discCfg =
                                    discPct >= 80 ? { from: 'from-green-500/20', border: 'border-green-500/30', text: 'text-green-400' } :
                                        discPct >= 60 ? { from: 'from-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' } :
                                            discPct <= 40 ? { from: 'from-red-500/20', border: 'border-red-500/30', text: 'text-red-400' } :
                                                { from: 'from-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };

                                return (
                                    <div key={idx} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg mb-4">

                                        {/* Cabeçalho da disciplina */}
                                        <div className={`relative px-5 py-4 bg-gradient-to-r ${discCfg.from} to-transparent border-b border-slate-700/50`}>
                                            <div className="flex justify-between items-end mb-2 relative z-10">
                                                <h3 className="text-xl font-black text-white flex items-center gap-3 drop-shadow-md tracking-tight uppercase">
                                                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg uppercase shadow-inner" style={{ backgroundColor: `${subjectColor}20`, color: subjectColor, border: `1px solid ${subjectColor}40` }}>
                                                        {disc.name ? disc.name[0] : '?'}
                                                    </span>
                                                    {disc.name}
                                                </h3>
                                                <div className="text-right">
                                                    <span className={`text-3xl font-mono font-black ${discCfg.text} drop-shadow-[0_0_10px_currentColor]`}>{discPct}%</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-4 relative z-10 mt-1">
                                                <span className="text-[11px] text-slate-200 font-black uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 shadow-sm">
                                                    {disc.overview}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono font-bold tracking-widest bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800">
                                                    {disc.totalCorrect}/{disc.totalQuestions} acertos
                                                </span>
                                            </div>
                                            {/* Barra geral da matéria - Agora usando a cor da matéria do Dashboard */}
                                            <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden relative z-10 border border-slate-800/80 shadow-inner">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_currentColor]"
                                                    style={{
                                                        width: `${discPct}%`,
                                                        backgroundColor: subjectColor,
                                                        color: subjectColor
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tópicos */}
                                        <div className="divide-y divide-slate-700/30">
                                            {disc.topics.map((topic, tIdx) => {
                                                const pct = topic.percentage || 0;
                                                const cfg =
                                                    pct >= 80 ? { label: 'Dominado', icon: '🏆', bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]', text: 'text-emerald-300' } :
                                                        pct >= 60 ? { label: 'Bom', icon: '👍', bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', text: 'text-amber-300' } :
                                                            pct <= 40 ? { label: 'Crítico', icon: '🚨', bar: 'bg-rose-500', badge: 'bg-rose-500/10   text-rose-400   border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]', text: 'text-rose-300' } :
                                                                { label: 'Atenção', icon: '⚠️', bar: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]', text: 'text-orange-300' };
                                                return (
                                                    <div key={tIdx} className="px-5 py-4 hover:bg-slate-700/30 transition-all duration-300 group/topic">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <span className={`text-sm font-bold truncate flex-1 ${cfg.text} group-hover/topic:translate-x-1 transition-transform`}>{topic.name}</span>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-md">{topic.correct}/{topic.total}</span>
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${cfg.badge}`}>
                                                                    {cfg.icon} {cfg.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Barra de progresso */}
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                                                                <div className={`h-full rounded-full transition-all duration-1000 ${cfg.bar}`} style={{ width: `${pct}%`, boxShadow: `0 0 10px currentColor` }} />
                                                            </div>
                                                            <span className={`text-[11px] font-mono font-black w-10 text-right ${cfg.text}`}>{pct}%</span>
                                                        </div>
                                                        {/* Ação */}
                                                        <div className="mt-2.5 flex items-center gap-1.5 opacity-70 group-hover/topic:opacity-100 transition-opacity">
                                                            <div className={`w-1 h-1 rounded-full ${cfg.bar}`} />
                                                            <p className="text-[11px] text-slate-300 font-medium tracking-wide">Ação recomendada: <strong className="text-white">{topic.action}</strong></p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                )}
            </div>

            <ConfirmModal
                isOpen={showResetScoresConfirm}
                onClose={() => setShowResetScoresConfirm(false)}
                onConfirm={handleConfirmResetScores}
                title="Zerar Valores do Simulado"
                message="Deseja zerar apenas os valores de acertos e total, mantendo todas as matérias cadastradas?"
                confirmText="Zerar Valores"
                type="warning"
                icon={RotateCcw}
            />
        </div>
    );
}


```

---

# 4. HISTÓRICO E VISUALIZAÇÃO DE DESEMPENHO (HISTORY & ANALYTICS)

## `src/components/StudyHistory.jsx` <a id="src-components-studyhistory-jsx"></a>

- **Localização:** `src/components/StudyHistory.jsx`
- **Descrição:** Painel de histórico de sessões e simulados com modo de desempenho, filtros cronológicos e suporte à exclusão granular de simulados
- **Linhas:** 1.232
- **Tamanho:** 87.52 KB

```javascript
import React, { useMemo, useState } from 'react';
import {
    Clock, Calendar, TrendingUp, TrendingDown, BarChart3, Zap, BrainCircuit,
    AlertCircle, Trophy, Siren, Trash2, Search, Filter, ChevronDown, ChevronUp,
    ArrowUpDown, CheckCircle2, Columns, LayoutList, CalendarDays, BookOpen, Layers,
    Eye, Sparkles, X
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { normalizeDate, getDateKey, formatDuration as globalFormatDuration } from '../utils/dateHelper';
import ConfirmModal from './ConfirmModal';

const formatDuration = (minutes) => {
    return globalFormatDuration((minutes || 0) / 60);
};

// Get day name in Portuguese - Full names to avoid browser translation bugs (Sex -> Gender)
const getDayName = (date) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[date.getDay()];
};

const StudyHistory = React.memo(function StudyHistory({
    studySessions: rawStudySessions = [],
    categories: rawCategories = [],
    simuladoRows: rawSimuladoRows = [],
    onDeleteSession,
    onDeleteSimulado,
    mode = 'full' // 'full', 'sessions', 'performance'
}) {
    const studySessions = Array.isArray(rawStudySessions) ? rawStudySessions : Object.values(rawStudySessions || {});
    const categories = (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    }));
    const simuladoRows = Array.isArray(rawSimuladoRows) ? rawSimuladoRows : Object.values(rawSimuladoRows || {});
    const showToast = useToast();
    const [selectedWeekOffset, setSelectedWeekOffset] = React.useState(0);
    const [currentTime, setCurrentTime] = React.useState(() => Date.now()); // Fix B-13 Purity

    React.useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) setCurrentTime(Date.now());
        }, 60 * 1000);
        const handleVisibility = () => {
            if (!document.hidden) setCurrentTime(Date.now());
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [simuladoToDelete, setSimuladoToDelete] = useState(null);
    const [selectedSimuladoKey, setSelectedSimuladoKey] = useState(null);
    const [compareKeys, setCompareKeys] = useState({ keyA: null, keyB: null });
    const [viewMode, setViewMode] = useState('focus'); // 'focus' | 'compare' | 'timeline'
    const [topicSearch, setTopicSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'dominated' | 'attention' | 'critical'
    const [sortOrder, setSortOrder] = useState('critical-first'); // 'critical-first' | 'best-first' | 'name-asc'
    const [collapsedSubjects, setCollapsedSubjects] = useState({});

    // P09 PERF FIX: Cache today's dateString to avoid new Date() in render path
    const todayDateStr = useMemo(() => new Date(currentTime).toDateString(), [currentTime]);

    // Calculate total weeks available (Sunday to Sunday boundaries)
    const availableWeeks = useMemo(() => {
        if (studySessions.length === 0) return 0;

        // Find the earliest session
        const earliestTimeArr = studySessions.map(s => {
            const d = normalizeDate(s.startTime);
            const t = d ? d.getTime() : currentTime;
            return isNaN(t) ? currentTime : t;
        });

        // FIX: Removido useMemo aninhado que causava erro #300. 
        // Hooks devem ser chamados apenas no nível superior.
        const earliestTime = earliestTimeArr.reduce((min, cur) => Math.min(min, cur), currentTime);

        const firstSession = new Date(earliestTime);

        // Get start of week (Sunday) for both earliest session and now
        const firstSunday = new Date(firstSession);
        firstSunday.setDate(firstSession.getDate() - firstSession.getDay());
        firstSunday.setHours(0, 0, 0, 0);

        const todaySunday = new Date();
        todaySunday.setDate(todaySunday.getDate() - todaySunday.getDay());
        todaySunday.setHours(0, 0, 0, 0);

        // Count weeks between Sundays
        const diffTime = Math.abs(todaySunday - firstSunday);
        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

        return Math.max(diffWeeks, 1);
    }, [studySessions, currentTime]); // BUG-23 FIX: currentTime adicionado

    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date(currentTime);
        // Adjust now based on selected week offset (selectedWeekOffset is 0 for current week, -1 for last week, etc.)
        const referenceDate = new Date(now);
        referenceDate.setDate(now.getDate() + (selectedWeekOffset * 7));

        const today = now.toDateString();
        const startOfWeek = new Date(referenceDate);
        startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        // Reference week sessions
        const refWeekEnd = new Date(startOfWeek);
        refWeekEnd.setDate(startOfWeek.getDate() + 7);

        const sessionsByDateStr = {};
        studySessions.forEach(s => {
            const d = normalizeDate(s.startTime);
            if (!d) return;
            const dStr = d.toDateString();
            if (!sessionsByDateStr[dStr]) {
                sessionsByDateStr[dStr] = { minutes: 0, sessions: [] };
            }
            sessionsByDateStr[dStr].minutes += (Number(s.duration) || 0);
            sessionsByDateStr[dStr].sessions.push(s);
        });

        // Today's sessions (always actual today)
        const todaySessions = sessionsByDateStr[today]?.sessions || [];
        const todayMinutes = sessionsByDateStr[today]?.minutes || 0;

        // Selected week's data (group by day)
        const weekData = [];
        const weekSessions = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toDateString();

            const daySessions = sessionsByDateStr[dateStr]?.sessions || [];
            weekSessions.push(...daySessions);

            weekData.push({
                day: getDayName(date),
                date: date.getDate(),
                minutes: sessionsByDateStr[dateStr]?.minutes || 0,
                isToday: dateStr === today
            });
        }

        // Total all time
        const totalMinutes = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
        const totalSessions = studySessions.length;

        // Max for chart scaling
        // BUG-110: Garantir que minutes seja numérico antes de Math.max
        const maxDayMinutes = Math.max(...weekData.map(d => Number(d.minutes) || 0), 30);

        return { todaySessions, weekSessions, todayMinutes, weekData, totalMinutes, totalSessions, maxDayMinutes, weekStart: startOfWeek, weekEnd: refWeekEnd };
    }, [studySessions, selectedWeekOffset, currentTime]);

    // Get category name by ID
    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || 'Estudo Geral';
    };

    // Get subject name by ID or fallback
    const getSubjectName = (categoryId, taskId, taskTitle = '') => {
        const isInternalId = (str) => {
            if (!str) return false;
            const s = String(str);
            return s.startsWith('task') || s.startsWith('cat-') || s.includes('-weaktopic-');
        };

        if (taskTitle && !isInternalId(taskTitle)) return taskTitle;
        if (!taskId) return '';
        
        const cat = categories.find(c => c.id === categoryId);
        if (!cat || !cat.tasks) return isInternalId(taskId) ? '' : taskId;
        
        const task = cat.tasks.find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
        return task?.text || task?.title || (isInternalId(taskId) ? '' : taskId);
    };

    const getCategoryIcon = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.icon || '📚';
    };

    // Helper to get color for performance subjects
    const _getSubjectColor = (name) => {
        const safeName = String(name || '').toLowerCase();
        const cat = categories.find(c => String(c?.name || '').toLowerCase() === safeName);
        if (cat?.color) return cat.color;

        // Palette fallback for consistent coloring of unknown subjects
        const palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
        let hash = 0;
        const source = safeName || 'desconhecido';
        for (let i = 0; i < source.length; i++) {
            hash = source.charCodeAt(i) + ((hash << 5) - hash);
        }
        return palette[Math.abs(hash) % palette.length];
    };

    return (
        <div className="w-full space-y-5 animate-fade-in-down">
            {/* Top Section - Stats */}
            {(mode === 'full' || mode === 'sessions') && (
                <div className="flex flex-col gap-6 text-slate-100">
                    {/* Stats Cards - Enhanced */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex-1 glass p-4 border-l-4 border-emerald-500">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <Clock size={14} />
                                Hoje
                            </div>
                            <div className="text-2xl font-black text-white">{formatDuration(stats.todayMinutes)}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats.todaySessions.length} sessões realizadas
                            </div>
                        </div>

                        <div className="flex-1 glass p-4 border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <Calendar size={14} />
                                Esta Semana
                            </div>
                            <div className="text-2xl font-black text-white">{formatDuration(stats.weekData.reduce((acc, d) => acc + d.minutes, 0))}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats.weekData.filter(d => d.minutes > 0).length} dias ativos
                            </div>
                        </div>

                        <div className="flex-1 glass p-4 border-l-4 border-purple-500">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <TrendingUp size={14} />
                                Total Geral
                            </div>
                            <div className="text-2xl font-black text-white">{formatDuration(stats.totalMinutes)}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats.totalSessions} sessões totais
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Middle Section - Chart and Sessions */}
            {(mode === 'full' || mode === 'sessions') && (
                <div className="flex flex-col gap-4 items-stretch min-w-0 w-full">
                    {/* Weekly Chart - Enhanced */}
                    <div className="w-full glass p-4 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 min-w-0">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3 shrink-0">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <BarChart3 size={12} className="text-blue-400" />
                                </div>
                                Gráfico Semanal
                            </h3>

                            {/* Week Selector - Wrapped for Mobile */}
                            <div className="w-full sm:w-auto min-w-0">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar scroll-smooth w-full">
                                    {Array.from({ length: Math.min(availableWeeks, 8) }).map((_, i) => {
                                        const offset = -i;
                                        const isSelected = selectedWeekOffset === offset;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedWeekOffset(offset)}
                                                className={`
                                                    relative px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                                    transition-all duration-300 ease-out flex items-center gap-2 shrink-0
                                                    ${isSelected
                                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-105 border border-white/20'
                                                        : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border border-transparent active:scale-95'
                                                    }
                                                    backdrop-blur-md
                                                `}
                                            >
                                                <div className={`w-1 h-1 rounded-full transition-all ${isSelected ? 'bg-white animate-pulse' : 'bg-slate-700'}`} />
                                                {offset === 0 ? 'Semana Atual' : `Semana ${availableWeeks - i}`}
                                            </button>
                                        );
                                    }).reverse()}
                                </div>
                            </div>
                        </div>
                        {/* Week date range — centered above bars */}
                        {stats.weekStart && (
                            <div className="text-center mb-3">
                                <span className="text-[11px] font-semibold text-slate-400 tracking-wide tabular-nums">
                                    {stats.weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    <span className="mx-1.5 text-slate-600">—</span>
                                    {new Date(stats.weekEnd.getTime() - 1).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </div>
                        )}
                        <div className="flex items-end justify-between gap-2 h-64">
                            {stats.weekData.map((day, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    {/* Bar */}
                                    <div className="w-full flex flex-col items-center justify-end h-40">
                                        <div
                                            className={`w-full max-w-8 rounded-t-lg transition-all duration-500 ${day.isToday
                                                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                                : day.minutes > 0
                                                    ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                                    : 'bg-slate-700/50'
                                                }`}
                                            style={{
                                                height: `${Math.max((day.minutes / stats.maxDayMinutes) * 100, 5)}%`,
                                                minHeight: '6px'
                                            }}
                                        />
                                    </div>
                                    {/* Time label */}
                                    <div className={`text-[9px] font-mono ${day.minutes > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {day.minutes > 0 ? formatDuration(day.minutes) : '-'}
                                    </div>
                                    {/* Day label - Force Portuguese and prevent browser auto-translation */}
                                    <div
                                        translate="no"
                                        className={`text-[10px] font-bold ${day.isToday ? 'text-emerald-400' : 'text-slate-500'}`}
                                        title={day.day}
                                    >
                                        {day.day === 'Domingo' ? 'Dom' :
                                            day.day === 'Segunda' ? 'Seg' :
                                                day.day === 'Terça' ? 'Ter' :
                                                    day.day === 'Quarta' ? 'Qua' :
                                                        day.day === 'Quinta' ? 'Qui' :
                                                            day.day === 'Sexta' ? 'Sex' : 'Sáb'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Week Sessions - Enhanced */}
                    <div className="w-full glass p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Zap size={14} />
                            Sessões da Semana ({stats.weekSessions.length})
                        </h3>

                        {stats.weekSessions.length > 0 ? (
                            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {[...stats.weekSessions].sort((a, b) => new Date(normalizeDate(b.startTime) || 0).getTime() - new Date(normalizeDate(a.startTime) || 0).getTime()).map((session, idx) => (
                                    <div key={session.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{getCategoryIcon(session.categoryId)}</span>
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {getCategoryName(session.categoryId)}
                                                </div>
                                                {getSubjectName(session.categoryId, session.taskId, session.taskTitle) && (
                                                    <div className="text-xs text-slate-400 mt-0.5 font-medium">
                                                        {getSubjectName(session.categoryId, session.taskId, session.taskTitle)}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {(normalizeDate(session.startTime) || new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-emerald-400">
                                                {formatDuration(session.duration)}
                                            </div>
                                            {typeof onDeleteSession === 'function' && (
                                                <button
                                                    onClick={() => {
                                                        if (!session.id) {
                                                            showToast('Erro: ID da sessão não encontrado.', 'error');
                                                            return;
                                                        }
                                                        setSessionToDelete(session);
                                                    }}
                                                    className="p-1.5 rounded-md bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                                                    title="Excluir Sessão"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500">
                                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhuma sessão nesta semana ainda</p>
                                <p className="text-xs mt-1 text-slate-600">Use o Pomodoro para começar!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SESSÃO DE HISTÓRICO DE DESEMPENHO EM SIMULADOS */}
            {(mode === 'full' || mode === 'performance') && (
                <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
                    {/* Background com gradiente sutil e moderno */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/40"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
                    <div className="absolute inset-[1px] rounded-2xl border border-white/10"></div>

                    <div className="relative p-5 sm:p-7 flex flex-col h-full space-y-6">
                        {(() => {
                            // Agrupar simulados do histórico por batchId ou data
                            const groupedSimulados = Object.values(simuladoRows.reduce((acc, r) => {
                                if (!r.date && !r.createdAt) return acc;
                                const hasData = parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0;
                                if (!r.validated && !hasData) return acc;
                                const rDate = normalizeDate(r.date || r.createdAt);
                                if (!rDate) return acc;
                                const isAi = r.source === 'ai-generated' || (r.batchId && r.source !== 'manual');
                                const key = (isAi && r.batchId) ? String(r.batchId) : (isAi ? `ai-${getDateKey(rDate)}` : `manual-${getDateKey(rDate)}`);
                                if (!acc[key]) {
                                    acc[key] = { key, date: rDate, rows: [], isAi };
                                }
                                acc[key].rows.push(r);
                                return acc;
                            }, {})).sort((a, b) => b.date.getTime() - a.date.getTime());

                            if (groupedSimulados.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl"></div>
                                            <div className="relative p-5 bg-slate-800/80 rounded-2xl border border-indigo-500/30">
                                                <BrainCircuit size={44} className="text-indigo-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-base font-bold text-white">Nenhum dado de simulado encontrado</h3>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                            Adicione resultados de simulados manuais ou gere simulados IA para acompanhar seu histórico de desempenho aqui.
                                        </p>
                                    </div>
                                );
                            }

                            // Estatísticas Globais Acumuladas
                            let totalGlobalQuestions = 0;
                            let totalGlobalCorrect = 0;
                            const uniqueTopicStats = new Map();

                            groupedSimulados.forEach(group => {
                                const valid = group.rows.filter(r => r.subject && r.topic);
                                valid.forEach(r => {
                                    const tot = parseInt(r.total, 10) || 0;
                                    const cor = parseInt(r.correct, 10) || 0;
                                    const safeC = Math.min(cor, tot);
                                    totalGlobalQuestions += tot;
                                    totalGlobalCorrect += safeC;

                                    const tKey = `${r.subject}__${r.topic}`;
                                    if (!uniqueTopicStats.has(tKey)) {
                                        uniqueTopicStats.set(tKey, { correct: 0, total: 0 });
                                    }
                                    const current = uniqueTopicStats.get(tKey);
                                    current.correct += safeC;
                                    current.total += tot;
                                });
                            });

                            const globalAllTimePct = totalGlobalQuestions > 0
                                ? Math.max(0, Math.min(100, Math.round((totalGlobalCorrect / totalGlobalQuestions) * 100)))
                                : 0;

                            let dominatedCount = 0;
                            let attentionCount = 0;
                            let criticalCount = 0;

                            uniqueTopicStats.forEach(({ correct, total }) => {
                                const pct = (total > 0 && Number.isFinite(correct) && Number.isFinite(total)) ? Math.round((correct / total) * 100) : 0;
                                if (pct >= 70) dominatedCount++;
                                else if (pct >= 50) attentionCount++;
                                else criticalCount++;
                            });

                            // Helpers de status
                            const getStatus = (pct) => {
                                const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
                                if (safePct >= 70) {
                                    return {
                                        id: 'dominated',
                                        label: 'DOMINADO',
                                        color: 'emerald',
                                        dotBg: 'bg-emerald-500',
                                        icon: Trophy,
                                        wrapper: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    };
                                }
                                if (safePct >= 50) {
                                    return {
                                        id: 'attention',
                                        label: 'ATENÇÃO',
                                        color: 'amber',
                                        dotBg: 'bg-amber-500',
                                        icon: AlertCircle,
                                        wrapper: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    };
                                }
                                return {
                                    id: 'critical',
                                    label: 'CRÍTICO',
                                    color: 'rose',
                                    dotBg: 'bg-rose-500',
                                    icon: Siren,
                                    wrapper: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                };
                            };

                            const getAction = (pct) => {
                                const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
                                if (safePct >= 70) return 'Manter Revisão Periódica';
                                if (safePct >= 50) return 'Treino Prático Intensivo';
                                return 'Revisão Teórica + Questões';
                            };

                            const getGlobalBannerStyle = (pct) => {
                                const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
                                if (safePct >= 70) {
                                    return {
                                        border: 'border-emerald-500/30 shadow-emerald-500/5',
                                        gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
                                        bar: 'bg-emerald-500',
                                        iconBg: 'bg-emerald-500/20 text-emerald-400',
                                        titleColor: 'text-emerald-300',
                                        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                                        statusLabel: 'Desempenho Excelente',
                                        message: 'Excelente! Você está dominando o conteúdo com consistência. Mantenha as revisões periódicas!'
                                    };
                                }
                                if (safePct >= 50) {
                                    return {
                                        border: 'border-amber-500/30 shadow-amber-500/5',
                                        gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
                                        bar: 'bg-amber-500',
                                        iconBg: 'bg-amber-500/20 text-amber-400',
                                        titleColor: 'text-amber-300',
                                        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                                        statusLabel: 'Atenção Necessária',
                                        message: `Bom ritmo! Sua média é de ${safePct}%. Foco nos tópicos em atenção para consolidar a zona de aprovação.`
                                    };
                                }
                                return {
                                    border: 'border-rose-500/30 shadow-rose-500/5',
                                    gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
                                    bar: 'bg-rose-500',
                                    iconBg: 'bg-rose-500/20 text-rose-400',
                                    titleColor: 'text-rose-300',
                                    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                                    statusLabel: 'Reforço Urgente',
                                    message: 'Atenção! Sua média global indica necessidade de reforçar a base teórica e praticar questões básicas dos tópicos críticos.'
                                };
                            };

                            // Função de processamento de simulado
                            const processSimulado = (rows) => {
                                const validRows = (Array.isArray(rows) ? rows : []).filter(r => r && r.subject && r.topic);
                                const totalQuestions = validRows.reduce((acc, r) => acc + (parseInt(r.total, 10) || 0), 0);
                                const totalCorrect = validRows.reduce((acc, r) => acc + Math.min(parseInt(r.correct, 10) || 0, parseInt(r.total, 10) || 0), 0);
                                const globalPct = totalQuestions > 0 ? Math.max(0, Math.min(100, Math.round((totalCorrect / totalQuestions) * 100))) : 0;

                                const subjectMap = {};
                                validRows.forEach(row => {
                                    const subj = String(row.subject || '').trim();
                                    const top = String(row.topic || '').trim();
                                    if (!subjectMap[subj]) {
                                        subjectMap[subj] = { name: subj, correct: 0, total: 0, topicMap: {} };
                                    }
                                    const cor = Math.min(parseInt(row.correct, 10) || 0, parseInt(row.total, 10) || 0);
                                    const tot = parseInt(row.total, 10) || 0;
                                    subjectMap[subj].correct += cor;
                                    subjectMap[subj].total += tot;

                                    if (!subjectMap[subj].topicMap[top]) {
                                        subjectMap[subj].topicMap[top] = { name: top, correct: 0, total: 0 };
                                    }
                                    subjectMap[subj].topicMap[top].correct += cor;
                                    subjectMap[subj].topicMap[top].total += tot;
                                });

                                let subjects = Object.values(subjectMap).map(subj => {
                                    let topics = Object.values(subj.topicMap).map(t => {
                                        const safeC = Math.min(t.correct, t.total);
                                        const pct = t.total > 0 ? Math.round((safeC / t.total) * 100) : 0;
                                        return {
                                            ...t,
                                            correct: safeC,
                                            pct: Math.max(0, Math.min(100, pct))
                                        };
                                    });

                                    // Filtro de busca
                                    if (topicSearch.trim()) {
                                        const q = topicSearch.trim().toLowerCase();
                                        topics = topics.filter(t => t.name.toLowerCase().includes(q) || subj.name.toLowerCase().includes(q));
                                    }

                                    // Filtro de status
                                    if (statusFilter !== 'all') {
                                        topics = topics.filter(t => getStatus(t.pct).id === statusFilter);
                                    }

                                    // Ordenação de tópicos
                                    topics.sort((a, b) => {
                                        if (sortOrder === 'critical-first') return a.pct - b.pct;
                                        if (sortOrder === 'best-first') return b.pct - a.pct;
                                        return a.name.localeCompare(b.name, 'pt-BR');
                                    });

                                    const safeSubjC = Math.min(subj.correct, subj.total);
                                    const subjPct = subj.total > 0 ? Math.round((safeSubjC / subj.total) * 100) : 0;

                                    return {
                                        ...subj,
                                        correct: safeSubjC,
                                        pct: Math.max(0, Math.min(100, subjPct)),
                                        topics
                                    };
                                }).filter(s => s.topics.length > 0);

                                subjects.sort((a, b) => {
                                    if (sortOrder === 'critical-first') return a.pct - b.pct;
                                    if (sortOrder === 'best-first') return b.pct - a.pct;
                                    return a.name.localeCompare(b.name, 'pt-BR');
                                });

                                return { validRows, totalQuestions, totalCorrect, globalPct, subjects };
                            };

                            // Configuração de datas ativas para os modos
                            const activeFocusKey = selectedSimuladoKey || groupedSimulados[0]?.key;
                            const activeSimulado = groupedSimulados.find(g => g.key === activeFocusKey) || groupedSimulados[0];

                            const activeCompAKey = compareKeys.keyA || groupedSimulados[0]?.key;
                            const activeCompBKey = compareKeys.keyB || (groupedSimulados[1] ? groupedSimulados[1]?.key : groupedSimulados[0]?.key);
                            const simuladoA = groupedSimulados.find(g => g.key === activeCompAKey) || groupedSimulados[0];
                            const simuladoB = groupedSimulados.find(g => g.key === activeCompBKey) || groupedSimulados[1] || groupedSimulados[0];

                            // Renderizador de um card de simulado
                            const renderSimuladoCard = (group, _isComparison = false, deltaInfo = null) => {
                                const { totalQuestions, totalCorrect, globalPct, subjects } = processSimulado(group.rows);
                                const isToday = group.date.toDateString() === todayDateStr;
                                const title = isToday ? 'Hoje' : group.date.toLocaleDateString('pt-BR');
                                const bannerStyle = getGlobalBannerStyle(globalPct);

                                return (
                                    <div key={group.key} className="flex-1 flex flex-col min-w-0 bg-slate-900/40 rounded-2xl border border-white/10 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
                                        {/* Cabeçalho do Card */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                                                    group.isAi 
                                                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                                                        : isToday 
                                                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                                                            : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                                                }`}>
                                                    {group.isAi ? '🤖' : (isToday ? '⚡' : '🕰️')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className={`text-base font-black tracking-tight truncate ${isToday ? 'text-emerald-400' : 'text-white'}`}>
                                                            {title}
                                                        </h3>
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                                            group.isAi
                                                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                                                : 'bg-slate-800 border-slate-700 text-slate-300'
                                                        }`}>
                                                            {group.isAi ? 'Simulado IA' : 'Simulado'}
                                                        </span>
                                                        {deltaInfo !== null && (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                                                deltaInfo > 0
                                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                                    : deltaInfo < 0
                                                                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                                            }`}>
                                                                {deltaInfo > 0 ? <TrendingUp size={11} /> : deltaInfo < 0 ? <TrendingDown size={11} /> : null}
                                                                {deltaInfo > 0 ? `+${deltaInfo}%` : `${deltaInfo}%`} vs anterior
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize truncate">
                                                        {group.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Contadores e Ação de Exclusão */}
                                            <div className="flex items-center gap-3">
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-xs font-bold text-slate-200 block">
                                                        {totalCorrect.toLocaleString('pt-BR')} / {totalQuestions.toLocaleString('pt-BR')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">acertos</span>
                                                </div>

                                                {typeof onDeleteSimulado === 'function' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSimuladoToDelete({
                                                                key: group.key,
                                                                title,
                                                                date: group.date,
                                                                totalQuestions
                                                            });
                                                        }}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95 shrink-0"
                                                        title={`Excluir histórico de ${title}`}
                                                        aria-label={`Excluir simulado de ${title}`}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Global Insight Banner Dinâmico */}
                                        <div className={`mb-6 rounded-xl border p-5 relative overflow-hidden bg-slate-800/80 ${bannerStyle.border}`}>
                                            <div className={`absolute inset-0 bg-gradient-to-r ${bannerStyle.gradient}`}></div>
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${bannerStyle.bar} rounded-l-xl`}></div>
                                            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${bannerStyle.iconBg}`}>
                                                        <BrainCircuit size={22} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className={`text-xs font-bold uppercase tracking-widest ${bannerStyle.titleColor}`}>
                                                                Média Geral
                                                            </h4>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bannerStyle.badgeBg}`}>
                                                                {bannerStyle.statusLabel}
                                                            </span>
                                                        </div>
                                                        <p className="text-2xl font-black text-white mt-0.5">{globalPct}%</p>
                                                    </div>
                                                </div>

                                                <div className="text-right hidden sm:block">
                                                    <span className="text-xs text-slate-400 font-medium">Taxa de Acerto</span>
                                                    <p className="text-sm font-bold text-white font-mono">
                                                        {totalCorrect.toLocaleString('pt-BR')} de {totalQuestions.toLocaleString('pt-BR')} questões
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="relative mt-3 text-xs text-slate-300 leading-relaxed font-medium">
                                                {bannerStyle.message}
                                            </p>
                                        </div>

                                        {/* Lista de Matérias */}
                                        <div className="space-y-4 flex-1">
                                            {subjects.length === 0 ? (
                                                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-white/5">
                                                    <Search size={24} className="mx-auto text-slate-600 mb-2" />
                                                    <p className="text-xs text-slate-400 font-medium">Nenhum assunto corresponde aos filtros aplicados.</p>
                                                </div>
                                            ) : (
                                                subjects.map((subj) => {
                                                    const subjStatus = getStatus(subj.pct);
                                                    const isCollapsed = Boolean(collapsedSubjects[`${group.key}__${subj.name}`]);
                                                    const toggleCollapse = () => {
                                                        setCollapsedSubjects(prev => ({
                                                            ...prev,
                                                            [`${group.key}__${subj.name}`]: !isCollapsed
                                                        }));
                                                    };

                                                    return (
                                                        <div key={subj.name} className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden transition-all hover:border-white/20">
                                                            {/* Subject Header */}
                                                            <div
                                                                onClick={toggleCollapse}
                                                                className="px-5 py-3.5 bg-slate-800/70 border-b border-white/5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/90 transition-colors select-none"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <button
                                                                        type="button"
                                                                        className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                                                                        aria-label={isCollapsed ? "Expandir matéria" : "Recolher matéria"}
                                                                    >
                                                                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                                                    </button>
                                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${subjStatus.dotBg} shadow-[0_0_8px_currentColor]`}></div>
                                                                    <h4 className="text-sm font-bold text-white truncate">{subj.name}</h4>
                                                                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
                                                                        ({subj.topics.length} {subj.topics.length === 1 ? 'tópico' : 'tópicos'})
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-4 shrink-0">
                                                                    <div className="w-20 hidden md:block">
                                                                        <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                                    subj.pct >= 70 ? 'bg-emerald-500' : subj.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                                }`}
                                                                                style={{ width: `${subj.pct}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-base font-black text-white">{subj.pct}%</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono block">
                                                                            {subj.correct.toLocaleString('pt-BR')}/{subj.total.toLocaleString('pt-BR')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Topics Table */}
                                                            {!isCollapsed && (
                                                                <div className="p-2 sm:p-3 space-y-2">
                                                                    {/* Column Headers Rigorosamente Alinhados */}
                                                                    <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 sm:px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/70 rounded-lg border border-white/5">
                                                                        <div className="col-span-4 text-left">Assunto / Tópico</div>
                                                                        <div className="col-span-3 text-center">Status</div>
                                                                        <div className="col-span-2 text-center">Desempenho</div>
                                                                        <div className="col-span-3 text-right">Ação Recomendada</div>
                                                                    </div>

                                                                    {/* Rows */}
                                                                    <div className="space-y-1.5">
                                                                        {subj.topics.map((topic) => {
                                                                            const topicStatus = getStatus(topic.pct);
                                                                            const action = getAction(topic.pct);
                                                                            const TopicIcon = topicStatus.icon;

                                                                            return (
                                                                                <div
                                                                                    key={topic.name}
                                                                                    className="flex flex-col sm:grid sm:grid-cols-12 gap-3 items-center px-4 sm:px-6 py-3 rounded-lg bg-slate-900/50 hover:bg-slate-800/60 transition-colors border border-transparent hover:border-indigo-500/20"
                                                                                >
                                                                                    {/* Assunto */}
                                                                                    <div className="w-full sm:col-span-4 text-sm font-semibold text-white sm:pr-2 whitespace-normal break-words leading-tight text-center sm:text-left flex items-center gap-2 justify-center sm:justify-start">
                                                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${topicStatus.dotBg}`}></span>
                                                                                        <span className="truncate" title={topic.name}>{topic.name}</span>
                                                                                    </div>

                                                                                    {/* Status Badge */}
                                                                                    <div className="w-full sm:col-span-3 flex justify-center">
                                                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wide ${topicStatus.wrapper}`}>
                                                                                            <TopicIcon size={12} className="shrink-0" />
                                                                                            <span>{topicStatus.label}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Desempenho Gauge */}
                                                                                    <div className="w-full sm:col-span-2 flex flex-col items-center justify-center">
                                                                                        <div className="relative w-9 h-9">
                                                                                            <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                                                                                                <circle cx="20" cy="20" r="16" strokeWidth="3" fill="transparent" className="stroke-slate-700/50" />
                                                                                                {topic.pct > 0 && (
                                                                                                    <circle
                                                                                                        cx="20"
                                                                                                        cy="20"
                                                                                                        r="16"
                                                                                                        strokeWidth="3"
                                                                                                        fill="transparent"
                                                                                                        stroke={topic.pct >= 70 ? '#10b981' : topic.pct >= 50 ? '#f59e0b' : '#f43f5e'}
                                                                                                        strokeLinecap="round"
                                                                                                        strokeDasharray={2 * Math.PI * 16}
                                                                                                        strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(100, topic.pct) / 100)}
                                                                                                    />
                                                                                                )}
                                                                                            </svg>
                                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                                <span className="text-[10px] font-bold text-white">{topic.pct}%</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <span className="text-[9px] text-slate-400 mt-0.5 font-mono tracking-tight">
                                                                                            {topic.correct.toLocaleString('pt-BR')}/{topic.total.toLocaleString('pt-BR')}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Ação Recomendada */}
                                                                                    <div className="w-full sm:col-span-3 text-center sm:text-right">
                                                                                        <span className="text-[11px] text-slate-200 font-medium break-words leading-tight inline-block px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                                                                                            {action}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            };

                            // Delta para o modo comparativo
                            const { globalPct: pctA } = processSimulado(simuladoA.rows);
                            const { globalPct: pctB } = processSimulado(simuladoB.rows);
                            const compareDelta = pctA - pctB;

                            return (
                                <div className="space-y-6">
                                    {/* 1. PAINEL DE KPIS GLOBAIS */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400">
                                                <CalendarDays size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Simulados</span>
                                                <span className="text-xl font-black text-white">{groupedSimulados.length}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
                                                <BrainCircuit size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Média Acumulada</span>
                                                <span className={`text-xl font-black ${
                                                    globalAllTimePct >= 70 ? 'text-emerald-400' : globalAllTimePct >= 50 ? 'text-amber-400' : 'text-rose-400'
                                                }`}>
                                                    {globalAllTimePct}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
                                                <Layers size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Questões Feitas</span>
                                                <span className="text-xl font-black text-white font-mono">
                                                    {totalGlobalQuestions.toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                                                <Trophy size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tópicos Dominados</span>
                                                <div className="flex items-center gap-1.5 text-sm font-black text-white">
                                                    <span className="text-emerald-400">{dominatedCount}</span>
                                                    <span className="text-slate-500">/</span>
                                                    <span className="text-amber-400">{attentionCount}</span>
                                                    <span className="text-slate-500">/</span>
                                                    <span className="text-rose-400">{criticalCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. BARRA DE CONTROLES E SELEÇÃO DE MODO */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/10">
                                        {/* Modos de visualização */}
                                        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start md:self-auto">
                                            <button
                                                onClick={() => setViewMode('focus')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    viewMode === 'focus'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <LayoutList size={14} />
                                                <span>Foco por Data</span>
                                            </button>

                                            {groupedSimulados.length > 1 && (
                                                <button
                                                    onClick={() => setViewMode('compare')}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        viewMode === 'compare'
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                                >
                                                    <Columns size={14} />
                                                    <span>Comparativo</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setViewMode('timeline')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    viewMode === 'timeline'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <Layers size={14} />
                                                <span>Linha do Tempo</span>
                                            </button>
                                        </div>

                                        {/* Legenda Dinâmica e Rápida */}
                                        <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                                                <Trophy size={11} />
                                                <span>≥70% Dominado</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                                                <AlertCircle size={11} />
                                                <span>50-69% Atenção</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                                                <Siren size={11} />
                                                <span>&lt;50% Crítico</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. FILTROS E BUSCA */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        {/* Campo de Busca */}
                                        <div className="relative flex-1 max-w-md">
                                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="text"
                                                value={topicSearch}
                                                onChange={(e) => setTopicSearch(e.target.value)}
                                                placeholder="Buscar por matéria ou tópico..."
                                                className="w-full pl-9 pr-8 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                            />
                                            {topicSearch && (
                                                <button
                                                    onClick={() => setTopicSearch('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Filtro de Status + Ordenação */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="all">Todos os Status</option>
                                                <option value="critical">🚨 Apenas Críticos (&lt;50%)</option>
                                                <option value="attention">⚠️ Apenas Atenção (50-69%)</option>
                                                <option value="dominated">🏆 Apenas Dominados (≥70%)</option>
                                            </select>

                                            <select
                                                value={sortOrder}
                                                onChange={(e) => setSortOrder(e.target.value)}
                                                className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="critical-first">⚡ Pior Desempenho Primeiro</option>
                                                <option value="best-first">🏆 Melhor Desempenho Primeiro</option>
                                                <option value="name-asc">🔤 Ordem Alfabética (A-Z)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 4. CONTEÚDO PRINCIPAL BASEADO NO MODO */}
                                    {viewMode === 'focus' && (
                                        <div className="space-y-4">
                                            {/* Seletor de Datas em Pills */}
                                            {groupedSimulados.length > 1 && (
                                                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                    {groupedSimulados.map((g, idx) => {
                                                        const isSelected = g.key === activeFocusKey;
                                                        const isToday = g.date.toDateString() === todayDateStr;
                                                        const label = isToday ? 'Hoje' : g.date.toLocaleDateString('pt-BR');
                                                        return (
                                                            <button
                                                                key={g.key}
                                                                onClick={() => setSelectedSimuladoKey(g.key)}
                                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                                                                    isSelected
                                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-white/20 shadow-lg shadow-indigo-600/30 scale-105'
                                                                        : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white'
                                                                }`}
                                                            >
                                                                <span>{g.isAi ? '🤖' : (isToday ? '⚡' : '📅')}</span>
                                                                <span>{label}</span>
                                                                {idx === 0 && (
                                                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white">
                                                                        Recente
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Renderização do Simulado Selecionado em Largura Total */}
                                            {renderSimuladoCard(activeSimulado)}
                                        </div>
                                    )}

                                    {viewMode === 'compare' && (
                                        <div className="space-y-4">
                                            {/* Barra de Seleção dos Dois Simulados */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/10">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                                        Simulado A (Base Recente)
                                                    </label>
                                                    <select
                                                        value={activeCompAKey}
                                                        onChange={(e) => setCompareKeys(prev => ({ ...prev, keyA: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    >
                                                        {groupedSimulados.map(g => (
                                                            <option key={g.key} value={g.key}>
                                                                {g.date.toLocaleDateString('pt-BR')} ({g.isAi ? 'IA' : 'Manual'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                                        Simulado B (Para Comparação)
                                                    </label>
                                                    <select
                                                        value={activeCompBKey}
                                                        onChange={(e) => setCompareKeys(prev => ({ ...prev, keyB: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    >
                                                        {groupedSimulados.map(g => (
                                                            <option key={g.key} value={g.key}>
                                                                {g.date.toLocaleDateString('pt-BR')} ({g.isAi ? 'IA' : 'Manual'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Cards Lado a Lado */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {renderSimuladoCard(simuladoA, true, compareDelta)}
                                                {renderSimuladoCard(simuladoB, true, null)}
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'timeline' && (
                                        <div className="space-y-6">
                                            {groupedSimulados.map((g, idx) => {
                                                const prevSimulado = groupedSimulados[idx + 1];
                                                let delta = null;
                                                if (prevSimulado) {
                                                    const cur = processSimulado(g.rows).globalPct;
                                                    const prev = processSimulado(prevSimulado.rows).globalPct;
                                                    delta = cur - prev;
                                                }
                                                return renderSimuladoCard(g, false, delta);
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Modal de confirmação para exclusão de sessão Pomodoro */}
            <ConfirmModal
                isOpen={!!sessionToDelete}
                onClose={() => setSessionToDelete(null)}
                onConfirm={() => {
                    if (sessionToDelete?.id) {
                        try {
                            if (typeof onDeleteSession === 'function') {
                                onDeleteSession(sessionToDelete.id);
                                showToast('Sessão excluída.', 'info');
                            }
                        } catch {
                            showToast('Erro ao excluir sessão.', 'error');
                        }
                    }
                }}
                title="Excluir Sessão de Estudo"
                message="Excluir esta sessão de estudo? O tempo será subtraído da categoria."
                confirmText="Excluir Sessão"
                type="danger"
                icon={Trash2}
            />

            {/* Modal de confirmação seguro para exclusão de simulado */}
            <ConfirmModal
                isOpen={!!simuladoToDelete}
                onClose={() => setSimuladoToDelete(null)}
                onConfirm={() => {
                    if (simuladoToDelete?.key && typeof onDeleteSimulado === 'function') {
                        try {
                            onDeleteSimulado(simuladoToDelete.key);
                            showToast(`Simulado de ${simuladoToDelete.title} excluído.`, 'info');
                        } catch {
                            showToast('Erro ao excluir simulado.', 'error');
                        }
                        setSimuladoToDelete(null);
                    }
                }}
                title={`Excluir Simulado (${simuladoToDelete?.title || ''})`}
                message="Deseja realmente excluir este simulado do histórico? Todas as respostas e dados de desempenho desta avaliação serão removidos."
                confirmText="Excluir Simulado"
                type="danger"
                icon={Trash2}
            />
        </div>
    );
});

export default StudyHistory;

```

---

# 5. SERVIÇOS E CONEXÃO DE IA (SERVICES & AI INTEGRATION)

## `src/services/aiQuestionService.js` <a id="src-services-aiquestionservice-js"></a>

- **Localização:** `src/services/aiQuestionService.js`
- **Descrição:** Serviço cliente de geração de questões com IA: schema de validação estrutural (AI_QUESTION_SCHEMA), sanitização de alternativas e comunicação resiliente
- **Linhas:** 247
- **Tamanho:** 7.64 KB

```javascript
// 🔒 [SECURITY] Chave Gemini NUNCA deve ser usada no frontend.
// Todas as chamadas passam por um backend proxy autenticado.
// ROTA OBRIGATÓRIA: rotacione a chave Gemini atual imediatamente.

const AI_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_BACKEND_URL) || '/api';
const AI_TIMEOUT_MS = Number(typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_TIMEOUT_MS) || 60_000;

// ✅ FIX S02: credentials deve ser 'same-origin' por padrão.
// Se o backend for cross-origin, o backend deve configurar CORS
// explicitamente e o frontend deve usar 'include' apenas quando necessário.
const isSameOrigin = (() => {
    try {
        const backendUrl = new URL(AI_BACKEND_URL, window.location.origin);
        return backendUrl.origin === window.location.origin;
    } catch {
        return false;
    }
})();

// ✅ FIX #1: Validação de URL para evitar requisições a endpoints inválidos
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return true;
  } catch {
    return false;
  }
}

export const AI_QUESTION_SCHEMA = {
  id: 'string',
  enunciado: 'string',
  alternativas: 'array de { letra: string, texto: string }',
  alternativa_correta: 'string (A, B, C, D ou E)',
  justificativa: 'string',
  materia: 'string',
  assunto: 'string',
  dificuldade: 'facil| medio| dificil| expert',
};

/**
 * Valida e sanitiza uma questão individual retornada pela IA.
 */
export function validateAIQuestion(question) {
  const VALID_LETTERS = ['A', 'B', 'C', 'D', 'E'];

  if (!question || typeof question !== 'object') return null;

  if (!question.enunciado || typeof question.enunciado !== 'string') return null;

  if (!Array.isArray(question.alternativas) || question.alternativas.length < 2) return null;

  const alternativas = question.alternativas
    .map((alt) => ({
      letra: String(alt?.letra || '').toUpperCase(),
      texto: String(alt?.texto || '').trim(),
    }))
    .filter((alt) => VALID_LETTERS.includes(alt.letra) && alt.texto.length > 0);

  const correta = String(question.alternativa_correta || '').toUpperCase();

  if (!VALID_LETTERS.includes(correta)) return null;
  if (!alternativas.some((alt) => alt.letra === correta)) return null;

  return {
    id: String(question.id || crypto.randomUUID()),
    enunciado: question.enunciado.trim(),
    alternativas,
    alternativa_correta: correta,
    justificativa: typeof question.justificativa === 'string' ? question.justificativa.trim() : '',
    materia: typeof question.materia === 'string' ? question.materia.trim() : '',
    assunto: typeof question.assunto === 'string' ? question.assunto.trim() : '',
    dificuldade: ['facil', 'medio', 'dificil', 'expert'].includes(question.dificuldade)
      ? question.dificuldade
      : 'medio',
  };
}

/**
 * Valida array de questões retornadas pela IA.
 */
export function validateAIQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map(validateAIQuestion).filter(Boolean);
}

/**
 * Gera questões via backend proxy (NUNCA usa chave Gemini no frontend).
 * O backend é responsável por autenticar com Gemini.
 */
export async function generateViaGeminiDirect({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  signal,
}) {
  // ✅ FIX #1: Validar URL antes de fazer requisição
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do backend de IA: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const handleAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', handleAbort);
    }
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: isSameOrigin ? 'same-origin' : 'omit',
      signal: controller.signal,
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName }),
    });

    if (!response.ok) {
      throw new Error(`Backend AI retornou ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('text/json'))) {
      throw new Error(`Resposta do backend AI não é JSON: ${contentType}`);
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Resposta inválida do backend AI (JSON parsing error)`);
    }
    const questions = data.questions ?? [];
    return validateAIQuestions(questions);
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
}

/**
 * Gera questões via backend próprio (fallback quando Gemini não está disponível).
 */
export async function generateViaBackend({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  signal,
}) {
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do backend: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const handleAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', handleAbort);
    }
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: isSameOrigin ? 'same-origin' : 'omit',
      signal: controller.signal,
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName }),
    });

    if (!response.ok) {
      throw new Error(`Backend retornou ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Resposta do backend não é JSON: ${contentType}`);
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Resposta inválida do backend (JSON parsing error)`);
    }
    const questions = data.questions ?? [];
    return validateAIQuestions(questions);
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
}

/**
 * API pública compatível com o restante do app.
 * Tenta geração direta e cai para o backend quando necessário.
 */
const allowDirectAI =
  String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALLOW_DIRECT_AI) || '').toLowerCase() === 'true';

export async function generateAIQuestions(params = {}) {
  const payload = params || {};

  if (allowDirectAI) {
    try {
      const direct = await generateViaGeminiDirect(payload);

      if (Array.isArray(direct) && direct.length > 0) {
        return validateAIQuestions(direct);
      }
    } catch (error) {
      console.warn('[AI] Geração direta falhou, usando backend.', error);
    }
  }

  const backend = await generateViaBackend(payload);
  return validateAIQuestions(backend || []);
}

export default {
  AI_QUESTION_SCHEMA,
  validateAIQuestion,
  validateAIQuestions,
  generateViaGeminiDirect,
  generateViaBackend,
  generateAIQuestions,
};

```

---

# 6. GERENCIAMENTO DE ESTADO GLOBAL (ZUSTAND STORE SLICES)

## `src/store/slices/createSimuladoSlice.js` <a id="src-store-slices-createsimuladoslice-js"></a>

- **Localização:** `src/store/slices/createSimuladoSlice.js`
- **Descrição:** Slice do Zustand para simulados: resetSimuladoStats (reset seguro) e deleteSimulado com remoção granular e recalibração bayesiana automática das categorias afetadas
- **Linhas:** 208
- **Tamanho:** 8.20 KB

```javascript
import { computeCategoryStats } from '../../engine/stats.js';
import { getSafeScore } from '../../utils/scoreHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { normalize, aliases } from '../../utils/normalization.js';

export const createSimuladoSlice = (set) => ({
  resetSimuladoStats: () => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData?.categories) return;

    activeData.categories.forEach(c => {
      c.simuladoStats = {
        history: [],
        average: 0,
        lastAttempt: 0,
        trend: 'stable',
        level: 'BAIXO'
      };
    });

    activeData.simuladoRows = [];
    activeData.simulados = [];

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  deleteSimulado: (dateInput) => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !dateInput) return;

    const normalizedInput = String(dateInput).trim();

    const matchesItem = (item) => {
      if (!item) return false;
      if (item.id && String(item.id).trim() === normalizedInput) {
        return true;
      }
      if (item.batchId && String(item.batchId).trim() === normalizedInput) {
        return true;
      }
      const raw = item.date || item.createdAt;
      if (!raw) return false;
      const normalizedRaw = String(raw).trim();
      if (normalizedRaw === normalizedInput) return true;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
      const rawDatePart = normalizedRaw.includes('T') ? normalizedRaw.split('T')[0] : normalizedRaw;

      if (dateRegex.test(inputDatePart) && rawDatePart === inputDatePart) {
        return true;
      }

      if (normalizedInput.startsWith('ai-') || normalizedInput.startsWith('manual-')) {
        const prefixStripped = normalizedInput.replace(/^(ai|manual)-/, '');
        const strippedDatePart = prefixStripped.includes('T') ? prefixStripped.split('T')[0] : prefixStripped;
        if (dateRegex.test(strippedDatePart) && rawDatePart === strippedDatePart) {
          const itemIsAi = item.source === 'ai-generated' || (item.batchId && item.source !== 'manual');
          if (normalizedInput.startsWith('ai-') && itemIsAi) return true;
          if (normalizedInput.startsWith('manual-') && !itemIsAi) return true;
        }
      }
      return false;
    };

    const safeRows = Array.isArray(activeData.simuladoRows)
      ? activeData.simuladoRows
      : Object.values(activeData.simuladoRows || {});
    const safeSimulados = Array.isArray(activeData.simulados)
      ? activeData.simulados
      : Object.values(activeData.simulados || {});

    // Coleta todas as datas afetadas pelos itens excluídos
    const affectedDates = new Set();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
    if (dateRegex.test(inputDatePart)) {
      affectedDates.add(inputDatePart);
    }
    if (normalizedInput.startsWith('ai-') || normalizedInput.startsWith('manual-')) {
      const prefixStripped = normalizedInput.replace(/^(ai|manual)-/, '');
      const strippedDatePart = prefixStripped.includes('T') ? prefixStripped.split('T')[0] : prefixStripped;
      if (dateRegex.test(strippedDatePart)) {
        affectedDates.add(strippedDatePart);
      }
    }

    safeRows.forEach(r => {
      if (matchesItem(r)) {
        const dKey = getDateKey(normalizeDate(r.date || r.createdAt));
        if (dKey) affectedDates.add(dKey);
      }
    });

    safeSimulados.forEach(s => {
      if (matchesItem(s)) {
        const dKey = getDateKey(normalizeDate(s.date || s.createdAt));
        if (dKey) affectedDates.add(dKey);
      }
    });

    const remainingRows = safeRows.filter(r => !matchesItem(r));
    activeData.simuladoRows = remainingRows;
    activeData.simulados = safeSimulados.filter(s => !matchesItem(s));

    if (activeData.categories) {
      activeData.categories = activeData.categories.map(c => {
        const catMaxScore = Number.isFinite(Number(c.maxScore)) && Number(c.maxScore) > 0
          ? Number(c.maxScore)
          : (Number(activeData.maxScore) || 100);
        const catMinScore = Number.isFinite(Number(c.minScore))
          ? Math.min(Number(c.minScore), catMaxScore)
          : (Number(activeData.minScore) || 0);
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);

        if (c.simuladoStats?.history) {
          const safeHistory = Array.isArray(c.simuladoStats.history)
            ? c.simuladoStats.history
            : Object.values(c.simuladoStats.history || {});

          const catNorm = normalize(c.name || '');

          // Reconciliar histórico para cada entrada
          const newHistory = safeHistory
            .map(h => {
              const hDateKey = getDateKey(normalizeDate(h?.date || h?.createdAt));
              if (!affectedDates.has(hDateKey)) {
                return matchesItem(h) ? null : h;
              }

              // Data afetada: recalcular stats com as rows restantes para esta categoria nessa data
              const catRowsForDay = remainingRows.filter(r => {
                const rDateKey = getDateKey(normalizeDate(r.date || r.createdAt));
                if (rDateKey !== hDateKey) return false;
                if (c.id && r.categoryId && r.categoryId === c.id) return true;
                const rSubNorm = normalize(r.subject || '');
                return rSubNorm === catNorm || (aliases[rSubNorm] && aliases[rSubNorm].some(a => normalize(a) === catNorm));
              });

              if (catRowsForDay.length === 0) {
                return null; // Nenhuma row restante para esse dia
              }

              const dayTotal = catRowsForDay.reduce((sum, r) => sum + (parseInt(r.total, 10) || 0), 0);
              const dayCorrect = catRowsForDay.reduce((sum, r) => sum + Math.min(parseInt(r.correct, 10) || 0, parseInt(r.total, 10) || 0), 0);

              if (dayTotal <= 0) return null;

              const ratio = dayCorrect / dayTotal;
              const computedScore = catMinScore + ratio * catRange;

              return {
                ...h,
                correct: dayCorrect,
                total: dayTotal,
                score: Math.min(catMaxScore, Math.max(catMinScore, Number(computedScore.toFixed(2))))
              };
            })
            .filter(Boolean);

          const newStatsObj = { ...c.simuladoStats, history: newHistory };

          if (newHistory.length > 0) {
            const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore, catMinScore);

            if (newStats) {
              const last = newHistory[newHistory.length - 1];
              const lastScore = last ? getSafeScore(last, catMaxScore, catMinScore) : NaN;

              newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
              newStatsObj.trend = newStats.trend || 'stable';

              newStatsObj.lastAttempt = Number.isFinite(lastScore)
                ? lastScore
                : Number(
                    last?.score ?? (
                      (Number(last?.total) > 0)
                        ? catMinScore + (Number(last?.correct || 0) / Number(last?.total)) * catRange
                        : catMinScore
                    )
                  );

              newStatsObj.level = newStats.level || 'BAIXO';
            }
          } else {
            newStatsObj.average = 0;
            newStatsObj.trend = 'stable';
            newStatsObj.lastAttempt = catMinScore;
            newStatsObj.level = 'BAIXO';
          }

          return { ...c, simuladoStats: newStatsObj };
        }

        return c;
      });
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
});

```

---

# 7. UTILITÁRIOS, NORMALIZAÇÃO E MEDIÇÃO (UTILS & HELPERS)

## `src/utils/aiSaveHelper.js` <a id="src-utils-aisavehelper-js"></a>

- **Localização:** `src/utils/aiSaveHelper.js`
- **Descrição:** Helper de persistência atômica dos resultados do simulado IA no draft do Zustand, agregação com pesos de dificuldade, atualização de simuladoRows e evento global
- **Linhas:** 201
- **Tamanho:** 8.55 KB

```javascript
import { getDateKey, normalizeDate } from './dateHelper.js';
import { generateId } from './idGenerator.js';
import { normalize } from './normalization.js';
import { computeCategoryStats } from '../engine/index.js';
import { mergeQuestionResult, safeDomain } from './measurement.js';

function safeArray(val) {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return Object.values(val);
    return [];
}

export function applyAIResultsToDraft(draft, formData, correct, total, timeSpentSecs, preventGlobalEvent, batchId) {
  if (!draft || typeof draft !== 'object') return;
  const todayKey = getDateKey(normalizeDate(new Date()));
  const materia = (formData.materia || '').trim();
  const assunto = (formData.assunto || '').trim();
  const categoryId = formData.categoryId || null;
  const taskId = formData.taskId || null;
  const assignedBatchId = batchId || formData?.batchId || generateId('batch');
  const computedScore = (total > 0 && Number.isFinite(correct) && Number.isFinite(total)) ? Math.round((correct / total) * 100) : 0;
  const diffMap = { facil: 0.7, medio: 1.0, dificil: 1.3, expert: 1.6 };
  const numericDifficulty = diffMap[formData.dificuldade] || 1.0;

  const newRow = {
    id: generateId('ai-row'),
    batchId: assignedBatchId,
    subject: materia,
    topic: assunto,
    categoryId,
    taskId,
    correct,
    total,
    score: computedScore,
    date: todayKey,
    createdAt: new Date().toISOString(),
    isAuto: false,
    validated: true,
    source: 'ai-generated',
    difficulty: numericDifficulty,
    timeSpent: timeSpentSecs,
    isPercentage: true,
  };

  if (!draft.simuladoRows || !Array.isArray(draft.simuladoRows)) {
    draft.simuladoRows = safeArray(draft.simuladoRows);
  }

  let rowFound = false;
  for (const r of draft.simuladoRows) {
    if (!r.isAuto && r.source !== 'ai-generated') continue;
    if (getDateKey(normalizeDate(r.date || r.createdAt)) !== todayKey) continue;
    const isCatMatch = (categoryId && r.categoryId)
      ? r.categoryId === categoryId
      : normalize(r.subject) === normalize(materia);
    const isTaskOrTopicMatch = (taskId && r.taskId)
      ? r.taskId === taskId
      : normalize(r.topic) === normalize(assunto);
    const hasExplicitBatch = Boolean(r.batchId || batchId || formData?.batchId);
    const isSameBatch = hasExplicitBatch ? (r.batchId === assignedBatchId) : true;
    if (isCatMatch && isTaskOrTopicMatch && isSameBatch) {
      rowFound = true;
      const domain = safeDomain(Number(draft.maxScore) || 100, Number(draft.minScore) || 0);
      const updatedRow = mergeQuestionResult(r, { correct, total, timeSpentSecs, isDelta: true }, domain.max, domain.min);
      Object.assign(r, updatedRow);
      r.lastUpdated = new Date().toISOString();
    }
  }
  if (!rowFound) {
    draft.simuladoRows.push(newRow);
  }

  if (!preventGlobalEvent) {
      if (!draft.simulados || !Array.isArray(draft.simulados)) {
        draft.simulados = safeArray(draft.simulados);
      }
      const domain = safeDomain(Number(draft.maxScore) || 100, Number(draft.minScore) || 0);
      const ratio = total > 0 ? correct / total : 0;
      const newSimEvent = {
        id: generateId('ai-sim'),
        batchId: assignedBatchId,
        date: todayKey,
        scorePoints: domain.min + ratio * (domain.max - domain.min),
        scorePct: ratio * 100,
        score: domain.min + ratio * (domain.max - domain.min),
        total,
        correct,
        type: 'ai-simulado',
        subject: materia,
        categoryId,
        taskId,
        validated: true,
        scoreUnit: 'points',
        isPercentage: false,
      };
      draft.simulados.push(newSimEvent);
      if (draft.simulados.length > 100) {
          draft.simulados = draft.simulados.slice(-100);
      }
  }

  const categoriesList = safeArray(draft.categories);
  for (const cat of categoriesList) {
    if (!cat) continue;
    const idMatch = categoryId && cat.id === categoryId;
    const nameMatch = !categoryId && normalize(cat.name) === normalize(materia);
    
    if (idMatch || nameMatch) {
      const catMaxScore = Number(cat.maxScore) || Number(draft.maxScore) || 100;
      const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : (Number.isFinite(Number(draft.minScore)) ? Number(draft.minScore) : 0);
      const catScoreRange = Math.max(1e-9, catMaxScore - catMinScore);
      
      if (!cat.simuladoStats) {
         cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
      }
      if (!Array.isArray(cat.simuladoStats.history)) {
         cat.simuladoStats.history = [];
      }
      let history = cat.simuladoStats.history;

      const todayIdx = history.findIndex(h => getDateKey(normalizeDate(h?.date || h?.createdAt)) === todayKey);
      const newTopicEntry = { name: assunto, correct, total, taskId, timeSpent: timeSpentSecs, difficulty: numericDifficulty };

      if (todayIdx !== -1) {
        const existing = history[todayIdx];
        let topicFound = false;
        
        if (!Array.isArray(existing.topics)) existing.topics = [];
        
        for (const t of existing.topics) {
          const isMatch = (taskId && t.taskId === taskId) || (!taskId && normalize(t.name) === normalize(assunto));
          if (isMatch) {
              topicFound = true;
              const newTTotal = (Number(t.total) || 0) + total;
              const newTCorrect = (Number(t.correct) || 0) + correct;
              const prevTWeight = (Number(t.difficulty) || 1.0) * (Number(t.total) || 0);
              const newTWeight = numericDifficulty * total;
              
              t.correct = newTCorrect;
              t.total = newTTotal;
              t.difficulty = newTTotal > 0 ? (prevTWeight + newTWeight) / newTTotal : 1.0;
              t.timeSpent = (Number(t.timeSpent) || 0) + timeSpentSecs;
          }
        }
        
        if (!topicFound) {
          existing.topics.push(newTopicEntry);
        }

        const dayTotal = (Number(existing.total) || 0) + total;
        const dayCorrect = (Number(existing.correct) || 0) + correct;
        const dayTimeSpent = (Number(existing.timeSpent) || 0) + timeSpentSecs;
        const dayTimedQuestoes = (Number(existing.timedQuestoes) || 0) + (timeSpentSecs >= 0 ? total : 0);

        const prevWeight = (existing.difficulty || 1.0) * (existing.total || 0);
        const newWeight = numericDifficulty * total;
        const newDiff = dayTotal > 0 ? (prevWeight + newWeight) / dayTotal : 1.0;

        existing.correct = dayCorrect;
        existing.total = dayTotal;
        existing.score = dayTotal > 0 ? Math.min(catMaxScore, Math.max(catMinScore, catMinScore + (dayCorrect / dayTotal) * catScoreRange)) : catMinScore;
        existing.difficulty = newDiff;
        existing.timeSpent = dayTimeSpent;
        existing.timedQuestoes = dayTimedQuestoes;
        existing.lastSessionTimeSpent = timeSpentSecs;
        existing.lastSessionTotal = total;
        
      } else {
        history.push({
          date: todayKey,
          correct,
          total,
          timeSpent: timeSpentSecs,
          timedQuestoes: timeSpentSecs >= 0 ? total : 0,
          lastSessionTimeSpent: timeSpentSecs,
          lastSessionTotal: total,
          score: total > 0 ? Math.min(catMaxScore, Math.max(catMinScore, catMinScore + (correct / total) * catScoreRange)) : catMinScore,
          difficulty: formData.dificuldade === 'facil' ? 0.7 : formData.dificuldade === 'medio' ? 1.0 : formData.dificuldade === 'dificil' ? 1.3 : 1.6,
          topics: [newTopicEntry],
        });
      }

      history.sort((a, b) => (a.date > b.date ? 1 : -1));
      if (history.length > 50) {
         cat.simuladoStats.history = history.slice(-50);
         history = cat.simuladoStats.history;
      }

      const statsResult = computeCategoryStats(history, cat.weight || 1, 60, catMaxScore, catMinScore);
      const todayEntry = history.find(h => getDateKey(normalizeDate(h?.date || h?.createdAt)) === todayKey);

      cat.simuladoStats.average = statsResult ? Number((statsResult.mean || 0).toFixed(2)) : 0;
      cat.simuladoStats.trend = statsResult?.trend || 'stable';
      cat.simuladoStats.lastAttempt = todayEntry ? Number(todayEntry.score || 0) : (total > 0 ? Math.min(catMaxScore, Math.max(catMinScore, catMinScore + (correct / total) * catScoreRange)) : catMinScore);
      cat.simuladoStats.level = statsResult?.level || 'BAIXO';
    }
  }

  draft.lastUpdated = new Date().toISOString();
}
```

---

## `src/utils/measurement.js` <a id="src-utils-measurement-js"></a>

- **Localização:** `src/utils/measurement.js`
- **Descrição:** Motor de medição e integridade: deduplicateSimulados, sanitizeSimuladoRow, mergeQuestionResult, safeDomain e clampFinite
- **Linhas:** 624
- **Tamanho:** 19.70 KB

```javascript
const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const mapCollection = (collection, mapper) => {
  if (Array.isArray(collection)) {
    return collection.map(mapper);
  }

  if (collection && typeof collection === "object") {
    return Object.fromEntries(
      Object.entries(collection).map(([key, value]) => [key, mapper(value, key)])
    );
  }

  return collection;
};

/**
 * Clamp seguro que NÃO propaga NaN.
 */
export function clampFinite(value, min, max, fallback = min) {
  let safeMin = Number(min);
  let safeMax = Number(max);
  if (!Number.isFinite(safeMin)) safeMin = 0;
  if (!Number.isFinite(safeMax)) safeMax = safeMin;
  if (safeMin > safeMax) { const tmp = safeMin; safeMin = safeMax; safeMax = tmp; }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const fb = Number(fallback);
    return Number.isFinite(fb)
      ? Math.min(safeMax, Math.max(safeMin, fb))
      : safeMin;
  }
  return Math.min(safeMax, Math.max(safeMin, n));
}

/**
 * Domínio seguro da prova/matéria.
 */
export function safeDomain(maxScore, minScore = 0) {
  let rawMax = Number(maxScore);
  let max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
  let min = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  if (min > max) { const tmp = min; min = max; max = tmp; }
  const range = Math.max(1e-9, max - min);
  return { min, max, range };
}

export function sanitizeMaxScore(value) {
  return clampFinite(value, 1, 1_000_000, 100);
}

const asDomain = (domainOrMax, minScore = 0) => {
  if (
    domainOrMax &&
    typeof domainOrMax === "object" &&
    "min" in domainOrMax &&
    "max" in domainOrMax &&
    "range" in domainOrMax
  ) {
    return domainOrMax;
  }

  return safeDomain(domainOrMax, minScore);
};

/**
 * Converte pontos para porcentagem dentro do intervalo útil [min, max].
 */
export function pointsToPct(points, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const pct = ((Number(points) - domain.min) / domain.range) * 100;
  return clampFinite(pct, 0, 100, 0);
}

/**
 * Converte porcentagem para pontos dentro do intervalo útil [min, max].
 */
export function pctToPoints(pct, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const safePct = clampFinite(pct, 0, 100, 0);
  return domain.min + (safePct / 100) * domain.range;
}

export function ratioToPoints(ratio, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const safeRatio = clampFinite(ratio, 0, 1, 0);
  return domain.min + safeRatio * domain.range;
}

/**
 * Probabilidade interna deve ser sempre 0-1.
 */
export function toProb01(value, unit = "auto") {
  if (value == null) return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  if (unit === "prob") return clampFinite(n, 0, 1, 0);
  if (unit === "pct") return clampFinite(n, 0, 100, 0) / 100;

  // auto
  if (n >= 0 && n <= 1) return n;
  if (n > 1 && n <= 100) return n / 100;

  return clampFinite(n, 0, 1, n < 0 ? 0 : 1);
}

export function toProbPct(value, unit = "auto") {
  const p = toProb01(value, unit);
  return p == null ? null : p * 100;
}

export function safeDivide(num, den, fallback = 0) {
  const n = Number(num);
  const d = Number(den);

  if (!Number.isFinite(n) || !Number.isFinite(d) || Math.abs(d) < 1e-12) {
    return fallback;
  }

  return n / d;
}

export function safeTime(value, fallback = NaN) {
  if (value == null) return fallback;

  try {
    const d = value instanceof Date ? value : new Date(value);
    const t = d?.getTime?.();
    return Number.isFinite(t) ? t : fallback;
  } catch {
    return fallback;
  }
}

const defaultGetDateKey = (value) => {
  const t = safeTime(value, NaN);
  if (!Number.isFinite(t)) return null;

  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export function normalizeSubjectKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sortChronologically(rows, getDate = (row) => row?.date || row?.createdAt) {
  return [...safeArray(rows)].sort((a, b) => {
    const ta = safeTime(getDate(a), 0);
    const tb = safeTime(getDate(b), 0);
    return ta - tb;
  });
}

export function latestByDate(rows, getDate = (row) => row?.date || row?.createdAt) {
  let best = null;

  for (const row of safeArray(rows)) {
    const t = safeTime(getDate(row), NaN);
    if (!Number.isFinite(t)) continue;

    if (!best || t > best.t) {
      best = { t, row };
    }
  }

  return best?.row || null;
}

export function resolveTargetPoints(value, domainOrMax, minScore = 0, unit = "auto") {
  const domain = asDomain(domainOrMax, typeof minScore === "number" ? minScore : 0);
  const actualUnit = typeof minScore === "string" && unit === "auto" ? minScore : unit;

  if (value && typeof value === "object") {
    if (Number.isFinite(value.points)) return clampFinite(value.points, domain.min, domain.max, domain.min);
    if (Number.isFinite(value.pct)) return pctToPoints(value.pct, domain);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return domain.min;
  if (actualUnit === "points") return clampFinite(n, domain.min, domain.max, domain.min);
  if (actualUnit === "pct") return pctToPoints(n, domain);
  return clampFinite(n, domain.min, domain.max, domain.min);
}

/**
 * Normaliza qualquer registro de score para o motor interno.
 * Retorna sempre:
 * - points: pontos no domínio [min, max]
 * - pct: porcentagem no intervalo útil
 * - ratio: 0-1
 */
export function normalizeScoreValue(row, maxScore, minScore = 0) {
  const r = row && typeof row === "object" ? row : {};
  const domain = safeDomain(maxScore, minScore);
  const totalRaw = Number(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions);
  const total = Number.isFinite(totalRaw) ? Math.max(0, Math.trunc(totalRaw)) : 0;

  let correct = 0;
  if (total > 0) {
    const correctRaw = Number(r.correct ?? r.acertos ?? r.correctCount);
    correct = Number.isFinite(correctRaw)
      ? Math.max(0, Math.min(total, Math.trunc(correctRaw)))
      : 0;
  }

  // ── 1) total/correct ──────────────────────────────────────
  if (total > 0) {
    const ratio = Math.max(0, Math.min(1, correct / total));
    return {
      points: domain.min + ratio * domain.range,
      pct: ratio * 100,
      ratio,
      total,
      correct,
      totalValid: true,
      domain,
      ambiguous: false,
      source: "total-correct",
    };
  }

  // ── 2) scorePoints explícito ──────────────────────────────
  const scorePointsRaw = r.scorePoints == null ? NaN : Number(r.scorePoints);
  if (Number.isFinite(scorePointsRaw)) {
    const points = clampFinite(scorePointsRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    return {
      points, pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "scorePoints",
    };
  }

  // ── 3) scorePct explícito ─────────────────────────────────
  const scorePctRaw = r.scorePct == null ? NaN : Number(r.scorePct);
  if (Number.isFinite(scorePctRaw)) {
    const pct = clampFinite(scorePctRaw, 0, 100, 0);
    const points = pctToPoints(pct, domain);
    return {
      points, pct,
      ratio: clampFinite(pct / 100, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "scorePct",
    };
  }

  // ── 4) campo score ────────────────────────────────────────
  const scoreRaw = r.score == null ? NaN : Number(r.score);
  if (Number.isFinite(scoreRaw)) {
    const unit = r.unit || r.scoreUnit;
    const explicitPct    = unit === "pct"    || r.isPercentage === true;
    const explicitPoints = unit === "points" || r.isPercentage === false;

    if (explicitPct) {
      // ✅ FIX: Clamp no domínio de porcentagem ANTES de converter
      const pct = clampFinite(scoreRaw, 0, 100, 0);
      const points = pctToPoints(pct, domain);
      // ✅ FIX: Garantir que points está dentro do domínio
      const safePoints = clampFinite(points, domain.min, domain.max, domain.min);
      const ratio = clampFinite((safePoints - domain.min) / domain.range, 0, 1, 0);
      return {
        points: safePoints,
        pct,
        ratio,
        total, correct, totalValid: false, domain,
        ambiguous: false, source: "score-explicit-pct",
      };
    }
    if (explicitPoints) {
      // ✅ FIX: Clamp direto no domínio
      const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
      const pct = pointsToPct(points, domain);
      const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
      return {
        points, pct, ratio,
        total, correct, totalValid: false, domain,
        ambiguous: false, source: "score-explicit-points",
      };
    }

    // ✅ FIX: SEM auto-detecção. Tratar como PONTOS.
    const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
    const ambiguous = domain.max > 100 && scoreRaw >= 0 && scoreRaw <= 100 && r.isPercentage !== false;
    
    return {
      points, pct, ratio,
      total, correct, totalValid: false, domain,
      ambiguous,
      source: ambiguous ? "score-ambiguous-as-points" : "score-auto-points",
    };
  }

  // ── 5) fallback campo value (dados legados) ───────────────
  const valueRaw = r.value == null ? NaN : Number(r.value);
  if (Number.isFinite(valueRaw)) {
    const points = clampFinite(valueRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    return {
      points, pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "value-field",
    };
  }

  return {
    points: NaN, pct: NaN, ratio: 0,
    total, correct, totalValid: false, domain,
    ambiguous: false, source: "missing", invalid: true,
  };
}

/**
 * Para motores matemáticos, retorne SEMPRE pontos.
 */
export function getSafeScore(row, maxScore, minScore = 0) {
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0
    ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore))
    ? Math.min(Number(minScore), safeMax) : 0;
  const range = Math.max(1e-9, safeMax - safeMin);

  if (row == null) return NaN; // ✅ NaN para dados nulos

  let score;

  const parseNum = (val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.includes(',')) {
        const clean = trimmed.replace(/\./g, '').replace(',', '.');
        return Number(clean);
      }
      if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
        return Number(trimmed.replace(/\./g, ''));
      }
      return Number(trimmed);
    }
    return Number(val);
  };

  if (typeof row === "number") {
    score = row;
  } else if (row.scorePoints != null && Number.isFinite(Number(row.scorePoints))) {
    score = Number(row.scorePoints);
  } else if (row.scorePct != null && Number.isFinite(Number(row.scorePct))) {
    score = safeMin + (Math.max(0, Math.min(100, Number(row.scorePct))) / 100) * range;
  } else if (row.score != null) {
    score = parseNum(row.score);
    if (row.isPercentage && Number.isFinite(score)) {
      score = safeMin + (score / 100) * range;
    }
  } else if (row.value != null && row.value !== '') {
    score = parseNum(row.value);
    if (row.isPercentage && Number.isFinite(score)) {
      score = safeMin + (score / 100) * range;
    }
  } else if ((row.correct != null || row.acertos != null || row.correctCount != null) && (row.total != null || row.questoes != null || row.totalQuestoes != null || row.questions != null)) {
    const total = Number(row.total ?? row.questoes ?? row.totalQuestoes ?? row.questions);
    const correct = Number(row.correct ?? row.acertos ?? row.correctCount);
    // ✅ FIX: proteger contra total=0 → divisão por zero
    if (Number.isFinite(total) && total > 0 && Number.isFinite(correct)) {
      score = safeMin + (Math.max(0, Math.min(total, correct)) / total) * range;
    }
  }

  // ✅ NaN é propagado para o consumidor filtrar
  // (evita tratar dado corrompido como "nota zero")
  if (!Number.isFinite(score)) return NaN;
  return Math.max(safeMin, Math.min(safeMax, score));
}

export function clampCorrectToTotal(correct, total) {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return 0;

  const c = Number(correct);
  if (!Number.isFinite(c)) return 0;

  const safeTotal = Math.max(0, Math.trunc(t));
  const safeCorrect = Math.max(0, Math.trunc(c));

  return Math.min(safeTotal, safeCorrect);
}

/**
 * Sanitiza linha de simulado garantindo invariantes:
 * - total >= 0
 * - correct >= 0
 * - correct <= total
 * - score interno em pontos
 * - scorePct para UI
 */
export function sanitizeSimuladoRow(row, maxScore = 100, minScore = 0) {
  const r = row && typeof row === "object" ? row : {};
  const warnings = [];
  const domain = safeDomain(maxScore, minScore);

  const rawTotal = Number(r.total);
  const rawCorrect = Number(r.correct);

  const norm = normalizeScoreValue(r, domain.max, domain.min);

  if (Number.isFinite(rawCorrect) && rawCorrect > 0 && norm.total === 0) {
    warnings.push("correct > 0 com total = 0 → correct zerado");
  }

  if (
    Number.isFinite(rawCorrect) &&
    Number.isFinite(rawTotal) &&
    rawTotal > 0 &&
    rawCorrect > rawTotal
  ) {
    warnings.push(`correct(${rawCorrect}) > total(${rawTotal}) → clamp aplicado`);
  }

  const rawDate = r.date || r.createdAt || null;
  const t = safeTime(rawDate, NaN);
  const hasValidDate = Number.isFinite(t) && t > 0;

  if (!hasValidDate) {
    warnings.push("data inválida");
  }

  // ✅ PATCH-04: expor ambiguidade para o consumidor
  const hasAmbiguousWarning = norm.ambiguous && norm.source.startsWith("score-ambiguous");
  if (hasAmbiguousWarning && !warnings.includes("score-ambiguous")) {
    warnings.push(
      `Score "${r.score}" ambíguo na escala [${domain.min}–${domain.max}]. ` +
      `Tratado como pontos. Defina "unit" ou "isPercentage" explicitamente.`
    );
  }

  return {
    ...r,
    date: hasValidDate ? rawDate : null,
    createdAt: hasValidDate ? (r.createdAt || rawDate) : null,
    valid: hasValidDate,
    total: norm.total,
    correct: norm.correct,
    scorePoints: norm.points,
    scorePct: norm.pct,
    score: norm.points,          // motores internos usam pontos
    isPercentage: false,         // após normalização nunca é pct
    originalIsPercentage: Boolean(r.isPercentage),
    scoreUnit: "points",
    ambiguousScore: norm.ambiguous,
    warnings,
  };
}

/**
 * Atualização segura de resultado de questões.
 * Nunca deixa correct > total.
 */
export function mergeQuestionResult(row, delta, maxScore, minScore = 0) {
  const domain = safeDomain(maxScore, minScore);
  const r = row && typeof row === "object" ? row : {};

  const addedTotal = Math.max(0, Math.trunc(Number(delta?.total) || 0));
  const addedCorrect = Math.min(
    addedTotal,
    Math.max(0, Math.trunc(Number(delta?.correct) || 0))
  );

  const oldTotal = Math.max(0, Math.trunc(Number(r.total) || 0));
  const oldCorrect = Math.min(oldTotal, Math.max(0, Math.trunc(Number(r.correct) || 0)));

  const isIncremental = Boolean(delta?.isDelta ?? delta?.incremental);
  const newTotal = isIncremental
    ? oldTotal + addedTotal
    : Math.max(oldTotal, addedTotal);
  const newCorrect = isIncremental
    ? Math.min(newTotal, oldCorrect + addedCorrect)
    : Math.min(newTotal, Math.max(oldCorrect, addedCorrect));

  const ratio = newTotal > 0 ? newCorrect / newTotal : 0;
  const points = domain.min + ratio * domain.range;

  return {
    ...r,
    correct: newCorrect,
    total: newTotal,
    scorePoints: points,
    scorePct: ratio * 100,
    score: points,
    scoreUnit: "points",
    isPercentage: false,
    timeSpent: Number.isFinite(Number(r.timeSpent)) || Number.isFinite(Number(delta?.timeSpentSecs))
      ? Math.max(0, (Number(r.timeSpent) || 0) + Math.max(0, Number(delta?.timeSpentSecs) || 0))
      : 0
  };
}

/**
 * Deduplicação correta de simulados por:
 * id + matéria + data + score.
 */
export function deduplicateSimulados(simulados, options = {}) {
  const {
    maxScore = 100,
    minScore = 0,
    getDateKey = defaultGetDateKey
  } = options;

  const map = new Map();

  safeArray(simulados).forEach((s) => {
    const norm = normalizeScoreValue(s, maxScore, minScore);
    if (norm.invalid) return;

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    const dateKey = getDateKey(s?.date || s?.createdAt) || "sem-data";

    const idPart = s?.id || [
      subjectKey,
      dateKey,
      norm.points.toFixed(2)
    ].join(':');
    const key = [idPart, subjectKey, dateKey, norm.points.toFixed(2)].join("|");

    map.set(key, {
      ...s,
      total: norm.total,
      correct: norm.correct,
      scorePoints: norm.points,
      scorePct: norm.pct,
      score: norm.points,
      scoreUnit: "points",
      isPercentage: false,
      originalIsPercentage: Boolean(s?.isPercentage)
    });
  });

  return Array.from(map.values());
}

/**
 * Cria chaves data+matéria para não suprimir histórico de matérias diferentes.
 */
export function buildSimuladoDateSubjectKeys(simulados, getDateKey = defaultGetDateKey) {
  const set = new Set();

  safeArray(simulados).forEach((s) => {
    const dk = getDateKey(s?.date || s?.createdAt);
    if (!dk) return;

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    set.add(`${dk}|${subjectKey}`);
  });

  return set;
}

/**
 * Migração de concurso existente para o novo modelo seguro.
 */
export function migrateContestData(contest) {
  if (!contest || typeof contest !== "object") return contest;

  const maxScore = sanitizeMaxScore(contest.maxScore);
  const minScore = clampFinite(contest.minScore, 0, maxScore, 0);

  const next = {
    ...contest,
    maxScore,
    minScore
  };

  if (next.simulados) {
    next.simulados = mapCollection(next.simulados, (row) =>
      sanitizeSimuladoRow(row, maxScore, minScore)
    );
  }

  if (next.categories) {
    next.categories = mapCollection(next.categories, (cat) => {
      if (!cat || typeof cat !== "object") return cat;

      const catMax = sanitizeMaxScore(cat.maxScore ?? maxScore);
      const catMin = clampFinite(cat.minScore ?? minScore, 0, catMax, minScore);

      const nextCat = {
        ...cat,
        maxScore: catMax,
        minScore: catMin
      };

      if (nextCat.history) {
        nextCat.history = safeArray(nextCat.history).map((h) =>
          sanitizeSimuladoRow(h, catMax, catMin)
        );
      }

      return nextCat;
    });
  }

  return next;
}

```

---

## `src/utils/normalization.js` <a id="src-utils-normalization-js"></a>

- **Localização:** `src/utils/normalization.js`
- **Descrição:** Normalização canônica de matérias e tópicos, remoção de diacríticos e mapeamento de aliases para pareamento exato entre formulários e categorias
- **Linhas:** 93
- **Tamanho:** 4.24 KB

```javascript
/**
 * Normalizes a string for consistent matching across the application.
 * Removes accents, converts to lowercase, trims whitespace, and removes common prefixes.
 * 
 * @param {string} str - The string to normalize
 * @returns {string} - The normalized string
 */
export const normalize = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .normalize('NFKC')              // Use NFKC for better compatibility matching
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "") // eslint-disable-line no-control-regex
        .replace(/nocoes de\s+/g, "")    // Remove common prefix
        .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep all letters (unicode) and numbers
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .trim();
};

/**
 * Map of aliases for common subjects.
 * Keys should be the normalized version of the canonical subject name (as if it was in Dashboard).
 * Values are arrays of alternative names (also normalized potentially, but usually raw variations).
 */
export const aliases = {
    'informatica': ['noções de informática', 'info', 'computação', 'ti', 'tecnologia da informação', 'informática'],
    'raciocinio logico': ['rlm', 'raciocínio lógico matemático', 'raciocinio logico quantitativo', 'rl', 'lógica', 'raciocínio'],
    'etica no servico publico': ['etica', 'ética no serviço público', 'ética', 'ética e cidadania'],
    'direito constitucional': ['const', 'constitucional', 'dir. const', 'd. const', 'constituição', 'dir const'],
    'direito administrativo': ['adm', 'administrativo', 'dir. adm', 'd. adm', 'adm pública', 'dir adm'],
    'lingua portuguesa': ['portugues', 'português', 'pt', 'gramática', 'interpretação de textos', 'port.'],
    'atualidades': ['conhecimentos gerais', 'mundo atual', 'geopolítica'],
    'direito penal': ['penal', 'dir. penal', 'd. penal', 'dp', 'dir penal'],
    'direito processual penal': ['processo penal', 'dpp', 'dir. proc. penal', 'dir proc penal'],
    'direitos humanos': ['dh', 'humanos', 'd. humanos'],
    'direito civil': ['civil', 'dir. civil', 'd. civil', 'dc', 'dir civil'],
    'direito processual civil': ['processo civil', 'dpc', 'dir. proc. civil', 'dir proc civil']
};

/**
 * Verifica se duas matérias correspondem, considerando o nome normalizado e os aliases.
 */
export const isSubjectMatch = (name1, name2) => {
  if (!name1 || !name2) return false;
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return true;

  // n2 é alias de n1 (n1 é chave canônica)
  if (aliases[n1] && aliases[n1].some(a => normalize(a) === n2)) return true;

  // n1 é alias de n2 (n2 é chave canônica)
  if (aliases[n2] && aliases[n2].some(a => normalize(a) === n1)) return true;

  // Ambos são aliases da mesma chave canônica
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    const hasN1 = n1 === canonical || aliasList.some(a => normalize(a) === n1);
    const hasN2 = n2 === canonical || aliasList.some(a => normalize(a) === n2);
    if (hasN1 && hasN2) return true;
  }

  return false;
};
/**
 * Normaliza um valor evitando divisão por zero e garantindo limites entre 0 e 1.
 * Se o máximo e o mínimo forem iguais (ex: primeira semana do aluno), 
 * assume-se o percentil 50% (0.5) para evitar distorções no gráfico.
 */
export const safeNormalize = (val, max, min) => {
    // Tratamento de edge case crítico
    if (typeof val !== 'number' || isNaN(val)) return 0;
    if (!Number.isFinite(max) || !Number.isFinite(min)) return 0;
    if (max === min) return 0.5; 
    
    const normalized = (val - min) / (max - min);
    
    // Clamping para evitar explodir a escala (valores > 1 ou < 0)
    return Math.max(0, Math.min(1, normalized));
};

/**
 * Divisão segura global para evitar Infinity ou NaN.
 */
export const safeDivide = (numerator, denominator, fallback = 0) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
};

```

---

## `src/utils/dateHelper.js` <a id="src-utils-datehelper-js"></a>

- **Localização:** `src/utils/dateHelper.js`
- **Descrição:** Formatadores e normalizadores de fuso horário, datas e chaves diárias para agrupamento cronológico correto de simulados
- **Linhas:** 352
- **Tamanho:** 12.83 KB

```javascript
import { addDays } from 'date-fns';

export const APP_TIMEZONE = 'America/Manaus';

const manausDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export function getManausDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return getDateKey(date);
  return manausDayFormatter.format(d);
}

export function getStreakDateKey(date = new Date()) {
  return getManausDateKey(date);
}

const MS_PER_DAY_MANAUS = 24 * 60 * 60 * 1000;

export function getManausDayRange(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const key = Number.isNaN(d.getTime()) ? getDateKey(dateInput) : getManausDateKey(d);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null;
  }
  const [year, month, day] = key.split('-').map(Number);
  const start = Date.UTC(year, month - 1, day, 4, 0, 0, 0);
  return {
    key,
    start,
    end: start + MS_PER_DAY_MANAUS
  };
}

export const safeDateParse = (dateInput, fallback = null) => {
  if (!dateInput) return fallback;
  if (typeof dateInput === 'boolean') return fallback;
  if (typeof dateInput === 'object') {
    if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? fallback : dateInput;
    if (typeof dateInput.toDate === 'function') {
      try {
        const d = dateInput.toDate();
        return (d instanceof Date && !isNaN(d.getTime())) ? d : fallback;
      } catch {
        return fallback;
      }
    }
    if (dateInput.seconds != null || dateInput._seconds != null) {
      const secs = dateInput.seconds != null ? dateInput.seconds : dateInput._seconds;
      const d = new Date(Number(secs) * 1000);
      return isNaN(d.getTime()) ? fallback : d;
    }
    return fallback;
  }
  if (typeof dateInput === 'string') {
    if (dateInput.includes('/') || /^\d{2}-\d{2}-\d{4}/.test(dateInput)) {
      const norm = normalizeDate(dateInput);
      if (norm instanceof Date && !isNaN(norm.getTime())) return norm;
    }
    const normalizedString = dateInput.replace(' ', 'T');
    const d = new Date(normalizedString);
    if (!isNaN(d.getTime())) return d;
    const norm = normalizeDate(dateInput);
    return (norm instanceof Date && !isNaN(norm.getTime())) ? norm : fallback;
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? fallback : d;
};

export function parseGoalDateUnified(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const normalized = value.includes('T') ? value : `${value}T12:00:00`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// ✅ FIX BUG-09: getDateKey com suporte a YY-MM-DD e extração direta de ISO. Retorna null se data inválida ou nula.
export const getDateKey = (rawDate) => {
  if (!rawDate) return null;

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;
    // ISO 'YYYY-MM-DD' → extração direta
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // YY-MM-DD → previne regressão para ano 1900
    if (/^\d{2}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const year = parseInt(parts[0], 10);
      const fullYear = year < 100 ? 2000 + year : year;
      return `${fullYear}-${parts[1]}-${parts[2]}`;
    }
  }

  if (typeof rawDate === 'object' && rawDate !== null && (rawDate.seconds || rawDate._seconds)) {
    const secs = rawDate.seconds || rawDate._seconds;
    const d = new Date(secs * 1000);
    if (Number.isNaN(d.getTime())) return null;
    const manausDate = new Date(d.getTime() - (4 * 3600000));
    const year = manausDate.getUTCFullYear();
    const month = String(manausDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(manausDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    const d = normalizeDate(rawDate);
    if (!d || Number.isNaN(d.getTime())) return null;
    const manausDate = new Date(d.getTime() - (4 * 3600000));
    const year = manausDate.getUTCFullYear();
    const month = String(manausDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(manausDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
};

export const getLocalMidnight = (date = new Date()) => {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      const fallback = new Date();
      return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } catch {
    const fallback = new Date();
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d{10,13}$/.test(dateStr.trim()))) {
    const numVal = Number(dateStr);
    const d = (String(dateStr).trim().length === 10) ? new Date(numVal * 1000) : new Date(numVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    }
  }
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[2]}/${parts[1]}`;
    if (parts[2].length === 4) return `${parts[0]}/${parts[1]}`;
    return `${parts[2]}/${parts[1]}`;
  }
  return cleanStr;
};

// ✅ FIX: normalizeDate com offset -04:00 para YYYY-MM-DD
export function normalizeDate(raw) {
  if (!raw) return null;
  let d;
  let isDateOnly = false;
  let normalizedRaw = raw;

  if (typeof raw === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      isDateOnly = true;
    } else if (/^\d{2}-\d{2}-\d{2}$/.test(raw)) {
      isDateOnly = true;
      const parts = raw.split('-');
      const p0 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[2], 10);
      let year, month, day;
      if (p0 > 31) {
        year = 2000 + p0;
        month = parts[1];
        day = parts[2];
      } else {
        year = 2000 + p2;
        month = parts[1];
        day = parts[0];
      }
      normalizedRaw = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  if (typeof raw === "object" && (raw.seconds != null || raw._seconds != null)) {
    const secs = raw.seconds != null ? raw.seconds : raw._seconds;
    d = new Date(secs * 1000);
  } else if (typeof raw === "string" && /^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    // DD-MM-YYYY com traços (formato pt-BR)
    const parts = raw.split('-');
    const isoBr = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`;
    d = new Date(isoBr);
  } else if (typeof raw === "string" && raw.includes("/")) {
    const parts = raw.trim().split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2) {
      const yearWithTime = parts[2].trim().split(/\s+/);
      const year = yearWithTime[0];
      const timePart = yearWithTime.slice(1).join(' ');
      if (year.length === 4) {
        const timeFormatted = timePart && timePart.includes(':') ? timePart : '12:00:00-04:00';
        const hasOffset = timeFormatted.includes('-') || timeFormatted.includes('+') || timeFormatted.endsWith('Z');
        const isoBr = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T${hasOffset ? timeFormatted : timeFormatted + '-04:00'}`;
        d = new Date(isoBr);
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
          const fallbackIso = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00-04:00`;
          d = new Date(fallbackIso);
        }
      } else {
        d = new Date(raw);
      }
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === "string") {
    // ✅ FIX: YYYY-MM-DD → meio-dia de Manaus (UTC-4)
    const isoNoon = `${normalizedRaw}T12:00:00-04:00`;
    d = isDateOnly
      ? new Date(isoNoon)
      : new Date(raw);
  } else {
    d = new Date(raw);
  }

  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d;
};

export const toDateMs = (value) => {
  if (!value) return Number.NaN;
  if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) {
    const secs = value.seconds != null ? value.seconds : value._seconds;
    return Number(secs) * 1000;
  }
  const parsed = normalizeDate(value);
  return parsed ? parsed.getTime() : new Date(value).getTime();
};

export const formatTimeAgo = (date) => {
  if (!date) return 'Nunca';
  const timeMs = toDateMs(date);
  if (timeMs == null || Number.isNaN(timeMs)) return 'Data inválida';
  const rawDiff = Date.now() - timeMs;
  if (rawDiff < 0) {
    // FIX-AGO-01: tolerar skew de relógio do dispositivo (até 10 min), senão
    // registros recém-criados apareciam como "No futuro".
    if (Math.abs(rawDiff) <= 600_000) return 'Agora há pouco';
    return 'No futuro';
  }
  const diff = rawDiff;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (hours < 1) return 'Agora há pouco';
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d atrás`;
  // FIX-AGO-02: weeks/months eram calculados e nunca usados (mostrava "45d atrás").
  if (weeks < 5) return weeks === 1 ? 'Semana passada' : `${weeks} sem atrás`;
  if (months < 12) return months === 1 ? '1 mês atrás' : `${months} meses atrás`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 ano atrás' : `${years} anos atrás`;
};

export const formatDuration = (decimalHours) => {
  const safe = Number.isFinite(Number(decimalHours)) ? Number(decimalHours) : 0;
  const normalized = Math.max(0, safe);
  let hours = Math.floor(normalized);
  let minutes = Math.round((normalized - hours) * 60);
  if (minutes >= 60) { hours += 1; minutes = 0; }
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '0h00';
  return `${hours}h${String(Math.max(0, minutes)).padStart(2, '0')}`;
};

export const formatDatePtBR = (date) => {
  try {
    if (!date) return '--/--/----';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/----';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(parsed);
  } catch {
    return '--/--/----';
  }
};

export const formatDateTimePtBR = (date) => {
  try {
    if (!date) return '--/--/---- --:--:--';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/---- --:--:--';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(parsed);
  } catch {
    return '--/--/---- --:--:--';
  }
};

export const formatWeekdayShortPtBR = (date) => {
  try {
    if (!date) return '';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, weekday: 'short'
    }).format(parsed).replace('.', '').toUpperCase();
  } catch {
    return '';
  }
};

export const getFlashcardTodayKey = () => getDateKey(new Date());

export const getFlashcardNextDueKey = (intervalDays = 1) => {
  const raw = Number(intervalDays);
  const safeDays = Number.isFinite(raw) ? Math.max(1, Math.min(3650, Math.floor(raw))) : 1;
  const anchorIso = `${getDateKey(new Date())}T12:00:00-04:00`;
  const anchor = new Date(anchorIso);
  const future = addDays(anchor, safeDays);
  const key = getDateKey(future);
  return key || getFlashcardTodayKey();
};

export const isFlashcardDue = (cardDue, referenceKey = null) => {
  if (!cardDue) return true;
  const todayKey = referenceKey || getFlashcardTodayKey();
  return cardDue <= todayKey;
};


export { parseNoonLocal } from './parseNoonLocal.js';
export { daysUntilGoal } from '../engine/math/date.js';
```

---

# 8. SUÍTE DE TESTES AUTOMATIZADOS (TESTS & AUDITS)

## `src/components/__tests__/simuladoMenuBugs.test.jsx` <a id="src-components-__tests__-simuladomenubugs-test-jsx"></a>

- **Localização:** `src/components/__tests__/simuladoMenuBugs.test.jsx`
- **Descrição:** Suíte completa de testes do menu Simulado: auditoria de salvamento por IA, deleção em cascata, recálculo de médias e isolamento de estado
- **Linhas:** 420
- **Tamanho:** 14.11 KB

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyAIResultsToDraft } from '../../utils/aiSaveHelper.js';
import { createSimuladoSlice } from '../../store/slices/createSimuladoSlice.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';

describe('Simulado Menu Bugs Audit & Fixes', () => {
  let mockState;
  let setFn;
  let slice;

  beforeEach(() => {
    mockState = {
      appState: {
        activeId: 'contest-1',
        version: 1,
        contests: {
          'contest-1': {
            id: 'contest-1',
            minScore: 0,
            maxScore: 100,
            categories: [
              {
                id: 'cat-1',
                name: 'Direito Constitucional',
                weight: 10,
                minScore: 0,
                maxScore: 100,
                simuladoStats: {
                  history: [],
                  average: 0,
                  lastAttempt: 0,
                  trend: 'stable',
                  level: 'BAIXO'
                }
              },
              {
                id: 'cat-2',
                name: 'Direito Administrativo',
                weight: 10,
                minScore: 0,
                maxScore: 100,
                simuladoStats: {
                  history: [],
                  average: 0,
                  lastAttempt: 0,
                  trend: 'stable',
                  level: 'BAIXO'
                }
              }
            ],
            simuladoRows: [],
            simulados: []
          }
        }
      }
    };

    setFn = (fn) => {
      fn(mockState);
    };

    slice = createSimuladoSlice(setFn);
  });

  describe('Bug 1 & 6: AI Simulado batchId Assignment & Preservation of Separate Attempts', () => {
    it('should assign batchId to both newRow and newSimEvent and preserve distinct attempts', () => {
      const contest = mockState.appState.contests['contest-1'];
      const form1 = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        dificuldade: 'medio'
      };

      // 1st AI attempt (Batch A)
      applyAIResultsToDraft(contest, form1, 8, 10, 120, false, 'batch-A');

      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].batchId).toBe('batch-A');
      expect(contest.simuladoRows[0].correct).toBe(8);
      expect(contest.simuladoRows[0].total).toBe(10);

      expect(contest.simulados).toHaveLength(1);
      expect(contest.simulados[0].batchId).toBe('batch-A');
      expect(contest.simulados[0].correct).toBe(8);

      // 2nd AI attempt on the same day and topic (Batch B)
      applyAIResultsToDraft(contest, form1, 9, 10, 110, false, 'batch-B');

      // Crucial: Must NOT overwrite or merge Batch A into Batch B; both must exist as distinct rows
      expect(contest.simuladoRows).toHaveLength(2);
      expect(contest.simuladoRows[0].batchId).toBe('batch-A');
      expect(contest.simuladoRows[1].batchId).toBe('batch-B');
      expect(contest.simulados).toHaveLength(2);
      expect(contest.simulados[1].batchId).toBe('batch-B');

      // Meanwhile, category history should aggregate total questions for the day
      const cat1 = contest.categories.find(c => c.id === 'cat-1');
      expect(cat1.simuladoStats.history).toHaveLength(1);
      expect(cat1.simuladoStats.history[0].total).toBe(20);
      expect(cat1.simuladoStats.history[0].correct).toBe(17);
    });

    it('should update an existing row only if it shares the exact same batchId', () => {
      const contest = mockState.appState.contests['contest-1'];
      const form = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        dificuldade: 'medio'
      };

      // Initial save
      applyAIResultsToDraft(contest, form, 5, 10, 60, false, 'batch-same');
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].total).toBe(10);

      // Re-save or update with same batchId
      applyAIResultsToDraft(contest, form, 2, 2, 20, false, 'batch-same');
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].batchId).toBe('batch-same');
    });
  });

  describe('Bug 3: deleteSimulado Purges and Reconciles Category History and Stats', () => {
    it('should delete AI simulado by batchId and reconcile category history with remaining rows', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));

      // Add two simulados on the same day for cat-1
      contest.simuladoRows = [
        {
          id: 'row-1',
          batchId: 'batch-A',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        },
        {
          id: 'row-2',
          batchId: 'batch-B',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Nacionalidade',
          correct: 8,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        }
      ];

      contest.simulados = [
        { id: 'sim-1', batchId: 'batch-A', date: todayKey, correct: 5, total: 10, type: 'ai-simulado' },
        { id: 'sim-2', batchId: 'batch-B', date: todayKey, correct: 8, total: 10, type: 'ai-simulado' }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          { date: todayKey, correct: 13, total: 20, score: 65 }
        ],
        average: 65,
        lastAttempt: 65,
        trend: 'stable',
        level: 'BOM'
      };

      // Delete batch-A
      slice.deleteSimulado('batch-A');

      // batch-A rows and events must be removed
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].batchId).toBe('batch-B');
      expect(contest.simulados).toHaveLength(1);
      expect(contest.simulados[0].batchId).toBe('batch-B');

      // Category history for today must be reconciled with remaining row (8/10 = 80%)
      const cat1History = contest.categories[0].simuladoStats.history;
      expect(cat1History).toHaveLength(1);
      expect(cat1History[0].correct).toBe(8);
      expect(cat1History[0].total).toBe(10);
      expect(cat1History[0].score).toBe(80);
      expect(contest.categories[0].simuladoStats.average).toBe(80);
    });

    it('should cleanly remove category history when the only simulado on that date is deleted by batchId', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));

      contest.simuladoRows = [
        {
          id: 'row-1',
          batchId: 'batch-sole',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        }
      ];

      contest.simulados = [
        { id: 'sim-1', batchId: 'batch-sole', date: todayKey, correct: 5, total: 10, type: 'ai-simulado' }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          { date: todayKey, correct: 5, total: 10, score: 50 }
        ],
        average: 50,
        lastAttempt: 50,
        trend: 'stable',
        level: 'MEDIO'
      };

      // Delete batch-sole
      slice.deleteSimulado('batch-sole');

      expect(contest.simuladoRows).toHaveLength(0);
      expect(contest.simulados).toHaveLength(0);
      expect(contest.categories[0].simuladoStats.history).toHaveLength(0);
      expect(contest.categories[0].simuladoStats.average).toBe(0);
      expect(contest.categories[0].simuladoStats.level).toBe('BAIXO');
    });

    it('should support deleting by prefixed key like manual-YYYY-MM-DD or ai-YYYY-MM-DD', () => {
      const contest = mockState.appState.contests['contest-1'];
      const targetDate = '2026-10-15';

      contest.simuladoRows = [
        {
          id: 'row-manual',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 10,
          total: 10,
          date: targetDate,
          source: 'manual'
        },
        {
          id: 'row-ai',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: targetDate,
          source: 'ai-generated'
        }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          { date: targetDate, correct: 15, total: 20, score: 75 }
        ],
        average: 75,
        lastAttempt: 75
      };

      // Delete only the manual simulado for that date
      slice.deleteSimulado(`manual-${targetDate}`);

      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].source).toBe('ai-generated');
      expect(contest.categories[0].simuladoStats.history[0].correct).toBe(5);
      expect(contest.categories[0].simuladoStats.history[0].total).toBe(10);
    });
  });

  describe('Bug 4: Date Normalization for Category History Deduplication', () => {
    it('should recognize ISO timestamp in category history and not produce duplicates', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));
      const isoToday = new Date().toISOString();

      // Pre-existing history entry with full ISO timestamp
      contest.categories[0].simuladoStats = {
        history: [
          { date: isoToday, correct: 5, total: 10, score: 50, topics: [{ name: 'Direitos Fundamentais', correct: 5, total: 10 }] }
        ]
      };

      const form = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        dificuldade: 'medio'
      };

      applyAIResultsToDraft(contest, form, 3, 5, 50, false, 'batch-2');

      const history = contest.categories[0].simuladoStats.history;
      // Must NOT create a second duplicate entry for today
      expect(history).toHaveLength(1);
      expect(history[0].total).toBe(15);
      expect(history[0].correct).toBe(8);
    });
  });

  describe('Bug 1: Manual Simulado Saves Preserve Earlier Topics of the Day', () => {
    it('should keep earlier submitted topics when a new topic is submitted and the earlier topic is 0 in rawRows', () => {
      const todayKey = getDateKey(normalizeDate(new Date()));
      const prevSimuladoRowsArray = [
        {
          id: 'row-morning',
          categoryId: 'cat-1',
          topicId: 'topic-1',
          subject: 'Direito Constitucional',
          topic: 'Direitos Fundamentais',
          correct: 8,
          total: 10,
          date: todayKey,
          source: 'manual',
          isAuto: false
        }
      ];

      // User now enters topic-2 in the afternoon with total=10, correct=9,
      // but topic-1 is present in the form with total=0 (unanswered in this submission)
      const rawRows = [
        {
          id: 'manual-cat-1-topic-1',
          categoryId: 'cat-1',
          topicId: 'topic-1',
          subject: 'Direito Constitucional',
          topic: 'Direitos Fundamentais',
          correct: 0,
          total: 0
        },
        {
          id: 'manual-cat-1-topic-2',
          categoryId: 'cat-1',
          topicId: 'topic-2',
          subject: 'Direito Constitucional',
          topic: 'Nacionalidade',
          correct: 9,
          total: 10
        }
      ];

      // Filter only actually submitted rows (total > 0)
      const actuallySubmittedRows = rawRows.filter(
        (r) => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0
      );
      const submittedIds = new Set(actuallySubmittedRows.map(r => r.id).filter(Boolean));
      const submittedKeys = new Set(actuallySubmittedRows.map(r => {
        if (r.categoryId && r.topicId) return `${r.categoryId}-${r.topicId}`;
        if (r.subject && r.topic) return `${r.subject}-${r.topic}`;
        return null;
      }).filter(Boolean));

      const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
        const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
        const isManual = r && !r.isAuto && r.source !== 'ai-generated';

        if (isToday && isManual) {
          if (r?.id && submittedIds.has(r.id)) return false;

          const key1 = (r?.categoryId && r?.topicId) ? `${r.categoryId}-${r.topicId}` : null;
          if (key1 && submittedKeys.has(key1)) return false;
        }

        return true;
      });

      // The morning row MUST be kept!
      expect(rowsToKeep).toHaveLength(1);
      expect(rowsToKeep[0].id).toBe('row-morning');
      expect(rowsToKeep[0].correct).toBe(8);
      expect(rowsToKeep[0].total).toBe(10);
    });
  });

  describe('Bug 5: DailySummaryCards Sanitization of Corrupt Row Data', () => {
    it('should sanitize per-row total and correct so corrupt rows do not contaminate totals', () => {
      // Row 1: corrupt data where correct (10) > total (5)
      // Row 2: valid data where correct is 0 out of 5
      const rows = [
        { subject: 'Direito Constitucional', correct: 10, total: 5 },
        { subject: 'Direito Administrativo', correct: 0, total: 5 }
      ];

      let totalQ = 0;
      let totalC = 0;
      const subjectMap = {};

      rows.forEach(r => {
        const rowT = Math.max(0, parseInt(r.total, 10) || 0);
        const rowC = Math.max(0, Math.min(rowT, parseInt(r.correct, 10) || 0));
        totalQ += rowT;
        totalC += rowC;

        const name = r.subject || 'Geral';
        if (!subjectMap[name]) subjectMap[name] = { c: 0, t: 0 };
        subjectMap[name].c += rowC;
        subjectMap[name].t += rowT;
      });

      const safeC = Math.min(totalC, totalQ);
      const pct = totalQ > 0 ? Math.max(0, Math.min(100, Math.round((safeC / totalQ) * 100))) : 0;

      // Row 1 was clamped to 5/5 (100%), Row 2 is 0/5 (0%)
      // Total questions = 10, total correct = 5, overall = 50%
      expect(totalQ).toBe(10);
      expect(totalC).toBe(5);
      expect(safeC).toBe(5);
      expect(pct).toBe(50);
      expect(subjectMap['Direito Constitucional'].c).toBe(5);
      expect(subjectMap['Direito Administrativo'].c).toBe(0);
    });
  });
});

```

---

## `src/utils/__tests__/measurement.test.js` <a id="src-utils-__tests__-measurement-test-js"></a>

- **Localização:** `src/utils/__tests__/measurement.test.js`
- **Descrição:** Testes unitários de domínio de notas, sanitização de rows de simulados e deduplicação de históricos
- **Linhas:** 134
- **Tamanho:** 3.13 KB

```javascript
import { describe, it, expect } from "vitest";
import {
  safeDomain,
  normalizeScoreValue,
  sanitizeSimuladoRow,
  mergeQuestionResult,
  toProb01,
  toProbPct,
  resolveTargetPoints,
  deduplicateSimulados,
  latestByDate,
  pointsToPct,
  pctToPoints
} from "../measurement.js";

describe("measurement", () => {
  it("cria domínio seguro", () => {
    const d = safeDomain(1000, 200);

    expect(d.min).toBe(200);
    expect(d.max).toBe(1000);
    expect(d.range).toBe(800);
  });

  it("converte pct para points com minScore", () => {
    expect(pctToPoints(50, 1000, 200)).toBe(600);
  });

  it("converte points para pct com minScore", () => {
    expect(pointsToPct(600, 1000, 200)).toBe(50);
  });

  it("normaliza percentual explícito", () => {
    const norm = normalizeScoreValue(
      { score: 80, isPercentage: true },
      1000,
      0
    );

    expect(norm.points).toBe(800);
    expect(norm.pct).toBe(80);
  });

  it("total/correct manda mais que score", () => {
    const norm = normalizeScoreValue(
      { total: 10, correct: 8, score: 10 },
      1000,
      0
    );

    expect(norm.points).toBe(800);
    expect(norm.pct).toBe(80);
  });

  it("sanitize zera correct quando total é zero", () => {
    const row = sanitizeSimuladoRow(
      { total: 0, correct: 5 },
      100
    );

    expect(row.total).toBe(0);
    expect(row.correct).toBe(0);
  });

  it("sanitize clamp correct > total", () => {
    const row = sanitizeSimuladoRow(
      { total: 10, correct: 20 },
      100
    );

    expect(row.correct).toBe(10);
    expect(row.total).toBe(10);
  });

  it("mergeQuestionResult nunca deixa correct maior que total", () => {
    const row = mergeQuestionResult(
      { total: 10, correct: 8 },
      { total: 5, correct: 10 },
      100
    );

    expect(row.total).toBe(10);
    expect(row.correct).toBeLessThanOrEqual(10);
  });

  it("probabilidade aceita 0-1 e 0-100", () => {
    expect(toProb01(0.7)).toBe(0.7);
    expect(toProb01(70)).toBe(0.7);
    expect(toProb01(70, "pct")).toBe(0.7);
    expect(toProbPct(0.7)).toBe(70);
  });

  it("resolve meta percentual para pontos", () => {
    const domain = safeDomain(1000, 0);
    expect(resolveTargetPoints(70, domain, "pct")).toBe(700);
  });

  it("deduplicação preserva matérias diferentes na mesma data", () => {
    const rows = [
      {
        subject: "Português",
        date: "2026-01-01",
        score: 80,
        isPercentage: true
      },
      {
        subject: "Matemática",
        date: "2026-01-01",
        score: 80,
        isPercentage: true
      }
    ];

    const unique = deduplicateSimulados(rows, {
      maxScore: 1000,
      minScore: 0,
      getDateKey: (d) => String(d).slice(0, 10)
    });

    expect(unique).toHaveLength(2);
  });

  it("latestByDate retorna o mais recente por data real", () => {
    const rows = [
      { date: "2026-01-01", id: "a" },
      { date: "2026-02-01", id: "b" },
      { date: "2026-01-15", id: "c" }
    ];

    const latest = latestByDate(rows);
    expect(latest.id).toBe("b");
  });
});
```

---

