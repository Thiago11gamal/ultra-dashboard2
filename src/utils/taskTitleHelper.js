/**
 * ============================================================================
 * UNIFIED TASK TITLE HELPER
 * ============================================================================
 * Sanitizes and formats task titles across the Pomodoro menu, AI Coach,
 * and TopBar to guarantee consistent display and matching.
 */

export function isInternalId(val) {
    if (!val || typeof val !== 'string') return false;
    const s = val.trim();
    if (!s) return false;

    // Common system ID prefixes: cat-, task-, id-, log-, session-, temp- followed by alphanumeric
    if (/^(cat|task|id|log|session|temp)-[0-9a-zA-Z_-]+/i.test(s)) return true;

    // Contains coach/system synthetic tags
    if (/-(geral|general|topic|weaktopic|decay|syllabus|srsblitz|drill|synthesis)-/i.test(s)) return true;

    // UUID v4 format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;

    // Raw timestamp IDs like 1772560345316 or 1772560345316-xyz
    if (/^1[6-9]\d{11}(-[0-9a-zA-Z]+)?$/.test(s)) return true;

    return false;
}

export function cleanTaskTitle(rawText, categoryName = '') {
    if (!rawText) return '';
    let text = String(rawText).trim();

    // Decode HTML entities
    text = text
        .replace(/&mdash;/gi, '—')
        .replace(/&ndash;/gi, '–')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");

    // Remove system tags
    text = text
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/gi, '')
        .replace(/\[ALERTA MESTRE\]\s*/gi, '')
        .trim();

    // Remove outer brackets
    if (text.startsWith('[') && text.endsWith(']')) {
        text = text.slice(1, -1).trim();
    }

    const sepIdx = text.indexOf(':');
    if (sepIdx !== -1) {
        let action = text.slice(sepIdx + 1).trim();
        if (action.startsWith('[') && action.endsWith(']')) {
            action = action.slice(1, -1).trim();
        }
        if (categoryName && action.toLowerCase() === String(categoryName).trim().toLowerCase()) {
            return 'Revisão Geral';
        }
        if (action) {
            if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(action)) {
                return text.slice(0, sepIdx).trim() || 'Revisão Geral';
            }
            // Strip alert prefixes like "Consolidação Teórica — Tópico" or "Revisão por Recência — Tópico"
            const alertClean = action.replace(/^(Revisão por Recência|Avanço de Edital|SRS Blitz|Consolidação Teórica|Bateria Ativa|Estudo Ativo|Revisão Expressa|Treino Rápido|Treino de Agilidade|Manutenção)\s*[-—–:]\s*/i, '').trim();
            if (alertClean && alertClean !== action) {
                return alertClean;
            }
            return action;
        }
    }

    const alertClean = text.replace(/^(Revisão por Recência|Avanço de Edital|SRS Blitz|Consolidação Teórica|Bateria Ativa|Estudo Ativo|Revisão Expressa|Treino Rápido|Treino de Agilidade|Manutenção)\s*[-—–:]\s*/i, '').trim();
    if (alertClean && alertClean !== text) {
        text = alertClean;
    }

    if (categoryName && text.toLowerCase() === String(categoryName).trim().toLowerCase()) {
        return 'Revisão Geral';
    }

    return text;
}

