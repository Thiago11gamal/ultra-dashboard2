import React from 'react';
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
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const timeColor = timeLeft < 180 ? 'text-red-400 border-red-500/30' : timeLeft < 300 ? 'text-amber-400 border-amber-500/30' : 'text-slate-300 border-white/10';
  const difficultyLabel = DIFFICULTIES.find(d => d.value === form.dificuldade)?.label || form.dificuldade;

return (
      <div className="w-full">
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
