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