export function extractTopicFromInternalId(id, category = null, allCategories = []) {
    if (!id || typeof id !== 'string') return null;
    const str = id.trim();

    // 1. General review & drill patterns
    if (/-(geral|general)-/i.test(str)) {
        return 'Revisão Geral';
    }
    if (/-(drill|synthesis)-/i.test(str)) {
        return 'Consolidação Teórica';
    }
    if (/-(srsblitz)-/i.test(str)) {
        return 'SRS Blitz';
    }

    // 2. Topic pattern: e.g. cat-1772560345316-opevcca-topic-c1-0, decay, syllabus, synthesis
    const markerIdx = str.search(/-(topic|weaktopic|decay|syllabus|synthesis)-/i);
    if (markerIdx !== -1) {
        const markerMatch = str.slice(markerIdx).match(/^-(topic|weaktopic|decay|syllabus)-/i);
        if (markerMatch) {
            let topicPart = str.slice(markerIdx + markerMatch[0].length);
            // Remove trailing index and hash suffix like -0, -1-abc123
            topicPart = topicPart.replace(/-\d+(-[a-zA-Z0-9]+)?$/, '').replace(/-\d+$/, '').trim();

            if (topicPart) {
                // Try to find matching task in category
                const cat = category || (Array.isArray(allCategories) ? allCategories : []).find(c => c && c.id && str.startsWith(String(c.id)));
                if (cat) {
                    const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                    const normalizeSlug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
                    const targetSlug = normalizeSlug(topicPart);

                    if (targetSlug) {
                        const matchedTask = tasks.find(t => {
                            const title = t?.title || t?.text || t?.name || '';
                            const normTitle = normalizeSlug(title);
                            return normTitle === targetSlug ||
                                   (normTitle.length > 2 && targetSlug.length > 2 && (normTitle.startsWith(targetSlug) || targetSlug.startsWith(normTitle)));
                        });

                        if (matchedTask) {
                            return cleanTaskTitle(matchedTask.title || matchedTask.text || matchedTask.name, cat.name);
                        }
                    }
                }

                // If not matched, return the topicPart slug as is
                return topicPart;
            }
        }
    }

    return null;
}

export function resolveHumanTaskTitle(rawTitle, taskId, category = null, allCategories = []) {
    // 1. If rawTitle is provided and is NOT an internal machine ID
    if (rawTitle && typeof rawTitle === 'string' && rawTitle.trim() && rawTitle.trim() !== '-') {
        const trimmed = rawTitle.trim();
        if (!isInternalId(trimmed)) {
            const cleaned = cleanTaskTitle(trimmed, category?.name || '');
            if (cleaned && !isInternalId(cleaned)) {
                return cleaned;
            }
        }
    }

    // 2. If rawTitle was an internal ID, try extracting human topic from it
    if (rawTitle && isInternalId(rawTitle)) {
        const fromRawId = extractTopicFromInternalId(rawTitle, category, allCategories);
        if (fromRawId) return fromRawId;
    }

    // 3. Try looking up taskId in category.tasks if available
    if (category && taskId) {
        const tasks = Array.isArray(category.tasks) ? category.tasks : Object.values(category.tasks || {});
        const task = tasks.find(t => t && (String(t.id) === String(taskId) || t.text === taskId || t.title === taskId));
        if (task) {
            const title = task.title || task.text || task.name;
            if (title && !isInternalId(title)) {
                return cleanTaskTitle(title, category.name);
            }
        }
    }

    // 4. Try extracting from taskId if taskId is an internal ID
    if (taskId && typeof taskId === 'string') {
        const fromTaskId = extractTopicFromInternalId(taskId, category, allCategories);
        if (fromTaskId) return fromTaskId;
    }

    // 5. Fallback based on category
    if (category) {
        return 'Revisão Geral';
    }

    return 'Sessão de Estudo';
}

