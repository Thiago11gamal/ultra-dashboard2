export function handleMenuKeyDown(e, items, currentIndex, onSelect, onActivate, onEscape) {
    if (!items || items.length === 0) return;
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (typeof onSelect === 'function') {
                onSelect((currentIndex + 1) % items.length);
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (typeof onSelect === 'function') {
                onSelect((currentIndex - 1 + items.length) % items.length);
            }
            break;
        case 'Home':
            e.preventDefault();
            if (typeof onSelect === 'function') {
                onSelect(0);
            }
            break;
        case 'End':
            e.preventDefault();
            if (typeof onSelect === 'function') {
                onSelect(items.length - 1);
            }
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (typeof onActivate === 'function') {
                onActivate(currentIndex);
            } else if (typeof onSelect === 'function') {
                onSelect(currentIndex, true);
            }
            break;
        case 'Escape':
            if (typeof onEscape === 'function') {
                e.preventDefault();
                onEscape();
            }
            break;
    }
}

export function getContestDisplayName(contestData) {
    if (typeof contestData === 'string') {
        const trimmed = contestData.trim();
        return trimmed || 'Sem nome';
    }
    const explicitName = contestData?.contestName ?? contestData?.name;
    const normalized = typeof explicitName === 'string' ? explicitName.trim() : '';
    return normalized || 'Sem nome';
}

export function isMenuItemActive(currentPath, itemPath) {
    const cleanCurrent = (currentPath || '/').split('?')[0].split('#')[0];
    const cleanItem = (itemPath || '/').split('?')[0].split('#')[0];
    const normalizedPath = cleanCurrent.replace(/\/+$/, '') || '/';
    const normalizedItemPath = cleanItem.replace(/\/+$/, '') || '/';
    const isDashboardAlias = normalizedPath === '/dashboard';
    if (normalizedItemPath === '/') return normalizedPath === '/' || isDashboardAlias;
    return normalizedPath === normalizedItemPath || normalizedPath.startsWith(`${normalizedItemPath}/`);
}

