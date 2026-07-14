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
  const hasApiKey = true;
  const isReadyToGenerate = form.categoryId && form.taskId && hasApiKey;

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
                          disabled={!form.categoryId || availableTasks.length === 0}
                          className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-400/70 focus:bg-slate-900 hover:border-white/25 transition-all rounded-2xl px-4 py-[15px] text-[15px] font-medium text-white outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pr-10"
                        >
                          <option value="">Selecione o assunto...</option>
                          {[...availableTasks].sort((a,b) => (a.title||a.text||'').localeCompare(b.title||b.text||'')).map((tsk) => {
                            const label = tsk.title || tsk.text || 'Sem título';
                            return <option key={tsk.id} value={tsk.id}>{label}</option>;
                          })}
                        </select>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300/70 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      {form.categoryId && availableTasks.length === 0 && (
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
              {!hasApiKey && (
                <p className="text-xs text-rose-400 font-medium">Configure sua chave de API (VITE_GEMINI_API_KEY) e reinicie o servidor</p>
              )}
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  
}
