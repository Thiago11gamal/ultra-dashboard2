import React, { useState, useMemo } from 'react';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { BookOpen, Plus, Trash2, Play, X, RotateCw, Award } from 'lucide-react';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';
import { getFlashcardTodayKey, getFlashcardNextDueKey, isFlashcardDue } from '../utils/dateHelper';
import DueForecast from '../components/DueForecast';

const EMPTY_ARRAY = [];

function getActiveContest(state) {
  const id = state.appState.activeId;
  return state.appState.contests[id] || {};
}

export default function Flashcards() {
  const rawDecks = useAppStore(state => getActiveContest(state).flashcardDecks || EMPTY_ARRAY);
  const decks = Array.isArray(rawDecks) ? rawDecks : Object.values(rawDecks || {});
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const logFlashcardReview = useAppStore(state => state.logFlashcardReview);

  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');

  const [showAddCard, setShowAddCard] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  // Study session
  const [isStudying, setIsStudying] = useState(false);
  const [studyDeck, setStudyDeck] = useState(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyStats, setStudyStats] = useState({ reviewed: 0, known: 0 });

  const selectedDeck = useMemo(() => decks.find(d => d.id === selectedDeckId), [decks, selectedDeckId]);

  const dueCards = useMemo(() => {
    if (!selectedDeck || !selectedDeck.cards) return [];
    const safeCards = Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {});
    return safeCards.filter(c => isFlashcardDue(c.due));
  }, [selectedDeck]);

  function persistDecks(nextDecks) {
    setData(contest => ({
      ...contest,
      flashcardDecks: nextDecks
    }));
  }

  // Create deck
  const createDeck = () => {
    if (!newDeckName.trim()) {
      showToast('Nome do deck obrigatório', 'error');
      return;
    }
    const newDeck = {
      id: generateId('deck'),
      name: newDeckName.trim(),
      subject: newDeckSubject.trim() || 'Geral',
      createdAt: new Date().toISOString(),
      cards: [],
      stats: { totalReviews: 0, mastered: 0 }
    };
    const next = [...decks, newDeck];
    persistDecks(next);
    setSelectedDeckId(newDeck.id);
    setNewDeckName('');
    setNewDeckSubject('');
    setShowCreateDeck(false);
    showToast('Deck criado! 📚', 'success');
  };

  // Delete deck
  const deleteDeck = (deckId) => {
    if (!window.confirm('Excluir este deck e todos os cartões?')) return;
    const next = decks.filter(d => d.id !== deckId);
    persistDecks(next);
    if (selectedDeckId === deckId) setSelectedDeckId(null);
    showToast('Deck removido', 'info');
  };

  // Add card
  const addCard = () => {
    if (!selectedDeckId || !front.trim() || !back.trim()) {
      showToast('Preencha frente e verso', 'error');
      return;
    }
    const nextDecks = decks.map(deck => {
      if (deck.id !== selectedDeckId) return deck;
      const cards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
      return {
        ...deck,
        cards: [...cards, {
          id: generateId('card'),
          front: front.trim(),
          back: back.trim(),
          interval: 1,
          ease: 2.5,
          due: getFlashcardTodayKey(),   // consistent TZ key
          lastReviewed: null,
          reviews: 0
        }]
      };
    });
    persistDecks(nextDecks);
    setFront('');
    setBack('');
    setShowAddCard(false);
    showToast('Cartão adicionado!', 'success');
  };

  const deleteCard = (cardId) => {
    const nextDecks = decks.map(deck => {
      if (deck.id !== selectedDeckId) return deck;
      const cards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
      return { ...deck, cards: cards.filter(c => c.id !== cardId) };
    });
    persistDecks(nextDecks);
    showToast('Cartão excluído', 'info');
  };

  // Start study
  const getDueCardsForDeck = (deck) => {
    if (!deck || !deck.cards) return [];
    const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
    return safeCards.filter(c => isFlashcardDue(c.due));
  };

  const startStudy = (deck) => {
    if (!deck) return;

    const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});

    if (safeCards.length === 0) {
      showToast('Adicione cartões antes de estudar', 'error');
      return;
    }

    const dueForDeck = getDueCardsForDeck(deck);
    const cardsToStudy = dueForDeck.length > 0 ? dueForDeck : safeCards;

    setSelectedDeckId(deck.id);
    setStudyDeck({ ...deck, cardsToStudy });
    setStudyIndex(0);
    setIsFlipped(false);
    setStudyStats({ reviewed: 0, known: 0 });
    setIsStudying(true);
  };

  const closeStudy = () => {
    setIsStudying(false);
    setStudyDeck(null);
    setStudyIndex(0);
    setIsFlipped(false);
  };

  const flipCard = () => setIsFlipped(f => !f);

  // SRS simple
  function rateCard(rating) {
    // rating: 0=Esqueci, 1=Difícil, 2=Bom, 3=Fácil
    if (!studyDeck || !studyDeck.cardsToStudy) return;

    const currentCard = studyDeck.cardsToStudy[studyIndex];
    if (!currentCard) return;

    // Update in decks
    let newInterval = currentCard.interval || 1;
    let newEase = currentCard.ease || 2.5;

    if (rating === 0) {
      newInterval = 1;
    } else if (rating === 1) {
      newInterval = Math.max(1, Math.floor(newInterval * 0.8));
      newEase = Math.max(1.3, newEase - 0.15);
    } else if (rating === 2) {
      newInterval = Math.floor(newInterval * newEase);
      newEase = Math.min(3.0, newEase + 0.05);
    } else {
      newInterval = Math.floor(newInterval * (newEase + 0.2));
      newEase = Math.min(3.2, newEase + 0.1);
    }

    const nextDue = getFlashcardNextDueKey(newInterval);

    const nextDecks = decks.map(deck => {
      if (deck.id !== studyDeck.id) return deck;
      const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
      const updatedCards = safeCards.map(card => {
        if (card.id === currentCard.id) {
          return {
            ...card,
            interval: newInterval,
            ease: newEase,
            due: nextDue,
            lastReviewed: new Date().toISOString(),
            reviews: (card.reviews || 0) + 1
          };
        }
        return card;
      });
      return {
        ...deck,
        cards: updatedCards,
        stats: {
          totalReviews: (deck.stats?.totalReviews || 0) + 1,
          mastered: updatedCards.filter(c => (c.reviews || 0) >= 3 && (c.interval || 1) > 6).length
        }
      };
    });

    persistDecks(nextDecks);

    // Integrate as measure: log review for stats, activity, gamification, coach
    if (logFlashcardReview && studyDeck) {
        logFlashcardReview(studyDeck.id, currentCard.id, rating, studyDeck.subject || studyDeck.name);
    }

    // Update local study session copy
    const updatedStudyCards = [...studyDeck.cardsToStudy];
    updatedStudyCards[studyIndex] = {
      ...updatedStudyCards[studyIndex],
      interval: newInterval,
      ease: newEase,
      due: nextDue
    };

    const newStats = {
      reviewed: studyStats.reviewed + 1,
      known: studyStats.known + (rating >= 2 ? 1 : 0)
    };
    setStudyStats(newStats);

    // Next card
    if (studyIndex + 1 < updatedStudyCards.length) {
      setStudyIndex(i => i + 1);
      setIsFlipped(false);
      setStudyDeck({ ...studyDeck, cardsToStudy: updatedStudyCards });
    } else {
      // Finished
      showToast(`Sessão concluída! ${newStats.known}/${newStats.reviewed} dominados.`, 'success');
      setTimeout(() => {
        closeStudy();
      }, 800);
    }
  }

  const currentStudyCard = studyDeck?.cardsToStudy?.[studyIndex];

  return (
    <PageErrorBoundary pageName="Flashcards">
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <BookOpen className="text-amber-400" size={28} />
            <h1 className="tool-header">Flashcards</h1>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm">Sistema de repetição espaçada para concursos</p>
        </div>

        <button
          onClick={() => setShowCreateDeck(true)}
          className="tool-btn"
        >
          <Plus size={17} /> Novo Deck
        </button>
      </div>

      {/* Previsão de Cartões a Vencer - compact header insight */}
      {decks.length > 0 && (
        <div className="mb-6">
          <DueForecast decks={decks} horizon={10} />
        </div>
      )}

      {/* Create deck modal */}
      {showCreateDeck && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowCreateDeck(false)}>
          <div className="premium-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 leading-tight">Criar Novo Deck</h3>
            <div className="space-y-3">
              <div>
                <label className="micro-label block mb-1">Nome do Deck</label>
                <input
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none"
                  placeholder="Ex: Direito Constitucional"
                />
              </div>
              <div>
                <label className="micro-label block mb-1">Disciplina (opcional)</label>
                <input
                  value={newDeckSubject}
                  onChange={e => setNewDeckSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none"
                  placeholder="Direito"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateDeck(false)} className="tool-btn secondary flex-1">Cancelar</button>
              <button onClick={createDeck} className="tool-btn flex-1">Criar Deck</button>
            </div>
          </div>
        </div>
      )}

      {/* Decks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {decks.length === 0 && (
          <div className="empty-state col-span-full text-center">
            <BookOpen className="mx-auto mb-4 text-amber-400/70" size={42} />
            <p className="text-lg font-semibold">Nenhum deck ainda</p>
            <p className="text-slate-400 mt-1">Crie decks de flashcards para revisar com repetição espaçada.</p>
            <button onClick={() => setShowCreateDeck(true)} className="tool-btn mt-6 mx-auto">Criar Primeiro Deck</button>
          </div>
        )}

        {decks.map(deck => {
          const cardCount = deck.cards?.length || 0;
          const isSelected = deck.id === selectedDeckId;
          const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
          const dueCount = safeCards.filter(c => isFlashcardDue(c.due)).length;
          return (
            <div
              key={deck.id}
              className={`deck-card premium-card p-5 cursor-pointer border ${isSelected ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-white/5'}`}
              onClick={() => setSelectedDeckId(deck.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg leading-tight tracking-[-0.01em]">{deck.name}</div>
                  <div className="text-xs text-amber-300/90 uppercase tracking-widest mt-1">{deck.subject}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                  className="text-rose-400/70 hover:text-rose-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-2xl font-bold tabular-nums">{cardCount}</span>
                  <span className="ml-1.5 text-slate-400">cartões</span>
                </div>
                <div className="text-emerald-400 text-xs font-bold">
                  {dueCount > 0 ? `${dueCount} para revisar` : 'Em dia'}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); startStudy(deck); }}
                disabled={cardCount === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/30 py-2.5 text-sm font-bold disabled:opacity-50 transition-colors"
              >
                <Play size={15} /> ESTUDAR AGORA
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected deck panel */}
      {selectedDeck && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-extrabold text-2xl leading-tight tracking-[-0.01em]">{selectedDeck.name}</div>
              <div className="text-amber-300/80 text-sm tracking-wider mt-0.5">{selectedDeck.subject} • {(Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {})).length} cartões</div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => startStudy(selectedDeck)} disabled={!selectedDeck.cards?.length} className="tool-btn">
                <Play size={16} /> Iniciar Revisão
              </button>
              <button onClick={() => setShowAddCard(true)} className="tool-btn secondary">
                <Plus size={16} /> Adicionar Cartão
              </button>
            </div>
          </div>

          {/* Add card form */}
          {showAddCard && (
            <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-slate-950/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="micro-label mb-1.5">FRENTE (Pergunta)</div>
                  <textarea value={front} onChange={e => setFront(e.target.value)} rows={3} className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm resize-y" placeholder="O que é... ?" />
                </div>
                <div>
                  <div className="micro-label mb-1.5">VERSO (Resposta)</div>
                  <textarea value={back} onChange={e => setBack(e.target.value)} rows={3} className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm resize-y" placeholder="Resposta completa..." />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowAddCard(false); setFront(''); setBack(''); }} className="tool-btn secondary flex-1">Cancelar</button>
                <button onClick={addCard} className="tool-btn flex-1">Adicionar Cartão</button>
              </div>
            </div>
          )}

          {/* Cards list */}
          <div>
            <div className="micro-label mb-3">CARTÕES ({(selectedDeck.cards || []).length})</div>
            {(Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {})).length === 0 ? (
              <div className="text-sm text-slate-400 py-3">Nenhum cartão. Adicione alguns acima.</div>
            ) : (
              <div className="space-y-2">
                {(Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {})).map((card) => (
                  <div key={card.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-amber-100 line-clamp-2 leading-snug">{card.front}</div>
                      <div className="text-slate-400 mt-1 text-xs line-clamp-2 leading-snug">{card.back}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                        <span>Intervalo: {card.interval || 1}d</span>
                        {card.due && <span>Próxima: {format(new Date(card.due + 'T12:00:00'), 'dd/MM')}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-500 transition p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDY MODAL */}
      {isStudying && currentStudyCard && (
        <div className="fixed inset-0 z-[300] bg-[#05070f]/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[680px]">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4 px-1 text-sm">
              <div className="flex items-center gap-2 text-amber-300">
                <BookOpen size={18} />
                <span className="font-semibold">{studyDeck?.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{studyIndex + 1} / {studyDeck?.cardsToStudy?.length}</span>
                <span className="text-emerald-400">{studyStats.known} bons</span>
                <button onClick={closeStudy} className="text-slate-400 hover:text-white flex items-center gap-1">
                  <X size={15} /> Sair
                </button>
              </div>
            </div>

            {/* Flashcard - generous framing */}
            <div className="flashcard-container mx-auto my-2" onClick={flipCard}>
              <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                {/* FRONT */}
                <div className="flashcard-front">
                  <div className="uppercase tracking-[2.5px] text-[10px] text-amber-300/70 mb-1.5 font-bold">PERGUNTA</div>
                  <div className="flashcard-content mt-1 mb-1">{currentStudyCard.front}</div>
                  <div className="absolute bottom-4 text-[10px] text-slate-500/80 tracking-wide">Toque para virar ↻</div>
                </div>
                {/* BACK */}
                <div className="flashcard-back">
                  <div className="uppercase tracking-[2.5px] text-[10px] text-violet-300/70 mb-1.5 font-bold">RESPOSTA</div>
                  <div className="flashcard-content mt-1 mb-1">{currentStudyCard.back}</div>
                </div>
              </div>
            </div>

            {/* Controls - better spacing */}
            {!isFlipped ? (
              <div className="mt-5 mb-1 text-center text-xs text-slate-400">Toque no cartão para revelar a resposta</div>
            ) : (
              <div className="mt-6">
                <div className="text-center text-sm font-medium text-amber-300 mb-3.5">Como foi a sua resposta?</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button onClick={() => rateCard(0)} className="rounded-2xl bg-rose-600/10 hover:bg-rose-600/25 border border-rose-600/30 py-3 text-rose-300 font-semibold active:scale-[0.985]">Esqueci</button>
                  <button onClick={() => rateCard(1)} className="rounded-2xl bg-orange-500/10 hover:bg-orange-500/25 border border-orange-400/30 py-3 text-orange-300 font-semibold active:scale-[0.985]">Difícil</button>
                  <button onClick={() => rateCard(2)} className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-400/30 py-3 text-emerald-300 font-semibold active:scale-[0.985]">Bom</button>
                  <button onClick={() => rateCard(3)} className="rounded-2xl bg-sky-500/10 hover:bg-sky-500/25 border border-sky-400/30 py-3 text-sky-300 font-semibold active:scale-[0.985]">Fácil</button>
                </div>
              </div>
            )}

            <div className="text-center mt-7">
              <button onClick={flipCard} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 hover:text-slate-200">
                <RotateCw size={14} /> Virar Cartão
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedDeck && decks.length > 0 && (
        <p className="text-center text-slate-500 mt-4 text-sm">Selecione um deck acima para gerenciar ou estudar.</p>
      )}
    </div>
    </PageErrorBoundary>
  );
}
