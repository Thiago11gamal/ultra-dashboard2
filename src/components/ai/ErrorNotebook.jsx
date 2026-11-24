import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Filter, RotateCcw, Sparkles, Clock, Plus, X } from 'lucide-react';
import { getDateKey } from '../../utils/dateHelper';
import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

const ERROR_LABELS = {
  teoria: 'Lacuna Teórica',
  atencao: 'Desatenção',
  esquecimento: 'Esquecimento',
  tempo: 'Falta de Tempo',
  banca: 'Pegadinha da Banca',
  lacuna: 'Lacuna Teórica',
  pegadinha: 'Pegadinha',
  leitura: 'Leitura',
};

const CONFIDENCE_LABELS = {
  certeza: { label: 'Certeza (Ilusão!)', cls: 'bg-rose-500/20 border-rose-400/50 text-rose-200' },
  duvida: { label: 'Dúvida', cls: 'bg-amber-500/20 border-amber-400/50 text-amber-200' },
  chute: { label: 'Chute', cls: 'bg-slate-700/60 border-white/15 text-slate-300' },
};

/**
 * Caderno de Erros Unificado (Cross-Simulados):
 * consolida todas as questões erradas registradas em `simuladoRows[].questionTelemetry`,
 * permite filtrar por matéria, causa do erro e confiança, enviar para Flashcards FSRS
 * ou acionar uma bateria focada de revisão.
 */
