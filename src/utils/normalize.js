export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value != null && typeof value === 'object') return Object.values(value);
  return [];
};
