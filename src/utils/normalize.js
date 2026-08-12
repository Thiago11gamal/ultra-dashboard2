export const toArray = (value) => {
  return Array.isArray(value) ? value : Object.values(value ?? {});
};