export default function ErrorNotebook({
  simuladoRows = [],
  categories = [],
  onSendToFlashcards = null,
  onStartErrorDrill = null,
  onAddManualError = null,
}) {
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [errorFilter, setErrorFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    subject: '',
    topic: '',
    statement: '',
    explanation: '',
    correctAnswer: '',
    errorType: 'teoria',
    confidence: 'certeza',
  });

  const safeCategories = useMemo(() => safeArr(categories), [categories]);

  const allErrors = useMemo(() => {
    const list = [];
    safeArr(simuladoRows).forEach((row) => {
      const tel = safeArr(row?.questionTelemetry);
      const subject = row.subject || row.materia || 'Geral';
      const topic = row.topic || row.assunto || 'Geral';
      const dateStr = getDateKey(row.date || row.createdAt) || '';

      tel.forEach((q, idx) => {
        if (!q || q.correct === true) return;
        list.push({
          uid: `${row.id || row.batchId || 'row'}-${q.id || idx}`,
          rowId: row.id,
          categoryId: row.categoryId || null,
          taskId: row.taskId || null,
          subject,
          topic,
          date: dateStr,
          confidence: q.confidence || null,
          errorType: q.errorType || null,
          difficulty: q.difficulty || row.difficulty || 'medio',
          timeSec: Number(q.timeSec) || 0,
          wasAnswered: q.wasAnswered !== false,
          statement: q.statement || '',
          explanation: q.explanation || '',
          correctAnswer: q.correctAnswer || '',
        });
      });
    });

    // Mais recentes + Ilusão de Competência primeiro
    return list.sort((a, b) => {
      const aCrit = a.confidence === 'certeza' ? 1 : 0;
      const bCrit = b.confidence === 'certeza' ? 1 : 0;
      if (bCrit !== aCrit) return bCrit - aCrit;
      return String(b.date).localeCompare(String(a.date));
    });
  }, [simuladoRows]);

  const subjects = useMemo(
    () => Array.from(new Set(allErrors.map((e) => e.subject))).sort((a, b) => a.localeCompare(b)),
    [allErrors]
  );

  const filtered = useMemo(() => {
    return allErrors.filter((e) => {
      if (subjectFilter !== 'all' && e.subject !== subjectFilter) return false;
      if (errorFilter !== 'all' && e.errorType !== errorFilter) return false;
      if (confidenceFilter !== 'all' && e.confidence !== confidenceFilter) return false;
      return true;
    });
  }, [allErrors, subjectFilter, errorFilter, confidenceFilter]);

  const criticalCount = useMemo(
    () => allErrors.filter((e) => e.confidence === 'certeza').length,
    [allErrors]
  );

  const handleBulkFlashcards = () => {
    if (!filtered.length || typeof onSendToFlashcards !== 'function') return;
    const nowIso = new Date().toISOString();
    const todayKey = getDateKey(new Date()) || nowIso.slice(0, 10);
    const cardsBySubject = {};

    filtered.slice(0, 40).forEach((err) => {
      const subj = err.subject || 'Geral';
      if (!cardsBySubject[subj]) cardsBySubject[subj] = [];
      const isCrit = err.confidence === 'certeza';
      const front = `${isCrit ? '[CONCEITO CRÍTICO] ' : ''}${err.statement || `${err.subject} — ${err.topic} (${ERROR_LABELS[err.errorType] || 'Revisão de erro'})`}`;
      const back = [
        err.correctAnswer ? `Gabarito: ${err.correctAnswer}` : null,
        err.explanation || `Revisar tópico: ${err.topic}`,
        err.errorType ? `Causa: ${ERROR_LABELS[err.errorType] || err.errorType}` : null,
      ].filter(Boolean).join('\n');

      cardsBySubject[subj].push({
        id: generateId('card'),
        sourceErrorUid: err.uid,
        categoryId: err.categoryId || null,
        front: front.slice(0, 260),
        back: back.slice(0, 360),
        interval: 1,
        ease: isCrit ? 2.1 : 2.5,
        priority: isCrit ? 'critical' : 'normal',
        confidence: err.confidence || null,
        errorType: err.errorType || null,
        reviews: 0,
        due: todayKey,
        createdAt: nowIso,
        source: 'error-notebook',
      });
    });

    onSendToFlashcards(cardsBySubject, normalize);
  };

  const handleSaveManualError = () => {
    if (typeof onAddManualError !== 'function' || !manualForm.statement.trim()) return;
    const chosenSubject = manualForm.subject || safeCategories[0]?.name || 'Geral';
    const matchedCat = safeCategories.find((c) => c && c.name === chosenSubject);
    onAddManualError({
      categoryId: matchedCat?.id || null,
      subject: chosenSubject,
      topic: manualForm.topic.trim() || 'Geral',
      statement: manualForm.statement.trim(),
      explanation: manualForm.explanation.trim(),
      correctAnswer: manualForm.correctAnswer.trim(),
      errorType: manualForm.errorType,
      confidence: manualForm.confidence,
    });
    setManualForm({
      subject: chosenSubject,
      topic: '',
      statement: '',
      explanation: '',
      correctAnswer: '',
      errorType: 'teoria',
      confidence: 'certeza',
    });
    setShowManualModal(false);
  };

  const manualModalNode = showManualModal && typeof onAddManualError === 'function' ? (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowManualModal(false)}>
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 space-y-4 shadow-2xl text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-white">Registrar Erro Manual (Prova / PDF)</h4>
          <button type="button" onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Matéria</label>
            <select
              value={manualForm.subject || safeCategories[0]?.name || 'Geral'}
              onChange={(e) => setManualForm((p) => ({ ...p, subject: e.target.value }))}
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white"
            >
              {safeCategories.map((c) => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
              <option value="Geral">Geral</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assunto / Tópico</label>
            <input
              value={manualForm.topic}
              onChange={(e) => setManualForm((p) => ({ ...p, topic: e.target.value }))}
              placeholder="Ex.: Controle de Constitucionalidade"
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Causa do Erro</label>
            <select
              value={manualForm.errorType}
              onChange={(e) => setManualForm((p) => ({ ...p, errorType: e.target.value }))}
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white"
            >
              <option value="teoria">Lacuna Teórica</option>
              <option value="atencao">Desatenção</option>
              <option value="esquecimento">Esquecimento</option>
              <option value="tempo">Falta de Tempo</option>
              <option value="banca">Pegadinha da Banca</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Confiança ao Responder</label>
            <select
              value={manualForm.confidence}
              onChange={(e) => setManualForm((p) => ({ ...p, confidence: e.target.value }))}
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white"
            >
              <option value="certeza">Certeza (Ilusão!)</option>
              <option value="duvida">Dúvida</option>
              <option value="chute">Chute</option>
            </select>
          </div>
        </div>
        <div className="text-xs">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Enunciado / Conceito que errou</label>
          <textarea
            rows={2}
            value={manualForm.statement}
            onChange={(e) => setManualForm((p) => ({ ...p, statement: e.target.value }))}
            placeholder="Descreva a questão, pegadinha ou artigo que errou..."
            className="w-full rounded-xl bg-slate-950 border border-white/10 p-3 text-white resize-y"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Gabarito (opc.)</label>
            <input
              value={manualForm.correctAnswer}
              onChange={(e) => setManualForm((p) => ({ ...p, correctAnswer: e.target.value }))}
              placeholder="Ex.: Certo / Letra C"
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Explicação / Regra Correta</label>
            <input
              value={manualForm.explanation}
              onChange={(e) => setManualForm((p) => ({ ...p, explanation: e.target.value }))}
              placeholder="Regra ou súmula que resolve a questão..."
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-300 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!manualForm.statement.trim()}
            onClick={handleSaveManualError}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-black text-white"
          >
            Salvar no Caderno
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (allErrors.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-center space-y-3">
        <AlertTriangle size={36} className="mx-auto text-amber-400/50" />
        <h3 className="text-lg font-black text-white">Seu Caderno de Erros está limpo</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Ao finalizar Simulados IA, cada questão errada é catalogada aqui automaticamente com seu nível de confiança, tempo gasto e causa do erro — ou registre erros de provas externas manualmente.
        </p>
        {typeof onAddManualError === 'function' && (
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-black transition-colors"
          >
            <Plus size={14} /> Registrar Erro Manual
          </button>
        )}
        {manualModalNode}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Actions */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-black text-white">Caderno de Erros Inteligente</h3>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-300">
              {filtered.length} erro(s)
            </span>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-200">
                ⚠️ {criticalCount} com Certeza (Ilusão de Competência)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Filtre padrões recorrentes e transforme erros críticos em Flashcards FSRS ou em uma nova rodada focada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof onAddManualError === 'function' && (
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Erro Manual
            </button>
          )}
          {typeof onSendToFlashcards === 'function' && (
            <button
              type="button"
              onClick={handleBulkFlashcards}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-xs font-black disabled:opacity-40 transition-colors"
            >
              <BookOpen size={14} />
              Enviar para Flashcards FSRS ({Math.min(40, filtered.length)})
            </button>
          )}
          {typeof onStartErrorDrill === 'function' && (
            <button
              type="button"
              onClick={() => onStartErrorDrill(filtered)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black disabled:opacity-40 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Sparkles size={14} />
              Refazer só meus erros (IA)
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Filter size={12} /> Filtros:
        </span>

        <select
          aria-label="Filtrar erros por matéria"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 font-bold outline-none"
        >
          <option value="all">Todas as matérias</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          aria-label="Filtrar erros por causa"
          value={errorFilter}
          onChange={(e) => setErrorFilter(e.target.value)}
          className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 font-bold outline-none"
        >
          <option value="all">Todas as causas</option>
          <option value="teoria">Lacuna Teórica</option>
          <option value="atencao">Desatenção</option>
          <option value="esquecimento">Esquecimento</option>
          <option value="tempo">Tempo</option>
          <option value="banca">Pegadinha da Banca</option>
        </select>

        <select
          aria-label="Filtrar erros por confiança"
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 font-bold outline-none"
        >
          <option value="all">Toda confiança</option>
          <option value="certeza">Certeza (Ilusão de Competência)</option>
          <option value="duvida">Dúvida</option>
          <option value="chute">Chute</option>
        </select>

        {(subjectFilter !== 'all' || errorFilter !== 'all' || confidenceFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSubjectFilter('all');
              setErrorFilter('all');
              setConfidenceFilter('all');
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"
          >
            <RotateCcw size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Error Cards List */}
      <div className="space-y-2.5">
        {filtered.slice(0, 50).map((err) => {
          const confMeta = err.confidence ? CONFIDENCE_LABELS[err.confidence] : null;
          return (
            <div
              key={err.uid}
              className={`rounded-2xl border p-4 space-y-2 ${
                err.confidence === 'certeza'
                  ? 'border-rose-500/35 bg-rose-950/20'
                  : 'border-white/10 bg-slate-900/50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-black text-white">{err.subject}</span>
                  <span className="text-slate-500">›</span>
                  <span className="text-indigo-300 font-semibold">{err.topic}</span>
                  {confMeta && (
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${confMeta.cls}`}>
                      {confMeta.label}
                    </span>
                  )}
                  {err.errorType && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300">
                      {ERROR_LABELS[err.errorType] || err.errorType}
                    </span>
                  )}
                  {!err.wasAnswered && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-400">
                      Em branco
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  {err.timeSec > 0 && (
                    <span className="inline-flex items-center gap-1"><Clock size={10} /> {err.timeSec}s</span>
                  )}
                  <span>{err.date}</span>
                </div>
              </div>

              {err.statement && (
                <p className="text-xs text-slate-200 leading-relaxed">{err.statement}</p>
              )}
              {err.explanation && (
                <p className="text-[11px] text-slate-400 border-l-2 border-indigo-500/40 pl-3 leading-relaxed">
                  {err.correctAnswer ? `Gabarito ${err.correctAnswer}: ` : ''}{err.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {manualModalNode}
    </div>
  );
}
