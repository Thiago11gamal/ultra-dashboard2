export function handleMenuKeyDown(e, items, currentIndex, onSelect) {
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            onSelect((currentIndex + 1) % items.length);
            break;
        case 'ArrowUp':
            e.preventDefault();
            onSelect((currentIndex - 1 + items.length) % items.length);
            break;
        case 'Home':
            e.preventDefault();
            onSelect(0);
            break;
        case 'End':
            e.preventDefault();
            onSelect(items.length - 1);
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            // Ativar item atual
            break;
    }
}

export function getContestDisplayName(contestData) {
    if (typeof contestData === 'string') return contestData;
    const explicitName = contestData?.contestName ?? contestData?.name;
    const normalized = typeof explicitName === 'string' ? explicitName.trim() : '';
    return normalized || 'Sem nome';
}

export function isMenuItemActive(currentPath, itemPath) {
    const normalizedPath = (currentPath || '/').replace(/\/+$/, '') || '/';
    const normalizedItemPath = (itemPath || '/').replace(/\/+$/, '') || '/';
    const isDashboardAlias = normalizedPath === '/dashboard';
    if (normalizedItemPath === '/') return normalizedPath === '/' || isDashboardAlias;
    return normalizedPath === normalizedItemPath || normalizedPath.startsWith(`${normalizedItemPath}/`);
}

