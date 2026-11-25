import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { BookOpen, Plus, Trash2, Play, X, RotateCw, Award, Edit2, Download, Upload, Check } from 'lucide-react';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';
import { getFlashcardTodayKey, getFlashcardNextDueKey, isFlashcardDue, parseNoonLocal, normalizeDate } from '../utils/dateHelper';
import { scheduleFlashcardFsrs, computeFlashcardRetrievability } from '../engine/probabilistic/fsrs';
import { isSubjectMatch } from '../utils/normalization';
import DueForecast from '../components/DueForecast';

import ConfirmModal from '../components/ConfirmModal';

const EMPTY_ARRAY = Object.freeze([]);

function getSafeDeckCards(deck) {
  if (!deck || !deck.cards) return [];
  const list = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
  return list.filter(Boolean);
}

function formatDueShort(rawDue) {
  if (!rawDue) return '--';
  const parsed = parseNoonLocal(rawDue) || normalizeDate(rawDue);
  return parsed && Number.isFinite(parsed.getTime()) ? format(parsed, 'dd/MM') : '--';
}

function getActiveContest(state) {
  const id = state.appState?.activeId || 'default';
  return state.appState?.contests?.[id] || {};
}

function parseDelimitedRow(line, sep) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

export default function Flashcards() {
  const location = useLocation();
  const activeId = useAppStore(state => state.appState?.activeId || 'default');
  const rawDecks = useAppStore(state => getActiveContest(state).flashcardDecks || EMPTY_ARRAY);
  const rawCategories = useAppStore(state => getActiveContest(state).categories || EMPTY_ARRAY);
  const categories = useMemo(
    () => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).filter(Boolean),
    [rawCategories]
  );
  const decks = useMemo(
    () => (Array.isArray(rawDecks) ? rawDecks : Object.values(rawDecks || {})).filter(Boolean),
    [rawDecks]
  );
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const logFlashcardReview = useAppStore(state => state.logFlashcardReview);

  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [prevActiveId, setPrevActiveId] = useState(activeId);
  const [prevSelectedDeckId, setPrevSelectedDeckId] = useState(null);
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckCategoryId, setNewDeckCategoryId] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');

  const [showAddCard, setShowAddCard] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [editingCardId, setEditingCardId] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Study session
  const [isStudying, setIsStudying] = useState(false);
  const [studyDeck, setStudyDeck] = useState(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyStats, setStudyStats] = useState({ reviewed: 0, known: 0 });
  const [pendingClose, setPendingClose] = useState(false);

  if (activeId !== prevActiveId) {
    setPrevActiveId(activeId);
    setPrevSelectedDeckId(null);
    setSelectedDeckId(null);
    setDeckToDelete(null);
    setShowAddCard(false);
    setEditingCardId(null);
    setEditFront('');
    setEditBack('');
    setShowImportCsv(false);
    setCsvText('');
    setPendingClose(false);
    setIsStudying(false);
    setStudyDeck(null);
    setStudyIndex(0);
    setIsFlipped(false);
  } else if (selectedDeckId !== prevSelectedDeckId) {
    setPrevSelectedDeckId(selectedDeckId);
    setEditingCardId(null);
    setEditFront('');
    setEditBack('');
    setShowImportCsv(false);
    setCsvText('');
  }

  const closeStudy = React.useCallback(() => {
    setPendingClose(false);
    setIsStudying(false);
    setStudyDeck(null);
    setStudyIndex(0);
    setIsFlipped(false);
  }, []);

  React.useEffect(() => {
    if (!pendingClose) return;
    const timer = setTimeout(() => {
      closeStudy();
      setPendingClose(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [pendingClose, closeStudy]);

  const selectedDeck = useMemo(() => decks.find(d => d.id === selectedDeckId), [decks, selectedDeckId]);



  function persistDecks(nextDecksOrUpdater) {
    setData(contest => {
      if (!contest || typeof contest !== 'object') return contest;
      const currentDecks = (Array.isArray(contest.flashcardDecks)
        ? contest.flashcardDecks
        : Object.values(contest.flashcardDecks || {})).filter(Boolean);
      const resolved = typeof nextDecksOrUpdater === 'function'
        ? nextDecksOrUpdater(currentDecks)
        : nextDecksOrUpdater;
      return {
        ...contest,
        flashcardDecks: (Array.isArray(resolved) ? resolved : []).filter(Boolean)
      };
    });
  }

  // Create deck
  const createDeck = () => {
    if (!newDeckName.trim()) {
      showToast('Nome do deck obrigatório', 'error');
      return;
    }
    const nowIso = new Date().toISOString();
    const matchedCat = newDeckCategoryId && newDeckCategoryId !== '__custom__'
      ? categories.find(c => c && String(c.id) === String(newDeckCategoryId))
      : categories.find(c => c && newDeckSubject.trim() && isSubjectMatch(newDeckSubject.trim(), c.name));
    const resolvedSubject = matchedCat
      ? matchedCat.name
      : (newDeckSubject.trim() || 'Geral');
    const newDeck = {
      id: generateId('deck'),
      name: newDeckName.trim(),
      subject: resolvedSubject,
      ...(matchedCat?.id ? { categoryId: matchedCat.id } : {}),
      createdAt: nowIso,
      lastUpdated: nowIso,
      cards: [],
      stats: { totalReviews: 0, mastered: 0 }
    };
    persistDecks(currentDecks => [...currentDecks, newDeck]);
    setSelectedDeckId(newDeck.id);
    setNewDeckName('');
    setNewDeckCategoryId('');
    setNewDeckSubject('');
    setShowCreateDeck(false);
    showToast('Deck criado! 📚', 'success');
  };

  // Delete deck
  const deleteDeck = (deckId) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) setDeckToDelete(deck);
  };

  const handleConfirmDeleteDeck = () => {
    if (!deckToDelete) return;
    const deletedDeckSnapshot = { ...deckToDelete };
    const deletedId = deckToDelete.id;
    const nowIso = new Date().toISOString();
    useAppStore.getState().archiveToTrash?.({
      type: 'flashcard_deck',
      contestId: activeId,
      data: deletedDeckSnapshot,
    });
    setData(contest => {
      if (!contest || typeof contest !== 'object') return contest;
      const currentDecks = (Array.isArray(contest.flashcardDecks)
        ? contest.flashcardDecks
        : Object.values(contest.flashcardDecks || {})).filter(Boolean);
      const prevDeleted = Array.isArray(contest.deletedFlashcardDeckIds) ? contest.deletedFlashcardDeckIds : [];
      return {
        ...contest,
        flashcardDecks: currentDecks.filter(d => d.id !== deletedId),
        deletedFlashcardDeckIds: [
          ...prevDeleted.filter(e => e && e.id !== deletedId),
          { id: deletedId, deletedAt: nowIso }
        ].slice(-100)
      };
    });
    if (selectedDeckId === deletedId) setSelectedDeckId(null);
    showToast('Deck movido para a Lixeira', 'info');
    setDeckToDelete(null);
  };

  // Add card
  const addCard = () => {
    if (!selectedDeckId || !front.trim() || !back.trim()) {
      showToast('Preencha frente e verso', 'error');
      return;
    }
    const nowIso = new Date().toISOString();
    const targetDeckId = selectedDeckId;
    const nextCard = {
      id: generateId('card'),
      front: front.trim(),
      back: back.trim(),
      interval: 1,
      ease: 2.5,
      due: getFlashcardTodayKey(),   // consistent TZ key
      lastReviewed: null,
      reviews: 0
    };
    persistDecks(currentDecks => currentDecks.map(deck => {
      if (deck.id !== targetDeckId) return deck;
      const cards = (Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {})).filter(Boolean);
      return {
        ...deck,
        lastUpdated: nowIso,
        cards: [...cards, nextCard]
      };
    }));
    setFront('');
    setBack('');
    setShowAddCard(false);
    showToast('Cartão adicionado!', 'success');
  };

  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setEditFront(card.front || '');
    setEditBack(card.back || '');
  };

  const saveEditCard = () => {
    if (!selectedDeckId || !editingCardId || !editFront.trim() || !editBack.trim()) {
      showToast('Preencha frente e verso do cartão.', 'error');
      return;
    }
    const nowIso = new Date().toISOString();
    const targetDeckId = selectedDeckId;
    const targetCardId = editingCardId;
    persistDecks(currentDecks => currentDecks.map(deck => {
      if (deck.id !== targetDeckId) return deck;
      const cards = getSafeDeckCards(deck).map(c => (
        c.id === targetCardId ? { ...c, front: editFront.trim(), back: editBack.trim(), updatedAt: nowIso } : c
      ));
      return { ...deck, lastUpdated: nowIso, cards };
    }));
    setEditingCardId(null);
    setEditFront('');
    setEditBack('');
    showToast('Cartão atualizado!', 'success');
  };

  const exportDeckCsv = () => {
    if (!selectedDeck) return;
    const cards = getSafeDeckCards(selectedDeck);
    if (!cards.length) {
      showToast('Este deck não possui cartões para exportar.', 'warning');
      return;
    }
    const escapeField = (v) => String(v || '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
    const tsv = cards.map((c) => `${escapeField(c.front)}\t${escapeField(c.back)}`).join('\n');
    try {
      const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(selectedDeck.name || 'deck').replace(/[^a-zA-Z0-9_-]/g, '_')}_anki.tsv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${cards.length} cartão(ões) exportado(s) (compatível com Anki)!`, 'success');
    } catch {
      showToast('Falha ao exportar arquivo.', 'error');
    }
  };

  const importDeckCsv = () => {
    if (!selectedDeckId || !csvText.trim()) {
      showToast('Cole linhas no formato "Frente ; Verso" ou "Frente [TAB] Verso".', 'warning');
      return;
    }
    const lines = csvText.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
    const nowIso = new Date().toISOString();
    const todayKey = getFlashcardTodayKey();
    const newCards = [];

    lines.forEach((line) => {
      const sep = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
      const cols = parseDelimitedRow(line, sep);
      const f = (cols[0] || '').trim();
      const b = (cols[1] || '').trim();
      if (f && b) {
        newCards.push({
          id: generateId('card'),
          front: f,
          back: b,
          interval: 1,
          ease: 2.5,
          due: todayKey,
          lastReviewed: null,
          reviews: 0,
          createdAt: nowIso,
          source: 'csv-import',
        });
      }
    });

    if (!newCards.length) {
      showToast('Nenhum par Frente/Verso válido encontrado.', 'error');
      return;
    }

    const targetDeckId = selectedDeckId;
    persistDecks(currentDecks => currentDecks.map(deck => {
      if (deck.id !== targetDeckId) return deck;
      return { ...deck, lastUpdated: nowIso, cards: [...getSafeDeckCards(deck), ...newCards] };
    }));
    setCsvText('');
    setShowImportCsv(false);
    showToast(`${newCards.length} cartão(ões) importado(s) com sucesso!`, 'success');
  };

  const deleteCard = (cardId) => {
    const nowIso = new Date().toISOString();
    const targetDeckId = selectedDeckId;
    persistDecks(currentDecks => currentDecks.map(deck => {
      if (deck.id !== targetDeckId) return deck;
      const cards = (Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {})).filter(Boolean);
      const nextCards = cards.filter(c => c.id !== cardId);
      const prevDeletedCards = Array.isArray(deck.deletedCardIds) ? deck.deletedCardIds : [];
      return {
        ...deck,
        lastUpdated: nowIso,
        cards: nextCards,
        deletedCardIds: [
          ...prevDeletedCards.filter(e => e && e.id !== cardId),
          { id: cardId, deletedAt: nowIso }
        ].slice(-200),
        stats: {
          ...deck.stats,
          mastered: nextCards.filter(c => (c.reviews || 0) >= 3 && (c.interval || 1) >= 6).length
        }
      };
    }));
    showToast('Cartão excluído', 'info');
  };

  // Start study — ordena por prioridade crítica (Conceito Errado Crítico) e menor recuperabilidade FSRS
  const getDueCardsForDeck = (deck) => {
    const nowMs = Date.now();
    return getSafeDeckCards(deck)
      .filter(c => isFlashcardDue(c.due))
      .sort((a, b) => {
        const aCrit = (a?.priority === 'critical' || a?.confidence === 'certeza') ? 1 : 0;
        const bCrit = (b?.priority === 'critical' || b?.confidence === 'certeza') ? 1 : 0;
        if (bCrit !== aCrit) return bCrit - aCrit;
        return computeFlashcardRetrievability(a, nowMs) - computeFlashcardRetrievability(b, nowMs);
      });
  };

  const startStudy = (deck) => {
    if (!deck) return;

    const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});

    if (safeCards.length === 0) {
      showToast('Adicione cartões antes de estudar', 'error');
      return;
    }

    const dueForDeck = getDueCardsForDeck(deck);

    if (dueForDeck.length === 0) {
      showToast('Nenhum cartão para revisar hoje!', 'success');
      return;
    }

    const cardsToStudy = dueForDeck;

    setSelectedDeckId(deck.id);
    setStudyDeck({ ...deck, cardsToStudy });
    setStudyIndex(0);
    setIsFlipped(false);
    setStudyStats({ reviewed: 0, known: 0 });
    setIsStudying(true);
  };



  const flipCard = () => setIsFlipped(f => !f);

  // Agendador FSRS-4.5 real (estabilidade S, dificuldade D e recuperabilidade R)
  function rateCard(rating) {
    if (pendingClose) return;
    // rating: 0=Esqueci, 1=Difícil, 2=Bom, 3=Fácil
    if (!studyDeck || !studyDeck.cardsToStudy) return;

    const currentCard = studyDeck.cardsToStudy[studyIndex];
    if (!currentCard) return;

    const fsrsResult = scheduleFlashcardFsrs(currentCard, rating);
    const newInterval = fsrsResult.interval;
    const newEase = fsrsResult.ease;
    const nextFsrs = fsrsResult.fsrs;

    const nextDue = getFlashcardNextDueKey(newInterval);

    const nowIso = new Date().toISOString();
    persistDecks(currentDecks => {
      return currentDecks.map(deck => {
        if (deck.id !== studyDeck.id) return deck;
        const safeCards = (Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {})).filter(Boolean);
        const updatedCards = safeCards.map(card => {
          if (card.id === currentCard.id) {
            return {
              ...card,
              interval: newInterval,
              ease: newEase,
              fsrs: nextFsrs,
              due: nextDue,
              lastReviewed: nowIso,
              reviews: (card.reviews || 0) + 1
            };
          }
          return card;
        });
        return {
          ...deck,
          lastUpdated: nowIso,
          cards: updatedCards,
          stats: {
            totalReviews: (deck.stats?.totalReviews || 0) + 1,
            mastered: updatedCards.filter(c => (c.reviews || 0) >= 3 && (c.interval || 1) >= 6).length
          }
        };
      });
    });

    // Integrate as measure: log review for stats, activity, gamification, coach
    if (typeof logFlashcardReview === 'function' && studyDeck) {
      logFlashcardReview(
        studyDeck.id,
        currentCard.id,
        rating,
        studyDeck.subject || studyDeck.name,
        0.5,
        studyDeck.categoryId || null
      );
    }

    // Update local study session copy
    const updatedStudyCards = [...studyDeck.cardsToStudy];
    updatedStudyCards[studyIndex] = {
      ...updatedStudyCards[studyIndex],
      interval: newInterval,
      ease: newEase,
      fsrs: nextFsrs,
      due: nextDue
    };

    // G-11 FIX: Atualizar estado local DEPOIS da persistência,
    // não antes. Se persistDecks falhar, o estado local não avança.
    const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
    const isKnown = safeRating >= 2;
    const projectedKnown = studyStats.known + (isKnown ? 1 : 0);
    const projectedReviewed = studyStats.reviewed + 1;

    setStudyStats(prev => {
      const pSafeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
      const pIsKnown = pSafeRating >= 2;
      const newReviewed = prev.reviewed + 1;
      const newKnown = prev.known + (pIsKnown ? 1 : 0);

      if (prev.reviewed === newReviewed && prev.known === newKnown) {
        return prev;
      }

      return {
        ...prev,
        reviewed: newReviewed,
        known: newKnown,
      };
    });

    // Next card
    if (studyIndex + 1 < updatedStudyCards.length) {
      setStudyIndex(i => i + 1);
      setIsFlipped(false);
      setStudyDeck({ ...studyDeck, cardsToStudy: updatedStudyCards });
    } else {
      // Finished
      setIsFlipped(false);
      showToast(`Sessão concluída! ${projectedKnown}/${projectedReviewed} dominados.`, 'success');
      setPendingClose(true);
    }
  }

  const currentStudyCard = studyDeck?.cardsToStudy?.[studyIndex];

  // Auto-open or start deck when navigated from Retenção, Pareto ou Notas
  const [prevNavState, setPrevNavState] = useState(null);
  const incomingNavState = location?.state || null;

  if (incomingNavState && incomingNavState !== prevNavState) {
    setPrevNavState(incomingNavState);
    const { focusSubject, focusCategoryId, autoStartReview, prefillCard } = incomingNavState;
    if (focusSubject || focusCategoryId || prefillCard) {
      const matchingDeck = decks.find(d => {
        if (!d) return false;
        if (focusCategoryId && d.categoryId && String(d.categoryId) === String(focusCategoryId)) return true;
        if (focusSubject && (isSubjectMatch(d.subject || '', focusSubject) || isSubjectMatch(d.name || '', focusSubject))) return true;
        return false;
      });

      if (matchingDeck) {
        setSelectedDeckId(matchingDeck.id);
        if (prefillCard) {
          setFront(prefillCard.front || '');
          setBack(prefillCard.back || '');
          setShowAddCard(true);
        } else if (autoStartReview) {
          const due = getSafeDeckCards(matchingDeck)
            .filter(c => isFlashcardDue(c.due))
            .sort((a, b) => {
              const aCrit = (a?.priority === 'critical' || a?.confidence === 'certeza') ? 1 : 0;
              const bCrit = (b?.priority === 'critical' || b?.confidence === 'certeza') ? 1 : 0;
              if (bCrit !== aCrit) return bCrit - aCrit;
              return String(a?.due || '').localeCompare(String(b?.due || ''));
            });
          if (due.length > 0) {
            setStudyDeck({ ...matchingDeck, cardsToStudy: due });
            setStudyIndex(0);
            setIsFlipped(false);
            setStudyStats({ reviewed: 0, known: 0 });
            setIsStudying(true);
          }
        }
      } else if (focusSubject) {
        setNewDeckName(prefillCard?.deckName || `Revisão — ${focusSubject}`);
        if (focusCategoryId && categories.some(c => c && String(c.id) === String(focusCategoryId))) {
          setNewDeckCategoryId(String(focusCategoryId));
          setNewDeckSubject(focusSubject);
        } else {
          const foundCat = categories.find(c => c && isSubjectMatch(focusSubject, c.name));
          setNewDeckCategoryId(foundCat ? String(foundCat.id) : '__custom__');
          setNewDeckSubject(foundCat ? foundCat.name : focusSubject);
        }
        if (prefillCard) {
          setFront(prefillCard.front || '');
          setBack(prefillCard.back || '');
        }
        setShowCreateDeck(true);
      }
    }
  }

  useEffect(() => {
    if (!incomingNavState) return;
    const { focusSubject, focusCategoryId, prefillCard } = incomingNavState;
    if (!focusSubject && !focusCategoryId && !prefillCard) return;
    try {
      window.history.replaceState({}, document.title);
    } catch { /* ignore */ }
  }, [incomingNavState]);

  const pageTitle = studyDeck?.name || "Flashcards";

  return (
    <PageErrorBoundary pageName={pageTitle}>
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
                  <label className="micro-label block mb-1">Disciplina do Edital</label>
                  {categories.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={newDeckCategoryId}
                        onChange={e => {
                          const val = e.target.value;
                          setNewDeckCategoryId(val);
                          if (val && val !== '__custom__') {
                            const cat = categories.find(c => c && String(c.id) === String(val));
                            if (cat) setNewDeckSubject(cat.name);
                          } else if (!val) {
                            setNewDeckSubject('');
                          }
                        }}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-amber-500/60 focus:outline-none"
                      >
                        <option value="">Geral (sem vínculo específico)</option>
                        {categories.map(c => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                        <option value="__custom__">Outra disciplina (digitar manualmente)...</option>
                      </select>
                      {newDeckCategoryId === '__custom__' && (
                        <input
                          value={newDeckSubject}
                          onChange={e => setNewDeckSubject(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none text-sm"
                          placeholder="Digite o nome da disciplina"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      value={newDeckSubject}
                      onChange={e => setNewDeckSubject(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none"
                      placeholder="Direito"
                    />
                  )}
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
            const safeCards = getSafeDeckCards(deck);
            const cardCount = safeCards.length;
            const isSelected = deck.id === selectedDeckId;
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
                <div className="text-amber-300/80 text-sm tracking-wider mt-0.5">{selectedDeck.subject} • {getSafeDeckCards(selectedDeck).length} cartões</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => startStudy(selectedDeck)} disabled={getSafeDeckCards(selectedDeck).length === 0} className="tool-btn">
                  <Play size={16} /> Iniciar Revisão
                </button>
                <button onClick={() => setShowAddCard(true)} className="tool-btn secondary">
                  <Plus size={16} /> Adicionar Cartão
                </button>
                <button type="button" onClick={() => setShowImportCsv((v) => !v)} className="tool-btn secondary" title="Importar cartões CSV / TSV (Anki)">
                  <Upload size={15} /> Importar CSV
                </button>
                <button type="button" onClick={exportDeckCsv} disabled={getSafeDeckCards(selectedDeck).length === 0} className="tool-btn secondary" title="Exportar deck em TSV compatível com Anki">
                  <Download size={15} /> Exportar Anki
                </button>
              </div>
            </div>

            {showImportCsv && (
              <div className="mb-6 p-4 rounded-2xl border border-indigo-500/30 bg-slate-950/70 space-y-3">
                <div className="micro-label text-indigo-300">IMPORTAR CSV / ANKI (1 cartão por linha: Frente ; Verso ou TAB)</div>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={4}
                  placeholder={'Art. 5º CF;Direitos e garantias individuais e coletivos\nControle concentrado;Exercido pelo STF via ADI, ADC, ADPF'}
                  className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-xs font-mono resize-y"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowImportCsv(false); setCsvText(''); }} className="tool-btn secondary">Cancelar</button>
                  <button type="button" onClick={importDeckCsv} className="tool-btn">Importar Cartões</button>
                </div>
              </div>
            )}

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
              <div className="micro-label mb-3">CARTÕES ({getSafeDeckCards(selectedDeck).length})</div>
              {getSafeDeckCards(selectedDeck).length === 0 ? (
                <div className="text-sm text-slate-400 py-3">Nenhum cartão. Adicione alguns acima.</div>
              ) : (
                <div className="space-y-2">
                  {getSafeDeckCards(selectedDeck).map((card) => (
                    <div key={card.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm group">
                      {editingCardId === card.id ? (
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={editFront}
                            onChange={(e) => setEditFront(e.target.value)}
                            rows={2}
                            aria-label="Editar frente do cartão"
                            className="w-full rounded-lg bg-black/50 border border-indigo-400/40 p-2 text-xs text-white outline-none"
                          />
                          <textarea
                            value={editBack}
                            onChange={(e) => setEditBack(e.target.value)}
                            rows={2}
                            aria-label="Editar verso do cartão"
                            className="w-full rounded-lg bg-black/50 border border-indigo-400/40 p-2 text-xs text-slate-200 outline-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setEditingCardId(null)} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-slate-400 hover:text-white">Cancelar</button>
                            <button type="button" onClick={saveEditCard} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold text-emerald-200">
                              <Check size={12} /> Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-amber-100 line-clamp-2 leading-snug">{card.front}</div>
                            <div className="text-slate-400 mt-1 text-xs line-clamp-2 leading-snug">{card.back}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              <span>Intervalo: {card.interval || 1}d</span>
                              {card.due && <span>Próxima: {formatDueShort(card.due)}</span>}
                              <span className="font-mono text-cyan-400/80">
                                R: {Math.round(computeFlashcardRetrievability(card) * 100)}%
                              </span>
                              {card.fsrs?.stability != null && (
                                <span className="font-mono text-indigo-300/80">FSRS S={card.fsrs.stability}d</span>
                              )}
                              {(card.priority === 'critical' || card.confidence === 'certeza') && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                                  Conceito Crítico
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => startEditCard(card)}
                              aria-label="Editar cartão"
                              className="text-indigo-300 hover:text-indigo-200 p-1"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCard(card.id)}
                              aria-label="Excluir cartão"
                              className="text-rose-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      )}
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

        <ConfirmModal
          isOpen={!!deckToDelete}
          onClose={() => setDeckToDelete(null)}
          onConfirm={handleConfirmDeleteDeck}
          title="Excluir Deck"
          message={`Tem certeza que deseja excluir o deck "${deckToDelete?.name || ''}" e todos os seus cartões? Essa ação não pode ser desfeita.`}
          confirmText="Excluir Deck"
          type="danger"
          icon={Trash2}
        />
      </div>
    </PageErrorBoundary>
  );
}

