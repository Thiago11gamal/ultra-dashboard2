/**
 * ============================================================================
 * UNIFIED TASK TITLE HELPER
 * ============================================================================
 * Sanitizes and formats task titles across the Pomodoro menu, AI Coach,
 * and TopBar to guarantee consistent display and matching.
 */

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