export function parseTaskDisplay(rawText, categoryName = '', categoryObj = null) {
    if (!rawText) return { displayTopic: '', secondaryText: '', alertBadge: null, isPriority: false };
    let fullText = String(rawText).trim()
        .replace(/&mdash;/gi, '—')
        .replace(/&ndash;/gi, '–')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");

    if (/estudo livre|foco livre|foco aberto/i.test(fullText)) {
        return {
            displayTopic: 'Estudo Livre / Foco Aberto',
            secondaryText: 'Geral',
            alertBadge: { label: 'Livre', icon: '⏱️', type: 'free', text: 'Foco Livre', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
            isPriority: false
        };
    }

    const isPriority = /\[PROTOCOLO PRIORITÁRIO\]|\[ALERTA MESTRE\]/i.test(fullText);

    const parts = fullText.split(':');
    let actionPart = parts.length > 1 ? parts.slice(1).join(':').trim() : fullText;
    let categoryPart = parts.length > 1 ? parts[0].trim() : (categoryName || '');

    // Resolve category object if an array was passed or categoryObj is provided
    let targetCategory = categoryObj;
    if (Array.isArray(categoryObj)) {
        targetCategory = categoryObj.find(c => {
            if (!c) return false;
            const cName = String(c.name || '').trim().toLowerCase();
            const cId = String(c.id || '').trim();
            const matchName1 = String(categoryName || '').trim().toLowerCase();
            const matchName2 = String(categoryPart || '').trim().toLowerCase();
            return (matchName1 && cName === matchName1) ||
                   (matchName2 && cName === matchName2) ||
                   (cId && (cId === categoryName || cId === categoryPart));
        }) || null;
    }

    // Limpa tags de prioridade
    let cleanText = actionPart
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/gi, '')
        .replace(/\[ALERTA MESTRE\]\s*/gi, '')
        .trim();

    // Remove colchetes externos se envolver toda a ação: "[...]"
    if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
        cleanText = cleanText.slice(1, -1).trim();
    }

    let alertBadge = null;

    // 1. Detecta modalidade se estiver entre colchetes no início, ex: "[Bateria Ativa] 15 Questões" ou "[Consolidação Teórica] Tópico"
    const bracketMatch = cleanText.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (bracketMatch) {
        const bracketTag = bracketMatch[1].trim();
        const remainder = bracketMatch[2].trim();
        if (/Revisão por Recência/i.test(bracketTag)) {
            alertBadge = { label: 'Recência', icon: '🧊', type: 'decay', text: 'Revisão por Recência', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
            cleanText = remainder;
        } else if (/Avanço de Edital/i.test(bracketTag)) {
            alertBadge = { label: 'Edital', icon: '📖', type: 'syllabus', text: 'Avanço de Edital', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
            cleanText = remainder;
        } else if (/SRS Blitz/i.test(bracketTag)) {
            alertBadge = { label: 'Flashcards', icon: '⚡', type: 'srs', text: 'SRS Blitz', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
            cleanText = remainder;
        } else if (/Consolidação Teórica|Bateria Ativa|Estudo Ativo|Síntese/i.test(bracketTag)) {
            alertBadge = { label: 'Síntese', icon: '🧠', type: 'synthesis', text: 'Consolidação Teórica', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
            cleanText = remainder;
        } else if (/Revisão Expressa|Treino Rápido|Treino de Agilidade/i.test(bracketTag)) {
            alertBadge = { label: 'Rápida', icon: '⚡', type: 'quick', text: 'Revisão Expressa', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
            cleanText = remainder;
        } else if (/Manutenção/i.test(bracketTag)) {
            alertBadge = { label: 'Manutenção', icon: '🛡️', type: 'maintenance', text: 'Manutenção', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
            cleanText = remainder;
        }
    }

    // 2. Detecta alerta / modalidade com separador ou no início
    if (!alertBadge) {
        if (/^Revisão por Recência(\s*[-—–:]\s*|\s*$)/i.test(cleanText)) {
            alertBadge = { label: 'Recência', icon: '🧊', type: 'decay', text: 'Revisão por Recência', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
            cleanText = cleanText.replace(/^Revisão por Recência(\s*[-—–:]\s*|\s*$)/i, '').trim();
        } else if (/^Avanço de Edital(\s*[-—–:]\s*|\s*$)/i.test(cleanText)) {
            alertBadge = { label: 'Edital', icon: '📖', type: 'syllabus', text: 'Avanço de Edital', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
            cleanText = cleanText.replace(/^Avanço de Edital(\s*[-—–:]\s*|\s*$)/i, '').trim();
        } else if (/^SRS Blitz(\s*[-—–:]\s*|\s*$)/i.test(cleanText)) {
            alertBadge = { label: 'Flashcards', icon: '⚡', type: 'srs', text: 'SRS Blitz', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
            cleanText = cleanText.replace(/^SRS Blitz(\s*[-—–:]\s*|\s*$)/i, '').trim();
        } else if (/^(Consolidação Teórica|Bateria Ativa|Estudo Ativo)(\s*[-—–:]\s*|\s*$)/i.test(cleanText)) {
            alertBadge = { label: 'Síntese', icon: '🧠', type: 'synthesis', text: 'Consolidação Teórica', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
            cleanText = cleanText.replace(/^(Consolidação Teórica|Bateria Ativa|Estudo Ativo)(\s*[-—–:]\s*|\s*$)/i, '').trim();
        } else if (/^(Revisão Expressa|Treino Rápido|Treino de Agilidade)(\s*[-—–:]\s*|\s*$)/i.test(cleanText)) {
            alertBadge = { label: 'Rápida', icon: '⚡', type: 'quick', text: 'Revisão Expressa', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
            cleanText = cleanText.replace(/^(Revisão Expressa|Treino Rápido|Treino de Agilidade)(\s*[-—–:]\s*|\s*$)/i, '').trim();
        } else if (/^Manutenção(\s*[-—–:]\s*|\s*$)/i.test(cleanText)) {
            alertBadge = { label: 'Manutenção', icon: '🛡️', type: 'maintenance', text: 'Manutenção', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
            cleanText = cleanText.replace(/^Manutenção(\s*[-—–:]\s*|\s*$)/i, '').trim();
        }
    }

    // Se o cleanText for apenas um placeholder genérico (como "15 Questões Mistas", "Síntese e Mapeamento", "Revisão Geral" ou o nome da disciplina)
    const isGeneric = (str) => {
        if (!str || !str.trim()) return true;
        const lower = str.trim().toLowerCase();
        const catLower = String(categoryName || categoryPart || (targetCategory?.name || '')).trim().toLowerCase();
        return (
            lower === catLower ||
            lower === 'revisão geral' ||
            lower === 'revisao geral' ||
            lower === 'estudo' ||
            lower === 'estudo livre' ||
            lower === 'foco livre' ||
            lower === 'sessão de estudo' ||
            lower === 'sessao de estudo' ||
            lower === 'missão ativa' ||
            lower === 'missao ativa' ||
            lower === '15 questões mistas' ||
            lower === '15 questoes mistas' ||
            lower === 'questões mistas' ||
            lower === 'questoes mistas' ||
            lower === 'bateria ativa' ||
            lower === 'consolidação teórica' ||
            lower === 'consolidacao teorica' ||
            lower === 'síntese e mapeamento' ||
            lower === 'sintese e mapeamento' ||
            lower.includes('questões mistas') ||
            lower.includes('questoes mistas') ||
            (lower.startsWith('zerar ') && lower.includes('flashcard'))
        );
    };

    if (isGeneric(cleanText)) {
        // Tenta buscar o assunto específico cadastrado na matéria
        if (targetCategory) {
            const rawTasks = Array.isArray(targetCategory.tasks) ? targetCategory.tasks : Object.values(targetCategory.tasks || {});
            const uncompleted = rawTasks.find(t => t && !t.completed && (t.text || t.title || t.name));
            if (uncompleted) {
                cleanText = cleanTaskTitle(uncompleted.text || uncompleted.title || uncompleted.name, targetCategory.name);
            } else {
                const firstTask = rawTasks.find(t => t && (t.text || t.title || t.name));
                if (firstTask) {
                    cleanText = cleanTaskTitle(firstTask.text || firstTask.title || firstTask.name, targetCategory.name);
                } else {
                    const history = Array.isArray(targetCategory.simuladoStats?.history)
                        ? targetCategory.simuladoStats.history
                        : Object.values(targetCategory.simuladoStats?.history || {});
                    const histTopic = history.find(h => h && (h.topic || h.assunto))?.topic || history.find(h => h && (h.topic || h.assunto))?.assunto;
                    cleanText = histTopic ? cleanTaskTitle(histTopic, targetCategory.name) : 'Teoria Geral e Fundamentos';
                }
            }
        } else {
            cleanText = 'Teoria Geral e Fundamentos';
        }
    }

    if (isGeneric(cleanText)) {
        cleanText = 'Teoria Geral e Fundamentos';
    }

    const displayTopic = cleanText || 'Teoria Geral e Fundamentos';
    const secondaryText = (categoryPart && categoryPart.toLowerCase() !== displayTopic.toLowerCase()) ? categoryPart : (targetCategory?.name || '');

    return { displayTopic, secondaryText, alertBadge, isPriority };
}

