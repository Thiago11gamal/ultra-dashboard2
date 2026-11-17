const stableStringify = (value) => {
  const ancestors = new WeakSet();

  const serialize = (val) => {
    if (val === null || val === undefined) return String(val);
    if (typeof val === 'bigint') return JSON.stringify(val.toString());
    if (typeof val === 'number') return Number.isFinite(val) ? String(val) : `"${String(val)}"`;
    if (typeof val !== 'object') return JSON.stringify(val);

    if (val instanceof Date) {
      return Number.isNaN(val.getTime()) ? '"Date:Invalid"' : `"Date:${val.toISOString()}"`;
    }
    if (val instanceof RegExp) {
      return `"RegExp:${val.toString()}"`;
    }
    if (ancestors.has(val)) return '"[Circular]"';

    ancestors.add(val);
    try {
      if (Array.isArray(val)) {
        return `[${val.map((item) => serialize(item)).join(',')}]`;
      }
      if (val instanceof Set) {
        const items = Array.from(val).map((item) => serialize(item)).sort();
        return `"Set:[${items.join(',')}]"`;
      }
      if (val instanceof Map) {
        const entries = Array.from(val.entries())
          .map(([k, v]) => `${serialize(k)}:${serialize(v)}`)
          .sort();
        return `"Map:{${entries.join(',')}}"`;
      }
      const keys = Object.keys(val).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${serialize(val[k])}`).join(',')}}`;
    } finally {
      ancestors.delete(val);
    }
  };

  try {
    return serialize(value);
  } catch {
    return String(value);
  }
};

export const stableHash = (value) => {
  const str = stableStringify(value) || '';
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
