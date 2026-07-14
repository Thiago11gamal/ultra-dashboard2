import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, ListChecks, CheckCircle2, XCircle, RefreshCw, Sparkles, BarChart3 } from 'lucide-react';

export default function SimuladoResults({
  results,
  form,
  showReview,
  setShowReview,
  resetAll,
  retrySameQuestions,
  showToast
}) {
  const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;
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
                {results.correct}
              </motion.div>
              <div className="text-2xl text-slate-600 font-light">/</div>
              <div className="text-3xl font-black text-slate-600 tracking-tight">{results.total}</div>
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
          <div className="grid grid-cols-4 border-t border-white/[0.06]">
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-emerald-400">{results.correct}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-emerald-400/50 mt-1.5">ACERTOS</div>
            </div>
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              {/* BUG-5 FIX: Show separate counts for errors and unanswered */}
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-rose-400">{results.questions.filter(q => q.wasAnswered && !q.isCorrect).length}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-rose-400/50 mt-1.5">ERROS</div>
            </div>
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-slate-400">{results.questions.filter(q => !q.wasAnswered).length}</div>
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
              onClick={() => setShowReview(false)}
              className={`flex-1 py-3 text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative ${!showReview ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Award size={14} /> Resumo
              {!showReview && <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-400" />}
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button 
              onClick={() => setShowReview(true)}
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
                        {Math.floor((results?.timeSpentSecs || 0) / 60)}m {((results?.timeSpentSecs || 0) % 60).toString().padStart(2, '0')}s
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
                  {results.questions.map((q, idx) => {
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
            onClick={retrySameQuestions} 
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
            onClick={resetAll} 
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
              resetAll();
              showToast('Voltando ao menu de simulados', 'info');
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
