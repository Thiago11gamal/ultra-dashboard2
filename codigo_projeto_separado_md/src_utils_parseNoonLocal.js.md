# src\utils\parseNoonLocal.js

```js
import { normalizeDate, getDateKey } from './dateHelper.js';

export function parseNoonLocal(input) {
  if (input == null) return null;
  try {
    const key = getDateKey(input);
    if (!key) {
      const fallback = normalizeDate(input);
      if (!fallback || Number.isNaN(fallback.getTime())) return null;
      return fallback;
    }
    const isoNoon = `${key}T12:00:00-04:00`;
    const dt = new Date(isoNoon);
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

export function addDaysNoon(date, days) {
  if (!date || typeof date.getTime !== 'function' || Number.isNaN(date.getTime())) {
    return null;
  }
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + (Number(days) || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const isoNoon = `${y}-${m}-${dd}T12:00:00-04:00`;
  const result = new Date(isoNoon);
  return Number.isNaN(result.getTime()) ? null : result;
}

```
