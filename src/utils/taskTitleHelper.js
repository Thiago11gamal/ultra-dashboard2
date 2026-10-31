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
    if (/-(geral|general|topic|weaktopic|decay|syllabus|srsblitz|drill)-/i.test(s)) return true;

    // UUID v4 format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;

    // Raw timestamp IDs like 1772560345316 or 1772560345316-xyz
    if (/^1[6-9]\d{11}(-[0-9a-zA-Z]+)?$/.test(s)) return true;

    return false;
}

export function cleanTaskTitle(rawText, categoryName = '') {
    if (!rawText) return '';
    let text = String(rawText).trim();

    // Remove system tags
    text = text
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/gi, '')
        .replace(/\[ALERTA MESTRE\]\s*/gi, '')
        .replace(/^\[(.*?)\]\s*/gi, '$1 ')
        .trim();

    const sepIdx = text.indexOf(':');
    if (sepIdx !== -1) {
        let action = text.slice(sepIdx + 1).trim();
        if (categoryName && action.toLowerCase() === String(categoryName).trim().toLowerCase()) {
            return 'Revisão Geral';
        }
        if (action) {
            if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(action)) {
                return text.slice(0, sepIdx).trim() || 'Revisão Geral';
            }
            return action;
        }
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
    if (/-(drill)-/i.test(str)) {
        return 'Bateria Ativa';
    }
    if (/-(srsblitz)-/i.test(str)) {
        return 'SRS Blitz';
    }

    // 2. Topic pattern: e.g. cat-1772560345316-opevcca-topic-c1-0, decay, syllabus
    const markerIdx = str.search(/-(topic|weaktopic|decay|syllabus)-/i);
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

export function parseTaskDisplay(rawText, categoryName = '') {
    if (!rawText) return { displayTopic: '', secondaryText: '' };
    const fullText = String(rawText).trim();
    const parts = fullText.split(':');
    let actionPart = parts.length > 1 ? parts.slice(1).join(':').trim() : fullText;

    actionPart = actionPart
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
        .replace(/\[ALERTA MESTRE\]\s*/i, '')
        .replace(/^\[(.*?)\]/i, '$1')
        .trim();

    let topicPart = (parts[0] || '')
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
        .replace(/\[ALERTA MESTRE\]\s*/i, '')
        .replace(/^\[(.*?)\]/i, '$1')
        .trim();
    if (categoryName && actionPart.toLowerCase() === String(categoryName).trim().toLowerCase()) {
        actionPart = 'Revisão Geral';
    }

    const displayTopic = actionPart || topicPart || '';
    let secondaryText = (topicPart && actionPart !== topicPart && actionPart !== 'Revisão Geral') ? topicPart : '';

    if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(secondaryText)) {
        secondaryText = '';
    }

    return { displayTopic, secondaryText };
}

